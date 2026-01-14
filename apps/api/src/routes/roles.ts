import { Router } from "express";
import { roleRepository } from "../repositories/roleRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List all roles (hierarchy tree format)
router.get("/roles", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activeOnly } = req.query;
    const roles = await roleRepository.findAll(req.context!.tenantId, {
      activeOnly: activeOnly === "true",
    });
    res.json({
      records: roles,
      totalSize: roles.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get role hierarchy (tree structure with level)
router.get(
  "/roles/hierarchy",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await roleRepository.getHierarchy(req.context!.tenantId);
      res.json({
        records: roles,
        totalSize: roles.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get role by ID
router.get(
  "/roles/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = await roleRepository.findById(
        req.context!.tenantId,
        req.params.id
      );
      if (!role) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Role not found",
          },
        });
        return;
      }
      res.json(role);
    } catch (error) {
      next(error);
    }
  }
);

// Get child roles
router.get(
  "/roles/:id/children",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await roleRepository.findByParent(
        req.context!.tenantId,
        req.params.id
      );
      res.json({
        records: roles,
        totalSize: roles.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get descendant roles (all levels)
router.get(
  "/roles/:id/descendants",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await roleRepository.getDescendants(
        req.context!.tenantId,
        req.params.id
      );
      res.json({
        records: roles,
        totalSize: roles.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get ancestor roles (all levels up to root)
router.get(
  "/roles/:id/ancestors",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = await roleRepository.getAncestors(
        req.context!.tenantId,
        req.params.id
      );
      res.json({
        records: roles,
        totalSize: roles.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get users in role
router.get(
  "/roles/:id/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await roleRepository.getUsersInRole(
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

// Create role
router.post(
  "/roles",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, parentRoleId, description, sortOrder, isActive } = req.body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        throw new ValidationError([
          { field: "name", message: "Role name is required" },
        ]);
      }

      // Validate parent role exists if provided
      if (parentRoleId) {
        const parentRole = await roleRepository.findById(
          req.context!.tenantId,
          parentRoleId
        );
        if (!parentRole) {
          throw new ValidationError([
            { field: "parentRoleId", message: "Parent role not found" },
          ]);
        }
      }

      const role = await roleRepository.create(
        req.context!.tenantId,
        {
          name: name.trim(),
          parentRoleId: parentRoleId || null,
          description,
          sortOrder,
          isActive,
        },
        req.context!.userId
      );

      res.status(201).json(role);
    } catch (error) {
      next(error);
    }
  }
);

// Update role
router.patch(
  "/roles/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, parentRoleId, description, sortOrder, isActive } = req.body;
      const etag = req.headers["if-match"] as string | undefined;

      if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
        throw new ValidationError([
          { field: "name", message: "Role name cannot be empty" },
        ]);
      }

      // Validate hierarchy if changing parent
      if (parentRoleId !== undefined && parentRoleId !== null) {
        // Check parent exists
        const parentRole = await roleRepository.findById(
          req.context!.tenantId,
          parentRoleId
        );
        if (!parentRole) {
          throw new ValidationError([
            { field: "parentRoleId", message: "Parent role not found" },
          ]);
        }

        // Check for circular reference
        const isValid = await roleRepository.validateHierarchy(
          req.context!.tenantId,
          req.params.id,
          parentRoleId
        );
        if (!isValid) {
          throw new ValidationError([
            {
              field: "parentRoleId",
              message: "Cannot set parent to a descendant role (would create cycle)",
            },
          ]);
        }
      }

      const role = await roleRepository.update(
        req.context!.tenantId,
        req.params.id,
        {
          name: name?.trim(),
          parentRoleId,
          description,
          sortOrder,
          isActive,
        },
        req.context!.userId,
        etag
      );

      if (!role) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Role not found or concurrent modification detected",
          },
        });
        return;
      }

      res.json(role);
    } catch (error) {
      next(error);
    }
  }
);

// Delete role
router.delete(
  "/roles/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await roleRepository.delete(
        req.context!.tenantId,
        req.params.id,
        req.context!.userId
      );

      if (!deleted) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Role not found",
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
