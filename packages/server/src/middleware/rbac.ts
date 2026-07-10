import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";

/**
 * Role-based access control guard.
 * @param allowedRoles - Array of roles permitted to access the route
 */
export function rbacGuard(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res
        .status(401)
        .json({
          success: false,
          message: "Authentication required",
          data: null,
        });
      return;
    }

    if (!req.user || !allowedRoles.includes(req.user.role as Role)) {
      res
        .status(403)
        .json({
          success: false,
          message: "Access denied: insufficient permissions",
          data: null,
        });
      return;
    }

    next();
  };
}
