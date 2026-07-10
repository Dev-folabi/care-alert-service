import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

/**
 * Role-based access control guard.
 * Must be used AFTER authGuard (requires req.user to be set).
 *
 * @param allowedRoles - Array of roles permitted to access the route
 *
 * Usage:
 *   router.get("/alerts", authGuard, rbacGuard(["CLINICIAN"]), handler)
 */
export function rbacGuard(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Forbidden",
        message: `Role '${req.user.role}' is not authorized for this resource`,
      });
      return;
    }

    next();
  };
}
