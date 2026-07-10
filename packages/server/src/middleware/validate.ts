import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

/**
 * Middleware that checks express-validator results
 */
export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res
      .status(422)
      .json({
        success: false,
        message: "Validation error",
        data: errors.array(),
      });
    return;
  }
  next();
}
