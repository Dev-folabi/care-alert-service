import { Request, Response, NextFunction } from "express";
import { ingestAlert, WebhookPayload } from "./webhook.service.js";

export async function ingestHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const payload: WebhookPayload = {
      eventId: req.body.eventId,
      deviceId: req.body.deviceId,
      patientId: req.body.patientId,
      severity: req.body.severity,
      message: req.body.message,
      triggeredAt: req.body.triggeredAt,
    };

    const result = await ingestAlert(payload);

    res.status(result.status).json(result.data);
  } catch (err) {
    next(err);
  }
}
