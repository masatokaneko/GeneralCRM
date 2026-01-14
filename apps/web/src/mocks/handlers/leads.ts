import { http, HttpResponse, delay } from "msw";
import { db, DEFAULT_TENANT_ID } from "../db";
import type { Lead } from "../types";

const BASE_URL = "/v1/leads";

export const leadHandlers = [
  // Get all leads
  http.get(`${BASE_URL}`, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const url = new URL(request.url);

    const leads = db.getAllLeads(tenantId);

    // Pagination
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const cursor = url.searchParams.get("cursor");
    let startIndex = 0;
    if (cursor) {
      startIndex = Number.parseInt(cursor, 10) || 0;
    }

    const paged = leads.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < leads.length ? String(startIndex + limit) : undefined;

    return HttpResponse.json({
      records: paged,
      totalSize: leads.length,
      nextCursor,
    });
  }),

  // Get single lead
  http.get(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(50);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const lead = db.getLead(id as string, tenantId);
    if (!lead) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Lead not found",
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(lead);
  }),

  // Create lead
  http.post(`${BASE_URL}`, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as Partial<Lead>;

    // Validation
    const errors: Array<{ field: string; message: string }> = [];
    if (!body.lastName) {
      errors.push({ field: "lastName", message: "Last name is required" });
    }
    if (!body.company) {
      errors.push({ field: "company", message: "Company is required" });
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

    const lead = db.createLead({
      ...body,
      tenantId,
    } as Partial<Lead>);

    return HttpResponse.json({ id: lead.id }, { status: 201 });
  }),

  // Update lead
  http.patch(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const ifMatch = request.headers.get("If-Match");
    const body = (await request.json()) as Partial<Lead>;

    const existing = db.getLead(id as string, tenantId);
    if (!existing) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Lead not found",
          },
        },
        { status: 404 }
      );
    }

    // Cannot update converted lead
    if (existing.isConverted) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Cannot update a converted lead",
          },
        },
        { status: 422 }
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

    const updated = db.updateLead(id as string, tenantId, body);
    return HttpResponse.json(updated);
  }),

  // Delete lead
  http.delete(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const deleted = db.deleteLead(id as string, tenantId);
    if (!deleted) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Lead not found",
          },
        },
        { status: 404 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // Convert lead
  http.post("/v1/leads/:leadId/convert", async ({ params, request }) => {
    await delay(200);
    const { leadId } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as {
      account: { mode: "new" | "existing"; id?: string; name?: string };
      contact: {
        mode: "new" | "existing";
        id?: string;
        lastName?: string;
        email?: string;
      };
      opportunity?: {
        create: boolean;
        name?: string;
        stageName?: string;
        closeDate?: string;
      };
      ownerId?: string;
    };

    const lead = db.getLead(leadId as string, tenantId);
    if (!lead) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Lead not found",
          },
        },
        { status: 404 }
      );
    }

    // Validate lead status
    if (lead.status !== "Qualified") {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Lead must be Qualified to convert",
            details: [
              {
                field: "status",
                message: `Current status is ${lead.status}, must be Qualified`,
              },
            ],
          },
        },
        { status: 422 }
      );
    }

    if (lead.isConverted) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Lead has already been converted",
          },
        },
        { status: 422 }
      );
    }

    // Perform conversion
    const result = db.convertLead(
      leadId as string,
      tenantId,
      {
        name: body.account.mode === "new" ? body.account.name : undefined,
      },
      {
        lastName: body.contact.mode === "new" ? body.contact.lastName : undefined,
        email: body.contact.mode === "new" ? body.contact.email : undefined,
      },
      body.opportunity?.create
        ? {
            name: body.opportunity.name,
            stageName: body.opportunity.stageName,
            closeDate: body.opportunity.closeDate,
          }
        : undefined
    );

    if (!result) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Lead conversion failed",
          },
        },
        { status: 422 }
      );
    }

    return HttpResponse.json({
      convertedAccountId: result.accountId,
      convertedContactId: result.contactId,
      convertedOpportunityId: result.opportunityId,
      convertLogId: crypto.randomUUID(),
    });
  }),
];
