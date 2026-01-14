import { Router } from "express";
import { fieldHistoryRepository } from "../repositories/fieldHistoryRepository.js";
import { fieldHistoryService } from "../services/fieldHistoryService.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";
import type { TrackableObjectName } from "../types/index.js";

const router = Router();

// ==================== Field History (read-only for audit) ====================

// List field history
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, objectName, recordId, fieldName, changedBy } = req.query;
    const result = await fieldHistoryRepository.listHistory(req.context!.tenantId, {
      limit: limit ? Number(limit) : undefined,
      cursor: cursor as string,
      objectName: objectName as TrackableObjectName,
      recordId: recordId as string,
      fieldName: fieldName as string,
      changedBy: changedBy as string,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get field history by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await fieldHistoryRepository.findHistoryById(
      req.context!.tenantId,
      req.params.id
    );
    if (!history) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Field history record not found",
        },
      });
      return;
    }
    res.json(history);
  } catch (error) {
    next(error);
  }
});

// Get history for a specific record
router.get("/record/:objectName/:recordId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectName, recordId } = req.params;
    const { limit } = req.query;

    const history = await fieldHistoryRepository.findByRecordId(
      req.context!.tenantId,
      objectName as TrackableObjectName,
      recordId,
      limit ? Number(limit) : undefined
    );

    res.json({
      records: history,
      totalSize: history.length,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Field Tracking Settings ====================

// List tracking settings
router.get("/tracking/settings", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, objectName, isTracked } = req.query;
    const result = await fieldHistoryRepository.listTracking(req.context!.tenantId, {
      limit: limit ? Number(limit) : undefined,
      cursor: cursor as string,
      objectName: objectName as TrackableObjectName,
      isTracked: isTracked !== undefined ? isTracked === "true" : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get tracked fields for an object
router.get("/tracking/:objectName", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fields = await fieldHistoryRepository.getTrackedFields(
      req.context!.tenantId,
      req.params.objectName as TrackableObjectName
    );
    res.json({
      objectName: req.params.objectName,
      trackedFields: fields,
    });
  } catch (error) {
    next(error);
  }
});

// Get tracking setting by ID
router.get("/tracking/settings/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setting = await fieldHistoryRepository.findTrackingById(
      req.context!.tenantId,
      req.params.id
    );
    if (!setting) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Tracking setting not found",
        },
      });
      return;
    }
    res.json(setting);
  } catch (error) {
    next(error);
  }
});

// Create tracking setting
router.post("/tracking/settings", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectName, fieldName, isTracked } = req.body;

    if (!objectName) {
      throw new ValidationError([
        { field: "objectName", message: "objectName is required." },
      ]);
    }
    if (!fieldName) {
      throw new ValidationError([
        { field: "fieldName", message: "fieldName is required." },
      ]);
    }

    const setting = await fieldHistoryRepository.createTracking(
      req.context!.tenantId,
      req.context!.userId,
      { objectName, fieldName, isTracked }
    );

    // Clear cache for this object
    fieldHistoryService.clearCache(req.context!.tenantId, objectName);

    res.status(201).json(setting);
  } catch (error) {
    next(error);
  }
});

// Update tracking setting
router.patch("/tracking/settings/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isTracked } = req.body;

    if (isTracked === undefined) {
      throw new ValidationError([
        { field: "isTracked", message: "isTracked is required." },
      ]);
    }

    // Get current setting for cache clearing
    const current = await fieldHistoryRepository.findTrackingById(
      req.context!.tenantId,
      req.params.id
    );

    const setting = await fieldHistoryRepository.updateTracking(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      { isTracked }
    );

    // Clear cache for this object
    if (current) {
      fieldHistoryService.clearCache(req.context!.tenantId, current.objectName);
    }

    res.json(setting);
  } catch (error) {
    next(error);
  }
});

// Delete tracking setting
router.delete("/tracking/settings/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get current setting for cache clearing
    const current = await fieldHistoryRepository.findTrackingById(
      req.context!.tenantId,
      req.params.id
    );

    await fieldHistoryRepository.deleteTracking(req.context!.tenantId, req.params.id);

    // Clear cache for this object
    if (current) {
      fieldHistoryService.clearCache(req.context!.tenantId, current.objectName);
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
