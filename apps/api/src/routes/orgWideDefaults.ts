import { Router } from "express";
import { orgWideDefaultRepository } from "../repositories/orgWideDefaultRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

const VALID_INTERNAL_ACCESS = ["Private", "PublicReadOnly", "PublicReadWrite", "ControlledByParent"];
const VALID_EXTERNAL_ACCESS = ["Private", "PublicReadOnly", "PublicReadWrite"];

// List all OWD settings
router.get(
  "/org-wide-defaults",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await orgWideDefaultRepository.findAll(req.context!.tenantId);
      res.json({
        records: settings,
        totalSize: settings.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get supported objects
router.get(
  "/org-wide-defaults/supported-objects",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const objects = await orgWideDefaultRepository.getSupportedObjects();
      res.json({
        records: objects,
        totalSize: objects.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get OWD for a specific object
router.get(
  "/org-wide-defaults/:objectName",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const owd = await orgWideDefaultRepository.findByObject(
        req.context!.tenantId,
        req.params.objectName
      );
      if (!owd) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: `OWD not configured for object: ${req.params.objectName}`,
          },
        });
        return;
      }
      res.json(owd);
    } catch (error) {
      next(error);
    }
  }
);

// Update OWD for a specific object
router.patch(
  "/org-wide-defaults/:objectName",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { internalAccess, externalAccess, grantAccessUsingHierarchies } = req.body;

      // Validate internal access
      if (internalAccess !== undefined && !VALID_INTERNAL_ACCESS.includes(internalAccess)) {
        throw new ValidationError([
          {
            field: "internalAccess",
            message: `Invalid internal access level. Must be one of: ${VALID_INTERNAL_ACCESS.join(", ")}`,
          },
        ]);
      }

      // Validate external access
      if (externalAccess !== undefined && !VALID_EXTERNAL_ACCESS.includes(externalAccess)) {
        throw new ValidationError([
          {
            field: "externalAccess",
            message: `Invalid external access level. Must be one of: ${VALID_EXTERNAL_ACCESS.join(", ")}`,
          },
        ]);
      }

      // ControlledByParent can only be used for child objects
      const childObjects = ["Contact", "Quote", "Order", "Task", "Event"];
      if (
        internalAccess === "ControlledByParent" &&
        !childObjects.includes(req.params.objectName)
      ) {
        throw new ValidationError([
          {
            field: "internalAccess",
            message: `ControlledByParent can only be used for child objects: ${childObjects.join(", ")}`,
          },
        ]);
      }

      // Validate hierarchy setting (can't be true for ControlledByParent or Public objects)
      if (
        grantAccessUsingHierarchies === true &&
        internalAccess === "ControlledByParent"
      ) {
        throw new ValidationError([
          {
            field: "grantAccessUsingHierarchies",
            message: "Cannot enable role hierarchy for ControlledByParent access",
          },
        ]);
      }

      const owd = await orgWideDefaultRepository.update(
        req.context!.tenantId,
        req.params.objectName,
        {
          internalAccess,
          externalAccess,
          grantAccessUsingHierarchies,
        },
        req.context!.userId
      );

      if (!owd) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: `OWD not configured for object: ${req.params.objectName}`,
          },
        });
        return;
      }

      res.json(owd);
    } catch (error) {
      next(error);
    }
  }
);

// Initialize OWD for all objects (admin only, typically during tenant setup)
router.post(
  "/org-wide-defaults/initialize",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await orgWideDefaultRepository.initializeForTenant(
        req.context!.tenantId,
        req.context!.userId
      );

      const settings = await orgWideDefaultRepository.findAll(req.context!.tenantId);
      res.status(201).json({
        records: settings,
        totalSize: settings.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk update OWD settings
router.put(
  "/org-wide-defaults",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { settings } = req.body;

      if (!Array.isArray(settings)) {
        throw new ValidationError([
          { field: "settings", message: "Settings must be an array" },
        ]);
      }

      const childObjects = ["Contact", "Quote", "Order", "Task", "Event"];

      // Validate all settings
      for (const setting of settings) {
        if (!setting.objectName) {
          throw new ValidationError([
            { field: "objectName", message: "Object name is required" },
          ]);
        }

        if (
          setting.internalAccess !== undefined &&
          !VALID_INTERNAL_ACCESS.includes(setting.internalAccess)
        ) {
          throw new ValidationError([
            {
              field: "internalAccess",
              message: `Invalid internal access for ${setting.objectName}`,
            },
          ]);
        }

        if (
          setting.internalAccess === "ControlledByParent" &&
          !childObjects.includes(setting.objectName)
        ) {
          throw new ValidationError([
            {
              field: "internalAccess",
              message: `ControlledByParent cannot be used for ${setting.objectName}`,
            },
          ]);
        }
      }

      // Apply updates
      const results = [];
      for (const setting of settings) {
        const owd = await orgWideDefaultRepository.upsert(
          req.context!.tenantId,
          setting.objectName,
          {
            internalAccess: setting.internalAccess,
            externalAccess: setting.externalAccess,
            grantAccessUsingHierarchies: setting.grantAccessUsingHierarchies,
          },
          req.context!.userId
        );
        results.push(owd);
      }

      res.json({
        records: results,
        totalSize: results.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
