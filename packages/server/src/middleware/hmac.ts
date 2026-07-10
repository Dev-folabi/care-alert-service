import { Request, Response, NextFunction } from "express";
import { verifyHmacSignature } from "../utils/crypto.js";
import { env } from "../config/env.js";

/**
 * HMAC signature verification middleware.
 *
 * Expects:
 *   - Header: X-Webhook-Signature with value "sha256=<hex>"
 *   - Raw request body (preserved via express.json verify callback)
 *
 * Rejects with 401 if:
 *   - Signature header is missing
 *   - Signature format is invalid
 *   - Signature does not match computed HMAC
 */
export function hmacGuard(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers["x-webhook-signature"] as string | undefined;

  if (!signature) {
    res.status(401).json({
      error: "Missing webhook signature",
      message: "X-Webhook-Signature header is required",
    });
    return;
  }

  // rawBody is attached by express.json({ verify }) in app.ts
  const rawBody = (req as any).rawBody;

  if (!rawBody) {
    res.status(401).json({
      error: "Cannot verify signature",
      message: "Raw request body not available",
    });
    return;
  }

  const isValid = verifyHmacSignature(rawBody, env.WEBHOOK_SECRET, signature);

  if (!isValid) {
    res.status(401).json({
      error: "Invalid signature",
      message: "Webhook signature verification failed",
    });
    return;
  }

  next();
}
