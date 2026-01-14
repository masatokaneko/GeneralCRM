import { Router } from "express";
import { opportunityRepository } from "../repositories/opportunityRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List opportunities
router.get("/", permissionMiddleware.list("Opportunity"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort, order, search, accountId, ...filters } = req.query;

    // If accountId is provided, use findByAccountId
    if (accountId) {
      const result = await opportunityRepository.findByAccountId(
        req.context!.tenantId,
        accountId as string,
        {
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          sort: sort as string,
          order: order as "asc" | "desc",
          search: search as string,
          filters: filters as Record<string, string>,
        }
      );
      res.json(result);
      return;
    }

    const result = await opportunityRepository.list(
      req.context!.tenantId,
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sort: sort as string,
        order: order as "asc" | "desc",
        search: search as string,
        filters: filters as Record<string, string>,
      },
      req.accessFilter
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get opportunity by ID
router.get("/:id", permissionMiddleware.get("Opportunity"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const opportunity = await opportunityRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!opportunity) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Opportunity not found",
        },
      });
      return;
    }
    res.json(opportunity);
  } catch (error) {
    next(error);
  }
});

// Create opportunity
router.post("/", permissionMiddleware.create("Opportunity"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, accountId, stageName, closeDate, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!name) {
      errors.push({ field: "name", message: "Name is required" });
    }
    if (!accountId) {
      errors.push({ field: "accountId", message: "Account ID is required" });
    }
    if (!stageName) {
      errors.push({ field: "stageName", message: "Stage is required" });
    }
    if (!closeDate) {
      errors.push({ field: "closeDate", message: "Close date is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const opportunity = await opportunityRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, accountId, stageName, closeDate, ...data }
    );
    res.status(201).json(opportunity);
  } catch (error) {
    next(error);
  }
});

// Update opportunity
router.patch("/:id", permissionMiddleware.update("Opportunity"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const opportunity = await opportunityRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(opportunity);
  } catch (error) {
    next(error);
  }
});

// Delete opportunity
router.delete("/:id", permissionMiddleware.delete("Opportunity"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await opportunityRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Change stage
router.post("/:id/stage", permissionMiddleware.update("Opportunity"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stageName } = req.body;

    if (!stageName) {
      throw new ValidationError([
        { field: "stageName", message: "Stage name is required" },
      ]);
    }

    const opportunity = await opportunityRepository.changeStage(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      stageName
    );
    res.json(opportunity);
  } catch (error) {
    next(error);
  }
});

// Close opportunity (Won or Lost)
router.post("/:id/close", permissionMiddleware.update("Opportunity"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isWon, lostReason } = req.body;

    if (typeof isWon !== "boolean") {
      throw new ValidationError([
        { field: "isWon", message: "isWon must be a boolean" },
      ]);
    }

    if (!isWon && !lostReason) {
      throw new ValidationError([
        { field: "lostReason", message: "Lost reason is required" },
      ]);
    }

    const opportunity = await opportunityRepository.close(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      isWon,
      lostReason
    );
    res.json(opportunity);
  } catch (error) {
    next(error);
  }
});

export default router;
