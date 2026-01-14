import { Router } from "express";
import { approvalProcessRepository } from "../repositories/approvalProcessRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List approval processes
router.get("/", permissionMiddleware.list("ApprovalProcess"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectName, isActive, search, limit, cursor } = req.query;

    const result = await approvalProcessRepository.findAll(req.context!.tenantId, {
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
router.get("/metadata/objects", permissionMiddleware.list("ApprovalProcess"), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const objects = approvalProcessRepository.getSupportedObjects();
    res.json({ objects });
  } catch (error) {
    next(error);
  }
});

// Get metadata: available approvers
router.get("/metadata/approvers", permissionMiddleware.list("ApprovalProcess"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.query;
    const approvers = await approvalProcessRepository.getAvailableApprovers(
      req.context!.tenantId,
      type as string
    );

    res.json({ approvers });
  } catch (error) {
    next(error);
  }
});

// Get approval process by ID
router.get("/:id", permissionMiddleware.get("ApprovalProcess"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const process = await approvalProcessRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!process) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Approval process not found",
        },
      });
      return;
    }

    res.json(process);
  } catch (error) {
    next(error);
  }
});

// Create approval process
router.post("/", permissionMiddleware.create("ApprovalProcess"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, objectName, ...data } = req.body;
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

    const process = await approvalProcessRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, objectName, ...data }
    );

    res.status(201).json(process);
  } catch (error) {
    next(error);
  }
});

// Update approval process
router.patch("/:id", permissionMiddleware.update("ApprovalProcess"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const process = await approvalProcessRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );

    res.json(process);
  } catch (error) {
    next(error);
  }
});

// Delete approval process
router.delete("/:id", permissionMiddleware.delete("ApprovalProcess"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await approvalProcessRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Toggle approval process active status
router.post("/:id/toggle", permissionMiddleware.update("ApprovalProcess"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const process = await approvalProcessRepository.toggle(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    res.json(process);
  } catch (error) {
    next(error);
  }
});

// Clone approval process
router.post("/:id/clone", permissionMiddleware.create("ApprovalProcess"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const process = await approvalProcessRepository.clone(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    res.status(201).json(process);
  } catch (error) {
    next(error);
  }
});

export default router;
