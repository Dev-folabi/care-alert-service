import { Router } from "express";
import { validateAlertQuery, validateAlertId } from "./alert.dto.js";
import { listAlerts, listMyAlerts, getAlert } from "./alert.controller.js";
import { authGuard } from "../../middleware/auth.js";
import { rbacGuard } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { Role } from "@prisma/client";

const router = Router();

/**
 * GET /api/alerts
 * Clinician-only: list all alerts across all patients.
 * Supports query params: patientId, severity, status, page, limit
 */
router.get(
  "/",
  authGuard,
  rbacGuard([Role.CLINICIAN]),
  validateAlertQuery,
  validate,
  listAlerts
);

/**
 * GET /api/alerts/mine
 * Patient-only: list alerts for the authenticated patient.
 * patientId comes from JWT, not query params.
 * Supports query params: severity, status, page, limit
 */
router.get(
  "/mine",
  authGuard,
  rbacGuard([Role.PATIENT]),
  validateAlertQuery,
  validate,
  listMyAlerts
);

/**
 * GET /api/alerts/:id
 * Both roles: get a single alert.
 * Patients can only see their own alerts (enforced in service).
 */
router.get(
  "/:id",
  authGuard,
  validateAlertId,
  validate,
  getAlert
);

export default router;
