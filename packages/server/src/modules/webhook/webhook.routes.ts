import { Router } from "express";
import { validateWebhook } from "./webhook.dto";
import { ingestHandler } from "./webhook.controller";
import { hmacGuard } from "../../middleware/hmac";
import { validate } from "../../middleware/validate";

const router = Router();

/**
 * POST /api/webhooks/alerts
 */
router.post("/alerts", hmacGuard, validateWebhook, validate, ingestHandler);

export default router;
