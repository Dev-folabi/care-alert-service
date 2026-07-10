import { query, param } from "express-validator";

export const validateAlertQuery = [
  query("patientId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("patientId filter cannot be empty"),

  query("severity")
    .optional()
    .trim()
    .isIn(["low", "medium", "high"])
    .withMessage("severity must be 'low', 'medium', or 'high'"),

  query("status")
    .optional()
    .trim()
    .isIn(["pending", "active", "suppressed"])
    .withMessage("status must be 'pending', 'active', or 'suppressed'"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100"),
];

export const validateAlertId = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Alert ID is required")
    .isUUID()
    .withMessage("Alert ID must be a valid UUID"),
];
