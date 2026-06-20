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
  await db.insert(walletsTable).values({ userId: id, gemBalance: 0, updatedAt: now });
  return { id, username };
}

async function getBalance(userId: string): Promise<number> {
  const [w] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  return w?.gemBalance ?? 0;
}

router.get("/balance", requireApiKey, balanceRateLimiter, async (req, res): Promise<void> => {
  const qp = GetBalanceQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: "username required" });
    return;
  }

  const user = await getOrCreateUser(qp.data.username);
  const balance = await getBalance(user.id);

  res.json({ username: user.username, userId: user.id, gemBalance: balance });
});

router.post("/earn", requireApiKey, mutationRateLimiter, async (req, res): Promise<void> => {
  const parsed = EarnGemsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, amount, reason } = parsed.data;
  const user = await getOrCreateUser(username);
  const currentBalance = await getBalance(user.id);
  const newBalance = currentBalance + amount;
  const now = new Date();

  await db
    .update(walletsTable)
    .set({ gemBalance: newBalance, updatedAt: now })
    .where(eq(walletsTable.userId, user.id));

  await db.insert(transactionsTable).values({
    id: randomUUID(),
    userId: user.id,
    appSource: req.appName!,
    type: "earn",
    amount,
    balanceAfter: newBalance,
    reason: reason ?? null,
    createdAt: now,
  });

  res.json({ username: user.username, userId: user.id, gemBalance: newBalance });
});

router.post("/spend", requireApiKey, mutationRateLimiter, async (req, res): Promise<void> => {
  const parsed = SpendGemsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, amount, reason } = parsed.data;
  const user = await getOrCreateUser(username);
  const currentBalance = await getBalance(user.id);

  if (currentBalance < amount) {
    res.status(400).json({ error: "Insufficient balance", gemBalance: currentBalance });
    return;
  }

  const newBalance = currentBalance - amount;
  const now = new Date();

  await db
    .update(walletsTable)
    .set({ gemBalance: newBalance, updatedAt: now })
    .where(eq(walletsTable.userId, user.id));

  await db.insert(transactionsTable).values({
    id: randomUUID(),
    userId: user.id,
    appSource: req.appName!,
    type: "spend",
    amount,
    balanceAfter: newBalance,
    reason: reason ?? null,
    createdAt: now,
  });

  res.json({ username: user.username, userId: user.id, gemBalance: newBalance });
});

router.post("/transfer", requireApiKey, mutationRateLimiter, async (req, res): Promise<void> => {
  const parsed = TransferGemsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fromUsername, toUsername, amount, reason } = parsed.data;

  if (fromUsername === toUsername) {
    res.status(400).json({ error: "Cannot transfer to self" });
    return;
  }

  const fromUser = await getOrCreateUser(fromUsername);
  const toUser = await getOrCreateUser(toUsername);

  const fromBalance = await getBalance(fromUser.id);
  if (fromBalance < amount) {
    res.status(400).json({ error: "Insufficient balance", gemBalance: fromBalance });
    return;
  }

  const fromNew = fromBalance - amount;
  const toBalance = await getBalance(toUser.id);
  const toNew = toBalance + amount;
  const now = new Date();
  const appSource = req.appName!;

  await db
    .update(walletsTable)
    .set({ gemBalance: fromNew, updatedAt: now })
    .where(eq(walletsTable.userId, fromUser.id));

  await db
    .update(walletsTable)
    .set({ gemBalance: toNew, updatedAt: now })
    .where(eq(walletsTable.userId, toUser.id));

  await db.insert(transactionsTable).values([
    {
      id: randomUUID(),
      userId: fromUser.id,
      appSource,
      type: "transfer_out",
      amount,
      balanceAfter: fromNew,
      reason: reason ?? null,
      createdAt: now,
    },
    {
      id: randomUUID(),
      userId: toUser.id,
      appSource,
      type: "transfer_in",
      amount,
      balanceAfter: toNew,
      reason: reason ?? null,
      createdAt: now,
    },
  ]);

  res.json({
    from: { username: fromUser.username, userId: fromUser.id, gemBalance: fromNew },
    to: { username: toUser.username, userId: toUser.id, gemBalance: toNew },
  });
});

export default router;
