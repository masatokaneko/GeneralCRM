import { Router } from "express";
import { quoteLineItemRepository } from "../repositories/quoteLineItemRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { query } from "../db/connection.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List line items by quote
router.get(
  "/quotes/:quoteId/line-items",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await quoteLineItemRepository.listByQuote(
        req.context!.tenantId,
        req.params.quoteId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get line item by ID
router.get(
  "/quote-line-items/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await quoteLineItemRepository.findById(
        req.context!.tenantId,
        req.params.id
      );
      if (!item) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Quote line item not found",
          },
        });
        return;
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Create line item
router.post(
  "/quotes/:quoteId/line-items",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, productId, quantity, unitPrice, discount, description } =
        req.body;

      if (!name) {
        throw new ValidationError([
          { field: "name", message: "Name is required" },
        ]);
      }

      const item = await quoteLineItemRepository.create(
        req.context!.tenantId,
        req.context!.userId,
        {
          quoteId: req.params.quoteId,
          name,
          productId,
          quantity: quantity || 1,
          unitPrice: unitPrice || 0,
          discount: discount || 0,
          description,
        }
      );

      // Update quote totals
      await updateQuoteTotals(req.context!.tenantId, req.params.quoteId);

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Update line item
router.patch(
  "/quote-line-items/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const etag = req.headers["if-match"] as string | undefined;
      const item = await quoteLineItemRepository.update(
        req.context!.tenantId,
        req.context!.userId,
        req.params.id,
        req.body,
        etag
      );

      // Update quote totals
      await updateQuoteTotals(req.context!.tenantId, item.quoteId);

      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Delete line item
router.delete(
  "/quote-line-items/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get item first to get quote ID
      const item = await quoteLineItemRepository.findById(
        req.context!.tenantId,
        req.params.id
      );
      if (!item) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Quote line item not found",
          },
        });
        return;
      }

      await quoteLineItemRepository.delete(
        req.context!.tenantId,
        req.context!.userId,
        req.params.id
      );

      // Update quote totals
      await updateQuoteTotals(req.context!.tenantId, item.quoteId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

async function updateQuoteTotals(
  tenantId: string,
  quoteId: string
): Promise<void> {
  const { subtotal, totalPrice } = await quoteLineItemRepository.calculateQuoteTotal(
    tenantId,
    quoteId
  );
  await query(
    `UPDATE quotes SET subtotal = $1, total_price = $2, grand_total = $2, updated_at = NOW() WHERE tenant_id = $3 AND id = $4`,
    [subtotal, totalPrice, tenantId, quoteId]
  );
}

export default router;
