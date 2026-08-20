import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, walletsTable, transactionsTable, treasuryTable } from "@workspace/db";
import { randomUUID } from "crypto";
import { ConvertGemsBody } from "@workspace/api-zod";
import { requireApiKey } from "../middleware/requireApiKey";
import { mutationRateLimiter } from "../middleware/rateLimiter";
import { buildEvent, deliverWebhooks } from "../lib/webhookDelivery";
import { getConversionRate, type GemType } from "../lib/conversionRates";

const router: IRouter = Router();
const TREASURY_ID = "primary";

async function getOrCreateUser(username: string): Promise<{ id: string; username: string }> {
  const [existing] = await db
    .select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (existing) return existing;

  const id = randomUUID();
  const now = new Date();
  await db.insert(usersTable).values({ id, username, createdAt: now });
  await db
    .insert(walletsTable)
    .values({ userId: id, gemBalance: 0, normalGems: 0, rareGems: 0, updatedAt: now });
  return { id, username };
}

router.post("/convert", requireApiKey, mutationRateLimiter, async (req, res): Promise<void> => {
  const parsed = ConvertGemsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, gemType, amount, targetToken } = parsed.data;
  const rate = getConversionRate(gemType as GemType);

  if (amount % rate !== 0) {
    res.status(400).json({
      error: `amount must be a multiple of ${rate} ${gemType} gems`,
      gemType,
      conversionRate: rate,
    });
    return;
  }

  const poolAmount = amount / rate;
  const user = await getOrCreateUser(username);

  const result = await db.transaction(async (tx) => {
    await tx
      .insert(treasuryTable)
      .values({ id: TREASURY_ID, backingAmount: "0" })
      .onConflictDoNothing();

    const [treasury] = await tx
      .select()
      .from(treasuryTable)
      .where(eq(treasuryTable.id, TREASURY_ID))
      .for("update");
    const backingAmount = Number(treasury.backingAmount);

    if (backingAmount < poolAmount) {
      return { error: "Treasury backing is insufficient", backingAmount };
    }

    const [wallet] = await tx
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, user.id))
      .for("update");

    const normalGems = wallet.normalGems ?? wallet.gemBalance;
    const rareGems = wallet.rareGems ?? 0;
    const currentBalance = gemType === "rare" ? rareGems : normalGems;
    if (currentBalance < amount) {
      return { error: `Insufficient ${gemType} gem balance`, balance: currentBalance };
    }

    const nextNormalGems = gemType === "normal" ? normalGems - amount : normalGems;
    const nextRareGems = gemType === "rare" ? rareGems - amount : rareGems;
    const nextBacking = Number((backingAmount - poolAmount).toFixed(2));
    const now = new Date();
    const transactionId = randomUUID();

    await tx
      .update(walletsTable)
      .set({
        gemBalance: nextNormalGems,
        normalGems: nextNormalGems,
        rareGems: nextRareGems,
        updatedAt: now,
      })
      .where(eq(walletsTable.userId, user.id));

    await tx
      .update(treasuryTable)
      .set({ backingAmount: nextBacking.toFixed(2), updatedAt: now })
      .where(eq(treasuryTable.id, TREASURY_ID));

    await tx.insert(transactionsTable).values({
      id: transactionId,
      userId: user.id,
      appSource: req.appName!,
      type: "convert",
      gemType,
      amount,
      balanceAfter: gemType === "rare" ? nextRareGems : nextNormalGems,
      reason: `Converted ${amount} ${gemType} gems to ${poolAmount} $POOL`,
      createdAt: now,
    });

    return {
      transactionId,
      normalGems: nextNormalGems,
      rareGems: nextRareGems,
      treasuryBacking: nextBacking,
    };
  });

  if ("error" in result) {
    res.status(400).json(result);
    return;
  }

  deliverWebhooks(
    buildEvent("transaction.convert", {
      transactionId: result.transactionId,
      userId: user.id,
      username: user.username,
      appSource: req.appName!,
      type: "convert",
      gemType,
      amount,
      balanceAfter: gemType === "rare" ? result.rareGems : result.normalGems,
      reason: `Converted ${amount} ${gemType} gems to ${poolAmount} $POOL`,
      poolAmount,
      targetToken,
      treasuryBacking: result.treasuryBacking,
      createdAt: new Date().toISOString(),
    }),
  );

  res.json({
    username: user.username,
    userId: user.id,
    gemType,
    amount,
    targetToken,
    poolAmount,
    normalGems: result.normalGems,
    rareGems: result.rareGems,
    treasuryBacking: result.treasuryBacking,
    transactionId: result.transactionId,
  });
});

export default router;