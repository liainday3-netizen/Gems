import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, apiKeysTable } from "@workspace/db";
import { randomUUID } from "crypto";
import {
  CreateApiKeyBody,
  UpdateApiKeyParams,
  UpdateApiKeyBody,
  DeleteApiKeyParams,
  ListApiKeysResponse,
  UpdateApiKeyResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/api-keys", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(apiKeysTable)
    .orderBy(apiKeysTable.createdAt);

  const result = rows.map((r) => ({
    key: r.key,
    appName: r.appName,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json(ListApiKeysResponse.parse(result));
});

router.post("/api-keys", async (req, res): Promise<void> => {
  const parsed = CreateApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { appName } = parsed.data;
  const key = `glk_${randomUUID().replace(/-/g, "")}`;
  const now = new Date();

  await db.insert(apiKeysTable).values({
    key,
    appName,
    active: true,
    createdAt: now,
  });

  res.status(201).json({
    key,
    appName,
    active: true,
    createdAt: now.toISOString(),
  });
});

router.patch("/api-keys/:key", async (req, res): Promise<void> => {
  const rawKey = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
  const params = UpdateApiKeyParams.safeParse({ key: rawKey });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(apiKeysTable)
    .set({ active: parsed.data.active })
    .where(eq(apiKeysTable.key, params.data.key))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  res.json(
    UpdateApiKeyResponse.parse({
      key: updated.key,
      appName: updated.appName,
      active: updated.active,
      createdAt: updated.createdAt.toISOString(),
    })
  );
});

router.delete("/api-keys/:key", async (req, res): Promise<void> => {
  const rawKey = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
  const params = DeleteApiKeyParams.safeParse({ key: rawKey });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(apiKeysTable)
    .where(eq(apiKeysTable.key, params.data.key))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
