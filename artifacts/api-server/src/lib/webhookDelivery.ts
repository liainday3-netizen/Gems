import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, webhookEndpointsTable, webhookDeliveryLogsTable } from "@workspace/db";

export interface WebhookEventData {
  transactionId: string;
  userId: string;
  username: string;
  appSource: string;
  type: string;
  gemType?: "normal" | "rare";
  amount: number;
  balanceAfter: number;
  reason: string | null;
  poolAmount?: number;
  targetToken?: string;
  treasuryBacking?: number;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  event: string;
  timestamp: number;
  data: WebhookEventData;
}

export function buildEvent(
  eventType: string,
  data: WebhookEventData,
): WebhookEvent {
  return {
    id: `evt_${data.transactionId.replace(/-/g, "")}`,
    event: eventType,
    timestamp: Math.floor(Date.now() / 1000),
    data,
  };
}

export function deliverWebhooks(event: WebhookEvent): void {
  setImmediate(async () => {
    let endpoints: { id: string; url: string; secret: string }[];
    try {
      endpoints = await db
        .select({
          id: webhookEndpointsTable.id,
          url: webhookEndpointsTable.url,
          secret: webhookEndpointsTable.secret,
        })
        .from(webhookEndpointsTable)
        .where(eq(webhookEndpointsTable.active, true));
    } catch {
      return;
    }

    const body = JSON.stringify(event);
    const timestamp = event.timestamp.toString();

    for (const endpoint of endpoints) {
      const sig = createHmac("sha256", endpoint.secret)
        .update(`${timestamp}.${body}`)
        .digest("hex");

      const start = Date.now();
      let statusCode: number | null = null;
      let success = false;

      try {
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Gem-Signature": `sha256=${sig}`,
            "X-Gem-Timestamp": timestamp,
            "X-Gem-Event": event.event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        statusCode = res.status;
        success = res.ok;
      } catch {
        // Network error or timeout — statusCode stays null, success stays false
      }

      const responseTimeMs = Date.now() - start;

      db.insert(webhookDeliveryLogsTable).values({
        id: randomUUID(),
        webhookEndpointId: endpoint.id,
        event: event.event,
        statusCode,
        responseTimeMs,
        success,
      }).catch(() => {
        // Don't let a log write failure surface anywhere
      });
    }
  });
}
