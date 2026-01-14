import { http, HttpResponse, delay } from "msw";
import { DEFAULT_TENANT_ID, DEFAULT_USER_ID } from "../db";
import type { Campaign, CampaignMember } from "../types";

const BASE_URL = "/v1/campaigns";

// In-memory storage
const campaigns = new Map<string, Campaign>();
const campaignMembers = new Map<string, CampaignMember>();

// Seed data
function seedCampaigns() {
  const now = new Date().toISOString();

  const seedData: Partial<Campaign>[] = [
    {
      name: "Spring 2024 Product Launch",
      type: "Email",
      status: "Completed",
      startDate: "2024-03-01",
      endDate: "2024-03-31",
      expectedRevenue: 5000000,
      budgetedCost: 500000,
      actualCost: 480000,
      numberSent: 10000,
      isActive: false,
      numberOfLeads: 250,
      numberOfContacts: 150,
      numberOfOpportunities: 45,
      numberOfWonOpportunities: 12,
      amountAllOpportunities: 3500000,
      amountWonOpportunities: 1200000,
    },
    {
      name: "Tech Summit 2024",
      type: "Conference",
      status: "InProgress",
      startDate: "2024-06-15",
      endDate: "2024-06-17",
      expectedRevenue: 8000000,
      budgetedCost: 2000000,
      actualCost: 1500000,
      isActive: true,
      numberOfLeads: 180,
      numberOfContacts: 90,
      numberOfOpportunities: 30,
      numberOfWonOpportunities: 5,
      amountAllOpportunities: 6000000,
      amountWonOpportunities: 800000,
    },
    {
      name: "Enterprise Webinar Series",
      type: "Webinar",
      status: "InProgress",
      startDate: "2024-01-15",
      endDate: "2024-12-31",
      expectedRevenue: 3000000,
      budgetedCost: 200000,
      actualCost: 120000,
      numberSent: 5000,
      isActive: true,
      numberOfLeads: 320,
      numberOfContacts: 200,
      numberOfOpportunities: 55,
      numberOfWonOpportunities: 15,
      amountAllOpportunities: 2800000,
      amountWonOpportunities: 950000,
    },
    {
      name: "Partner Referral Program",
      type: "Partner",
      status: "InProgress",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      expectedRevenue: 10000000,
      budgetedCost: 1000000,
      actualCost: 650000,
      isActive: true,
      numberOfLeads: 150,
      numberOfContacts: 80,
      numberOfOpportunities: 40,
      numberOfWonOpportunities: 18,
      amountAllOpportunities: 7500000,
      amountWonOpportunities: 3200000,
    },
    {
      name: "Q4 Direct Mail Campaign",
      type: "Direct Mail",
      status: "Planned",
      startDate: "2024-10-01",
      endDate: "2024-12-15",
      expectedRevenue: 2000000,
      budgetedCost: 300000,
      isActive: true,
      numberOfLeads: 0,
      numberOfContacts: 0,
      numberOfOpportunities: 0,
      numberOfWonOpportunities: 0,
      amountAllOpportunities: 0,
      amountWonOpportunities: 0,
    },
  ];

  seedData.forEach((data, index) => {
    const id = crypto.randomUUID();
    campaigns.set(id, {
      id,
      tenantId: DEFAULT_TENANT_ID,
      ownerId: DEFAULT_USER_ID,
      createdAt: now,
      createdBy: DEFAULT_USER_ID,
      updatedAt: now,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      systemModstamp: now,
      ownerName: "Taro Yamada",
      ...data,
    } as Campaign);
  });
}

seedCampaigns();

export const campaignHandlers = [
  // List campaigns
  http.get(BASE_URL, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const url = new URL(request.url);

    let results = Array.from(campaigns.values())
      .filter((c) => c.tenantId === tenantId && !c.isDeleted);

    // Filter by status
    const status = url.searchParams.get("status");
    if (status) {
      results = results.filter((c) => c.status === status);
    }

    // Filter by type
    const type = url.searchParams.get("type");
    if (type) {
      results = results.filter((c) => c.type === type);
    }

    // Filter by isActive
    const isActive = url.searchParams.get("isActive");
    if (isActive !== null) {
      results = results.filter((c) => c.isActive === (isActive === "true"));
    }

    // Sort by start date descending
    results.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });

    // Pagination
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
    const cursor = url.searchParams.get("cursor");
    let startIndex = 0;
    if (cursor) {
      startIndex = Number.parseInt(cursor, 10) || 0;
    }

    const paged = results.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < results.length ? String(startIndex + limit) : undefined;

    return HttpResponse.json({
      records: paged,
      totalSize: results.length,
      nextCursor,
    });
  }),

  // Get single campaign
  http.get(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(50);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const campaign = campaigns.get(id as string);
    if (!campaign || campaign.tenantId !== tenantId || campaign.isDeleted) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    return HttpResponse.json(campaign);
  }),

  // Create campaign
  http.post(BASE_URL, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as Partial<Campaign>;

    // Validation
    const errors: Array<{ field: string; message: string }> = [];
    if (!body.name) {
      errors.push({ field: "name", message: "Campaign name is required" });
    }
    if (!body.type) {
      errors.push({ field: "type", message: "Campaign type is required" });
    }

    if (errors.length > 0) {
      return HttpResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", details: errors } },
        { status: 422 }
      );
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const campaign: Campaign = {
      id,
      tenantId,
      name: body.name!,
      type: body.type!,
      status: body.status || "Planned",
      startDate: body.startDate,
      endDate: body.endDate,
      expectedRevenue: body.expectedRevenue,
      budgetedCost: body.budgetedCost,
      actualCost: body.actualCost,
      expectedResponse: body.expectedResponse,
      numberSent: body.numberSent,
      parentId: body.parentId,
      isActive: body.isActive ?? true,
      description: body.description,
      ownerId: DEFAULT_USER_ID,
      createdAt: now,
      createdBy: DEFAULT_USER_ID,
      updatedAt: now,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      systemModstamp: now,
      ownerName: "Taro Yamada",
      numberOfLeads: 0,
      numberOfContacts: 0,
      numberOfOpportunities: 0,
      numberOfWonOpportunities: 0,
      amountAllOpportunities: 0,
      amountWonOpportunities: 0,
    };

    campaigns.set(id, campaign);
    return HttpResponse.json({ id }, { status: 201 });
  }),

  // Update campaign
  http.patch(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const ifMatch = request.headers.get("If-Match");
    const body = (await request.json()) as Partial<Campaign>;

    const campaign = campaigns.get(id as string);
    if (!campaign || campaign.tenantId !== tenantId || campaign.isDeleted) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    if (ifMatch && ifMatch !== campaign.systemModstamp) {
      return HttpResponse.json(
        { error: { code: "CONFLICT", message: "Record has been modified" } },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const updated: Campaign = {
      ...campaign,
      ...body,
      updatedAt: now,
      updatedBy: DEFAULT_USER_ID,
      systemModstamp: now,
    };

    campaigns.set(id as string, updated);
    return HttpResponse.json(updated);
  }),

  // Delete campaign
  http.delete(`${BASE_URL}/:id`, async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const campaign = campaigns.get(id as string);
    if (!campaign || campaign.tenantId !== tenantId || campaign.isDeleted) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    campaign.isDeleted = true;
    campaign.updatedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  // Get campaign members
  http.get(`${BASE_URL}/:campaignId/members`, async ({ params, request }) => {
    await delay(100);
    const { campaignId } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const members = Array.from(campaignMembers.values())
      .filter(
        (m) =>
          m.tenantId === tenantId &&
          m.campaignId === campaignId &&
          !m.isDeleted
      );

    return HttpResponse.json({
      records: members,
      totalSize: members.length,
    });
  }),

  // Add campaign member
  http.post(`${BASE_URL}/:campaignId/members`, async ({ params, request }) => {
    await delay(100);
    const { campaignId } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as Partial<CampaignMember>;

    const campaign = campaigns.get(campaignId as string);
    if (!campaign || campaign.tenantId !== tenantId || campaign.isDeleted) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign not found" } },
        { status: 404 }
      );
    }

    if (!body.leadId && !body.contactId) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Either leadId or contactId is required",
          },
        },
        { status: 422 }
      );
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const member: CampaignMember = {
      id,
      tenantId,
      campaignId: campaignId as string,
      leadId: body.leadId,
      contactId: body.contactId,
      status: body.status || "Sent",
      hasResponded: false,
      createdAt: now,
      createdBy: DEFAULT_USER_ID,
      updatedAt: now,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      systemModstamp: now,
    };

    campaignMembers.set(id, member);

    // Update campaign metrics
    if (body.leadId) {
      campaign.numberOfLeads = (campaign.numberOfLeads || 0) + 1;
    } else {
      campaign.numberOfContacts = (campaign.numberOfContacts || 0) + 1;
    }

    return HttpResponse.json(member, { status: 201 });
  }),

  // Get campaign stats
  http.get(`${BASE_URL}/stats`, async ({ request }) => {
    await delay(100);
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const results = Array.from(campaigns.values())
      .filter((c) => c.tenantId === tenantId && !c.isDeleted);

    const stats = {
      totalCampaigns: results.length,
      activeCampaigns: results.filter((c) => c.isActive).length,
      totalBudget: results.reduce((sum, c) => sum + (c.budgetedCost || 0), 0),
      totalActualCost: results.reduce((sum, c) => sum + (c.actualCost || 0), 0),
      totalRevenue: results.reduce((sum, c) => sum + (c.amountWonOpportunities || 0), 0),
      roi: 0,
    };

    if (stats.totalActualCost > 0) {
      stats.roi = ((stats.totalRevenue - stats.totalActualCost) / stats.totalActualCost) * 100;
    }

    return HttpResponse.json(stats);
  }),

  // Update campaign member
  http.patch("/v1/campaign-members/:id", async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;
    const body = (await request.json()) as Partial<CampaignMember>;

    const member = campaignMembers.get(id as string);
    if (!member || member.tenantId !== tenantId || member.isDeleted) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign member not found" } },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const updated: CampaignMember = {
      ...member,
      status: body.status ?? member.status,
      hasResponded: body.status === "Responded" || body.status === "Converted",
      firstRespondedDate:
        (body.status === "Responded" || body.status === "Converted") && !member.firstRespondedDate
          ? now
          : member.firstRespondedDate,
      updatedAt: now,
      updatedBy: DEFAULT_USER_ID,
      systemModstamp: now,
    };

    campaignMembers.set(id as string, updated);
    return HttpResponse.json(updated);
  }),

  // Delete campaign member
  http.delete("/v1/campaign-members/:id", async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const tenantId = request.headers.get("X-Tenant-Id") || DEFAULT_TENANT_ID;

    const member = campaignMembers.get(id as string);
    if (!member || member.tenantId !== tenantId || member.isDeleted) {
      return HttpResponse.json(
        { error: { code: "NOT_FOUND", message: "Campaign member not found" } },
        { status: 404 }
      );
    }

    member.isDeleted = true;
    member.updatedAt = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),
];
