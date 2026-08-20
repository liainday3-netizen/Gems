import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, treasuryTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router: IRouter = Router();
const TREASURY_ID = "primary";

async function ensureTreasury() {
  await db
    .insert(treasuryTable)
    .values({ id: TREASURY_ID, backingAmount: "0" })
    .onConflictDoNothing();

  const [treasury] = await db
    .select()
    .from(treasuryTable)
    .where(eq(treasuryTable.id, TREASURY_ID));

  return treasury;
}

function serializeTreasury(treasury: typeof treasuryTable.$inferSelect) {
  return {
    id: treasury.id,
    backingAmount: Number(treasury.backingAmount),
    updatedAt: treasury.updatedAt.toISOString(),
  };
}

router.get("/treasury", async (_req, res): Promise<void> => {
  const treasury = await ensureTreasury();
  res.json(serializeTreasury(treasury));
});

// This is an internal admin operation. Consumer conversion uses the API-key-protected
// route in conversion.ts and can never increase backing.
router.post("/treasury/adjust", async (req, res): Promise<void> => {
  const { operation, amount, reason } = req.body as {
    operation?: unknown;
    amount?: unknown;
    reason?: unknown;
  };

  if (operation !== "increase" && operation !== "decrease") {
    res.status(400).json({ error: "operation must be increase or decrease" });
    return;
  }

  const numericAmount = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    res.status(400).json({ error: "amount must be a positive number" });
    return;
  }

  const updated = await db.transaction(async (tx) => {
    await tx
      .insert(treasuryTable)
      .values({ id: TREASURY_ID, backingAmount: "0" })
      .onConflictDoNothing();

    const [current] = await tx
      .select()
      .from(treasuryTable)
      .where(eq(treasuryTable.id, TREASURY_ID))
      .for("update");

    const currentAmount = Number(current.backingAmount);
    const nextAmount =
      operation === "increase"
        ? currentAmount + numericAmount
        : currentAmount - numericAmount;

    if (nextAmount < 0) return null;

    const now = new Date();
    const [row] = await tx
      .update(treasuryTable)
      .set({ backingAmount: nextAmount.toFixed(2), updatedAt: now })
      .where(eq(treasuryTable.id, TREASURY_ID))
      .returning();

    return row;
  });

  if (!updated) {
    res.status(400).json({ error: "Treasury backing cannot go below zero" });
    return;
  }

  res.json({
    ...serializeTreasury(updated),
    reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
    adjustmentId: randomUUID(),
  });
});

export { TREASURY_ID };
export default router;