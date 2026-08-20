import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, usersTable, walletsTable, transactionsTable, treasuryTable } from "@workspace/db";
import { randomUUID } from "crypto";
import {
  ListTransactionsQueryParams,
  ListTransactionsResponse,
  CreateTransactionBody,
  GetTransactionSummaryResponse,
} from "@workspace/api-zod";
import { buildEvent, deliverWebhooks } from "../lib/webhookDelivery";
import { type GemType } from "../lib/conversionRates";

const router: IRouter = Router();

router.get("/transactions/summary", async (_req, res): Promise<void> => {
  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);

  const [walletSum] = await db
    .select({
      normal: sql<number>`coalesce(sum(coalesce(normal_gems, gem_balance)),0)::int`,
      rare: sql<number>`coalesce(sum(rare_gems),0)::int`,
    })
    .from(walletsTable);

  const [txCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactionsTable);

  const [conversionCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactionsTable)
    .where(eq(transactionsTable.type, "convert"));

  await db
    .insert(treasuryTable)
    .values({ id: "primary", backingAmount: "0" })
    .onConflictDoNothing();
  const [treasury] = await db
    .select({ backingAmount: treasuryTable.backingAmount })
    .from(treasuryTable)
    .where(eq(treasuryTable.id, "primary"));

  const appStats = await db
    .select({
      appSource: transactionsTable.appSource,
      transactionCount: sql<number>`count(*)::int`,
      totalCredited: sql<number>`coalesce(sum(case when type='credit' then amount else 0 end),0)::int`,
      totalDebited: sql<number>`coalesce(sum(case when type='debit' then amount else 0 end),0)::int`,
    })
    .from(transactionsTable)
    .groupBy(transactionsTable.appSource);

  res.json(
    GetTransactionSummaryResponse.parse({
      totalUsers: userCount?.count ?? 0,
      totalGemsInCirculation: (walletSum?.normal ?? 0) + (walletSum?.rare ?? 0),
      totalNormalGems: walletSum?.normal ?? 0,
      totalRareGems: walletSum?.rare ?? 0,
      totalTransactions: txCount?.count ?? 0,
      totalConversions: conversionCount?.count ?? 0,
      treasuryBacking: Number(treasury?.backingAmount ?? 0),
      transactionsByApp: appStats,
    })
  );
});

router.get("/transactions", async (req, res): Promise<void> => {
  const qp = ListTransactionsQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  const { userId, appSource, limit } = qp.data;

  const conditions = [];
  if (userId) conditions.push(eq(transactionsTable.userId, userId));
  if (appSource) conditions.push(eq(transactionsTable.appSource, appSource));

  const rows = await db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      username: usersTable.username,
      appSource: transactionsTable.appSource,
      type: transactionsTable.type,
      gemType: transactionsTable.gemType,
      amount: transactionsTable.amount,
      balanceAfter: transactionsTable.balanceAfter,
      reason: transactionsTable.reason,
      createdAt: transactionsTable.createdAt,
    })
    .from(transactionsTable)
    .innerJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit ?? 50);

  const result = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    username: r.username,
    appSource: r.appSource,
    type: r.type,
      gemType: r.gemType,
    amount: r.amount,
    balanceAfter: r.balanceAfter,
    reason: r.reason ?? null,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(ListTransactionsResponse.parse(result));
});

router.post("/transactions", async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, appSource, type, amount, reason } = parsed.data;
  const gemType = parsed.data.gemType ?? "normal";

  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (userRows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const walletRows = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  if (walletRows.length === 0) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const currentNormal = walletRows[0].normalGems ?? walletRows[0].gemBalance;
  const currentRare = walletRows[0].rareGems ?? 0;
  const currentBalance = gemType === "rare" ? currentRare : currentNormal;
  let newBalance: number;

  if (type === "credit") {
    newBalance = currentBalance + amount;
  } else {
    newBalance = currentBalance - amount;
    if (newBalance < 0) {
      res.status(400).json({ error: "Insufficient gem balance" });
      return;
    }
  }

  const now = new Date();
  const txId = randomUUID();

  await db
    .update(walletsTable)
    .set({
      gemBalance: gemType === "normal" ? newBalance : currentNormal,
      normalGems: gemType === "normal" ? newBalance : currentNormal,
      rareGems: gemType === "rare" ? newBalance : currentRare,
      updatedAt: now,
    })
    .where(eq(walletsTable.userId, userId));

  await db.insert(transactionsTable).values({
    id: txId,
    userId,
    appSource,
    type,
    gemType,
    amount,
    balanceAfter: newBalance,
    reason: reason ?? null,
    createdAt: now,
  });

  const eventType = type === "credit" ? "transaction.credit" : "transaction.debit";
  deliverWebhooks(buildEvent(eventType, {
    transactionId: txId,
    userId,
    username: userRows[0].username,
    appSource,
    type,
    gemType,
    amount,
    balanceAfter: newBalance,
    reason: reason ?? null,
    createdAt: now.toISOString(),
  }));

  res.status(201).json({
    id: txId,
    userId,
    username: userRows[0].username,
    appSource,
    type,
    amount,
    balanceAfter: newBalance,
    reason: reason ?? null,
    createdAt: now.toISOString(),
  });
});

export default router;
