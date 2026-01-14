import { Router } from "express";
import { invoiceLineItemRepository } from "../repositories/invoiceLineItemRepository.js";
import { invoiceRepository } from "../repositories/invoiceRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Get invoice line item by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lineItem = await invoiceLineItemRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!lineItem) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Invoice line item not found",
        },
      });
      return;
    }
    res.json(lineItem);
  } catch (error) {
    next(error);
  }
});

// Update invoice line item
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;

    // Get the line item first to check invoice status
    const existingItem = await invoiceLineItemRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!existingItem) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Invoice line item not found",
        },
      });
      return;
    }

    // Check if invoice is Draft (only allow updates on Draft invoices)
    const invoice = await invoiceRepository.findById(
      req.context!.tenantId,
      existingItem.invoiceId
    );

    if (invoice && invoice.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Invoice must be in Draft status to update items" },
      ]);
    }

    const lineItem = await invoiceLineItemRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );

    // Update invoice totals
    const totals = await invoiceLineItemRepository.calculateInvoiceTotal(
      req.context!.tenantId,
      existingItem.invoiceId
    );
    await invoiceRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      existingItem.invoiceId,
      {
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
      }
    );

    res.json(lineItem);
  } catch (error) {
    next(error);
  }
});

// Delete invoice line item
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the line item first
    const existingItem = await invoiceLineItemRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!existingItem) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Invoice line item not found",
        },
      });
      return;
    }

    // Check if invoice is Draft
    const invoice = await invoiceRepository.findById(
      req.context!.tenantId,
      existingItem.invoiceId
    );

    if (invoice && invoice.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Invoice must be in Draft status to delete items" },
      ]);
    }

    await invoiceLineItemRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    // Update invoice totals
    const totals = await invoiceLineItemRepository.calculateInvoiceTotal(
      req.context!.tenantId,
      existingItem.invoiceId
    );
    await invoiceRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      existingItem.invoiceId,
      {
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
      }
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
