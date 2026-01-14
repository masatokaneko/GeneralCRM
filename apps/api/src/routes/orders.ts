import { Router } from "express";
import { orderRepository } from "../repositories/orderRepository.js";
import { orderItemRepository } from "../repositories/orderItemRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List orders
router.get("/", permissionMiddleware.list("Order"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, sort, order, accountId, opportunityId, contractId, status, ...filters } = req.query;

    const queryFilters: Record<string, unknown> = { ...filters };
    if (accountId) queryFilters.accountId = accountId;
    if (opportunityId) queryFilters.opportunityId = opportunityId;
    if (contractId) queryFilters.contractId = contractId;
    if (status) queryFilters.status = status;

    const result = await orderRepository.list(
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

// Get order by ID
router.get("/:id", permissionMiddleware.get("Order"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!order) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Order not found",
        },
      });
      return;
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Create order
router.post("/", permissionMiddleware.create("Order"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, accountId, orderNumber, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!name) {
      errors.push({ field: "name", message: "Name is required" });
    }
    if (!accountId) {
      errors.push({ field: "accountId", message: "Account ID is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Generate order number if not provided
    const generatedOrderNumber = orderNumber || `ORD-${Date.now()}`;

    const order = await orderRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, accountId, orderNumber: generatedOrderNumber, ...data }
    );
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// Update order
router.patch("/:id", permissionMiddleware.update("Order"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const order = await orderRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Delete order
router.delete("/:id", permissionMiddleware.delete("Order"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await orderRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Activate order
router.post("/:id/actions/activate", permissionMiddleware.update("Order"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderRepository.activate(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Fulfill order
router.post("/:id/actions/fulfill", permissionMiddleware.update("Order"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderRepository.fulfill(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Cancel order
router.post("/:id/actions/cancel", permissionMiddleware.update("Order"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderRepository.cancel(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Get order items
router.get("/:id/items", permissionMiddleware.get("Order"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await orderItemRepository.listByOrder(
      req.context!.tenantId,
      req.params.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Create order item
router.post("/:id/items", permissionMiddleware.update("Order"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity, unitPrice, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!productId) {
      errors.push({ field: "productId", message: "Product ID is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const orderItem = await orderItemRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      {
        orderId: req.params.id,
        productId,
        quantity: quantity || 1,
        unitPrice: unitPrice || 0,
        ...data,
      }
    );

    // Update order total
    const total = await orderItemRepository.calculateOrderTotal(
      req.context!.tenantId,
      req.params.id
    );
    await orderRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      { totalAmount: total }
    );

    res.status(201).json(orderItem);
  } catch (error) {
    next(error);
  }
});

export default router;
