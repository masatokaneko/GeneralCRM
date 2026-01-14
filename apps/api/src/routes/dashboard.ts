import { Router } from "express";
import { queryEngineService } from "../services/queryEngineService.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Get dashboard KPIs with permission filtering
router.get("/kpis", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context!.tenantId;
    const userId = req.context!.userId;

    // Get total accounts (with permission filter)
    const accountsCount = await queryEngineService.execute(tenantId, userId, {
      objectName: "Account",
      select: [],
      aggregations: [{ field: "*", function: "count", alias: "count" }],
    });

    // Get total leads (unconverted, with permission filter)
    const leadsCount = await queryEngineService.execute(tenantId, userId, {
      objectName: "Lead",
      select: [],
      where: [{ field: "isConverted", operator: "eq", value: false }],
      aggregations: [{ field: "*", function: "count", alias: "count" }],
    });

    // Get open opportunities (with permission filter)
    const openOppsResult = await queryEngineService.execute(tenantId, userId, {
      objectName: "Opportunity",
      select: [],
      where: [{ field: "isClosed", operator: "eq", value: false }],
      aggregations: [
        { field: "*", function: "count", alias: "count" },
        { field: "amount", function: "sum", alias: "total" },
      ],
    });

    // Get won opportunities this month (with permission filter)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const wonResult = await queryEngineService.execute(tenantId, userId, {
      objectName: "Opportunity",
      select: [],
      where: [
        { field: "isWon", operator: "eq", value: true },
        { field: "updatedAt", operator: "gte", value: firstDayOfMonth.toISOString() },
      ],
      aggregations: [
        { field: "*", function: "count", alias: "count" },
        { field: "amount", function: "sum", alias: "total" },
      ],
    });

    // Extract values from results
    const totalAccounts = Number(accountsCount.records[0]?.count || 0);
    const totalLeads = Number(leadsCount.records[0]?.count || 0);
    const openOpportunities = Number(openOppsResult.records[0]?.count || 0);
    const pipelineAmount = Number(openOppsResult.records[0]?.total || 0);
    const wonCount = Number(wonResult.records[0]?.count || 0);
    const wonAmount = Number(wonResult.records[0]?.total || 0);

    res.json({
      totalAccounts,
      totalLeads,
      openOpportunities,
      pipelineAmount,
      wonThisMonth: {
        count: wonCount,
        amount: wonAmount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get pipeline by stage with permission filtering
router.get("/pipeline", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context!.tenantId;
    const userId = req.context!.userId;

    // Get pipeline grouped by stage (with permission filter)
    const result = await queryEngineService.execute(tenantId, userId, {
      objectName: "Opportunity",
      select: [],
      where: [{ field: "isClosed", operator: "eq", value: false }],
      groupBy: ["stageName"],
      aggregations: [
        { field: "*", function: "count", alias: "count" },
        { field: "amount", function: "sum", alias: "amount" },
      ],
    });

    // Sort by stage order
    const stageOrder: Record<string, number> = {
      "Prospecting": 1,
      "Qualification": 2,
      "Needs Analysis": 3,
      "Value Proposition": 4,
      "Proposal/Price Quote": 5,
      "Negotiation/Review": 6,
    };

    const stages = result.records
      .map((row) => ({
        stage: String(row.stageName || "Unknown"),
        count: Number(row.count || 0),
        amount: Number(row.amount || 0),
      }))
      .sort((a, b) => {
        const orderA = stageOrder[a.stage] || 99;
        const orderB = stageOrder[b.stage] || 99;
        return orderA - orderB;
      });

    res.json({ stages });
  } catch (error) {
    next(error);
  }
});

// Get recent activities with permission filtering
router.get("/activities", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context!.tenantId;
    const userId = req.context!.userId;
    const limit = Number(req.query.limit) || 10;

    // Get recent accounts
    const accountsResult = await queryEngineService.execute(tenantId, userId, {
      objectName: "Account",
      select: ["id", "name", "updatedAt"],
      orderBy: [{ field: "updatedAt", direction: "DESC" }],
      limit,
    });

    // Get recent contacts
    const contactsResult = await queryEngineService.execute(tenantId, userId, {
      objectName: "Contact",
      select: ["id", "firstName", "lastName", "updatedAt"],
      orderBy: [{ field: "updatedAt", direction: "DESC" }],
      limit,
    });

    // Get recent leads
    const leadsResult = await queryEngineService.execute(tenantId, userId, {
      objectName: "Lead",
      select: ["id", "firstName", "lastName", "updatedAt"],
      where: [{ field: "isConverted", operator: "eq", value: false }],
      orderBy: [{ field: "updatedAt", direction: "DESC" }],
      limit,
    });

    // Get recent opportunities
    const opportunitiesResult = await queryEngineService.execute(tenantId, userId, {
      objectName: "Opportunity",
      select: ["id", "name", "updatedAt"],
      orderBy: [{ field: "updatedAt", direction: "DESC" }],
      limit,
    });

    // Combine and format all activities
    const allActivities = [
      ...accountsResult.records.map((row) => ({
        id: row.id,
        name: row.name,
        type: "account",
        updatedAt: row.updatedAt,
      })),
      ...contactsResult.records.map((row) => ({
        id: row.id,
        name: `${row.firstName || ""} ${row.lastName || ""}`.trim(),
        type: "contact",
        updatedAt: row.updatedAt,
      })),
      ...leadsResult.records.map((row) => ({
        id: row.id,
        name: `${row.firstName || ""} ${row.lastName || ""}`.trim(),
        type: "lead",
        updatedAt: row.updatedAt,
      })),
      ...opportunitiesResult.records.map((row) => ({
        id: row.id,
        name: row.name,
        type: "opportunity",
        updatedAt: row.updatedAt,
      })),
    ];

    // Sort by updated_at and limit
    allActivities.sort((a, b) => {
      const dateA = new Date(a.updatedAt as string).getTime();
      const dateB = new Date(b.updatedAt as string).getTime();
      return dateB - dateA;
    });

    res.json({
      activities: allActivities.slice(0, limit),
    });
  } catch (error) {
    next(error);
  }
});

// Get opportunities by owner (for team dashboard)
router.get("/opportunities-by-owner", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context!.tenantId;
    const userId = req.context!.userId;

    const result = await queryEngineService.execute(tenantId, userId, {
      objectName: "Opportunity",
      select: [],
      where: [{ field: "isClosed", operator: "eq", value: false }],
      groupBy: ["ownerId"],
      aggregations: [
        { field: "*", function: "count", alias: "count" },
        { field: "amount", function: "sum", alias: "totalAmount" },
        { field: "amount", function: "avg", alias: "avgAmount" },
      ],
    });

    res.json({
      byOwner: result.records.map((row) => ({
        ownerId: row.ownerId,
        count: Number(row.count || 0),
        totalAmount: Number(row.totalAmount || 0),
        avgAmount: Number(row.avgAmount || 0),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Get opportunities closing soon
router.get("/closing-soon", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.context!.tenantId;
    const userId = req.context!.userId;
    const days = Number(req.query.days) || 30;
    const limit = Number(req.query.limit) || 10;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const result = await queryEngineService.execute(tenantId, userId, {
      objectName: "Opportunity",
      select: ["id", "name", "accountId", "stageName", "amount", "closeDate", "probability"],
      where: [
        { field: "isClosed", operator: "eq", value: false },
        { field: "closeDate", operator: "lte", value: futureDate.toISOString().split("T")[0] },
        { field: "closeDate", operator: "gte", value: new Date().toISOString().split("T")[0] },
      ],
      orderBy: [{ field: "closeDate", direction: "ASC" }],
      limit,
    });

    res.json({
      opportunities: result.records,
      totalSize: result.totalSize,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
