import { rateLimit } from "express-rate-limit";
import type { Request } from "express";

function keyByApiKey(req: Request): string {
  return req.header("x-api-key") ?? req.ip ?? "unknown";
}

function tooManyRequestsHandler(_req: Request, res: any): void {
  res.status(429).json({
    error: "Rate limit exceeded",
    message: "Too many requests from this API key. Slow down and retry after the window resets.",
  });
}

export const balanceRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  keyGenerator: keyByApiKey,
  handler: tooManyRequestsHandler,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: undefined,
});

export const mutationRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  keyGenerator: keyByApiKey,
  handler: tooManyRequestsHandler,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: undefined,
});
