import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const webhookDeliveryLogsTable = pgTable("webhook_delivery_logs", {
  id: text("id").primaryKey(),
  webhookEndpointId: text("webhook_endpoint_id").notNull(),
  event: text("event").notNull(),
  statusCode: integer("status_code"),
  responseTimeMs: integer("response_time_ms"),
  success: boolean("success").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WebhookDeliveryLog = typeof webhookDeliveryLogsTable.$inferSelect;
