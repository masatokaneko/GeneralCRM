import { Router } from "express";
import { userRepository } from "../repositories/userRepository.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// List users
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor, search, isActive, roleId, profileId, managerId, department } = req.query;
    const result = await userRepository.list(req.context!.tenantId, {
      limit: limit ? Number(limit) : undefined,
      cursor: cursor as string,
      search: search as string,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      roleId: roleId as string,
      profileId: profileId as string,
      managerId: managerId as string,
      department: department as string,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get current user (me)
router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepository.findById(
      req.context!.tenantId,
      req.context!.userId
    );
    if (!user) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
      return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepository.findById(
      req.context!.tenantId,
      req.params.id
    );
    if (!user) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
      return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Get direct reports for a user
router.get("/:id/direct-reports", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const directReports = await userRepository.findByManagerId(
      req.context!.tenantId,
      req.params.id
    );
    res.json({
      records: directReports,
      totalSize: directReports.length,
    });
  } catch (error) {
    next(error);
  }
});

// Create user
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, lastName, ...data } = req.body;

    // Validate required fields
    const errors: { field: string; message: string }[] = [];
    if (!email) {
      errors.push({ field: "email", message: "email is required." });
    }
    if (!lastName) {
      errors.push({ field: "lastName", message: "lastName is required." });
    }

    // Validate email format
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: "email", message: "Invalid email format." });
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const user = await userRepository.create(req.context!.tenantId, {
      email,
      lastName,
      ...data,
    });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Update user
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;

    // Validate email format if provided
    if (req.body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
      throw new ValidationError([
        { field: "email", message: "Invalid email format." },
      ]);
    }

    const user = await userRepository.update(
      req.context!.tenantId,
      req.params.id,
      req.body,
      etag
    );
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Delete user (soft delete)
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.context!.userId) {
      throw new ValidationError([
        { field: "id", message: "Cannot delete your own user account." },
      ]);
    }

    await userRepository.delete(req.context!.tenantId, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Update current user's profile (me)
router.patch("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const etag = req.headers["if-match"] as string | undefined;

    // Restrict what fields current user can update on themselves
    const allowedFields = [
      "firstName", "lastName", "displayName", "phone", "mobilePhone",
      "title", "timezone", "locale", "photoUrl", "aboutMe",
    ];

    const filteredData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        filteredData[field] = req.body[field];
      }
    }

    const user = await userRepository.update(
      req.context!.tenantId,
      req.context!.userId,
      filteredData,
      etag
    );
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Deactivate user
router.post("/:id/deactivate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Prevent self-deactivation
    if (req.params.id === req.context!.userId) {
      throw new ValidationError([
        { field: "id", message: "Cannot deactivate your own user account." },
      ]);
    }

    const user = await userRepository.update(
      req.context!.tenantId,
      req.params.id,
      { isActive: false }
    );
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Activate user
router.post("/:id/activate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userRepository.update(
      req.context!.tenantId,
      req.params.id,
      { isActive: true }
    );
    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
