import { Router } from "express";
import { contractRepository } from "../repositories/contractRepository.js";
import { contractLineItemRepository } from "../repositories/contractLineItemRepository.js";
import { poolConsumptionRepository } from "../repositories/poolConsumptionRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List contracts
router.get("/", permissionMiddleware.list("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, sort, order, accountId, status, contractType, ...filters } = req.query;

    const queryFilters: Record<string, unknown> = { ...filters };
    if (accountId) queryFilters.accountId = accountId;
    if (status) queryFilters.status = status;
    if (contractType) queryFilters.contractType = contractType;

    const result = await contractRepository.list(
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

// Get contract by ID
router.get("/:id", permissionMiddleware.get("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await contractRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!contract) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Contract not found",
        },
      });
      return;
    }
    res.json(contract);
  } catch (error) {
    next(error);
  }
});

// Create contract
router.post("/", permissionMiddleware.create("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, accountId, contractNumber, contractType, termMonths, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    // INV-CON1: Contract.AccountId is required
    if (!name) {
      errors.push({ field: "name", message: "Name is required" });
    }
    if (!accountId) {
      errors.push({ field: "accountId", message: "Account ID is required" });
    }
    if (!contractType) {
      errors.push({ field: "contractType", message: "Contract Type is required" });
    }
    if (!termMonths) {
      errors.push({ field: "termMonths", message: "Term Months is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Generate contract number if not provided
    const generatedContractNumber = contractNumber || `CON-${Date.now()}`;

    const contract = await contractRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, accountId, contractNumber: generatedContractNumber, contractType, termMonths, ...data }
    );
    res.status(201).json(contract);
  } catch (error) {
    next(error);
  }
});

// Update contract
router.patch("/:id", permissionMiddleware.update("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const contract = await contractRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(contract);
  } catch (error) {
    next(error);
  }
});

// Delete contract
router.delete("/:id", permissionMiddleware.delete("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only allow delete for Draft contracts
    const existing = await contractRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (existing && existing.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Contract must be in Draft status to delete" },
      ]);
    }

    await contractRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Submit for approval: Draft → InApproval
router.post("/:id/actions/submit-for-approval", permissionMiddleware.update("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await contractRepository.submitForApproval(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(contract);
  } catch (error) {
    next(error);
  }
});

// Activate contract: InApproval/Draft → Activated
router.post("/:id/actions/activate", permissionMiddleware.update("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await contractRepository.activate(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(contract);
  } catch (error) {
    next(error);
  }
});

// Terminate contract: Activated → Terminated
router.post("/:id/actions/terminate", permissionMiddleware.update("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const contract = await contractRepository.terminate(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      reason
    );
    res.json(contract);
  } catch (error) {
    next(error);
  }
});

// Expire contract: Activated → Expired
router.post("/:id/actions/expire", permissionMiddleware.update("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contract = await contractRepository.expire(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.json(contract);
  } catch (error) {
    next(error);
  }
});

// Renew contract
router.post("/:id/actions/renew", permissionMiddleware.update("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const renewalData = req.body;
    const contract = await contractRepository.renew(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      renewalData
    );
    res.status(201).json(contract);
  } catch (error) {
    next(error);
  }
});

// Get contract line items
router.get("/:id/line-items", permissionMiddleware.get("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await contractLineItemRepository.listByContract(
      req.context!.tenantId,
      req.params.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Create contract line item
router.post("/:id/line-items", permissionMiddleware.update("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity, unitPrice, startDate, endDate, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!productId) {
      errors.push({ field: "productId", message: "Product ID is required" });
    }
    if (!startDate) {
      errors.push({ field: "startDate", message: "Start Date is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Check if contract is Draft (only allow adding items on Draft contracts)
    const contract = await contractRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (contract && contract.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Contract must be in Draft status to add items" },
      ]);
    }

    const lineItem = await contractLineItemRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      {
        contractId: req.params.id,
        productId,
        quantity: quantity || 1,
        unitPrice: unitPrice || 0,
        startDate,
        endDate,
        ...data,
      }
    );

    // Update contract total
    const total = await contractLineItemRepository.calculateContractTotal(
      req.context!.tenantId,
      req.params.id
    );
    await contractRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      { totalContractValue: total, remainingValue: total }
    );

    res.status(201).json(lineItem);
  } catch (error) {
    next(error);
  }
});

// Get pool consumptions for contract
router.get("/:id/consumptions", permissionMiddleware.get("Contract"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await poolConsumptionRepository.listByContract(
      req.context!.tenantId,
      req.params.id
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
