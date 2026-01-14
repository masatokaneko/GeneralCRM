import { Router } from "express";
import { contactRepository } from "../repositories/contactRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List contacts
router.get("/", permissionMiddleware.list("Contact"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort, order, search, accountId, ...filters } = req.query;

    // If accountId is provided, use findByAccountId
    if (accountId) {
      const result = await contactRepository.findByAccountId(
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

    const result = await contactRepository.list(
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

// Get contact by ID
router.get("/:id", permissionMiddleware.get("Contact"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contact = await contactRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!contact) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Contact not found",
        },
      });
      return;
    }
    res.json(contact);
  } catch (error) {
    next(error);
  }
});

// Create contact
router.post("/", permissionMiddleware.create("Contact"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lastName, accountId, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!lastName) {
      errors.push({ field: "lastName", message: "Last name is required" });
    }
    if (!accountId) {
      errors.push({ field: "accountId", message: "Account ID is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const contact = await contactRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { lastName, accountId, ...data }
    );
    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
});

// Update contact
router.patch("/:id", permissionMiddleware.update("Contact"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const contact = await contactRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(contact);
  } catch (error) {
    next(error);
  }
});

// Delete contact
router.delete("/:id", permissionMiddleware.delete("Contact"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await contactRepository.delete(
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
