import { Router } from "express";
import { opportunityLineItemRepository } from "../repositories/opportunityLineItemRepository.js";
import { pricebookEntryRepository } from "../repositories/pricebookEntryRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { query } from "../db/connection.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List line items by opportunity
router.get(
  "/opportunities/:opportunityId/line-items",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await opportunityLineItemRepository.listByOpportunity(
        req.context!.tenantId,
        req.params.opportunityId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get line item by ID
router.get(
  "/opportunity-line-items/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await opportunityLineItemRepository.findById(
        req.context!.tenantId,
        req.params.id
      );
      if (!item) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Opportunity line item not found",
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
  "/opportunities/:opportunityId/line-items",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pricebookEntryId, quantity, unitPrice, discount, description } =
        req.body;

      if (!pricebookEntryId) {
        throw new ValidationError([
          { field: "pricebookEntryId", message: "Pricebook entry is required" },
        ]);
      }

      // Get pricebook entry to get product info
      const entry = await pricebookEntryRepository.findById(
        req.context!.tenantId,
        pricebookEntryId
      );
      if (!entry) {
        throw new ValidationError([
          { field: "pricebookEntryId", message: "Pricebook entry not found" },
        ]);
      }

      const item = await opportunityLineItemRepository.create(
        req.context!.tenantId,
        req.context!.userId,
        {
          opportunityId: req.params.opportunityId,
          pricebookEntryId,
          productId: entry.productId,
          quantity: quantity || 1,
          unitPrice: unitPrice !== undefined ? unitPrice : entry.unitPrice,
          discount: discount || 0,
          description,
        }
      );

      // Update opportunity amount
      await updateOpportunityAmount(
        req.context!.tenantId,
        req.params.opportunityId
      );

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Update line item
router.patch(
  "/opportunity-line-items/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const etag = req.headers["if-match"] as string | undefined;
      const item = await opportunityLineItemRepository.update(
        req.context!.tenantId,
        req.context!.userId,
        req.params.id,
        req.body,
        etag
      );

      // Update opportunity amount
      await updateOpportunityAmount(
        req.context!.tenantId,
        item.opportunityId
      );

      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Delete line item
router.delete(
  "/opportunity-line-items/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get item first to get opportunity ID
      const item = await opportunityLineItemRepository.findById(
        req.context!.tenantId,
        req.params.id
      );
      if (!item) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Opportunity line item not found",
          },
        });
        return;
      }

      await opportunityLineItemRepository.delete(
        req.context!.tenantId,
        req.context!.userId,
        req.params.id
      );

      // Update opportunity amount
      await updateOpportunityAmount(
        req.context!.tenantId,
        item.opportunityId
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

async function updateOpportunityAmount(
  tenantId: string,
  opportunityId: string
): Promise<void> {
  const total = await opportunityLineItemRepository.calculateOpportunityTotal(
    tenantId,
    opportunityId
  );
  await query(
    `UPDATE opportunities SET amount = $1, updated_at = NOW() WHERE tenant_id = $2 AND id = $3`,
    [total, tenantId, opportunityId]
  );
}

export default router;
