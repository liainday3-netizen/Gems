import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const webhookEndpointsTable = pgTable("webhook_endpoints", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WebhookEndpoint = typeof webhookEndpointsTable.$inferSelect;
