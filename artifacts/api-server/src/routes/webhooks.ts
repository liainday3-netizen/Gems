import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, webhookEndpointsTable, webhookDeliveryLogsTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function isValidUrl(s: unknown): s is string {
  if (typeof s !== "string" || !s.startsWith("http")) return false;
  try { new URL(s); return true; } catch { return false; }
}

router.get("/webhooks", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: webhookEndpointsTable.id,
      url: webhookEndpointsTable.url,
      active: webhookEndpointsTable.active,
      createdAt: webhookEndpointsTable.createdAt,
    })
    .from(webhookEndpointsTable)
    .orderBy(desc(webhookEndpointsTable.createdAt));

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/webhooks", async (req, res): Promise<void> => {
  const { url } = req.body as { url?: unknown };
  if (!isValidUrl(url)) {
    res.status(400).json({ error: "url is required and must be a valid HTTP/HTTPS URL" });
    return;
  }

  const id = randomUUID();
  const secret = `glkw_${randomUUID().replace(/-/g, "")}`;

  await db.insert(webhookEndpointsTable).values({ id, url, secret, active: true });

  const [row] = await db
    .select()
    .from(webhookEndpointsTable)
    .where(eq(webhookEndpointsTable.id, id));

  res.status(201).json({
    id: row.id,
    url: row.url,
    secret: row.secret,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  });
});

router.patch("/webhooks/:id", async (req, res): Promise<void> => {
  const { active } = req.body as { active?: unknown };
  if (typeof active !== "boolean") {
    res.status(400).json({ error: "active (boolean) is required" });
    return;
  }

  const rows = await db
    .select({ id: webhookEndpointsTable.id })
    .from(webhookEndpointsTable)
    .where(eq(webhookEndpointsTable.id, req.params.id));

  if (rows.length === 0) {
    res.status(404).json({ error: "Webhook endpoint not found" });
    return;
  }

  await db
    .update(webhookEndpointsTable)
    .set({ active })
    .where(eq(webhookEndpointsTable.id, req.params.id));

  res.json({ id: req.params.id, active });
});

router.delete("/webhooks/:id", async (req, res): Promise<void> => {
  await db.delete(webhookEndpointsTable).where(eq(webhookEndpointsTable.id, req.params.id));
  res.status(204).end();
});

router.get("/webhooks/:id/deliveries", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: webhookDeliveryLogsTable.id,
      event: webhookDeliveryLogsTable.event,
      statusCode: webhookDeliveryLogsTable.statusCode,
      responseTimeMs: webhookDeliveryLogsTable.responseTimeMs,
      success: webhookDeliveryLogsTable.success,
      createdAt: webhookDeliveryLogsTable.createdAt,
    })
    .from(webhookDeliveryLogsTable)
    .where(eq(webhookDeliveryLogsTable.webhookEndpointId, req.params.id))
    .orderBy(desc(webhookDeliveryLogsTable.createdAt))
    .limit(50);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

export default router;
