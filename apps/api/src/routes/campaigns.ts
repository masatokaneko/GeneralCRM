import { Router } from "express";
import { campaignRepository } from "../repositories/campaignRepository.js";
import { campaignMemberRepository } from "../repositories/campaignMemberRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// ==================== Campaign CRUD ====================

// List campaigns
router.get("/", permissionMiddleware.list("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, sort, order, search, ...filters } = req.query;
    const result = await campaignRepository.list(
      req.context!.tenantId,
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sort: sort as string,
        order: order as "asc" | "desc",
        search: search as string,
        filters: filters as Record<string, string>,
      },
      req.accessFilter
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get campaign by ID
router.get("/:id", permissionMiddleware.get("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await campaignRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!campaign) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Campaign not found",
        },
      });
      return;
    }
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

// Create campaign
router.post("/", permissionMiddleware.create("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, ...data } = req.body;
    if (!name) {
      throw new ValidationError([
        { field: "name", message: "Name is required." },
      ]);
    }

    // Validate dates if provided
    if (data.startDate && data.endDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      if (endDate < startDate) {
        throw new ValidationError([
          { field: "endDate", message: "End date must be after start date." },
        ]);
      }
    }

    const campaign = await campaignRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      { name, ...data }
    );
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

// Update campaign
router.patch("/:id", permissionMiddleware.update("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;

    // Validate dates if provided
    if (req.body.startDate && req.body.endDate) {
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      if (endDate < startDate) {
        throw new ValidationError([
          { field: "endDate", message: "End date must be after start date." },
        ]);
      }
    }

    const campaign = await campaignRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      req.body,
      etag
    );
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

// Delete campaign
router.delete("/:id", permissionMiddleware.delete("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await campaignRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==================== Campaign Members ====================

// List campaign members (for a specific campaign)
router.get("/:id/members", permissionMiddleware.get("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, memberType, status } = req.query;
    const result = await campaignMemberRepository.list(
      req.context!.tenantId,
      {
        campaignId: req.params.id,
        limit: limit ? Number(limit) : undefined,
        cursor: cursor as string,
        memberType: memberType as string,
        status: status as string,
      }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Add member to campaign
router.post("/:id/members", permissionMiddleware.update("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberType, memberId, status, description } = req.body;

    if (!memberType || !memberId) {
      throw new ValidationError([
        { field: "memberType", message: "memberType is required." },
        { field: "memberId", message: "memberId is required." },
      ]);
    }

    if (!["Lead", "Contact"].includes(memberType)) {
      throw new ValidationError([
        { field: "memberType", message: "memberType must be 'Lead' or 'Contact'." },
      ]);
    }

    const member = await campaignMemberRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      {
        campaignId: req.params.id,
        memberType,
        memberId,
        status,
        description,
      }
    );

    // Update campaign stats
    await campaignRepository.updateStats(req.context!.tenantId, req.params.id);

    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
});

// Get campaign member by ID
router.get("/:id/members/:memberId", permissionMiddleware.get("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const member = await campaignMemberRepository.findById(
      req.context!.tenantId,
      req.params.memberId
    );
    if (!member || member.campaignId !== req.params.id) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Campaign member not found",
        },
      });
      return;
    }
    res.json(member);
  } catch (error) {
    next(error);
  }
});

// Update campaign member
router.patch("/:id/members/:memberId", permissionMiddleware.update("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;
    const member = await campaignMemberRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.memberId,
      req.body,
      etag
    );

    // Update campaign stats if status changed
    if (req.body.status) {
      await campaignRepository.updateStats(req.context!.tenantId, req.params.id);
    }

    res.json(member);
  } catch (error) {
    next(error);
  }
});

// Remove member from campaign
router.delete("/:id/members/:memberId", permissionMiddleware.update("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await campaignMemberRepository.delete(
      req.context!.tenantId,
      req.context!.userId,
      req.params.memberId
    );

    // Update campaign stats
    await campaignRepository.updateStats(req.context!.tenantId, req.params.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ==================== Campaign Actions ====================

// Activate campaign
router.post("/:id/actions/activate", permissionMiddleware.update("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await campaignRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!campaign) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Campaign not found",
        },
      });
      return;
    }

    if (campaign.status !== "Planned") {
      throw new ValidationError([
        { field: "status", message: "Only planned campaigns can be activated." },
      ]);
    }

    const etag = req.headers["if-match"] as string | undefined;
    const updated = await campaignRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      { status: "Active" },
      etag
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Complete campaign
router.post("/:id/actions/complete", permissionMiddleware.update("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await campaignRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!campaign) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Campaign not found",
        },
      });
      return;
    }

    if (campaign.status !== "Active") {
      throw new ValidationError([
        { field: "status", message: "Only active campaigns can be completed." },
      ]);
    }

    const etag = req.headers["if-match"] as string | undefined;
    const updated = await campaignRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      { status: "Completed" },
      etag
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Abort campaign
router.post("/:id/actions/abort", permissionMiddleware.update("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await campaignRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!campaign) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Campaign not found",
        },
      });
      return;
    }

    if (!["Planned", "Active"].includes(campaign.status)) {
      throw new ValidationError([
        { field: "status", message: "Only planned or active campaigns can be aborted." },
      ]);
    }

    const etag = req.headers["if-match"] as string | undefined;
    const updated = await campaignRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      { status: "Aborted" },
      etag
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Get child campaigns
router.get("/:id/children", permissionMiddleware.get("Campaign"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const children = await campaignRepository.findByParentCampaignId(
      req.context!.tenantId,
      req.params.id,
      req.accessFilter
    );
    res.json({ records: children, totalSize: children.length });
  } catch (error) {
    next(error);
  }
});

export default router;
