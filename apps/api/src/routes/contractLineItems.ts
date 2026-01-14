import { Router } from "express";
import { contractLineItemRepository } from "../repositories/contractLineItemRepository.js";
import { contractRepository } from "../repositories/contractRepository.js";
import { poolConsumptionRepository } from "../repositories/poolConsumptionRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Get contract line item by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lineItem = await contractLineItemRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!lineItem) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Contract line item not found",
        },
      });
      return;
    }
    res.json(lineItem);
  } catch (error) {
    next(error);
  }
});

// Update contract line item
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;

    // Get the line item first to check contract status
    const existingItem = await contractLineItemRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!existingItem) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Contract line item not found",
        },
      });
      return;
    }

    // Check if contract is Draft (only allow updates on Draft contracts)
    const contract = await contractRepository.findById(
      req.context!.tenantId,
      existingItem.contractId
    );

    if (contract && contract.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Contract must be in Draft status to update items" },
      ]);
    }

    const lineItem = await contractLineItemRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );

    // Update contract total
    const total = await contractLineItemRepository.calculateContractTotal(
      req.context!.tenantId,
      existingItem.contractId
    );
    await contractRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      existingItem.contractId,
      { totalContractValue: total, remainingValue: total }
    );

    res.json(lineItem);
  } catch (error) {
    next(error);
  }
});

// Delete contract line item
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the line item first
    const existingItem = await contractLineItemRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!existingItem) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Contract line item not found",
        },
      });
      return;
    }

    // Check if contract is Draft
    const contract = await contractRepository.findById(
      req.context!.tenantId,
      existingItem.contractId
    );

    if (contract && contract.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Contract must be in Draft status to delete items" },
      ]);
    }

    await contractLineItemRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    // Update contract total
    const total = await contractLineItemRepository.calculateContractTotal(
      req.context!.tenantId,
      existingItem.contractId
    );
    await contractRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      existingItem.contractId,
      { totalContractValue: total, remainingValue: total }
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get pool consumptions for line item
router.get("/:id/consumptions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await poolConsumptionRepository.listByContractLineItem(
      req.context!.tenantId,
      req.params.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
