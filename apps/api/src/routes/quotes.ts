import { Router } from "express";
import { quoteRepository } from "../repositories/quoteRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List quotes
router.get("/", permissionMiddleware.list("Quote"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort, order, search, opportunityId, ...filters } = req.query;

    // If opportunityId is provided, use findByOpportunityId
    if (opportunityId) {
      const result = await quoteRepository.findByOpportunityId(
        req.context!.tenantId,
        opportunityId as string,
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

    const result = await quoteRepository.list(
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

// Get quote by ID
router.get("/:id", permissionMiddleware.get("Quote"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quote = await quoteRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!quote) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Quote not found",
        },
      });
      return;
    }
    res.json(quote);
  } catch (error) {
    next(error);
  }
});

// Create quote
router.post("/", permissionMiddleware.create("Quote"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, opportunityId, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!name) {
      errors.push({ field: "name", message: "Name is required" });
    }
    if (!opportunityId) {
      errors.push({ field: "opportunityId", message: "Opportunity ID is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const quote = await quoteRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, opportunityId, ...data }
    );
    res.status(201).json(quote);
  } catch (error) {
    next(error);
  }
});

// Update quote
router.patch("/:id", permissionMiddleware.update("Quote"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const quote = await quoteRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(quote);
  } catch (error) {
    next(error);
  }
});

// Delete quote
router.delete("/:id", permissionMiddleware.delete("Quote"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await quoteRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Set as primary quote
router.post("/:id/set-primary", permissionMiddleware.update("Quote"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { opportunityId } = req.body;

    if (!opportunityId) {
      throw new ValidationError([
        { field: "opportunityId", message: "Opportunity ID is required" },
      ]);
    }

    const quote = await quoteRepository.setPrimary(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      opportunityId
    );
    res.json(quote);
  } catch (error) {
    next(error);
  }
});

// Change quote status
router.post("/:id/status", permissionMiddleware.update("Quote"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;

    const validStatuses = ["Draft", "Needs Review", "In Review", "Approved", "Rejected", "Presented", "Accepted"];
    if (!status || !validStatuses.includes(status)) {
      throw new ValidationError([
        { field: "status", message: `Status must be one of: ${validStatuses.join(", ")}` },
      ]);
    }

    const quote = await quoteRepository.changeStatus(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      status
    );
    res.json(quote);
  } catch (error) {
    next(error);
  }
});

export default router;
