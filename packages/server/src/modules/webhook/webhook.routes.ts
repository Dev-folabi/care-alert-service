import { Router } from "express";
import { validateWebhook } from "./webhook.dto.js";
import { ingestHandler } from "./webhook.controller.js";
import { hmacGuard } from "../../middleware/hmac.js";
import { validate } from "../../middleware/validate.js";

const router = Router();

/**
 * POST /api/webhooks/alerts
 *
 * Ingest an alert event from a monitoring provider.
 * Pipeline: HMAC verification → validation → ingestion
 */
router.post(
  "/alerts",
  hmacGuard,
  validateWebhook,
  validate,
  ingestHandler
);

export default router;
