import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, usersTable, walletsTable, transactionsTable } from "@workspace/db";
import { randomUUID } from "crypto";
import {
  ListTransactionsQueryParams,
  ListTransactionsResponse,
  CreateTransactionBody,
  GetTransactionSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/transactions/summary", async (_req, res): Promise<void> => {
  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);

  const [walletSum] = await db
    .select({ total: sql<number>`coalesce(sum(gem_balance),0)::int` })
    .from(walletsTable);

  const [txCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactionsTable);

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
      totalGemsInCirculation: walletSum?.total ?? 0,
      totalTransactions: txCount?.count ?? 0,
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

  const currentBalance = walletRows[0].gemBalance;
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
    .set({ gemBalance: newBalance, updatedAt: now })
    .where(eq(walletsTable.userId, userId));

  await db.insert(transactionsTable).values({
    id: txId,
    userId,
    appSource,
    type,
    amount,
    balanceAfter: newBalance,
    reason: reason ?? null,
    createdAt: now,
  });

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
