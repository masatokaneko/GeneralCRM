import { Router } from "express";
import { poolConsumptionRepository } from "../repositories/poolConsumptionRepository.js";
import { contractLineItemRepository } from "../repositories/contractLineItemRepository.js";
import { contractRepository } from "../repositories/contractRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List pending consumptions (for approval queue)
router.get("/pending", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await poolConsumptionRepository.listPending(req.context!.tenantId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get consumption by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consumption = await poolConsumptionRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!consumption) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Pool consumption not found",
        },
      });
      return;
    }
    res.json(consumption);
  } catch (error) {
    next(error);
  }
});

// Create consumption request
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contractLineItemId, consumptionDate, quantity, unitPrice, amount, description, externalReference } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!contractLineItemId) {
      errors.push({ field: "contractLineItemId", message: "Contract Line Item ID is required" });
    }
    if (!consumptionDate) {
      errors.push({ field: "consumptionDate", message: "Consumption Date is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Get contract line item to validate
    const lineItem = await contractLineItemRepository.findById(
      req.context!.tenantId,
      contractLineItemId
    );

    if (!lineItem) {
      throw new ValidationError([
        { field: "contractLineItemId", message: "Contract line item does not exist" },
      ]);
    }

    // Get contract to check type and dates
    const contract = await contractRepository.findById(
      req.context!.tenantId,
      lineItem.contractId
    );

    if (!contract) {
      throw new ValidationError([
        { field: "contractId", message: "Contract does not exist" },
      ]);
    }

    // INV-PC2: Only PoF contracts can have consumptions
    if (contract.contractType !== "PoF") {
      throw new ValidationError([
        { field: "contractType", message: "Contract must be of type PoF" },
      ]);
    }

    // Check if contract is active
    if (contract.status !== "Activated") {
      throw new ValidationError([
        { field: "status", message: "Contract is not in Activated status" },
      ]);
    }

    // INV-PC3: Consumption date must be within contract period
    const consumptionDateObj = new Date(consumptionDate);
    if (lineItem.startDate && consumptionDateObj < new Date(lineItem.startDate)) {
      throw new ValidationError([
        { field: "consumptionDate", message: `Consumption date must be on or after ${lineItem.startDate}` },
      ]);
    }
    if (lineItem.endDate && consumptionDateObj > new Date(lineItem.endDate)) {
      throw new ValidationError([
        { field: "consumptionDate", message: `Consumption date must be on or before ${lineItem.endDate}` },
      ]);
    }

    const consumption = await poolConsumptionRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      {
        contractLineItemId,
        consumptionDate,
        quantity: quantity || 1,
        unitPrice: unitPrice || lineItem.unitPrice,
        amount,
        description,
        externalReference,
      }
    );
    res.status(201).json(consumption);
  } catch (error) {
    next(error);
  }
});

// Approve consumption
router.post("/:id/actions/approve", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consumption = await poolConsumptionRepository.approve(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(consumption);
  } catch (error) {
    next(error);
  }
});

// Reject consumption
router.post("/:id/actions/reject", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      throw new ValidationError([
        { field: "reason", message: "Rejection reason is required" },
      ]);
    }

    const consumption = await poolConsumptionRepository.reject(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      reason
    );
    res.json(consumption);
  } catch (error) {
    next(error);
  }
});

// Cancel consumption
router.post("/:id/actions/cancel", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consumption = await poolConsumptionRepository.cancel(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(consumption);
  } catch (error) {
    next(error);
  }
});

// Delete consumption (only Pending)
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await poolConsumptionRepository.delete(
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
