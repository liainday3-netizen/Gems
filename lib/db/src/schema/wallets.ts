import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const walletsTable = pgTable("wallets", {
  userId: text("user_id").primaryKey(),
  // Kept in sync with normalGems for backwards compatibility with older clients.
  gemBalance: integer("gem_balance").notNull().default(0),
  normalGems: integer("normal_gems").notNull().default(0),
  rareGems: integer("rare_gems").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable);
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
