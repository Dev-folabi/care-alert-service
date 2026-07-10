import { Router } from "express";
import { validateAlertQuery, validateAlertId } from "./alert.dto";
import { listAlerts, listMyAlerts, getAlert } from "./alert.controller";
import { authGuard } from "../../middleware/auth";
import { rbacGuard } from "../../middleware/rbac";
import { validate } from "../../middleware/validate";
import { Role } from "@prisma/client";

const router = Router();

/**
 * GET /api/alerts
 * Clinician-only: list all alerts across all patients.
 */
router.get(
  "/",
  authGuard,
  rbacGuard([Role.CLINICIAN]),
  validateAlertQuery,
  validate,
  listAlerts,
);

/**
 * GET /api/alerts/mine
 * Patient-only: list alerts for the authenticated patient.
 */
router.get(
  "/mine",
  authGuard,
  rbacGuard([Role.PATIENT]),
  validateAlertQuery,
  validate,
  listMyAlerts,
);

/**
 * GET /api/alerts/:id
 * Both roles: get a single alert.
 */
router.get("/:id", authGuard, validateAlertId, validate, getAlert);

export default router;
