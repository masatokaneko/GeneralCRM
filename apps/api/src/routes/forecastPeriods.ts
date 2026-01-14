import { Router } from "express";
import { forecastPeriodRepository } from "../repositories/forecastPeriodRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";
import type { CreateForecastPeriodInput, UpdateForecastPeriodInput } from "../types/index.js";

const router = Router();

// GET /forecast-periods - List forecast periods
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const {
      limit,
      cursor,
      orderBy,
      orderDir,
      periodType,
      fiscalYear,
      fiscalQuarter,
      isClosed,
    } = req.query;

    const result = await forecastPeriodRepository.list(tenantId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string,
      orderBy: orderBy as string,
      orderDir: orderDir as "ASC" | "DESC",
      filters: {
        periodType: periodType as string,
        fiscalYear: fiscalYear ? parseInt(fiscalYear as string, 10) : undefined,
        fiscalQuarter: fiscalQuarter ? parseInt(fiscalQuarter as string, 10) : undefined,
        isClosed: isClosed !== undefined ? isClosed === "true" : undefined,
      },
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /forecast-periods/current - Get current period
router.get("/current", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const period = await forecastPeriodRepository.findCurrent(tenantId);

    if (!period) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "No current forecast period found",
        },
      });
      return;
    }

    res.json(period);
  } catch (error) {
    next(error);
  }
});

// GET /forecast-periods/open - Get open periods
router.get("/open", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const periods = await forecastPeriodRepository.findOpen(tenantId);
    res.json({ records: periods, totalSize: periods.length });
  } catch (error) {
    next(error);
  }
});

// GET /forecast-periods/:id - Get a single forecast period
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const period = await forecastPeriodRepository.findByIdOrThrow(tenantId, id);
    res.json(period);
  } catch (error) {
    next(error);
  }
});

// POST /forecast-periods - Create a new forecast period
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const data = req.body as CreateForecastPeriodInput;

    // Validate required fields
    const errors: Array<{ field: string; message: string }> = [];

    if (!data.name) {
      errors.push({ field: "name", message: "Name is required" });
    }
    if (!data.periodType) {
      errors.push({ field: "periodType", message: "Period type is required" });
    }
    if (!data.startDate) {
      errors.push({ field: "startDate", message: "Start date is required" });
    }
    if (!data.endDate) {
      errors.push({ field: "endDate", message: "End date is required" });
    }
    if (!data.fiscalYear) {
      errors.push({ field: "fiscalYear", message: "Fiscal year is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Validate period type values
    if (!["Monthly", "Quarterly", "Yearly"].includes(data.periodType)) {
      throw new ValidationError([
        { field: "periodType", message: "Invalid period type. Must be Monthly, Quarterly, or Yearly" },
      ]);
    }

    // Validate date range
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate < startDate) {
      throw new ValidationError([
        { field: "endDate", message: "End date must be after or equal to start date" },
      ]);
    }

    const period = await forecastPeriodRepository.create(tenantId, userId, {
      ...data,
      startDate,
      endDate,
    });

    res.status(201).json(period);
  } catch (error) {
    next(error);
  }
});

// PATCH /forecast-periods/:id - Update a forecast period
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;
    const data = req.body as UpdateForecastPeriodInput;
    const etag = req.headers["if-match"] as string | undefined;

    // Validate period type if provided
    if (data.periodType && !["Monthly", "Quarterly", "Yearly"].includes(data.periodType)) {
      throw new ValidationError([
        { field: "periodType", message: "Invalid period type. Must be Monthly, Quarterly, or Yearly" },
      ]);
    }

    // Convert dates if provided
    const updateData: UpdateForecastPeriodInput = { ...data };
    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    const period = await forecastPeriodRepository.update(
      tenantId,
      userId,
      id,
      updateData,
      etag
    );

    res.json(period);
  } catch (error) {
    next(error);
  }
});

// DELETE /forecast-periods/:id - Delete a forecast period
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;

    await forecastPeriodRepository.delete(tenantId, userId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /forecast-periods/:id/close - Close a forecast period
router.post("/:id/close", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;

    const period = await forecastPeriodRepository.close(tenantId, userId, id);
    res.json(period);
  } catch (error) {
    next(error);
  }
});

export default router;
