import { Router } from "express";
import { opportunityContactRoleRepository } from "../repositories/opportunityContactRoleRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List contact roles by opportunity
router.get(
  "/opportunities/:opportunityId/contact-roles",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await opportunityContactRoleRepository.listByOpportunity(
        req.context!.tenantId,
        req.params.opportunityId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// List contact roles by contact
router.get(
  "/contacts/:contactId/opportunity-roles",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await opportunityContactRoleRepository.listByContact(
        req.context!.tenantId,
        req.params.contactId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get contact role by ID
router.get(
  "/opportunity-contact-roles/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await opportunityContactRoleRepository.findById(
        req.context!.tenantId,
        req.params.id
      );
      if (!item) {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Opportunity contact role not found",
          },
        });
        return;
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Create contact role
router.post(
  "/opportunities/:opportunityId/contact-roles",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId, role, isPrimary, influenceLevel, stance } = req.body;

      if (!contactId) {
        throw new ValidationError([
          { field: "contactId", message: "Contact is required" },
        ]);
      }

      if (!role) {
        throw new ValidationError([
          { field: "role", message: "Role is required" },
        ]);
      }

      const validRoles = ["DecisionMaker", "Influencer", "Evaluator", "Executive", "User", "Other"];
      if (!validRoles.includes(role)) {
        throw new ValidationError([
          { field: "role", message: `Role must be one of: ${validRoles.join(", ")}` },
        ]);
      }

      if (influenceLevel !== undefined && (influenceLevel < 1 || influenceLevel > 5)) {
        throw new ValidationError([
          { field: "influenceLevel", message: "Influence level must be between 1 and 5" },
        ]);
      }

      if (stance !== undefined) {
        const validStances = ["Support", "Neutral", "Oppose"];
        if (!validStances.includes(stance)) {
          throw new ValidationError([
            { field: "stance", message: `Stance must be one of: ${validStances.join(", ")}` },
          ]);
        }
      }

      const item = await opportunityContactRoleRepository.create(
        req.context!.tenantId,
        req.context!.userId,
        {
          opportunityId: req.params.opportunityId,
          contactId,
          role,
          isPrimary: isPrimary || false,
          influenceLevel,
          stance,
        }
      );

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Update contact role
router.patch(
  "/opportunity-contact-roles/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, isPrimary, influenceLevel, stance } = req.body;
      const etag = req.headers["if-match"] as string | undefined;

      if (role !== undefined) {
        const validRoles = ["DecisionMaker", "Influencer", "Evaluator", "Executive", "User", "Other"];
        if (!validRoles.includes(role)) {
          throw new ValidationError([
            { field: "role", message: `Role must be one of: ${validRoles.join(", ")}` },
          ]);
        }
      }

      if (influenceLevel !== undefined && (influenceLevel < 1 || influenceLevel > 5)) {
        throw new ValidationError([
          { field: "influenceLevel", message: "Influence level must be between 1 and 5" },
        ]);
      }

      if (stance !== undefined && stance !== null) {
        const validStances = ["Support", "Neutral", "Oppose"];
        if (!validStances.includes(stance)) {
          throw new ValidationError([
            { field: "stance", message: `Stance must be one of: ${validStances.join(", ")}` },
          ]);
        }
      }

      const item = await opportunityContactRoleRepository.update(
        req.context!.tenantId,
        req.context!.userId,
        req.params.id,
        { role, isPrimary, influenceLevel, stance },
        etag
      );

      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Set as primary contact
router.post(
  "/opportunity-contact-roles/:id/set-primary",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await opportunityContactRoleRepository.setPrimary(
        req.context!.tenantId,
        req.context!.userId,
        req.params.id
      );
      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Delete contact role
router.delete(
  "/opportunity-contact-roles/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await opportunityContactRoleRepository.delete(
        req.context!.tenantId,
        req.context!.userId,
        req.params.id
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
