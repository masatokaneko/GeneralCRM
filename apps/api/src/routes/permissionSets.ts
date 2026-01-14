import { Router } from "express";
import { permissionSetRepository } from "../repositories/permissionSetRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List all permission sets
router.get(
  "/permission-sets",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activeOnly } = req.query;
      const sets = await permissionSetRepository.findAll(
        req.context!.tenantId,
        { activeOnly: activeOnly === "true" }
      );
      res.json({
        records: sets,
        totalSize: sets.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get permission set by ID
router.get(
  "/permission-sets/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const set = await permissionSetRepository.findById(
        req.context!.tenantId,
        req.params.id
      );
      if (!set) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Permission set not found",
          },
        });
        return;
      }
      res.json(set);
    } catch (error) {
      next(error);
    }
  }
);

// Get object permissions for a permission set
router.get(
  "/permission-sets/:id/object-permissions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const permissions = await permissionSetRepository.getObjectPermissions(
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

// Get field permissions for a permission set
router.get(
  "/permission-sets/:id/field-permissions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { objectName } = req.query;
      const permissions = await permissionSetRepository.getFieldPermissions(
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

// Get users assigned to a permission set
router.get(
  "/permission-sets/:id/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await permissionSetRepository.getPermissionSetUsers(
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

// Get permission sets for a user
router.get(
  "/users/:userId/permission-sets",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sets = await permissionSetRepository.getUserPermissionSets(
        req.context!.tenantId,
        req.params.userId
      );
      res.json({
        records: sets,
        totalSize: sets.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create permission set
router.post(
  "/permission-sets",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, isActive } = req.body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        throw new ValidationError([
          { field: "name", message: "Permission set name is required" },
        ]);
      }

      // Check for duplicate name
      const existing = await permissionSetRepository.findByName(
        req.context!.tenantId,
        name.trim()
      );
      if (existing) {
        throw new ValidationError([
          { field: "name", message: "Permission set with this name already exists" },
        ]);
      }

      const set = await permissionSetRepository.create(
        req.context!.tenantId,
        {
          name: name.trim(),
          description,
          isActive,
        },
        req.context!.userId
      );

      res.status(201).json(set);
    } catch (error) {
      next(error);
    }
  }
);

// Update permission set
router.patch(
  "/permission-sets/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, isActive } = req.body;
      const etag = req.headers["if-match"] as string | undefined;

      if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
        throw new ValidationError([
          { field: "name", message: "Permission set name cannot be empty" },
        ]);
      }

      // Check for duplicate name if changing
      if (name !== undefined) {
        const existing = await permissionSetRepository.findByName(
          req.context!.tenantId,
          name.trim()
        );
        if (existing && existing.id !== req.params.id) {
          throw new ValidationError([
            { field: "name", message: "Permission set with this name already exists" },
          ]);
        }
      }

      const set = await permissionSetRepository.update(
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

      if (!set) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Permission set not found or concurrent modification detected",
          },
        });
        return;
      }

      res.json(set);
    } catch (error) {
      next(error);
    }
  }
);

// Assign user to permission set
router.post(
  "/permission-sets/:id/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        throw new ValidationError([
          { field: "userId", message: "User ID is required" },
        ]);
      }

      const assignment = await permissionSetRepository.assignUserToPermissionSet(
        req.context!.tenantId,
        userId,
        req.params.id,
        req.context!.userId
      );

      res.status(201).json(assignment);
    } catch (error) {
      next(error);
    }
  }
);

// Remove user from permission set
router.delete(
  "/permission-sets/:id/users/:userId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const removed = await permissionSetRepository.removeUserFromPermissionSet(
        req.context!.tenantId,
        req.params.userId,
        req.params.id
      );

      if (!removed) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "User not assigned to this permission set",
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

// Update object permissions for a permission set (bulk)
router.put(
  "/permission-sets/:id/object-permissions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        throw new ValidationError([
          { field: "permissions", message: "Permissions must be an array" },
        ]);
      }

      for (const perm of permissions) {
        if (!perm.objectName) {
          throw new ValidationError([
            { field: "objectName", message: "Object name is required" },
          ]);
        }
      }

      const results = await permissionSetRepository.bulkUpsertObjectPermissions(
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

// Delete permission set
router.delete(
  "/permission-sets/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await permissionSetRepository.delete(
        req.context!.tenantId,
        req.params.id,
        req.context!.userId
      );

      if (!deleted) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Permission set not found",
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
