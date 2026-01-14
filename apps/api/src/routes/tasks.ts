import { Router } from "express";
import { taskRepository } from "../repositories/taskRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List tasks
router.get("/", permissionMiddleware.list("Task"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status,
      priority,
      ownerId,
      whoType,
      whoId,
      whatType,
      whatId,
      isClosed,
      limit,
      offset,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await taskRepository.list(
      req.context!.tenantId,
      {
        status: status as string,
        priority: priority as string,
        ownerId: ownerId as string,
        whoType: whoType as string,
        whoId: whoId as string,
        whatType: whatType as string,
        whatId: whatId as string,
        isClosed: isClosed === "true" ? true : isClosed === "false" ? false : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      },
      req.accessFilter
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get task by ID
router.get("/:id", permissionMiddleware.get("Task"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!task) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Task not found",
        },
      });
      return;
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Create task
router.post("/", permissionMiddleware.create("Task"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, ...rest } = req.body;

    if (!subject) {
      throw new ValidationError([
        { field: "subject", message: "Subject is required" },
      ]);
    }

    const task = await taskRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { subject, ...rest }
    );

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// Update task
router.patch("/:id", permissionMiddleware.update("Task"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const task = await taskRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Complete task
router.post("/:id/complete", permissionMiddleware.update("Task"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskRepository.complete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(task);
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete("/:id", permissionMiddleware.delete("Task"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await taskRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!task) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Task not found",
        },
      });
      return;
    }

    await taskRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
