import { Request, Response, NextFunction } from "express";
import { verifyHmacSignature } from "../utils/crypto";
import { env } from "../config/env";

/**
 * HMAC signature verification middleware.
 */
export const hmacGuard = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers["x-webhook-signature"] as string | undefined;

  if (!signature) {
    res
      .status(401)
      .json({
        success: false,
        message: "Missing webhook signature",
        data: null,
      });
    return;
  }

  const rawBody = (req as any).rawBody;

  if (!rawBody) {
    res
      .status(401)
      .json({ success: false, message: "Missing request body", data: null });
    return;
  }

  const isValid = verifyHmacSignature(rawBody, env.WEBHOOK_SECRET, signature);

  if (!isValid) {
    res
      .status(401)
      .json({
        success: false,
        message: "Invalid webhook signature",
        data: null,
      });
    return;
  }

  next();
};
