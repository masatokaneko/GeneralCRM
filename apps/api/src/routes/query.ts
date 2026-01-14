import { Router } from "express";
import { queryEngineService, type QueryRequest } from "../services/queryEngineService.js";
import { ValidationError } from "../middleware/errorHandler.js";
import type { Request, Response, NextFunction } from "express";

const router = Router();

// Execute query
router.post("/execute", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectName, select, where, orderBy, groupBy, aggregations, limit, offset } = req.body;

    // Validation
    const errors: Array<{ field: string; message: string }> = [];

    if (!objectName) {
      errors.push({ field: "objectName", message: "Object name is required" });
    }
    if (!select || !Array.isArray(select) || select.length === 0) {
      // Allow empty select for aggregation-only queries
      if (!aggregations || !Array.isArray(aggregations) || aggregations.length === 0) {
        errors.push({ field: "select", message: "Select fields are required (or aggregations must be provided)" });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(errors);
    }

    const queryRequest: QueryRequest = {
      objectName,
      select: select || [],
      where: where?.map((w: Record<string, unknown>) => ({
        field: w.field as string,
        operator: w.operator as QueryRequest["where"] extends Array<{ operator: infer O }> ? O : never,
        value: w.value,
      })),
      orderBy: orderBy?.map((o: Record<string, unknown>) => ({
        field: o.field as string,
        direction: (o.direction as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC",
      })),
      groupBy,
      aggregations: aggregations?.map((a: Record<string, unknown>) => ({
        field: a.field as string,
        function: a.function as "count" | "sum" | "avg" | "min" | "max",
        alias: a.alias as string | undefined,
      })),
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };

    const result = await queryEngineService.execute(
      req.context!.tenantId,
      req.context!.userId,
      queryRequest
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get available objects for querying
router.get("/objects", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Return list of queryable objects
    const objects = [
      { name: "Account", label: "Accounts", fields: ["id", "name", "type", "industry", "website", "phone", "ownerId", "createdAt", "updatedAt"] },
      { name: "Contact", label: "Contacts", fields: ["id", "firstName", "lastName", "email", "phone", "accountId", "ownerId", "createdAt", "updatedAt"] },
      { name: "Lead", label: "Leads", fields: ["id", "firstName", "lastName", "email", "company", "status", "ownerId", "createdAt", "updatedAt"] },
      { name: "Opportunity", label: "Opportunities", fields: ["id", "name", "accountId", "stageName", "amount", "closeDate", "probability", "ownerId", "createdAt", "updatedAt"] },
      { name: "Quote", label: "Quotes", fields: ["id", "name", "opportunityId", "status", "totalPrice", "ownerId", "createdAt", "updatedAt"] },
      { name: "Order", label: "Orders", fields: ["id", "name", "accountId", "status", "totalAmount", "ownerId", "createdAt", "updatedAt"] },
      { name: "Contract", label: "Contracts", fields: ["id", "name", "accountId", "status", "contractType", "totalContractValue", "ownerId", "createdAt", "updatedAt"] },
      { name: "Invoice", label: "Invoices", fields: ["id", "invoiceNumber", "accountId", "status", "totalAmount", "ownerId", "createdAt", "updatedAt"] },
      { name: "Task", label: "Tasks", fields: ["id", "subject", "status", "priority", "ownerId", "whoType", "whoId", "whatType", "whatId", "createdAt", "updatedAt"] },
      { name: "Event", label: "Events", fields: ["id", "subject", "startDateTime", "endDateTime", "ownerId", "whoType", "whoId", "whatType", "whatId", "createdAt", "updatedAt"] },
    ];

    res.json({ objects });
  } catch (error) {
    next(error);
  }
});

// Get field metadata for an object
router.get("/objects/:objectName/fields", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { objectName } = req.params;

    // Field metadata by object
    const fieldMetadata: Record<string, Array<{ name: string; label: string; type: string; referenceTo?: string }>> = {
      Account: [
        { name: "id", label: "ID", type: "uuid" },
        { name: "name", label: "Account Name", type: "string" },
        { name: "type", label: "Type", type: "string" },
        { name: "industry", label: "Industry", type: "string" },
        { name: "website", label: "Website", type: "string" },
        { name: "phone", label: "Phone", type: "string" },
        { name: "billingAddressStreet", label: "Billing Street", type: "string" },
        { name: "billingAddressCity", label: "Billing City", type: "string" },
        { name: "billingAddressState", label: "Billing State", type: "string" },
        { name: "billingAddressPostalCode", label: "Billing Postal Code", type: "string" },
        { name: "billingAddressCountry", label: "Billing Country", type: "string" },
        { name: "annualRevenue", label: "Annual Revenue", type: "number" },
        { name: "numberOfEmployees", label: "Employees", type: "number" },
        { name: "ownerId", label: "Owner", type: "reference", referenceTo: "User" },
        { name: "createdAt", label: "Created Date", type: "datetime" },
        { name: "updatedAt", label: "Last Modified Date", type: "datetime" },
      ],
      Opportunity: [
        { name: "id", label: "ID", type: "uuid" },
        { name: "name", label: "Opportunity Name", type: "string" },
        { name: "accountId", label: "Account", type: "reference", referenceTo: "Account" },
        { name: "stageName", label: "Stage", type: "string" },
        { name: "amount", label: "Amount", type: "number" },
        { name: "probability", label: "Probability (%)", type: "number" },
        { name: "closeDate", label: "Close Date", type: "date" },
        { name: "type", label: "Type", type: "string" },
        { name: "leadSource", label: "Lead Source", type: "string" },
        { name: "isClosed", label: "Closed", type: "boolean" },
        { name: "isWon", label: "Won", type: "boolean" },
        { name: "ownerId", label: "Owner", type: "reference", referenceTo: "User" },
        { name: "createdAt", label: "Created Date", type: "datetime" },
        { name: "updatedAt", label: "Last Modified Date", type: "datetime" },
      ],
      // Add more objects as needed
    };

    const fields = fieldMetadata[objectName];
    if (!fields) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Object ${objectName} not found`,
        },
      });
      return;
    }

    res.json({ fields });
  } catch (error) {
    next(error);
  }
});

export default router;
