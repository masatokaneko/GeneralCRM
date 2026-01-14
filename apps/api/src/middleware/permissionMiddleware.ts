import type { Request, Response, NextFunction } from "express";
import { permissionService } from "../services/permissionService.js";
import { accessibleIdsService, type AccessFilter } from "../services/accessibleIdsService.js";

// Extend Express Request type to include accessFilter
declare global {
  namespace Express {
    interface Request {
      accessFilter?: AccessFilter | null;
    }
  }
}

// Permission check options
export interface PermissionCheckOptions {
  objectName: string;
  action: "create" | "read" | "update" | "delete";
  // Function to extract record ID from request (for record-level checks)
  getRecordId?: (req: Request) => string | null;
  // Skip permission check for certain conditions
  skipIf?: (req: Request) => boolean;
}

// Error for permission denied
export class PermissionDeniedError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, code: string = "PERMISSION_DENIED") {
    super(message);
    this.name = "PermissionDeniedError";
    this.statusCode = 403;
    this.code = code;
  }
}

// Error for insufficient access
export class InsufficientAccessError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string) {
    super(message);
    this.name = "InsufficientAccessError";
    this.statusCode = 403;
    this.code = "INSUFFICIENT_ACCESS";
  }
}

/**
 * Create permission check middleware
 */
export function checkPermission(options: PermissionCheckOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) {
        throw new PermissionDeniedError(
          "Authentication required",
          "AUTHENTICATION_REQUIRED"
        );
      }

      // Check skip condition
      if (options.skipIf && options.skipIf(req)) {
        return next();
      }

      const { tenantId, userId } = context;

      // Get record ID if needed
      const recordId = options.getRecordId ? options.getRecordId(req) : null;

      // Check permission
      const hasPermission = await permissionService.canPerformAction(
        tenantId,
        userId,
        options.objectName,
        recordId,
        options.action
      );

      if (!hasPermission) {
        const actionMessages = {
          create: `create ${options.objectName} records`,
          read: `view this ${options.objectName} record`,
          update: `update this ${options.objectName} record`,
          delete: `delete this ${options.objectName} record`,
        };

        throw new PermissionDeniedError(
          `You do not have permission to ${actionMessages[options.action]}`,
          "INSUFFICIENT_PRIVILEGES"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create object permission check middleware (CRUD level only)
 */
export function checkObjectPermission(
  objectName: string,
  action: "create" | "read" | "update" | "delete"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) {
        throw new PermissionDeniedError(
          "Authentication required",
          "AUTHENTICATION_REQUIRED"
        );
      }

      const objPerms = await permissionService.getObjectPermissions(
        context.tenantId,
        context.userId,
        objectName
      );

      const permissionMap = {
        create: objPerms.canCreate,
        read: objPerms.canRead,
        update: objPerms.canUpdate,
        delete: objPerms.canDelete,
      };

      if (!permissionMap[action]) {
        throw new PermissionDeniedError(
          `You do not have permission to ${action} ${objectName} records`,
          "INSUFFICIENT_PRIVILEGES"
        );
      }

      // Attach object permissions to request for later use
      (req as Request & { objectPermissions?: typeof objPerms }).objectPermissions = objPerms;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create record access check middleware
 */
export function checkRecordAccess(
  objectName: string,
  requiredAccess: "Read" | "ReadWrite" = "Read",
  getRecordId: (req: Request) => string | null = (req) => req.params.id ?? null
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const context = req.context;
      if (!context) {
        throw new PermissionDeniedError(
          "Authentication required",
          "AUTHENTICATION_REQUIRED"
        );
      }

      const recordId = getRecordId(req);
      if (!recordId) {
        return next(); // No record to check
      }

      const access = await permissionService.getRecordAccess(
        context.tenantId,
        context.userId,
        objectName,
        recordId
      );

      if (access === "None") {
        throw new InsufficientAccessError(
          `You do not have access to this ${objectName} record`
        );
      }

      if (requiredAccess === "ReadWrite" && access !== "ReadWrite") {
        throw new InsufficientAccessError(
          `You do not have write access to this ${objectName} record`
        );
      }

      // Attach record access level to request
      (req as Request & { recordAccess?: typeof access }).recordAccess = access;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Apply field-level security to response data
 */
export function applyFieldSecurity(
  objectName: string,
  mode: "read" | "edit" = "read"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const context = req.context;
    if (!context) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to apply FLS
    res.json = ((data: unknown) => {
      if (data && typeof data === "object") {
        applyFLSToData(
          context.tenantId,
          context.userId,
          objectName,
          data,
          mode
        ).then((secured) => {
          originalJson(secured);
        }).catch(() => {
          originalJson(data);
        });
        return res;
      }
      return originalJson(data);
    }) as typeof res.json;

    next();
  };
}

/**
 * Helper to apply FLS to data (handles single records and arrays)
 */
async function applyFLSToData(
  tenantId: string,
  userId: string,
  objectName: string,
  data: unknown,
  mode: "read" | "edit"
): Promise<unknown> {
  if (Array.isArray(data)) {
    // Handle array of records
    const results = [];
    for (const item of data) {
      if (item && typeof item === "object") {
        const secured = await permissionService.applyFieldSecurity(
          tenantId,
          userId,
          objectName,
          item as Record<string, unknown>,
          mode
        );
        results.push(secured);
      } else {
        results.push(item);
      }
    }
    return results;
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    // Check if it's a paginated response with records array
    if ("records" in obj && Array.isArray(obj.records)) {
      const securedRecords = await applyFLSToData(
        tenantId,
        userId,
        objectName,
        obj.records,
        mode
      );
      return { ...obj, records: securedRecords };
    }

    // Single record
    return permissionService.applyFieldSecurity(
      tenantId,
      userId,
      objectName,
      obj,
      mode
    );
  }

  return data;
}

/**
 * Combined middleware for standard CRUD operations
 */
export const permissionMiddleware = {
  /**
   * Check for list/query operations with record-level filtering
   */
  list(objectName: string) {
    return [
      checkObjectPermission(objectName, "read"),
      async (req: Request, _res: Response, next: NextFunction) => {
        try {
          const context = req.context;
          if (!context) {
            return next();
          }

          // Generate access filter for record-level permissions
          const filter = await accessibleIdsService.getAccessibleIdsFilter(
            context.tenantId,
            context.userId,
            objectName
          );

          // Attach filter to request for use in route handler
          req.accessFilter = filter;
          next();
        } catch (error) {
          next(error);
        }
      },
    ];
  },

  /**
   * Check for get single record
   */
  get(objectName: string) {
    return [
      checkObjectPermission(objectName, "read"),
      checkRecordAccess(objectName, "Read"),
    ];
  },

  /**
   * Check for create operations
   */
  create(objectName: string) {
    return checkObjectPermission(objectName, "create");
  },

  /**
   * Check for update operations
   */
  update(objectName: string) {
    return [
      checkObjectPermission(objectName, "update"),
      checkRecordAccess(objectName, "ReadWrite"),
    ];
  },

  /**
   * Check for delete operations
   */
  delete(objectName: string) {
    return [
      checkObjectPermission(objectName, "delete"),
      checkRecordAccess(objectName, "ReadWrite"),
    ];
  },
};

/**
 * Utility to check field-level edit permission for specific fields
 */
export async function checkFieldEditPermissions(
  req: Request,
  objectName: string,
  fieldNames: string[]
): Promise<{ allowed: string[]; denied: string[] }> {
  const context = req.context;
  if (!context) {
    return { allowed: [], denied: fieldNames };
  }

  const permissions = await permissionService.getFieldPermissions(
    context.tenantId,
    context.userId,
    objectName,
    fieldNames
  );

  const permMap = new Map<string, boolean>();
  for (const p of permissions) {
    permMap.set(p.fieldName, p.isEditable);
  }

  const allowed: string[] = [];
  const denied: string[] = [];

  for (const field of fieldNames) {
    if (permMap.get(field) !== false) {
      allowed.push(field);
    } else {
      denied.push(field);
    }
  }

  return { allowed, denied };
}

/**
 * Middleware to validate field-level edit permissions
 */
export function validateFieldEdits(objectName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return next();
      }

      const fieldNames = Object.keys(req.body);
      if (fieldNames.length === 0) {
        return next();
      }

      const { denied } = await checkFieldEditPermissions(
        req,
        objectName,
        fieldNames
      );

      if (denied.length > 0) {
        throw new PermissionDeniedError(
          `You do not have permission to edit the following fields: ${denied.join(", ")}`,
          "FIELD_NOT_EDITABLE"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
