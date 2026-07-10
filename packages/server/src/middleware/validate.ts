import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

/**
 * Middleware that checks express-validator results.
 * If validation errors exist, returns 422 with the error details.
 * Otherwise, passes to the next handler.
 */
export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      error: "Validation failed",
      details: errors.array().map((e) => ({
        field: e.type === "field" ? e.path : "unknown",
        message: e.msg,
      })),
    });
    return;
  }
  next();
}
