import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../modules/auth/auth.service";

// Extend Express Request to carry JWT payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Auth guard middleware.
 * Extracts Bearer token from Authorization header,
 * verifies the JWT, and attaches the payload to req.user.
 */
export function authGuard(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ success: false, message: "Authentication required", data: null });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    res
      .status(401)
      .json({
        success: false,
        message: "Invalid or expired token",
        data: null,
      });
    return;
  }
}
