import { http, HttpResponse, delay } from "msw";
import { db, DEFAULT_TENANT_ID } from "../db";
import type { Contact } from "../types";

const BASE_URL = "/v1/contacts";

export const contactHandlers = [
  // Get all contacts
  http.get(`${BASE_URL}`, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const url = new URL(request.url);

    let contacts = db.getAllContacts(tenantId);

    // Filter by accountId if specified
    const accountId = url.searchParams.get("accountId");
    if (accountId) {
      contacts = contacts.filter((c) => c.accountId === accountId);
    }

    // Pagination
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const cursor = url.searchParams.get("cursor");
    let startIndex = 0;
    if (cursor) {
      startIndex = Number.parseInt(cursor, 10) || 0;
    }

    const paged = contacts.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < contacts.length
        ? String(startIndex + limit)
        : undefined;

    return HttpResponse.json({
      records: paged,
      totalSize: contacts.length,
      nextCursor,
    });
  }),

  // Get single contact
  http.get(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(50);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const contact = db.getContact(id as string, tenantId);
    if (!contact) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Contact not found",
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(contact);
  }),

  // Create contact
  http.post(`${BASE_URL}`, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as Partial<Contact>;

    // Validation
    const errors: Array<{ field: string; message: string }> = [];
    if (!body.lastName) {
      errors.push({ field: "lastName", message: "Last name is required" });
    }
    if (!body.accountId) {
      errors.push({
        field: "accountId",
        message: "Account is required (INV-C1)",
      });
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

    // Check primary contact constraint (INV-C2)
    if (body.isPrimary && body.accountId) {
      const existingContacts = db.getContactsByAccount(body.accountId, tenantId);
      const hasPrimary = existingContacts.some((c) => c.isPrimary);
      if (hasPrimary) {
        errors.push({
          field: "isPrimary",
          message:
            "Account already has a primary contact. Unset existing primary first.",
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

    const contact = db.createContact({
      ...body,
      tenantId,
    } as Partial<Contact>);

    return HttpResponse.json({ id: contact.id }, { status: 201 });
  }),

  // Update contact
  http.patch(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const ifMatch = request.headers.get("If-Match");
    const body = (await request.json()) as Partial<Contact>;

    const existing = db.getContact(id as string, tenantId);
    if (!existing) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Contact not found",
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

    // Check primary contact constraint when setting isPrimary
    if (body.isPrimary && !existing.isPrimary) {
      const existingContacts = db.getContactsByAccount(
        existing.accountId,
        tenantId
      );
      const hasPrimary = existingContacts.some(
        (c) => c.isPrimary && c.id !== id
      );
      if (hasPrimary) {
        return HttpResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Validation failed",
              details: [
                {
                  field: "isPrimary",
                  message:
                    "Account already has a primary contact (INV-C2)",
                },
              ],
            },
          },
          { status: 422 }
        );
      }
    }

    const updated = db.updateContact(id as string, tenantId, body);
    return HttpResponse.json(updated);
  }),

  // Delete contact
  http.delete(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const deleted = db.deleteContact(id as string, tenantId);
    if (!deleted) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Contact not found",
          },
        },
        { status: 404 }
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),
];
