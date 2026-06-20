import type { Request, Response, NextFunction } from "express";
import { db, apiKeysTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      appName?: string;
    }
  }
}

export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const key = req.header("x-api-key");
  if (!key) {
    res.status(401).json({ error: "Missing x-api-key header" });
    return;
  }

  const [row] = await db
    .select()
    .from(apiKeysTable)
    .where(eq(apiKeysTable.key, key));

  if (!row || !row.active) {
    res.status(403).json({ error: "Invalid or inactive API key" });
    return;
  }

  req.appName = row.appName;
  next();
}
