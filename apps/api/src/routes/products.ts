import { Router } from "express";
import { productRepository } from "../repositories/productRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List products
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort, order, search, ...filters } = req.query;
    const result = await productRepository.list(req.context!.tenantId, {
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

// Get product by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!product) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Product not found",
        },
      });
      return;
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Create product
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, ...data } = req.body;
    if (!name) {
      throw new ValidationError([
        { field: "name", message: "Name is required" },
      ]);
    }
    const product = await productRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, isActive: true, ...data }
    );
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

// Update product
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const product = await productRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Delete product
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productRepository.delete(
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
