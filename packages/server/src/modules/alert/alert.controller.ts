import { Request, Response, NextFunction } from "express";
import * as alertService from "./alert.service.js";

/**
 * GET /api/alerts
 * Clinician-only: list all alerts with optional filters.
 */
export async function listAlerts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const filters: alertService.AlertQueryFilters = {
      patientId: req.query.patientId as string | undefined,
      severity: req.query.severity as string | undefined,
      status: req.query.status as string | undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await alertService.getAllAlerts(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/alerts/mine
 * Patient-only: list alerts belonging to the authenticated patient.
 * patientId is taken from the JWT token (req.user), not from query params.
 */
export async function listMyAlerts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const patientId = req.user!.patientId;

    if (!patientId) {
      res.status(400).json({ error: "No patientId associated with this account" });
      return;
    }

    const filters: Omit<alertService.AlertQueryFilters, "patientId"> = {
      severity: req.query.severity as string | undefined,
      status: req.query.status as string | undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await alertService.getMyAlerts(patientId, filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/alerts/:id
 * Both roles: get a single alert by ID.
 * Patients can only view their own alerts (enforced in service layer).
 */
export async function getAlert(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id as string;
    const { userId, role, patientId } = req.user!;

    const alert = await alertService.getAlertById(id, userId, role, patientId);
    res.status(200).json(alert);
  } catch (err) {
    next(err);
  }
}
