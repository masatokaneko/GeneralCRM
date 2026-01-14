import { Router } from "express";
import { approvalInstanceRepository } from "../repositories/approvalInstanceRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// =============================================
// Approval Instance Routes
// =============================================

// List approval instances
router.get("/instances", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, status, targetObjectName, targetRecordId, submittedBy } = req.query;
    const result = await approvalInstanceRepository.listInstances(req.context!.tenantId, {
      limit: limit ? Number(limit) : undefined,
      cursor: cursor as string,
      status: status as string,
      targetObjectName: targetObjectName as string,
      targetRecordId: targetRecordId as string,
      submittedBy: submittedBy as string,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get my submitted approvals
router.get("/my-submissions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, status } = req.query;
    const result = await approvalInstanceRepository.listInstances(req.context!.tenantId, {
      limit: limit ? Number(limit) : undefined,
      cursor: cursor as string,
      status: status as string,
      submittedBy: req.context!.userId,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get approval instance by ID
router.get("/instances/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const instance = await approvalInstanceRepository.findInstanceById(
      req.context!.tenantId,
      req.params.id
    );
    if (!instance) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Approval instance not found",
        },
      });
      return;
    }
    res.json(instance);
  } catch (error) {
    next(error);
  }
});

// Get approval history for an instance
router.get("/instances/:id/history", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await approvalInstanceRepository.getHistory(
      req.context!.tenantId,
      req.params.id
    );
    res.json({
      records: history,
      totalSize: history.length,
    });
  } catch (error) {
    next(error);
  }
});

// Submit a record for approval
router.post("/submit", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { processDefinitionId, targetObjectName, targetRecordId, comments } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!processDefinitionId) {
      errors.push({ field: "processDefinitionId", message: "processDefinitionId is required." });
    }
    if (!targetObjectName) {
      errors.push({ field: "targetObjectName", message: "targetObjectName is required." });
    }
    if (!targetRecordId) {
      errors.push({ field: "targetRecordId", message: "targetRecordId is required." });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const instance = await approvalInstanceRepository.submit(
      req.context!.tenantId,
      req.context!.userId,
      { processDefinitionId, targetObjectName, targetRecordId, comments }
    );

    res.status(201).json(instance);
  } catch (error) {
    next(error);
  }
});

// Recall an approval request
router.post("/instances/:id/recall", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const instance = await approvalInstanceRepository.recall(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(instance);
  } catch (error) {
    next(error);
  }
});

// =============================================
// Work Item Routes
// =============================================

// List my pending work items (approval queue)
router.get("/work-items", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, status } = req.query;
    const result = await approvalInstanceRepository.listMyWorkItems(
      req.context!.tenantId,
      req.context!.userId,
      {
        limit: limit ? Number(limit) : undefined,
        cursor: cursor as string,
        status: status as string,
      }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get work item by ID
router.get("/work-items/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workItem = await approvalInstanceRepository.findWorkItemById(
      req.context!.tenantId,
      req.params.id
    );
    if (!workItem) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Approval work item not found",
        },
      });
      return;
    }
    res.json(workItem);
  } catch (error) {
    next(error);
  }
});

// Decide on a work item (approve/reject)
router.post("/work-items/:id/decide", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, comments } = req.body;

    if (!action || !["Approve", "Reject"].includes(action)) {
      throw new ValidationError([
        { field: "action", message: "action must be 'Approve' or 'Reject'." },
      ]);
    }

    const workItem = await approvalInstanceRepository.decide(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      action,
      comments
    );
    res.json(workItem);
  } catch (error) {
    next(error);
  }
});

// Reassign a work item
router.post("/work-items/:id/reassign", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newApproverId, comments } = req.body;

    if (!newApproverId) {
      throw new ValidationError([
        { field: "newApproverId", message: "newApproverId is required." },
      ]);
    }

    const workItem = await approvalInstanceRepository.reassign(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      newApproverId,
      comments
    );
    res.json(workItem);
  } catch (error) {
    next(error);
  }
});

export default router;
