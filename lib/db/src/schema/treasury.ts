import { numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const treasuryTable = pgTable("treasury", {
  id: text("id").primaryKey(),
  backingAmount: numeric("backing_amount", { precision: 20, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Treasury = typeof treasuryTable.$inferSelect;