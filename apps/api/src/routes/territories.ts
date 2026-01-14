import { Router } from "express";
import { territoryRepository } from "../repositories/territoryRepository.js";
import { territoryRuleEngine } from "../services/territoryRuleEngine.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Get metadata: available users for assignment
router.get("/metadata/available-users", permissionMiddleware.list("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await territoryRepository.getAvailableUsers(req.context!.tenantId);

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// List territories
router.get("/", permissionMiddleware.list("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { view, parentId, search, limit, cursor } = req.query;

    const result = await territoryRepository.findAll(req.context!.tenantId, {
      view: (view as "tree" | "list") || "list",
      parentId: parentId as string,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      cursor: cursor as string,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get territory by ID
router.get("/:id", permissionMiddleware.get("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const territory = await territoryRepository.findById(
      req.context!.tenantId,
      req.params.id
    );

    if (!territory) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Territory not found",
        },
      });
      return;
    }

    res.json(territory);
  } catch (error) {
    next(error);
  }
});

// Create territory
router.post("/", permissionMiddleware.create("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!name) {
      errors.push({ field: "name", message: "Name is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const territory = await territoryRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, ...data }
    );

    res.status(201).json(territory);
  } catch (error) {
    next(error);
  }
});

// Update territory
router.patch("/:id", permissionMiddleware.update("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const territory = await territoryRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );

    res.json(territory);
  } catch (error) {
    next(error);
  }
});

// Delete territory
router.delete("/:id", permissionMiddleware.delete("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await territoryRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============ Hierarchy (Closure Table) ============

// Get ancestors of territory
router.get("/:id/ancestors", permissionMiddleware.get("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ancestors = await territoryRepository.getAncestors(
      req.context!.tenantId,
      req.params.id
    );

    res.json({ territories: ancestors });
  } catch (error) {
    next(error);
  }
});

// Get descendants of territory
router.get("/:id/descendants", permissionMiddleware.get("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const descendants = await territoryRepository.getDescendants(
      req.context!.tenantId,
      req.params.id
    );

    res.json({ territories: descendants });
  } catch (error) {
    next(error);
  }
});

// Get subtree (self + all descendants)
router.get("/:id/subtree", permissionMiddleware.get("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subtree = await territoryRepository.getSubtree(
      req.context!.tenantId,
      req.params.id
    );

    res.json({ territories: subtree });
  } catch (error) {
    next(error);
  }
});

// ============ User Assignments ============

// Get users assigned to territory
router.get("/:id/users", permissionMiddleware.get("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignments = await territoryRepository.getUserAssignments(
      req.context!.tenantId,
      req.params.id
    );

    res.json({ assignments });
  } catch (error) {
    next(error);
  }
});

// Add user to territory
router.post("/:id/users", permissionMiddleware.update("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, accessLevel } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!userId) {
      errors.push({ field: "userId", message: "User ID is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const assignment = await territoryRepository.addUserAssignment(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      { userId, accessLevel }
    );

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
});

// Remove user from territory
router.delete("/:id/users/:assignmentId", permissionMiddleware.update("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await territoryRepository.removeUserAssignment(
      req.context!.tenantId,
      req.params.assignmentId
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============ Account Assignments ============

// Get accounts assigned to territory
router.get("/:id/accounts", permissionMiddleware.get("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignments = await territoryRepository.getAccountAssignments(
      req.context!.tenantId,
      req.params.id
    );

    res.json({ assignments });
  } catch (error) {
    next(error);
  }
});

// Add account to territory
router.post("/:id/accounts", permissionMiddleware.update("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId, assignmentType } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!accountId) {
      errors.push({ field: "accountId", message: "Account ID is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const assignment = await territoryRepository.addAccountAssignment(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      { accountId, assignmentType }
    );

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
});

// Remove account from territory
router.delete("/:id/accounts/:assignmentId", permissionMiddleware.update("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await territoryRepository.removeAccountAssignment(
      req.context!.tenantId,
      req.params.assignmentId
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============ Assignment Rules ============

// Get rules for territory
router.get("/:id/rules", permissionMiddleware.get("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await territoryRepository.getRules(
      req.context!.tenantId,
      req.params.id
    );

    res.json({ rules });
  } catch (error) {
    next(error);
  }
});

// Create rule for territory
router.post("/:id/rules", permissionMiddleware.update("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, ...data } = req.body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!name) {
      errors.push({ field: "name", message: "Name is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const rule = await territoryRepository.createRule(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      { name, ...data }
    );

    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

// Update rule for territory
router.patch("/:id/rules/:ruleId", permissionMiddleware.update("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rule = await territoryRepository.updateRule(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.params.ruleId,
      req.body
    );

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// Delete rule from territory
router.delete("/:id/rules/:ruleId", permissionMiddleware.update("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await territoryRepository.deleteRule(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.params.ruleId
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Run rules for territory (auto-assign accounts)
router.post("/:id/rules/run", permissionMiddleware.update("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await territoryRuleEngine.runRulesForTerritory(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Preview rule matches without assigning
router.post("/:id/rules/preview", permissionMiddleware.get("Territory"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await territoryRuleEngine.previewRuleMatches(
      req.context!.tenantId,
      req.params.id
    );

    res.json({ matches: result });
  } catch (error) {
    next(error);
  }
});

export default router;
