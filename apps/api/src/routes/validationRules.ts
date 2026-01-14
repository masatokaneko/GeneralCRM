import { Router } from "express";
import { validationRuleRepository } from "../repositories/validationRuleRepository.js";
import { validationService } from "../services/validationService.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";
import type { ValidationObjectName } from "../types/index.js";

const router = Router();

// List validation rules
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, objectName, isActive } = req.query;
    const result = await validationRuleRepository.list(req.context!.tenantId, {
      limit: limit ? Number(limit) : undefined,
      cursor: cursor as string,
      objectName: objectName as ValidationObjectName,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get validation rule by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = await validationRuleRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!rule) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Validation rule not found",
        },
      });
      return;
    }
    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// Create validation rule
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectName, ruleName, conditionExpression, errorMessage, ...data } = req.body;

    // Validate required fields
    const errors: { field: string; message: string }[] = [];
    if (!objectName) {
      errors.push({ field: "objectName", message: "objectName is required." });
    }
    if (!ruleName) {
      errors.push({ field: "ruleName", message: "ruleName is required." });
    }
    if (!conditionExpression) {
      errors.push({ field: "conditionExpression", message: "conditionExpression is required." });
    }
    if (!errorMessage) {
      errors.push({ field: "errorMessage", message: "errorMessage is required." });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Validate condition expression structure
    if (!conditionExpression.schemaVersion || !conditionExpression.expr) {
      throw new ValidationError([
        { field: "conditionExpression", message: "conditionExpression must have schemaVersion and expr." },
      ]);
    }

    const rule = await validationRuleRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { objectName, ruleName, conditionExpression, errorMessage, ...data }
    );
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

// Update validation rule
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;

    // Validate condition expression structure if provided
    if (req.body.conditionExpression) {
      if (!req.body.conditionExpression.schemaVersion || !req.body.conditionExpression.expr) {
        throw new ValidationError([
          { field: "conditionExpression", message: "conditionExpression must have schemaVersion and expr." },
        ]);
      }
    }

    const rule = await validationRuleRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// Delete validation rule
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await validationRuleRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Test validation rule against a record
router.post("/:id/test", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = await validationRuleRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!rule) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Validation rule not found",
        },
      });
      return;
    }

    const { record, prior } = req.body;

    if (!record) {
      throw new ValidationError([
        { field: "record", message: "record is required for testing." },
      ]);
    }

    const result = await validationService.evaluate(
      req.context!.tenantId,
      rule.objectName,
      record,
      prior || null,
      req.context!.userId
    );

    res.json({
      ruleId: rule.id,
      ruleName: rule.ruleName,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// Validate a record against all active rules for an object
router.post("/validate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectName, record, prior } = req.body;

    if (!objectName) {
      throw new ValidationError([
        { field: "objectName", message: "objectName is required." },
      ]);
    }
    if (!record) {
      throw new ValidationError([
        { field: "record", message: "record is required." },
      ]);
    }

    const result = await validationService.evaluate(
      req.context!.tenantId,
      objectName as ValidationObjectName,
      record,
      prior || null,
      req.context!.userId
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
