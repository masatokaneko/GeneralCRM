import { http, HttpResponse, delay } from "msw";
import { db, DEFAULT_TENANT_ID } from "../db";
import type { Account } from "../types";

const BASE_URL = "/v1/accounts";

export const accountHandlers = [
  // Get all accounts
  http.get(`${BASE_URL}`, async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const accounts = db.getAllAccounts(tenantId);

    // Simple filtering
    const filter = url.searchParams.get("filter");
    let filtered = accounts;
    if (filter) {
      // Basic filter parsing (name contains)
      const nameMatch = filter.match(/name\s*like\s*['"]%?(.+?)%?['"]/i);
      if (nameMatch) {
        const searchTerm = nameMatch[1].toLowerCase();
        filtered = accounts.filter((a) =>
          a.name.toLowerCase().includes(searchTerm)
        );
      }
    }

    // Sorting
    const sort = url.searchParams.get("sort");
    if (sort) {
      const desc = sort.startsWith("-");
      const field = desc ? sort.slice(1) : sort;
      filtered.sort((a, b) => {
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

    const paged = filtered.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < filtered.length
        ? String(startIndex + limit)
        : undefined;

    return HttpResponse.json({
      records: paged,
      totalSize: filtered.length,
      nextCursor,
    });
  }),

  // Get single account
  http.get(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(50);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const account = db.getAccount(id as string, tenantId);
    if (!account) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Account not found",
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(account);
  }),

  // Create account
  http.post(`${BASE_URL}`, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as Partial<Account>;

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
                message: "Account name is required",
              },
            ],
          },
        },
        { status: 422 }
      );
    }

    const account = db.createAccount({
      ...body,
      tenantId,
    } as Partial<Account>);

    return HttpResponse.json(
      { id: account.id },
      { status: 201 }
    );
  }),

  // Update account
  http.patch(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const ifMatch = request.headers.get("If-Match");
    const body = (await request.json()) as Partial<Account>;

    const existing = db.getAccount(id as string, tenantId);
    if (!existing) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Account not found",
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

    const updated = db.updateAccount(id as string, tenantId, body);
    return HttpResponse.json(updated);
  }),

  // Delete account
  http.delete(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const deleted = db.deleteAccount(id as string, tenantId);
    if (!deleted) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Account not found",
          },
        },
        { status: 404 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Get related contacts
  http.get(`${BASE_URL}/:id/related/Contacts`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const account = db.getAccount(id as string, tenantId);
    if (!account) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Account not found",
          },
        },
        { status: 404 }
      );
    }

    const contacts = db.getContactsByAccount(id as string, tenantId);

    return HttpResponse.json({
      records: contacts,
      totalSize: contacts.length,
    });
  }),

  // Get related opportunities
  http.get(
    `${BASE_URL}/:id/related/Opportunities`,
    async ({ params, request }) => {
      await delay(100);
      const { id } = params;
      const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

      const account = db.getAccount(id as string, tenantId);
      if (!account) {
        return HttpResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Account not found",
            },
          },
          { status: 404 }
        );
      }

      const opportunities = db.getOpportunitiesByAccount(id as string, tenantId);

      return HttpResponse.json({
        records: opportunities,
        totalSize: opportunities.length,
      });
    }
  ),
];
