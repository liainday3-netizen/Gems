import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, walletsTable } from "@workspace/db";
import { randomUUID } from "crypto";
import {
  CreateUserBody,
  GetUserParams,
  ListUsersResponse,
  GetUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      createdAt: usersTable.createdAt,
      gemBalance: walletsTable.gemBalance,
      walletUpdatedAt: walletsTable.updatedAt,
    })
    .from(usersTable)
    .leftJoin(walletsTable, eq(usersTable.id, walletsTable.userId))
    .orderBy(usersTable.createdAt);

  const result = rows.map((r) => ({
    id: r.id,
    username: r.username,
    createdAt: r.createdAt.toISOString(),
    gemBalance: r.gemBalance ?? 0,
    walletUpdatedAt: r.walletUpdatedAt ? r.walletUpdatedAt.toISOString() : r.createdAt.toISOString(),
  }));

  res.json(ListUsersResponse.parse(result));
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username } = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (existing.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const id = randomUUID();
  const now = new Date();

  await db.insert(usersTable).values({ id, username, createdAt: now });
  await db.insert(walletsTable).values({ userId: id, gemBalance: 0, updatedAt: now });

  res.status(201).json(
    GetUserResponse.parse({
      id,
      username,
      createdAt: now.toISOString(),
      gemBalance: 0,
      walletUpdatedAt: now.toISOString(),
    })
  );
});

router.get("/users/:userId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const params = GetUserParams.safeParse({ userId: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      createdAt: usersTable.createdAt,
      gemBalance: walletsTable.gemBalance,
      walletUpdatedAt: walletsTable.updatedAt,
    })
    .from(usersTable)
    .leftJoin(walletsTable, eq(usersTable.id, walletsTable.userId))
    .where(eq(usersTable.id, params.data.userId));

  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const r = rows[0];
  res.json(
    GetUserResponse.parse({
      id: r.id,
      username: r.username,
      createdAt: r.createdAt.toISOString(),
      gemBalance: r.gemBalance ?? 0,
      walletUpdatedAt: r.walletUpdatedAt ? r.walletUpdatedAt.toISOString() : r.createdAt.toISOString(),
    })
  );
});

export default router;
