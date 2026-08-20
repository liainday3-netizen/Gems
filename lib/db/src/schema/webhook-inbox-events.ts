import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const webhookInboxEventsTable = pgTable("webhook_inbox_events", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  event: text("event").notNull(),
  payload: text("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WebhookInboxEvent = typeof webhookInboxEventsTable.$inferSelect;