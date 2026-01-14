import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { quotaRepository } from "../repositories/quotaRepository.js";
import { forecastPeriodRepository } from "../repositories/forecastPeriodRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { CreateQuotaInput, UpdateQuotaInput } from "../types/index.js";

const router = Router();

// GET /quotas - List quotas
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { limit, cursor, orderBy, orderDir, ownerId, periodId } = req.query;

    const result = await quotaRepository.list(tenantId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string,
      orderBy: orderBy as string,
      orderDir: orderDir as "ASC" | "DESC",
      filters: {
        ownerId: ownerId as string,
        periodId: periodId as string,
      },
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /quotas/summary - Get quota summary by period
router.get("/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { periodId } = req.query;

    if (!periodId) {
      throw new ValidationError([
        { field: "periodId", message: "Period ID is required" },
      ]);
    }

    const summary = await quotaRepository.getSummaryByPeriod(
      tenantId,
      periodId as string
    );

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// GET /quotas/:id - Get a single quota
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const quota = await quotaRepository.findByIdOrThrow(tenantId, id);
    res.json(quota);
  } catch (error) {
    next(error);
  }
});

// GET /quotas/:id/attainment - Get quota with attainment calculation
router.get("/:id/attainment", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const quotaWithAttainment = await quotaRepository.calculateAttainment(
      tenantId,
      id
    );

    res.json(quotaWithAttainment);
  } catch (error) {
    next(error);
  }
});

// POST /quotas - Create a new quota
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const data = req.body as CreateQuotaInput;

    // Validate required fields
    const errors: Array<{ field: string; message: string }> = [];

    if (!data.ownerId) {
      errors.push({ field: "ownerId", message: "Owner ID is required" });
    }
    if (!data.periodId) {
      errors.push({ field: "periodId", message: "Period ID is required" });
    }
    if (data.quotaAmount === undefined || data.quotaAmount === null) {
      errors.push({ field: "quotaAmount", message: "Quota amount is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Validate quota amount is positive
    if (data.quotaAmount < 0) {
      throw new ValidationError([
        { field: "quotaAmount", message: "Quota amount must be non-negative" },
      ]);
    }

    // Verify period exists
    await forecastPeriodRepository.findByIdOrThrow(tenantId, data.periodId);

    // Check for duplicate
    const existing = await quotaRepository.findByOwnerAndPeriod(
      tenantId,
      data.ownerId,
      data.periodId
    );

    if (existing) {
      throw new ValidationError([
        { field: "ownerId", message: "A quota already exists for this owner and period" },
      ]);
    }

    const quota = await quotaRepository.create(tenantId, userId, data);
    res.status(201).json(quota);
  } catch (error) {
    next(error);
  }
});

// PATCH /quotas/:id - Update a quota
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;
    const data = req.body as UpdateQuotaInput;
    const etag = req.headers["if-match"] as string | undefined;

    // Validate quota amount if provided
    if (data.quotaAmount !== undefined && data.quotaAmount < 0) {
      throw new ValidationError([
        { field: "quotaAmount", message: "Quota amount must be non-negative" },
      ]);
    }

    const quota = await quotaRepository.update(
      tenantId,
      userId,
      id,
      data,
      etag
    );

    res.json(quota);
  } catch (error) {
    next(error);
  }
});

// DELETE /quotas/:id - Delete a quota
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;

    await quotaRepository.delete(tenantId, userId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
