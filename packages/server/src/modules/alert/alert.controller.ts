import { Request, Response, NextFunction } from "express";
import * as alertService from "./alert.service.js";

/**
 * GET /api/alerts
 */
export const listAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const filters: alertService.AlertQueryFilters = {
      patientId: req.query.patientId as string | undefined,
      severity: req.query.severity as string | undefined,
      status: req.query.status as string | undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await alertService.getAllAlerts(filters);
    res.status(200).json({
      success: true,
      message: "Alerts fetched successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/alerts/mine
 */
export const listMyAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const patientId = req.user!.patientId;

    if (!patientId) {
      res.status(400).json({
        success: false,
        message: "No patientId associated with this account",
        data: null,
      });
      return;
    }

    const filters: Omit<alertService.AlertQueryFilters, "patientId"> = {
      severity: req.query.severity as string | undefined,
      status: req.query.status as string | undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await alertService.getMyAlerts(patientId, filters);
    res.status(200).json({
      success: true,
      message: "Alerts fetched successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/alerts/:id
 */
export const getAlert = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { userId, role, patientId } = req.user!;

    const alert = await alertService.getAlertById(id, userId, role, patientId);
    res.status(200).json({
      success: true,
      message: "Alert fetched successfully",
      data: alert,
    });
  } catch (err) {
    next(err);
  }
};
