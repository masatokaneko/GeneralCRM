import { http, HttpResponse, delay } from "msw";
import { db, DEFAULT_TENANT_ID, STAGE_DEFINITIONS } from "../db";
import type { Opportunity } from "../types";

const BASE_URL = "/v1/opportunities";

export const opportunityHandlers = [
  // Get all opportunities
  http.get(`${BASE_URL}`, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const url = new URL(request.url);

    let opportunities = db.getAllOpportunities(tenantId);

    // Filter by accountId if specified
    const accountId = url.searchParams.get("accountId");
    if (accountId) {
      opportunities = opportunities.filter((o) => o.accountId === accountId);
    }

    // Filter by stage
    const stage = url.searchParams.get("stageName");
    if (stage) {
      opportunities = opportunities.filter((o) => o.stageName === stage);
    }

    // Sorting
    const sort = url.searchParams.get("sort");
    if (sort) {
      const desc = sort.startsWith("-");
      const field = desc ? sort.slice(1) : sort;
      opportunities.sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[field];
        const bVal = (b as unknown as Record<string, unknown>)[field];
        if (aVal === bVal) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = aVal < bVal ? -1 : 1;
        return desc ? -cmp : cmp;
      });
    }

    // Pagination
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const cursor = url.searchParams.get("cursor");
    let startIndex = 0;
    if (cursor) {
      startIndex = Number.parseInt(cursor, 10) || 0;
    }

    const paged = opportunities.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < opportunities.length
        ? String(startIndex + limit)
        : undefined;

    return HttpResponse.json({
      records: paged,
      totalSize: opportunities.length,
      nextCursor,
    });
  }),

  // Get single opportunity
  http.get(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(50);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const opportunity = db.getOpportunity(id as string, tenantId);
    if (!opportunity) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity not found",
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(opportunity);
  }),

  // Create opportunity
  http.post(`${BASE_URL}`, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as Partial<Opportunity>;

    // Validation
    const errors: Array<{ field: string; message: string }> = [];
    if (!body.name) {
      errors.push({ field: "name", message: "Opportunity name is required" });
    }
    if (!body.accountId) {
      errors.push({ field: "accountId", message: "Account is required" });
    }
    if (!body.stageName) {
      errors.push({ field: "stageName", message: "Stage is required" });
    }
    if (!body.closeDate) {
      errors.push({ field: "closeDate", message: "Close date is required" });
    }

    // Validate stage exists
    if (body.stageName) {
      const validStage = STAGE_DEFINITIONS.find(
        (s) => s.stageName === body.stageName
      );
      if (!validStage) {
        errors.push({
          field: "stageName",
          message: `Invalid stage: ${body.stageName}`,
        });
      }
    }

    // Validate account exists
    if (body.accountId) {
      const account = db.getAccount(body.accountId, tenantId);
      if (!account) {
        errors.push({
          field: "accountId",
          message: "Account not found",
        });
      }
    }

    if (errors.length > 0) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: errors,
          },
        },
        { status: 422 }
      );
    }

    const opportunity = db.createOpportunity({
      ...body,
      tenantId,
    } as Partial<Opportunity>);

    return HttpResponse.json({ id: opportunity.id }, { status: 201 });
  }),

  // Update opportunity
  http.patch(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const ifMatch = request.headers.get("If-Match");
    const body = (await request.json()) as Partial<Opportunity>;

    const existing = db.getOpportunity(id as string, tenantId);
    if (!existing) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity not found",
          },
        },
        { status: 404 }
      );
    }

    // Optimistic locking
    if (ifMatch && ifMatch !== existing.systemModstamp) {
      return HttpResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Record has been modified by another user",
          },
        },
        { status: 409 }
      );
    }

    const updated = db.updateOpportunity(id as string, tenantId, body);
    return HttpResponse.json(updated);
  }),

  // Delete opportunity
  http.delete(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const deleted = db.deleteOpportunity(id as string, tenantId);
    if (!deleted) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity not found",
          },
        },
        { status: 404 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Change stage
  http.post(`${BASE_URL}/:id/stage`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as {
      stageName: string;
      expectedVersion?: string;
    };

    const existing = db.getOpportunity(id as string, tenantId);
    if (!existing) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity not found",
          },
        },
        { status: 404 }
      );
    }

    // Optimistic locking
    if (body.expectedVersion && body.expectedVersion !== existing.systemModstamp) {
      return HttpResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Record has been modified by another user",
          },
        },
        { status: 409 }
      );
    }

    // Validate stage
    const validStage = STAGE_DEFINITIONS.find(
      (s) => s.stageName === body.stageName
    );
    if (!validStage) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid stage: ${body.stageName}`,
          },
        },
        { status: 422 }
      );
    }

    const updated = db.updateOpportunity(id as string, tenantId, {
      stageName: body.stageName,
    });

    return HttpResponse.json(updated);
  }),

  // Close opportunity
  http.post("/v1/opportunities/:id/close", async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as {
      result: "WON" | "LOST";
      closeDate: string;
      lostReason?: string;
    };

    const existing = db.getOpportunity(id as string, tenantId);
    if (!existing) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity not found",
          },
        },
        { status: 404 }
      );
    }

    // Already closed
    if (existing.isClosed) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Opportunity is already closed",
          },
        },
        { status: 422 }
      );
    }

    // Validate lost reason for LOST
    if (body.result === "LOST" && !body.lostReason) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Lost reason is required when closing as Lost",
            details: [
              {
                field: "lostReason",
                message: "Lost reason is required",
                rule: "VR-OPP-03",
              },
            ],
          },
        },
        { status: 422 }
      );
    }

    const stageName = body.result === "WON" ? "Closed Won" : "Closed Lost";
    const updated = db.changeOpportunityStage(
      id as string,
      tenantId,
      stageName,
      body.lostReason
    );

    if (updated) {
      updated.closeDate = body.closeDate;
    }

    return HttpResponse.json(updated);
  }),

  // Get related quotes
  http.get(`${BASE_URL}/:id/related/Quotes`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const opportunity = db.getOpportunity(id as string, tenantId);
    if (!opportunity) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity not found",
          },
        },
        { status: 404 }
      );
    }

    const quotes = db.getQuotesByOpportunity(id as string, tenantId);

    return HttpResponse.json({
      records: quotes,
      totalSize: quotes.length,
    });
  }),
];
