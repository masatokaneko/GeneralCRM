import { Router } from "express";
import { pricebookRepository } from "../repositories/pricebookRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List pricebooks
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort, order, search, ...filters } = req.query;
    const result = await pricebookRepository.list(req.context!.tenantId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort: sort as string,
      order: order as "asc" | "desc",
      search: search as string,
      filters: filters as Record<string, string>,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get pricebook by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pricebook = await pricebookRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!pricebook) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Pricebook not found",
        },
      });
      return;
    }
    res.json(pricebook);
  } catch (error) {
    next(error);
  }
});

// Create pricebook
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, ...data } = req.body;
    if (!name) {
      throw new ValidationError([
        { field: "name", message: "Name is required" },
      ]);
    }
    const pricebook = await pricebookRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, isActive: true, isStandard: false, ...data }
    );
    res.status(201).json(pricebook);
  } catch (error) {
    next(error);
  }
});

// Update pricebook
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const pricebook = await pricebookRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(pricebook);
  } catch (error) {
    next(error);
  }
});

// Delete pricebook
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pricebookRepository.delete(
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
