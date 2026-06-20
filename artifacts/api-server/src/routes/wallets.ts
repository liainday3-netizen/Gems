import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, walletsTable } from "@workspace/db";
import {
  GetWalletParams,
  ListWalletsResponse,
  GetWalletResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/wallets", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      userId: walletsTable.userId,
      username: usersTable.username,
      gemBalance: walletsTable.gemBalance,
      updatedAt: walletsTable.updatedAt,
    })
    .from(walletsTable)
    .innerJoin(usersTable, eq(walletsTable.userId, usersTable.id))
    .orderBy(walletsTable.gemBalance);

  const result = rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    gemBalance: r.gemBalance,
    updatedAt: r.updatedAt.toISOString(),
  }));

  res.json(ListWalletsResponse.parse(result));
});

router.get("/wallets/:userId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const params = GetWalletParams.safeParse({ userId: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      userId: walletsTable.userId,
      username: usersTable.username,
      gemBalance: walletsTable.gemBalance,
      updatedAt: walletsTable.updatedAt,
    })
    .from(walletsTable)
    .innerJoin(usersTable, eq(walletsTable.userId, usersTable.id))
    .where(eq(walletsTable.userId, params.data.userId));

  if (rows.length === 0) {
    res.status(404).json({ error: "Wallet not found" });
    return;
  }

  const r = rows[0];
  res.json(
    GetWalletResponse.parse({
      userId: r.userId,
      username: r.username,
      gemBalance: r.gemBalance,
      updatedAt: r.updatedAt.toISOString(),
    })
  );
});

export default router;
