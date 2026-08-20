import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, walletsTable, transactionsTable } from "@workspace/db";
import { randomUUID } from "crypto";
import { requireApiKey } from "../middleware/requireApiKey";
import { balanceRateLimiter, mutationRateLimiter } from "../middleware/rateLimiter";
import {
  EarnGemsBody,
  SpendGemsBody,
  TransferGemsBody,
  GetBalanceQueryParams,
} from "@workspace/api-zod";
import { buildEvent, deliverWebhooks } from "../lib/webhookDelivery";
import { type GemType } from "../lib/conversionRates";

const router: IRouter = Router();

async function getOrCreateUser(username: string): Promise<{ id: string; username: string }> {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (existing.length > 0) return existing[0];

  const id = randomUUID();
  const now = new Date();
  await db.insert(usersTable).values({ id, username, createdAt: now });
  await db.insert(walletsTable).values({ userId: id, gemBalance: 0, normalGems: 0, rareGems: 0, updatedAt: now });
  return { id, username };
}

async function getBalances(userId: string): Promise<{ normalGems: number; rareGems: number }> {
  const [w] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  return {
    normalGems: w?.normalGems ?? w?.gemBalance ?? 0,
    rareGems: w?.rareGems ?? 0,
  };
}

function getBalanceForType(balances: { normalGems: number; rareGems: number }, gemType: GemType): number {
  return gemType === "rare" ? balances.rareGems : balances.normalGems;
}

function getWalletUpdate(
  balances: { normalGems: number; rareGems: number },
  gemType: GemType,
  newBalance: number,
) {
  return {
    normalGems: gemType === "normal" ? newBalance : balances.normalGems,
    rareGems: gemType === "rare" ? newBalance : balances.rareGems,
    // Keep the original column aligned with normal gems for older integrations.
    gemBalance: gemType === "normal" ? newBalance : balances.normalGems,
  };
}

function balanceResponse(
  user: { id: string; username: string },
  balances: { normalGems: number; rareGems: number },
) {
  return {
    username: user.username,
    userId: user.id,
    normalGems: balances.normalGems,
    rareGems: balances.rareGems,
    gemBalance: balances.normalGems,
  };
}

router.get("/balance", requireApiKey, balanceRateLimiter, async (req, res): Promise<void> => {
  const qp = GetBalanceQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: "username required" });
    return;
  }

  const user = await getOrCreateUser(qp.data.username);
  const balances = await getBalances(user.id);

  res.json(balanceResponse(user, balances));
});

router.post("/earn", requireApiKey, mutationRateLimiter, async (req, res): Promise<void> => {
  const parsed = EarnGemsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, amount, reason } = parsed.data;
  const gemType = parsed.data.gemType ?? "normal";
  const user = await getOrCreateUser(username);
  const balances = await getBalances(user.id);
  const newBalance = getBalanceForType(balances, gemType) + amount;
  const now = new Date();
  const txId = randomUUID();

  await db
    .update(walletsTable)
    .set({ ...getWalletUpdate(balances, gemType, newBalance), updatedAt: now })
    .where(eq(walletsTable.userId, user.id));

  await db.insert(transactionsTable).values({
    id: txId,
    userId: user.id,
    appSource: req.appName!,
    type: "earn",
    gemType,
    amount,
    balanceAfter: newBalance,
    reason: reason ?? null,
    createdAt: now,
  });

  deliverWebhooks(buildEvent("transaction.earn", {
    transactionId: txId,
    userId: user.id,
    username: user.username,
    appSource: req.appName!,
    type: "earn",
    amount,
    balanceAfter: newBalance,
    reason: reason ?? null,
    createdAt: now.toISOString(),
  }));

  res.json(balanceResponse(user, {
    ...balances,
    ...(gemType === "normal" ? { normalGems: newBalance } : { rareGems: newBalance }),
  }));
});

router.post("/spend", requireApiKey, mutationRateLimiter, async (req, res): Promise<void> => {
  const parsed = SpendGemsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, amount, reason } = parsed.data;
  const gemType = parsed.data.gemType ?? "normal";
  const user = await getOrCreateUser(username);
  const balances = await getBalances(user.id);
  const currentBalance = getBalanceForType(balances, gemType);

  if (currentBalance < amount) {
    res.status(400).json({ error: `Insufficient ${gemType} gem balance`, gemType, balance: currentBalance });
    return;
  }

  const newBalance = currentBalance - amount;
  const now = new Date();
  const txId = randomUUID();

  await db
    .update(walletsTable)
    .set({ ...getWalletUpdate(balances, gemType, newBalance), updatedAt: now })
    .where(eq(walletsTable.userId, user.id));

  await db.insert(transactionsTable).values({
    id: txId,
    userId: user.id,
    appSource: req.appName!,
    type: "spend",
    gemType,
    amount,
    balanceAfter: newBalance,
    reason: reason ?? null,
    createdAt: now,
  });

  deliverWebhooks(buildEvent("transaction.spend", {
    transactionId: txId,
    userId: user.id,
    username: user.username,
    appSource: req.appName!,
    type: "spend",
    amount,
    balanceAfter: newBalance,
    reason: reason ?? null,
    createdAt: now.toISOString(),
  }));

  res.json(balanceResponse(user, {
    ...balances,
    ...(gemType === "normal" ? { normalGems: newBalance } : { rareGems: newBalance }),
  }));
});

router.post("/transfer", requireApiKey, mutationRateLimiter, async (req, res): Promise<void> => {
  const parsed = TransferGemsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fromUsername, toUsername, amount, reason } = parsed.data;
  const gemType = parsed.data.gemType ?? "normal";

  if (fromUsername === toUsername) {
    res.status(400).json({ error: "Cannot transfer to self" });
    return;
  }

  const fromUser = await getOrCreateUser(fromUsername);
  const toUser = await getOrCreateUser(toUsername);

  const fromBalances = await getBalances(fromUser.id);
  const fromBalance = getBalanceForType(fromBalances, gemType);
  if (fromBalance < amount) {
    res.status(400).json({ error: "Insufficient balance", gemBalance: fromBalance });
    return;
  }

  const fromNew = fromBalance - amount;
  const toBalances = await getBalances(toUser.id);
  const toBalance = getBalanceForType(toBalances, gemType);
  const toNew = toBalance + amount;
  const now = new Date();
  const appSource = req.appName!;
  const txOutId = randomUUID();
  const txInId = randomUUID();

  await db
    .update(walletsTable)
    .set({ ...getWalletUpdate(fromBalances, gemType, fromNew), updatedAt: now })
    .where(eq(walletsTable.userId, fromUser.id));

  await db
    .update(walletsTable)
    .set({ ...getWalletUpdate(toBalances, gemType, toNew), updatedAt: now })
    .where(eq(walletsTable.userId, toUser.id));

  await db.insert(transactionsTable).values([
    {
      id: txOutId,
      userId: fromUser.id,
      appSource,
      type: "transfer_out",
      gemType,
      amount,
      balanceAfter: fromNew,
      reason: reason ?? null,
      createdAt: now,
    },
    {
      id: txInId,
      userId: toUser.id,
      appSource,
      type: "transfer_in",
      gemType,
      amount,
      balanceAfter: toNew,
      reason: reason ?? null,
      createdAt: now,
    },
  ]);

  deliverWebhooks(buildEvent("transaction.transfer", {
    transactionId: txOutId,
    userId: fromUser.id,
    username: fromUser.username,
    appSource,
    type: "transfer_out",
    gemType,
    amount,
    balanceAfter: fromNew,
    reason: reason ?? null,
    createdAt: now.toISOString(),
  }));

  res.json({
    from: {
      ...balanceResponse(fromUser, {
        ...fromBalances,
        ...(gemType === "normal" ? { normalGems: fromNew } : { rareGems: fromNew }),
      }),
    },
    to: {
      ...balanceResponse(toUser, {
        ...toBalances,
        ...(gemType === "normal" ? { normalGems: toNew } : { rareGems: toNew }),
      }),
    },
  });
});

export default router;
