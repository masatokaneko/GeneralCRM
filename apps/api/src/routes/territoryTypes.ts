import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { territoryTypeRepository } from "../repositories/territoryTypeRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { CreateTerritoryTypeInput, UpdateTerritoryTypeInput } from "../types/index.js";

const router = Router();

// GET /territory-types - List territory types
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { limit, cursor, orderBy, orderDir, search } = req.query;

    const result = await territoryTypeRepository.list(tenantId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string,
      orderBy: orderBy as string,
      orderDir: orderDir as "ASC" | "DESC",
      filters: {
        search: search as string,
      },
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /territory-types/:id - Get a single territory type
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const type = await territoryTypeRepository.findByIdOrThrow(tenantId, id);
    res.json(type);
  } catch (error) {
    next(error);
  }
});

// POST /territory-types - Create a new territory type
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const data = req.body as CreateTerritoryTypeInput;

    // Validate required fields
    if (!data.name) {
      throw new ValidationError([
        { field: "name", message: "Name is required" },
      ]);
    }

    const type = await territoryTypeRepository.create(tenantId, userId, data);
    res.status(201).json(type);
  } catch (error) {
    next(error);
  }
});

// PATCH /territory-types/:id - Update a territory type
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;
    const data = req.body as UpdateTerritoryTypeInput;
    const etag = req.headers["if-match"] as string | undefined;

    const type = await territoryTypeRepository.update(
      tenantId,
      userId,
      id,
      data,
      etag
    );

    res.json(type);
  } catch (error) {
    next(error);
  }
});

// DELETE /territory-types/:id - Delete a territory type
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;

    await territoryTypeRepository.delete(tenantId, userId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
