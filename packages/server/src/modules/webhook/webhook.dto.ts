import { body } from "express-validator";

export const validateWebhook = [
  body("eventId")
    .trim()
    .notEmpty()
    .withMessage("eventId is required")
    .isLength({ max: 255 })
    .withMessage("eventId must be at most 255 characters"),

  body("deviceId")
    .trim()
    .notEmpty()
    .withMessage("deviceId is required")
    .isLength({ max: 255 })
    .withMessage("deviceId must be at most 255 characters"),

  body("patientId")
    .trim()
    .notEmpty()
    .withMessage("patientId is required")
    .isLength({ max: 255 })
    .withMessage("patientId must be at most 255 characters"),

  body("severity")
    .notEmpty()
    .withMessage("severity is required")
    .isIn(["low", "medium", "high"])
    .withMessage("severity must be 'low', 'medium', or 'high'"),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("message is required")
    .isLength({ max: 2000 })
    .withMessage("message must be at most 2000 characters"),

  body("triggeredAt")
    .notEmpty()
    .withMessage("triggeredAt is required")
    .isISO8601()
    .withMessage("triggeredAt must be a valid ISO 8601 date"),
];
