import type { Request, Response, NextFunction } from "express";
import type { RequestContext } from "../types/index.js";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

// In production, this would validate JWT tokens from Keycloak
// For development, we use a mock user
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Check for Authorization header
  const authHeader = req.headers.authorization;

  if (process.env.NODE_ENV === "development" && !authHeader) {
    // Development mode: use mock user (UUIDs from seed data)
    req.context = {
      tenantId: "11111111-1111-1111-1111-111111111111",
      userId: "22222222-2222-2222-2222-222222222222",
      userEmail: "admin@demo.com",
      roles: ["Admin", "Sales Manager"],
    };
    next();
    return;
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      },
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // In production, validate JWT token here
    // For now, parse the mock token format: "tenantId:userId:email:roles"
    const parts = token.split(":");
    if (parts.length >= 4) {
      req.context = {
        tenantId: parts[0],
        userId: parts[1],
        userEmail: parts[2],
        roles: parts[3].split(","),
      };
    } else {
      // Fallback for development
      req.context = {
        tenantId: "tenant-001",
        userId: "user-001",
        userEmail: "admin@example.com",
        roles: ["Admin"],
      };
    }
    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      },
    });
  }
}

// Middleware to ensure tenant isolation
export function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.context?.tenantId) {
    res.status(403).json({
      error: {
        code: "TENANT_REQUIRED",
        message: "Tenant context is required",
      },
    });
    return;
  }
  next();
}
