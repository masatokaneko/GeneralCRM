import { Router } from "express";
import { orderItemRepository } from "../repositories/orderItemRepository.js";
import { orderRepository } from "../repositories/orderRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Get order item by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderItem = await orderItemRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!orderItem) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Order item not found",
        },
      });
      return;
    }
    res.json(orderItem);
  } catch (error) {
    next(error);
  }
});

// Update order item
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;

    // Get the order item first to check order status
    const existingItem = await orderItemRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!existingItem) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Order item not found",
        },
      });
      return;
    }

    // Check if order is Draft (only allow updates on Draft orders)
    const order = await orderRepository.findById(
      req.context!.tenantId,
      existingItem.orderId
    );

    if (order && order.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Order must be in Draft status to update items" },
      ]);
    }

    const orderItem = await orderItemRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );

    // Update order total
    const total = await orderItemRepository.calculateOrderTotal(
      req.context!.tenantId,
      existingItem.orderId
    );
    await orderRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      existingItem.orderId,
      { totalAmount: total }
    );

    res.json(orderItem);
  } catch (error) {
    next(error);
  }
});

// Delete order item
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the order item first
    const existingItem = await orderItemRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!existingItem) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Order item not found",
        },
      });
      return;
    }

    // Check if order is Draft
    const order = await orderRepository.findById(
      req.context!.tenantId,
      existingItem.orderId
    );

    if (order && order.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Order must be in Draft status to delete items" },
      ]);
    }

    await orderItemRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    // Update order total
    const total = await orderItemRepository.calculateOrderTotal(
      req.context!.tenantId,
      existingItem.orderId
    );
    await orderRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      existingItem.orderId,
      { totalAmount: total }
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
