import { http, HttpResponse, delay } from "msw";
import { db, DEFAULT_TENANT_ID, DEFAULT_USER_ID } from "../db";
import type { OpportunityContactRole } from "../../lib/api/opportunityContactRoles";

// In-memory storage for contact roles
const contactRoles = new Map<string, OpportunityContactRole>();

// Initialize with seed data
function seedContactRoles() {
  const opportunities = db.getAllOpportunities(DEFAULT_TENANT_ID);
  const contacts = db.getAllContacts(DEFAULT_TENANT_ID);

  if (opportunities.length > 0 && contacts.length > 0) {
    // Create a sample contact role for the first opportunity
    const now = new Date().toISOString();
    const contact = contacts[0];
    const id = crypto.randomUUID();

    contactRoles.set(id, {
      id,
      tenantId: DEFAULT_TENANT_ID,
      opportunityId: opportunities[0].id,
      contactId: contact.id,
      role: "DecisionMaker",
      isPrimary: true,
      influenceLevel: 5,
      stance: "Support",
      createdAt: now,
      createdBy: DEFAULT_USER_ID,
      updatedAt: now,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      systemModstamp: now,
      contactName: `${contact.firstName || ""} ${contact.lastName}`.trim(),
      contactEmail: contact.email,
      contactTitle: contact.title,
    });
  }
}

// Initialize seed data
seedContactRoles();

export const opportunityContactRoleHandlers = [
  // List contact roles by opportunity
  http.get("/v1/opportunities/:opportunityId/contact-roles", async ({ params, request }) => {
    await delay(100);
    const { opportunityId } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const roles = Array.from(contactRoles.values())
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.opportunityId === opportunityId &&
          !r.isDeleted
      )
      .sort((a, b) => {
        // Primary first, then by created date
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    return HttpResponse.json({
      records: roles,
      totalSize: roles.length,
    });
  }),

  // List contact roles by contact
  http.get("/v1/contacts/:contactId/opportunity-roles", async ({ params, request }) => {
    await delay(100);
    const { contactId } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const roles = Array.from(contactRoles.values())
      .filter(
        (r) =>
          r.tenantId === tenantId && r.contactId === contactId && !r.isDeleted
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return HttpResponse.json({
      records: roles,
      totalSize: roles.length,
    });
  }),

  // Get single contact role
  http.get("/v1/opportunity-contact-roles/:id", async ({ params, request }) => {
    await delay(50);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const role = contactRoles.get(id as string);
    if (!role || role.tenantId !== tenantId || role.isDeleted) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity contact role not found",
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(role);
  }),

  // Create contact role
  http.post("/v1/opportunities/:opportunityId/contact-roles", async ({ params, request }) => {
    await delay(100);
    const { opportunityId } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as Partial<OpportunityContactRole>;

    // Validation
    const errors: Array<{ field: string; message: string }> = [];
    if (!body.contactId) {
      errors.push({ field: "contactId", message: "Contact is required" });
    }
    if (!body.role) {
      errors.push({ field: "role", message: "Role is required" });
    }

    // Check if contact already exists for this opportunity
    const existing = Array.from(contactRoles.values()).find(
      (r) =>
        r.tenantId === tenantId &&
        r.opportunityId === opportunityId &&
        r.contactId === body.contactId &&
        !r.isDeleted
    );
    if (existing) {
      return HttpResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Contact is already associated with this opportunity",
          },
        },
        { status: 409 }
      );
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

    // If setting as primary, unset existing primary
    if (body.isPrimary) {
      Array.from(contactRoles.values())
        .filter(
          (r) =>
            r.tenantId === tenantId &&
            r.opportunityId === opportunityId &&
            r.isPrimary &&
            !r.isDeleted
        )
        .forEach((r) => {
          r.isPrimary = false;
          r.updatedAt = new Date().toISOString();
        });
    }

    // Get contact info
    const contact = db.getContact(body.contactId!, tenantId);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const role: OpportunityContactRole = {
      id,
      tenantId,
      opportunityId: opportunityId as string,
      contactId: body.contactId!,
      role: body.role || "Other",
      isPrimary: body.isPrimary || false,
      influenceLevel: body.influenceLevel,
      stance: body.stance,
      createdAt: now,
      createdBy: DEFAULT_USER_ID,
      updatedAt: now,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      systemModstamp: now,
      contactName: contact
        ? `${contact.firstName || ""} ${contact.lastName}`.trim()
        : undefined,
      contactEmail: contact?.email,
      contactTitle: contact?.title,
    };

    contactRoles.set(id, role);
    return HttpResponse.json(role, { status: 201 });
  }),

  // Update contact role
  http.patch("/v1/opportunity-contact-roles/:id", async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const ifMatch = request.headers.get("If-Match");
    const body = (await request.json()) as Partial<OpportunityContactRole>;

    const role = contactRoles.get(id as string);
    if (!role || role.tenantId !== tenantId || role.isDeleted) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity contact role not found",
          },
        },
        { status: 404 }
      );
    }

    // Optimistic locking
    if (ifMatch && ifMatch !== role.systemModstamp) {
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

    // If setting as primary, unset existing primary
    if (body.isPrimary && !role.isPrimary) {
      Array.from(contactRoles.values())
        .filter(
          (r) =>
            r.tenantId === tenantId &&
            r.opportunityId === role.opportunityId &&
            r.isPrimary &&
            !r.isDeleted &&
            r.id !== role.id
        )
        .forEach((r) => {
          r.isPrimary = false;
          r.updatedAt = new Date().toISOString();
        });
    }

    const now = new Date().toISOString();
    const updated: OpportunityContactRole = {
      ...role,
      role: body.role ?? role.role,
      isPrimary: body.isPrimary ?? role.isPrimary,
      influenceLevel: body.influenceLevel ?? role.influenceLevel,
      stance: body.stance ?? role.stance,
      updatedAt: now,
      updatedBy: DEFAULT_USER_ID,
      systemModstamp: now,
    };

    contactRoles.set(id as string, updated);
    return HttpResponse.json(updated);
  }),

  // Set as primary
  http.post("/v1/opportunity-contact-roles/:id/set-primary", async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const role = contactRoles.get(id as string);
    if (!role || role.tenantId !== tenantId || role.isDeleted) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity contact role not found",
          },
        },
        { status: 404 }
      );
    }

    // Unset existing primary
    Array.from(contactRoles.values())
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.opportunityId === role.opportunityId &&
          r.isPrimary &&
          !r.isDeleted
      )
      .forEach((r) => {
        r.isPrimary = false;
        r.updatedAt = new Date().toISOString();
      });

    const now = new Date().toISOString();
    role.isPrimary = true;
    role.updatedAt = now;
    role.systemModstamp = now;

    return HttpResponse.json(role);
  }),

  // Delete contact role
  http.delete("/v1/opportunity-contact-roles/:id", async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const role = contactRoles.get(id as string);
    if (!role || role.tenantId !== tenantId || role.isDeleted) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Opportunity contact role not found",
          },
        },
        { status: 404 }
      );
    }

    role.isDeleted = true;
    role.updatedAt = new Date().toISOString();

    return new HttpResponse(null, { status: 204 });
  }),
];
