import { Router } from "express";
import { invoiceRepository } from "../repositories/invoiceRepository.js";
import { invoiceLineItemRepository } from "../repositories/invoiceLineItemRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List invoices
router.get("/", permissionMiddleware.list("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, sort, order, accountId, contractId, status, ...filters } = req.query;

    const queryFilters: Record<string, unknown> = { ...filters };
    if (accountId) queryFilters.accountId = accountId;
    if (contractId) queryFilters.contractId = contractId;
    if (status) queryFilters.status = status;

    const result = await invoiceRepository.list(
      req.context!.tenantId,
      {
        limit: limit ? Number(limit) : undefined,
        cursor: cursor as string,
        orderBy: sort as string,
        orderDir: order === "asc" ? "ASC" : "DESC",
        filters: queryFilters,
      },
      req.accessFilter
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get invoice by ID
router.get("/:id", permissionMiddleware.get("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!invoice) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Invoice not found",
        },
      });
      return;
    }
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Create invoice
router.post("/", permissionMiddleware.create("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, invoiceDate, dueDate, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!accountId) {
      errors.push({ field: "accountId", message: "Account ID is required" });
    }
    if (!invoiceDate) {
      errors.push({ field: "invoiceDate", message: "Invoice Date is required" });
    }
    if (!dueDate) {
      errors.push({ field: "dueDate", message: "Due Date is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const invoice = await invoiceRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { accountId, invoiceDate, dueDate, ...data }
    );
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
});

// Update invoice
router.patch("/:id", permissionMiddleware.update("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const invoice = await invoiceRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Delete invoice
router.delete("/:id", permissionMiddleware.delete("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await invoiceRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Send invoice: Draft → Sent
router.post("/:id/actions/send", permissionMiddleware.update("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceRepository.send(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Record payment
router.post("/:id/actions/record-payment", permissionMiddleware.update("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      throw new ValidationError([
        { field: "amount", message: "Payment amount must be greater than 0" },
      ]);
    }

    const invoice = await invoiceRepository.recordPayment(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      amount
    );
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Mark as overdue
router.post("/:id/actions/mark-overdue", permissionMiddleware.update("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceRepository.markOverdue(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Cancel invoice
router.post("/:id/actions/cancel", permissionMiddleware.update("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceRepository.cancel(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Void invoice
router.post("/:id/actions/void", permissionMiddleware.update("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoiceRepository.void(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Get invoice line items
router.get("/:id/line-items", permissionMiddleware.get("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await invoiceLineItemRepository.listByInvoice(
      req.context!.tenantId,
      req.params.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Create invoice line item
router.post("/:id/line-items", permissionMiddleware.update("Invoice"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, description, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!productId) {
      errors.push({ field: "productId", message: "Product ID is required" });
    }
    if (!description) {
      errors.push({ field: "description", message: "Description is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Check if invoice is Draft (only allow adding items on Draft invoices)
    const invoice = await invoiceRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (invoice && invoice.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Invoice must be in Draft status to add items" },
      ]);
    }

    const lineItem = await invoiceLineItemRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      {
        invoiceId: req.params.id,
        productId,
        description,
        ...data,
      }
    );

    // Update invoice totals
    const totals = await invoiceLineItemRepository.calculateInvoiceTotal(
      req.context!.tenantId,
      req.params.id
    );
    await invoiceRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      {
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
      }
    );

    res.status(201).json(lineItem);
  } catch (error) {
    next(error);
  }
});

export default router;
