import { Router } from "express";
import { pricebookEntryRepository } from "../repositories/pricebookEntryRepository.js";
import { pricebookRepository } from "../repositories/pricebookRepository.js";
import { productRepository } from "../repositories/productRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List pricebook entries
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, pricebookId, productId, ...filters } = req.query;
    const result = await pricebookEntryRepository.listWithDetails(
      req.context!.tenantId,
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        filters: {
          ...filters,
          pricebookId: pricebookId as string,
          productId: productId as string,
        },
      }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get pricebook entry by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entry = await pricebookEntryRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!entry) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Pricebook entry not found",
        },
      });
      return;
    }
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

// Create pricebook entry
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pricebookId, productId, unitPrice, ...data } = req.body;

    const errors: Array<{ field: string; message: string }> = [];

    if (!pricebookId) {
      errors.push({ field: "pricebookId", message: "Pricebook ID is required" });
    }
    if (!productId) {
      errors.push({ field: "productId", message: "Product ID is required" });
    }
    if (unitPrice === undefined || unitPrice === null) {
      errors.push({ field: "unitPrice", message: "Unit price is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Verify pricebook exists
    const pricebook = await pricebookRepository.findById(
      req.context!.tenantId,
      pricebookId
    );
    if (!pricebook) {
      throw new ValidationError([
        { field: "pricebookId", message: "Pricebook not found" },
      ]);
    }

    // Verify product exists
    const product = await productRepository.findById(
      req.context!.tenantId,
      productId
    );
    if (!product) {
      throw new ValidationError([
        { field: "productId", message: "Product not found" },
      ]);
    }

    // Check for duplicate entry
    const existing = await pricebookEntryRepository.findByPricebookAndProduct(
      req.context!.tenantId,
      pricebookId,
      productId
    );
    if (existing) {
      throw new ValidationError([
        {
          field: "productId",
          message: "This product already has an entry in this pricebook",
        },
      ]);
    }

    const entry = await pricebookEntryRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { pricebookId, productId, unitPrice, isActive: true, ...data }
    );
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// Update pricebook entry
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const entry = await pricebookEntryRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

// Delete pricebook entry
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await pricebookEntryRepository.delete(
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
