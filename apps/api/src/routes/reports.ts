import { Router } from "express";
import { reportRepository } from "../repositories/reportRepository.js";
import { queryEngineService } from "../services/queryEngineService.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List reports
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, sort, order, search, folderId, reportType, baseObject } = req.query;

    const result = await reportRepository.list(
      req.context!.tenantId,
      req.context!.userId,
      {
        limit: limit ? Number(limit) : undefined,
        cursor: cursor as string,
        orderBy: sort as string,
        orderDir: order === "asc" ? "ASC" : "DESC",
        filters: {
          search: search as string,
          folderId: folderId as string,
          reportType: reportType as string,
          baseObject: baseObject as string,
        },
      }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get report by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!report) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Report not found",
        },
      });
      return;
    }

    // Check access: public or owner
    if (!report.isPublic && report.ownerId !== req.context!.userId) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this report",
        },
      });
      return;
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
});

// Create report
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, baseObject, reportType, definition, chartConfig, description, folderId, isPublic } = req.body;

    const errors: Array<{ field: string; message: string }> = [];

    if (!name) {
      errors.push({ field: "name", message: "Name is required" });
    }
    if (!baseObject) {
      errors.push({ field: "baseObject", message: "Base object is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const report = await reportRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      {
        name,
        baseObject,
        reportType: reportType || "Tabular",
        definition: definition || { select: ["id", "name"] },
        chartConfig,
        description,
        folderId,
        isPublic: isPublic || false,
      }
    );
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
});

// Update report
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await reportRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!existing) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Report not found",
        },
      });
      return;
    }

    // Only owner can update
    if (existing.ownerId !== req.context!.userId) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Only the owner can update this report",
        },
      });
      return;
    }

    const etag = req.headers["if-match"] as string | undefined;
    const report = await reportRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(report);
  } catch (error) {
    next(error);
  }
});

// Delete report
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await reportRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!existing) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Report not found",
        },
      });
      return;
    }

    // Only owner can delete
    if (existing.ownerId !== req.context!.userId) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Only the owner can delete this report",
        },
      });
      return;
    }

    await reportRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Run report
router.post("/:id/run", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!report) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Report not found",
        },
      });
      return;
    }

    // Check access
    if (!report.isPublic && report.ownerId !== req.context!.userId) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this report",
        },
      });
      return;
    }

    // Create run record
    const run = await reportRepository.createRun(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body.parameters
    );

    try {
      // Execute the report query
      const result = await queryEngineService.execute(
        req.context!.tenantId,
        req.context!.userId,
        {
          objectName: report.baseObject,
          select: report.definition.select,
          where: report.definition.filters?.map((f) => ({
            field: f.field,
            operator: f.operator as "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in" | "notIn" | "isNull" | "isNotNull",
            value: f.value,
          })),
          orderBy: report.definition.orderBy,
          groupBy: report.definition.groupBy,
          aggregations: report.definition.aggregations?.map((a) => ({
            field: a.field,
            function: a.function as "count" | "sum" | "avg" | "min" | "max",
            alias: a.alias,
          })),
          limit: report.definition.limit,
        }
      );

      // Update run with results
      const completedRun = await reportRepository.updateRun(
        req.context!.tenantId,
        run.id,
        "Completed",
        result.records
      );

      res.json({
        run: completedRun,
        data: result.records,
        totalSize: result.totalSize,
      });
    } catch (error) {
      // Update run with error
      await reportRepository.updateRun(
        req.context!.tenantId,
        run.id,
        "Failed",
        undefined,
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// Get report run history
router.get("/:id/runs", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!report) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Report not found",
        },
      });
      return;
    }

    // Check access
    if (!report.isPublic && report.ownerId !== req.context!.userId) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this report",
        },
      });
      return;
    }

    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const runs = await reportRepository.listRuns(
      req.context!.tenantId,
      req.params.id,
      limit
    );

    res.json({ runs });
  } catch (error) {
    next(error);
  }
});

// Get specific run result
router.get("/:id/runs/:runId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const run = await reportRepository.findRunById(
      req.context!.tenantId,
      req.params.runId
    );

    if (!run) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Report run not found",
        },
      });
      return;
    }

    // Check report access
    const report = await reportRepository.findById(
      req.context!.tenantId,
      run.reportId
    );

    if (!report) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Report not found",
        },
      });
      return;
    }

    if (!report.isPublic && report.ownerId !== req.context!.userId) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this report",
        },
      });
      return;
    }

    res.json(run);
  } catch (error) {
    next(error);
  }
});

export default router;
