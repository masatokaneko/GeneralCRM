import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import type { ApiError } from "../types/index.js";

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Array<{ field?: string; message: string; rule?: string }>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    details?: Array<{ field?: string; message: string; rule?: string }>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      "NOT_FOUND",
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      404
    );
  }
}

export class ValidationError extends AppError {
  constructor(
    details: Array<{ field?: string; message: string; rule?: string }>
  ) {
    super("VALIDATION_ERROR", "Validation failed", 400, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource was modified by another user") {
    super("CONFLICT", message, 409);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action") {
    super("FORBIDDEN", message, 403);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = uuidv4();

  // Log error
  console.error(`[${correlationId}] Error:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    tenantId: req.context?.tenantId,
    userId: req.context?.userId,
  });

  if (err instanceof AppError) {
    const errorResponse: ApiError = {
      code: err.code,
      message: err.message,
      correlationId,
    };

    if (err.details) {
      errorResponse.details = err.details;
    }

    res.status(err.statusCode).json({ error: errorResponse });
    return;
  }

  // Generic error
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      correlationId,
    } satisfies ApiError,
  });
}

// Async handler wrapper
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
