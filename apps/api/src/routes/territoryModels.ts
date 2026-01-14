import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { territoryModelRepository } from "../repositories/territoryModelRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { CreateTerritoryModelInput, UpdateTerritoryModelInput } from "../types/index.js";

const router = Router();

// GET /territory-models - List territory models
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { limit, cursor, orderBy, orderDir, state, search } = req.query;

    const result = await territoryModelRepository.list(tenantId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string,
      orderBy: orderBy as string,
      orderDir: orderDir as "ASC" | "DESC",
      filters: {
        state: state as string,
        search: search as string,
      },
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /territory-models/active - Get the currently active model
router.get("/active", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;

    const model = await territoryModelRepository.findActive(tenantId);

    if (!model) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "No active territory model found",
        },
      });
      return;
    }

    res.json(model);
  } catch (error) {
    next(error);
  }
});

// GET /territory-models/:id - Get a single territory model
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.context!;
    const { id } = req.params;

    const model = await territoryModelRepository.findByIdOrThrow(tenantId, id);
    res.json(model);
  } catch (error) {
    next(error);
  }
});

// POST /territory-models - Create a new territory model
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const data = req.body as CreateTerritoryModelInput;

    // Validate required fields
    if (!data.name) {
      throw new ValidationError([
        { field: "name", message: "Name is required" },
      ]);
    }

    const model = await territoryModelRepository.create(tenantId, userId, data);
    res.status(201).json(model);
  } catch (error) {
    next(error);
  }
});

// PATCH /territory-models/:id - Update a territory model
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;
    const data = req.body as UpdateTerritoryModelInput;
    const etag = req.headers["if-match"] as string | undefined;

    const model = await territoryModelRepository.update(
      tenantId,
      userId,
      id,
      data,
      etag
    );

    res.json(model);
  } catch (error) {
    next(error);
  }
});

// DELETE /territory-models/:id - Delete a territory model
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;

    await territoryModelRepository.delete(tenantId, userId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /territory-models/:id/activate - Activate a territory model
router.post("/:id/activate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;

    const model = await territoryModelRepository.activate(tenantId, userId, id);
    res.json(model);
  } catch (error) {
    next(error);
  }
});

// POST /territory-models/:id/archive - Archive a territory model
router.post("/:id/archive", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;

    const model = await territoryModelRepository.archive(tenantId, userId, id);
    res.json(model);
  } catch (error) {
    next(error);
  }
});

// POST /territory-models/:id/clone - Clone a territory model
router.post("/:id/clone", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId } = req.context!;
    const { id } = req.params;
    const { name } = req.body as { name: string };

    if (!name) {
      throw new ValidationError([
        { field: "name", message: "Name is required for the cloned model" },
      ]);
    }

    const model = await territoryModelRepository.clone(tenantId, userId, id, name);
    res.status(201).json(model);
  } catch (error) {
    next(error);
  }
});

export default router;
