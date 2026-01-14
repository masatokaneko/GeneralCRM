import { Router } from "express";
import { accountRepository } from "../repositories/accountRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List accounts
router.get("/", permissionMiddleware.list("Account"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort, order, search, ...filters } = req.query;
    const result = await accountRepository.list(
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

// Get account by ID
router.get("/:id", permissionMiddleware.get("Account"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await accountRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!account) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Account not found",
        },
      });
      return;
    }
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// Create account
router.post("/", permissionMiddleware.create("Account"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, ...data } = req.body;
    if (!name) {
      throw new ValidationError([
        { field: "name", message: "Name is required." },
      ]);
    }
    const account = await accountRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, ...data }
    );
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

// Update account
router.patch("/:id", permissionMiddleware.update("Account"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const account = await accountRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// Delete account
router.delete("/:id", permissionMiddleware.delete("Account"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await accountRepository.delete(
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
