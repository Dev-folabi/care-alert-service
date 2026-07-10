import { Request, Response, NextFunction } from "express";
import { ingestAlert, WebhookPayload } from "./webhook.service";

export const ingestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
    res
      .status(result.status)
      .json({
        success: true,
        message: result.data.message,
        data: result.data.alert,
      });
  } catch (err) {
    next(err);
  }
};
