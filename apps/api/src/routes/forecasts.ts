import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { forecastRepository, determineForecastCategory } from "../repositories/forecastRepository.js";
import { forecastPeriodRepository } from "../repositories/forecastPeriodRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type {
  CreateForecastInput,
  UpdateForecastInput,
  CreateForecastItemInput,
  CreateForecastAdjustmentInput,
  ForecastCategory,
} from "../types/index.js";

const router = Router();

// GET /forecasts - List forecasts
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { limit, cursor, orderBy, orderDir, ownerId, periodId, forecastCategory } = req.query;

    const result = await forecastRepository.list(tenantId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string,
      orderBy: orderBy as string,
      orderDir: orderDir as "ASC" | "DESC",
      filters: {
        ownerId: ownerId as string,
        periodId: periodId as string,
        forecastCategory: forecastCategory as ForecastCategory,
      },
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /forecasts/summary - Get forecast summary by period
router.get("/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { periodId } = req.query;

    if (!periodId) {
      throw new ValidationError([
        { field: "periodId", message: "Period ID is required" },
      ]);
    }

    const summary = await forecastRepository.getSummaryByPeriod(
      tenantId,
      periodId as string
    );

    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// GET /forecasts/:id - Get a single forecast
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const forecast = await forecastRepository.findByIdOrThrow(tenantId, id);
    res.json(forecast);
  } catch (error) {
    next(error);
  }
});

// POST /forecasts - Create a new forecast
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const data = req.body as CreateForecastInput;

    // Validate required fields
    const errors: Array<{ field: string; message: string }> = [];

    if (!data.ownerId) {
      errors.push({ field: "ownerId", message: "Owner ID is required" });
    }
    if (!data.periodId) {
      errors.push({ field: "periodId", message: "Period ID is required" });
    }
    if (!data.forecastCategory) {
      errors.push({ field: "forecastCategory", message: "Forecast category is required" });
    }
    if (data.amount === undefined || data.amount === null) {
      errors.push({ field: "amount", message: "Amount is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Validate forecast category
    if (!["Pipeline", "BestCase", "Commit", "Closed"].includes(data.forecastCategory)) {
      throw new ValidationError([
        { field: "forecastCategory", message: "Invalid forecast category" },
      ]);
    }

    // Verify period exists
    await forecastPeriodRepository.findByIdOrThrow(tenantId, data.periodId);

    // Check for duplicate
    const existing = await forecastRepository.findByOwnerAndPeriod(
      tenantId,
      data.ownerId,
      data.periodId,
      data.forecastCategory
    );

    if (existing.length > 0) {
      throw new ValidationError([
        { field: "forecastCategory", message: "A forecast already exists for this owner, period, and category" },
      ]);
    }

    const forecast = await forecastRepository.create(tenantId, userId, data);
    res.status(201).json(forecast);
  } catch (error) {
    next(error);
  }
});

// PATCH /forecasts/:id - Update a forecast
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;
    const data = req.body as UpdateForecastInput;
    const etag = req.headers["if-match"] as string | undefined;

    const forecast = await forecastRepository.update(
      tenantId,
      userId,
      id,
      data,
      etag
    );

    res.json(forecast);
  } catch (error) {
    next(error);
  }
});

// DELETE /forecasts/:id - Delete a forecast
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;

    await forecastRepository.delete(tenantId, userId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /forecasts/:id/calculate - Recalculate forecast from opportunities
router.post("/:id/calculate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { periodId } = req.body as { periodId: string };

    if (!periodId) {
      throw new ValidationError([
        { field: "periodId", message: "Period ID is required" },
      ]);
    }

    const forecasts = await forecastRepository.calculateFromOpportunities(
      tenantId,
      userId,
      periodId
    );

    res.json({ records: forecasts, totalSize: forecasts.length });
  } catch (error) {
    next(error);
  }
});

// ==================== Forecast Items ====================

// GET /forecasts/:id/items - Get forecast items
router.get("/:id/items", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { id } = req.params;

    // Verify forecast exists
    await forecastRepository.findByIdOrThrow(tenantId, id);

    const items = await forecastRepository.getItems(tenantId, id);
    res.json({ records: items, totalSize: items.length });
  } catch (error) {
    next(error);
  }
});

// POST /forecasts/:id/items - Add forecast item
router.post("/:id/items", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;
    const data = req.body as Omit<CreateForecastItemInput, "forecastId">;

    // Verify forecast exists
    await forecastRepository.findByIdOrThrow(tenantId, id);

    // Validate required fields
    const errors: Array<{ field: string; message: string }> = [];

    if (!data.opportunityId) {
      errors.push({ field: "opportunityId", message: "Opportunity ID is required" });
    }
    if (data.amount === undefined) {
      errors.push({ field: "amount", message: "Amount is required" });
    }
    if (data.probability === undefined) {
      errors.push({ field: "probability", message: "Probability is required" });
    }
    if (!data.closeDate) {
      errors.push({ field: "closeDate", message: "Close date is required" });
    }
    if (!data.stageName) {
      errors.push({ field: "stageName", message: "Stage name is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Auto-determine forecast category if not provided
    const forecastCategory = data.forecastCategory || determineForecastCategory(data.probability);

    const item = await forecastRepository.addItem(tenantId, userId, {
      ...data,
      forecastId: id,
      forecastCategory,
      closeDate: new Date(data.closeDate),
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// DELETE /forecasts/:id/items/:itemId - Remove forecast item
router.delete("/:id/items/:itemId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { itemId } = req.params;

    await forecastRepository.removeItem(tenantId, userId, itemId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==================== Forecast Adjustments ====================

// GET /forecasts/:id/adjustments - Get forecast adjustments
router.get("/:id/adjustments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { id } = req.params;

    // Verify forecast exists
    await forecastRepository.findByIdOrThrow(tenantId, id);

    const adjustments = await forecastRepository.getAdjustments(tenantId, id);
    res.json({ records: adjustments, totalSize: adjustments.length });
  } catch (error) {
    next(error);
  }
});

// POST /forecasts/:id/adjustments - Add forecast adjustment
router.post("/:id/adjustments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;
    const data = req.body as Omit<CreateForecastAdjustmentInput, "forecastId">;

    // Verify forecast exists
    const forecast = await forecastRepository.findByIdOrThrow(tenantId, id);

    // Validate required fields
    const errors: Array<{ field: string; message: string }> = [];

    if (!data.adjustmentType) {
      errors.push({ field: "adjustmentType", message: "Adjustment type is required" });
    }
    if (data.adjustedAmount === undefined) {
      errors.push({ field: "adjustedAmount", message: "Adjusted amount is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Validate adjustment type
    if (!["OwnerAdjustment", "ManagerAdjustment"].includes(data.adjustmentType)) {
      throw new ValidationError([
        { field: "adjustmentType", message: "Invalid adjustment type" },
      ]);
    }

    const adjustment = await forecastRepository.addAdjustment(tenantId, userId, {
      ...data,
      forecastId: id,
      originalAmount: data.originalAmount ?? forecast.amount,
    });

    // Update forecast amount with adjusted amount
    await forecastRepository.update(tenantId, userId, id, {
      amount: data.adjustedAmount,
    });

    res.status(201).json(adjustment);
  } catch (error) {
    next(error);
  }
});

export default router;
