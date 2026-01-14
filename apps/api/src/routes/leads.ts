import { Router } from "express";
import { leadRepository } from "../repositories/leadRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List leads
router.get("/", permissionMiddleware.list("Lead"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort, order, search, ...filters } = req.query;
    const result = await leadRepository.list(
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

// Get lead by ID
router.get("/:id", permissionMiddleware.get("Lead"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await leadRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!lead) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Lead not found",
        },
      });
      return;
    }
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

// Create lead
router.post("/", permissionMiddleware.create("Lead"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lastName, company, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!lastName) {
      errors.push({ field: "lastName", message: "Last name is required" });
    }
    if (!company) {
      errors.push({ field: "company", message: "Company is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const lead = await leadRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { lastName, company, ...data }
    );
    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
});

// Update lead
router.patch("/:id", permissionMiddleware.update("Lead"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const lead = await leadRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

// Delete lead
router.delete("/:id", permissionMiddleware.delete("Lead"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await leadRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Convert lead to Account + Contact + Opportunity
router.post("/:id/convert", permissionMiddleware.update("Lead"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { createAccount, existingAccountId, createOpportunity, opportunityName } = req.body;

    const result = await leadRepository.convert(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      {
        createAccount,
        existingAccountId,
        createOpportunity,
        opportunityName,
      }
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
