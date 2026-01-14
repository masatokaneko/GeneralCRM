import { Router } from "express";
import { permissionProfileRepository } from "../repositories/permissionProfileRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List all permission profiles
router.get(
  "/permission-profiles",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activeOnly } = req.query;
      const profiles = await permissionProfileRepository.findAll(
        req.context!.tenantId,
        { activeOnly: activeOnly === "true" }
      );
      res.json({
        records: profiles,
        totalSize: profiles.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get permission profile by ID
router.get(
  "/permission-profiles/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await permissionProfileRepository.findById(
        req.context!.tenantId,
        req.params.id
      );
      if (!profile) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Permission profile not found",
          },
        });
        return;
      }
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
);

// Get object permissions for a profile
router.get(
  "/permission-profiles/:id/object-permissions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const permissions = await permissionProfileRepository.getObjectPermissions(
        req.context!.tenantId,
        req.params.id
      );
      res.json({
        records: permissions,
        totalSize: permissions.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get field permissions for a profile
router.get(
  "/permission-profiles/:id/field-permissions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { objectName } = req.query;
      const permissions = await permissionProfileRepository.getFieldPermissions(
        req.context!.tenantId,
        req.params.id,
        objectName as string | undefined
      );
      res.json({
        records: permissions,
        totalSize: permissions.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get users in a profile
router.get(
  "/permission-profiles/:id/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await permissionProfileRepository.getUsersInProfile(
        req.context!.tenantId,
        req.params.id
      );
      res.json({
        records: users,
        totalSize: users.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create permission profile
router.post(
  "/permission-profiles",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, isActive } = req.body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        throw new ValidationError([
          { field: "name", message: "Profile name is required" },
        ]);
      }

      // Check for duplicate name
      const existing = await permissionProfileRepository.findByName(
        req.context!.tenantId,
        name.trim()
      );
      if (existing) {
        throw new ValidationError([
          { field: "name", message: "Profile with this name already exists" },
        ]);
      }

      const profile = await permissionProfileRepository.create(
        req.context!.tenantId,
        {
          name: name.trim(),
          description,
          isSystem: false, // User-created profiles are never system profiles
          isActive,
        },
        req.context!.userId
      );

      res.status(201).json(profile);
    } catch (error) {
      next(error);
    }
  }
);

// Update permission profile
router.patch(
  "/permission-profiles/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, isActive } = req.body;
      const etag = req.headers["if-match"] as string | undefined;

      if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
        throw new ValidationError([
          { field: "name", message: "Profile name cannot be empty" },
        ]);
      }

      // Check for duplicate name if changing
      if (name !== undefined) {
        const existing = await permissionProfileRepository.findByName(
          req.context!.tenantId,
          name.trim()
        );
        if (existing && existing.id !== req.params.id) {
          throw new ValidationError([
            { field: "name", message: "Profile with this name already exists" },
          ]);
        }
      }

      const profile = await permissionProfileRepository.update(
        req.context!.tenantId,
        req.params.id,
        {
          name: name?.trim(),
          description,
          isActive,
        },
        req.context!.userId,
        etag
      );

      if (!profile) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Permission profile not found or concurrent modification detected",
          },
        });
        return;
      }

      res.json(profile);
    } catch (error) {
      next(error);
    }
  }
);

// Update object permissions for a profile (bulk)
router.put(
  "/permission-profiles/:id/object-permissions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        throw new ValidationError([
          { field: "permissions", message: "Permissions must be an array" },
        ]);
      }

      // Validate each permission
      for (const perm of permissions) {
        if (!perm.objectName) {
          throw new ValidationError([
            { field: "objectName", message: "Object name is required" },
          ]);
        }
      }

      const results = await permissionProfileRepository.bulkUpsertObjectPermissions(
        req.context!.tenantId,
        req.params.id,
        permissions.map((p) => ({
          objectName: p.objectName,
          canCreate: p.canCreate ?? false,
          canRead: p.canRead ?? false,
          canUpdate: p.canUpdate ?? false,
          canDelete: p.canDelete ?? false,
          viewAll: p.viewAll ?? false,
          modifyAll: p.modifyAll ?? false,
        })),
        req.context!.userId
      );

      res.json({
        records: results,
        totalSize: results.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update single object permission
router.put(
  "/permission-profiles/:id/object-permissions/:objectName",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { canCreate, canRead, canUpdate, canDelete, viewAll, modifyAll } = req.body;

      const result = await permissionProfileRepository.upsertObjectPermission(
        req.context!.tenantId,
        req.params.id,
        req.params.objectName,
        {
          canCreate,
          canRead,
          canUpdate,
          canDelete,
          viewAll,
          modifyAll,
        },
        req.context!.userId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Update field permissions for a profile (bulk)
router.put(
  "/permission-profiles/:id/field-permissions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        throw new ValidationError([
          { field: "permissions", message: "Permissions must be an array" },
        ]);
      }

      // Validate each permission
      for (const perm of permissions) {
        if (!perm.objectName || !perm.fieldName) {
          throw new ValidationError([
            { field: "permissions", message: "Object name and field name are required" },
          ]);
        }
      }

      const results = await permissionProfileRepository.bulkUpsertFieldPermissions(
        req.context!.tenantId,
        req.params.id,
        permissions.map((p) => ({
          objectName: p.objectName,
          fieldName: p.fieldName,
          isReadable: p.isReadable ?? true,
          isEditable: p.isEditable ?? false,
        })),
        req.context!.userId
      );

      res.json({
        records: results,
        totalSize: results.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete permission profile
router.delete(
  "/permission-profiles/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await permissionProfileRepository.delete(
        req.context!.tenantId,
        req.params.id,
        req.context!.userId
      );

      if (!deleted) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Permission profile not found",
          },
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
