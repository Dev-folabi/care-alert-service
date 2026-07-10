import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service.js";

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password, name, role, patientId } = req.body;
    const result = await authService.register(
      email,
      password,
      name,
      role,
      patientId
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function meHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user.userId;
    const user = await authService.getMe(userId);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}
