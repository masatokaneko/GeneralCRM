import { Router } from "express";
import { sharingRuleRepository } from "../repositories/sharingRuleRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

const VALID_RULE_TYPES = ["OwnerBased", "CriteriaBased"];
const VALID_SOURCE_TYPES = ["Role", "RoleAndSubordinates", "PublicGroup"];
const VALID_TARGET_TYPES = ["Role", "RoleAndSubordinates", "PublicGroup", "User"];
const VALID_ACCESS_LEVELS = ["Read", "ReadWrite"];
const VALID_MEMBER_TYPES = ["User", "Role", "RoleAndSubordinates", "Group"];

// === Sharing Rules ===

// List all sharing rules
router.get(
  "/sharing-rules",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { objectName, activeOnly } = req.query;
      const rules = await sharingRuleRepository.findAll(req.context!.tenantId, {
        objectName: objectName as string | undefined,
        activeOnly: activeOnly === "true",
      });
      res.json({
        records: rules,
        totalSize: rules.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get sharing rule by ID
router.get(
  "/sharing-rules/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await sharingRuleRepository.findById(
        req.context!.tenantId,
        req.params.id
      );
      if (!rule) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Sharing rule not found",
          },
        });
        return;
      }
      res.json(rule);
    } catch (error) {
      next(error);
    }
  }
);

// Create sharing rule
router.post(
  "/sharing-rules",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        objectName,
        ruleType,
        description,
        isActive,
        sourceType,
        sourceId,
        targetType,
        targetId,
        accessLevel,
        filterCriteria,
      } = req.body;

      // Validate required fields
      if (!name || typeof name !== "string" || name.trim() === "") {
        throw new ValidationError([
          { field: "name", message: "Sharing rule name is required" },
        ]);
      }

      if (!objectName) {
        throw new ValidationError([
          { field: "objectName", message: "Object name is required" },
        ]);
      }

      if (!ruleType || !VALID_RULE_TYPES.includes(ruleType)) {
        throw new ValidationError([
          { field: "ruleType", message: `Rule type must be one of: ${VALID_RULE_TYPES.join(", ")}` },
        ]);
      }

      if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
        throw new ValidationError([
          { field: "targetType", message: `Target type must be one of: ${VALID_TARGET_TYPES.join(", ")}` },
        ]);
      }

      if (!targetId) {
        throw new ValidationError([
          { field: "targetId", message: "Target ID is required" },
        ]);
      }

      // OwnerBased rules require source
      if (ruleType === "OwnerBased") {
        if (!sourceType || !VALID_SOURCE_TYPES.includes(sourceType)) {
          throw new ValidationError([
            { field: "sourceType", message: `Source type is required for OwnerBased rules` },
          ]);
        }
        if (!sourceId) {
          throw new ValidationError([
            { field: "sourceId", message: "Source ID is required for OwnerBased rules" },
          ]);
        }
      }

      // CriteriaBased rules require filter
      if (ruleType === "CriteriaBased" && !filterCriteria) {
        throw new ValidationError([
          { field: "filterCriteria", message: "Filter criteria is required for CriteriaBased rules" },
        ]);
      }

      if (accessLevel && !VALID_ACCESS_LEVELS.includes(accessLevel)) {
        throw new ValidationError([
          { field: "accessLevel", message: `Access level must be one of: ${VALID_ACCESS_LEVELS.join(", ")}` },
        ]);
      }

      const rule = await sharingRuleRepository.create(
        req.context!.tenantId,
        {
          name: name.trim(),
          objectName,
          ruleType,
          description,
          isActive,
          sourceType,
          sourceId,
          targetType,
          targetId,
          accessLevel: accessLevel || "Read",
          filterCriteria,
        },
        req.context!.userId
      );

      res.status(201).json(rule);
    } catch (error) {
      next(error);
    }
  }
);

// Update sharing rule
router.patch(
  "/sharing-rules/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        description,
        isActive,
        sourceType,
        sourceId,
        targetType,
        targetId,
        accessLevel,
        filterCriteria,
      } = req.body;
      const etag = req.headers["if-match"] as string | undefined;

      if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
        throw new ValidationError([
          { field: "name", message: "Sharing rule name cannot be empty" },
        ]);
      }

      if (sourceType !== undefined && sourceType !== null && !VALID_SOURCE_TYPES.includes(sourceType)) {
        throw new ValidationError([
          { field: "sourceType", message: `Source type must be one of: ${VALID_SOURCE_TYPES.join(", ")}` },
        ]);
      }

      if (targetType !== undefined && !VALID_TARGET_TYPES.includes(targetType)) {
        throw new ValidationError([
          { field: "targetType", message: `Target type must be one of: ${VALID_TARGET_TYPES.join(", ")}` },
        ]);
      }

      if (accessLevel !== undefined && !VALID_ACCESS_LEVELS.includes(accessLevel)) {
        throw new ValidationError([
          { field: "accessLevel", message: `Access level must be one of: ${VALID_ACCESS_LEVELS.join(", ")}` },
        ]);
      }

      const rule = await sharingRuleRepository.update(
        req.context!.tenantId,
        req.params.id,
        {
          name: name?.trim(),
          description,
          isActive,
          sourceType,
          sourceId,
          targetType,
          targetId,
          accessLevel,
          filterCriteria,
        },
        req.context!.userId,
        etag
      );

      if (!rule) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Sharing rule not found or concurrent modification detected",
          },
        });
        return;
      }

      res.json(rule);
    } catch (error) {
      next(error);
    }
  }
);

// Delete sharing rule
router.delete(
  "/sharing-rules/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await sharingRuleRepository.delete(
        req.context!.tenantId,
        req.params.id,
        req.context!.userId
      );

      if (!deleted) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Sharing rule not found",
          },
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// === Public Groups ===

// List all public groups
router.get(
  "/public-groups",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activeOnly } = req.query;
      const groups = await sharingRuleRepository.findAllGroups(req.context!.tenantId, {
        activeOnly: activeOnly === "true",
      });
      res.json({
        records: groups,
        totalSize: groups.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get public group by ID
router.get(
  "/public-groups/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await sharingRuleRepository.findGroupById(
        req.context!.tenantId,
        req.params.id
      );
      if (!group) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Public group not found",
          },
        });
        return;
      }
      res.json(group);
    } catch (error) {
      next(error);
    }
  }
);

// Get group members
router.get(
  "/public-groups/:id/members",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await sharingRuleRepository.getGroupMembers(
        req.context!.tenantId,
        req.params.id
      );
      res.json({
        records: members,
        totalSize: members.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create public group
router.post(
  "/public-groups",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, isActive, doesIncludeBosses } = req.body;

      if (!name || typeof name !== "string" || name.trim() === "") {
        throw new ValidationError([
          { field: "name", message: "Group name is required" },
        ]);
      }

      const group = await sharingRuleRepository.createGroup(
        req.context!.tenantId,
        {
          name: name.trim(),
          description,
          isActive,
          doesIncludeBosses,
        },
        req.context!.userId
      );

      res.status(201).json(group);
    } catch (error) {
      next(error);
    }
  }
);

// Update public group
router.patch(
  "/public-groups/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, isActive, doesIncludeBosses } = req.body;

      if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
        throw new ValidationError([
          { field: "name", message: "Group name cannot be empty" },
        ]);
      }

      const group = await sharingRuleRepository.updateGroup(
        req.context!.tenantId,
        req.params.id,
        {
          name: name?.trim(),
          description,
          isActive,
          doesIncludeBosses,
        },
        req.context!.userId
      );

      if (!group) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Public group not found",
          },
        });
        return;
      }

      res.json(group);
    } catch (error) {
      next(error);
    }
  }
);

// Add member to group
router.post(
  "/public-groups/:id/members",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { memberType, memberId } = req.body;

      if (!memberType || !VALID_MEMBER_TYPES.includes(memberType)) {
        throw new ValidationError([
          { field: "memberType", message: `Member type must be one of: ${VALID_MEMBER_TYPES.join(", ")}` },
        ]);
      }

      if (!memberId) {
        throw new ValidationError([
          { field: "memberId", message: "Member ID is required" },
        ]);
      }

      const member = await sharingRuleRepository.addGroupMember(
        req.context!.tenantId,
        req.params.id,
        memberType,
        memberId,
        req.context!.userId
      );

      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  }
);

// Remove member from group
router.delete(
  "/public-groups/:id/members/:memberType/:memberId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const removed = await sharingRuleRepository.removeGroupMember(
        req.context!.tenantId,
        req.params.id,
        req.params.memberType,
        req.params.memberId
      );

      if (!removed) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Group member not found",
          },
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Delete public group
router.delete(
  "/public-groups/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await sharingRuleRepository.deleteGroup(
        req.context!.tenantId,
        req.params.id,
        req.context!.userId
      );

      if (!deleted) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Public group not found",
          },
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
