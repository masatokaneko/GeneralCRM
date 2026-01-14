import { http, HttpResponse, delay } from "msw";
import { db, DEFAULT_TENANT_ID } from "../db";
import type { Quote } from "../types";

const BASE_URL = "/v1/quotes";

export const quoteHandlers = [
  // Get all quotes
  http.get(`${BASE_URL}`, async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    let quotes = db.getAllQuotes(tenantId);

    // Filter by opportunityId if provided
    const opportunityId = url.searchParams.get("opportunityId");
    if (opportunityId) {
      quotes = quotes.filter((q) => q.opportunityId === opportunityId);
    }

    // Simple filtering
    const filter = url.searchParams.get("filter");
    if (filter) {
      const nameMatch = filter.match(/name\s*like\s*['"]%?(.+?)%?['"]/i);
      if (nameMatch) {
        const searchTerm = nameMatch[1].toLowerCase();
        quotes = quotes.filter((q) =>
          q.name.toLowerCase().includes(searchTerm)
        );
      }
    }

    // Sorting
    const sort = url.searchParams.get("sort");
    if (sort) {
      const desc = sort.startsWith("-");
      const field = desc ? sort.slice(1) : sort;
      quotes.sort((a, b) => {
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
    const limit = Math.min(
      Number(url.searchParams.get("limit")) || 50,
      200
    );
    const cursor = url.searchParams.get("cursor");
    let startIndex = 0;
    if (cursor) {
      startIndex = Number.parseInt(cursor, 10) || 0;
    }

    const paged = quotes.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < quotes.length
        ? String(startIndex + limit)
        : undefined;

    return HttpResponse.json({
      records: paged,
      totalSize: quotes.length,
      nextCursor,
    });
  }),

  // Get single quote
  http.get(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(50);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const quote = db.getQuote(id as string, tenantId);
    if (!quote) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Quote not found",
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(quote);
  }),

  // Create quote
  http.post(`${BASE_URL}`, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as Partial<Quote>;

    // Validation
    if (!body.name) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: [
              {
                field: "name",
                message: "Quote name is required",
              },
            ],
          },
        },
        { status: 422 }
      );
    }

    if (!body.opportunityId) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: [
              {
                field: "opportunityId",
                message: "Opportunity ID is required",
              },
            ],
          },
        },
        { status: 422 }
      );
    }

    const quote = db.createQuote({
      ...body,
      tenantId,
    } as Partial<Quote>);

    return HttpResponse.json(
      { id: quote.id },
      { status: 201 }
    );
  }),

  // Update quote
  http.patch(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const ifMatch = request.headers.get("If-Match");
    const body = (await request.json()) as Partial<Quote>;

    const existing = db.getQuote(id as string, tenantId);
    if (!existing) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Quote not found",
          },
        },
        { status: 404 }
      );
    }

    // Optimistic locking check
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

    const updated = db.updateQuote(id as string, tenantId, body);
    return HttpResponse.json(updated);
  }),

  // Delete quote
  http.delete(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const quote = db.getQuote(id as string, tenantId);
    if (!quote) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Quote not found",
          },
        },
        { status: 404 }
      );
    }

    // Soft delete
    db.updateQuote(id as string, tenantId, { isDeleted: true });

    return new HttpResponse(null, { status: 204 });
  }),

  // Set as primary quote
  http.post(`${BASE_URL}/:id/primary`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const result = db.markQuoteAsPrimary(id as string, tenantId);
    if (!result) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Quote not found",
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(result.quote);
  }),

  // Change quote status
  http.post(`${BASE_URL}/:id/status`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as { status: Quote["status"] };

    const quote = db.getQuote(id as string, tenantId);
    if (!quote) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Quote not found",
          },
        },
        { status: 404 }
      );
    }

    const validStatuses: Quote["status"][] = [
      "Draft",
      "NeedsReview",
      "InReview",
      "Approved",
      "Rejected",
      "Presented",
      "Accepted",
      "Denied",
    ];

    if (!validStatuses.includes(body.status)) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid status",
            details: [
              {
                field: "status",
                message: `Status must be one of: ${validStatuses.join(", ")}`,
              },
            ],
          },
        },
        { status: 422 }
      );
    }

    const updated = db.updateQuote(id as string, tenantId, {
      status: body.status,
    });

    return HttpResponse.json(updated);
  }),

  // Get related line items
  http.get(`${BASE_URL}/:id/related/QuoteLineItems`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const quote = db.getQuote(id as string, tenantId);
    if (!quote) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Quote not found",
          },
        },
        { status: 404 }
      );
    }

    // Return empty array for now (line items not implemented in mock db)
    return HttpResponse.json({
      records: [],
      totalSize: 0,
    });
  }),
];
