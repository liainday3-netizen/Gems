import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, webhookInboxEventsTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function isValidSlug(value: string): boolean {
  return /^[a-z0-9-]{1,80}$/.test(value);
}

router.post("/webhook-inbox/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  if (!isValidSlug(slug)) {
    res.status(400).json({ error: "Invalid inbox name" });
    return;
  }

  const payload = JSON.stringify(req.body ?? {});
  const event = req.header("x-gem-event") ?? "unknown";
  await db.insert(webhookInboxEventsTable).values({
    id: randomUUID(),
    slug,
    event,
    payload,
  });

  res.status(200).json({ received: true });
});

router.get("/webhook-inbox/:slug/events", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  if (!isValidSlug(slug)) {
    res.status(400).json({ error: "Invalid inbox name" });
    return;
  }

  const rows = await db
    .select()
    .from(webhookInboxEventsTable)
    .where(eq(webhookInboxEventsTable.slug, slug))
    .orderBy(desc(webhookInboxEventsTable.createdAt))
    .limit(25);

  res.json(rows.map((row) => ({
    id: row.id,
    event: row.event,
    payload: JSON.parse(row.payload),
    createdAt: row.createdAt.toISOString(),
  })));
});

export default router;