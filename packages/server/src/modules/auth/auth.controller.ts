import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";

export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, name, role, patientId } = req.body;
    const result = await authService.register(
      email,
      password,
      name,
      role,
      patientId,
    );
    res
      .status(201)
      .json({
        success: true,
        message: "User registered successfully",
        data: result,
      });
  } catch (err) {
    next(err);
  }
};

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res
      .status(200)
      .json({ success: true, message: "Login successful", data: result });
  } catch (err) {
    next(err);
  }
};

export const meHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user.userId;
    const user = await authService.getMe(userId);
    res
      .status(200)
      .json({
        success: true,
        message: "User fetched successfully",
        data: user,
      });
  } catch (err) {
    next(err);
  }
};
