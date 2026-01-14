import { Router } from "express";
import { eventRepository } from "../repositories/eventRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import { permissionMiddleware } from "../middleware/permissionMiddleware.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List events
router.get("/", permissionMiddleware.list("Event"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      ownerId,
      whoType,
      whoId,
      whatType,
      whatId,
      startDateFrom,
      startDateTo,
      limit,
      offset,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await eventRepository.list(
      req.context!.tenantId,
      {
        ownerId: ownerId as string,
        whoType: whoType as string,
        whoId: whoId as string,
        whatType: whatType as string,
        whatId: whatId as string,
        startDateFrom: startDateFrom ? new Date(startDateFrom as string) : undefined,
        startDateTo: startDateTo ? new Date(startDateTo as string) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      },
      req.accessFilter
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get event by ID
router.get("/:id", permissionMiddleware.get("Event"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!event) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Event not found",
        },
      });
      return;
    }
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Create event
router.post("/", permissionMiddleware.create("Event"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, startDateTime, endDateTime, ...rest } = req.body;

    const errors = [];
    if (!subject) {
      errors.push({ field: "subject", message: "Subject is required" });
    }
    if (!startDateTime) {
      errors.push({ field: "startDateTime", message: "Start date/time is required" });
    }
    if (!endDateTime) {
      errors.push({ field: "endDateTime", message: "End date/time is required" });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    // Validate end date is after start date
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (end < start) {
      throw new ValidationError([
        { field: "endDateTime", message: "End date must be after start date" },
      ]);
    }

    const event = await eventRepository.create(
      req.context!.tenantId,
      req.context!.userId,
      {
        subject,
        startDateTime: start,
        endDateTime: end,
        ...rest,
      }
    );

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

// Update event
router.patch("/:id", permissionMiddleware.update("Event"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;

    // Handle date conversions
    const data = { ...req.body };
    if (data.startDateTime) {
      data.startDateTime = new Date(data.startDateTime);
    }
    if (data.endDateTime) {
      data.endDateTime = new Date(data.endDateTime);
    }

    // Validate end date is after start date if both are provided
    if (data.startDateTime && data.endDateTime) {
      if (data.endDateTime < data.startDateTime) {
        throw new ValidationError([
          { field: "endDateTime", message: "End date must be after start date" },
        ]);
      }
    }

    const event = await eventRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      req.params.id,
      data,
      etag
    );
    res.json(event);
  } catch (error) {
    next(error);
  }
});

// Delete event
router.delete("/:id", permissionMiddleware.delete("Event"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!event) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Event not found",
        },
      });
      return;
    }

    await eventRepository.delete(
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
