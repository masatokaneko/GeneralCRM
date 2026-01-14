import { Router } from "express";
import { workflowRuleRepository } from "../repositories/workflowRuleRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List workflow rules
router.get("/", permissionMiddleware.list("WorkflowRule"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectName, isActive, search, limit, cursor } = req.query;

    const result = await workflowRuleRepository.findAll(req.context!.tenantId, {
      objectName: objectName as string,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get metadata: supported objects
router.get("/metadata/objects", permissionMiddleware.list("WorkflowRule"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const objects = workflowRuleRepository.getSupportedObjects();
    res.json({ objects });
  } catch (error) {
    next(error);
  }
});

// Get metadata: object fields
router.get("/metadata/fields/:objectName", permissionMiddleware.list("WorkflowRule"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectName } = req.params;
    const fields = workflowRuleRepository.getObjectFields(objectName);

    if (fields.length === 0) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Object '${objectName}' not found or not supported`,
        },
      });
      return;
    }

    res.json({ fields });
  } catch (error) {
    next(error);
  }
});

// Get workflow rule by ID
router.get("/:id", permissionMiddleware.get("WorkflowRule"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = await workflowRuleRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!rule) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Workflow rule not found",
        },
      });
      return;
    }

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// Create workflow rule
router.post("/", permissionMiddleware.create("WorkflowRule"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, objectName, triggerType, evaluationCriteria, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!name) {
      errors.push({ field: "name", message: "Name is required" });
    }
    if (!objectName) {
      errors.push({ field: "objectName", message: "Object name is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const rule = await workflowRuleRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, objectName, triggerType, evaluationCriteria, ...data }
    );

    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

// Update workflow rule
router.patch("/:id", permissionMiddleware.update("WorkflowRule"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const rule = await workflowRuleRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// Delete workflow rule
router.delete("/:id", permissionMiddleware.delete("WorkflowRule"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await workflowRuleRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Toggle workflow rule active status
router.post("/:id/toggle", permissionMiddleware.update("WorkflowRule"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = await workflowRuleRepository.toggle(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

export default router;
