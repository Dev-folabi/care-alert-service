import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../modules/auth/auth.service.js";

// Extend Express Request to carry our JWT payload
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
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
}
