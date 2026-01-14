import { http, HttpResponse } from "msw";
import type {
  Territory,
  TerritoryUserAssignment,
  TerritoryAccountAssignment,
  TerritoryAssignmentRule,
  QueryResponse,
} from "../types";

const TENANT_ID = "tenant-001";
const USER_ID = "user-001";

// Mock territories data (hierarchical structure)
const mockTerritories: Territory[] = [
  {
    id: "terr-001",
    tenantId: TENANT_ID,
    name: "Global",
    parentTerritoryId: undefined,
    description: "Global sales territory",
    isActive: true,
    sortOrder: 0,
    userCount: 31,
    accountCount: 450,
    pipelineAmount: 25000000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "terr-002",
    tenantId: TENANT_ID,
    name: "APAC",
    parentTerritoryId: "terr-001",
    parentTerritoryName: "Global",
    description: "Asia Pacific region",
    isActive: true,
    sortOrder: 0,
    userCount: 12,
    accountCount: 150,
    pipelineAmount: 8000000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "terr-003",
    tenantId: TENANT_ID,
    name: "Japan",
    parentTerritoryId: "terr-002",
    parentTerritoryName: "APAC",
    description: "Japan market coverage",
    isActive: true,
    sortOrder: 0,
    userCount: 5,
    accountCount: 80,
    pipelineAmount: 4500000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "terr-004",
    tenantId: TENANT_ID,
    name: "Korea",
    parentTerritoryId: "terr-002",
    parentTerritoryName: "APAC",
    description: "Korea market coverage",
    isActive: true,
    sortOrder: 1,
    userCount: 3,
    accountCount: 40,
    pipelineAmount: 2000000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "terr-005",
    tenantId: TENANT_ID,
    name: "Southeast Asia",
    parentTerritoryId: "terr-002",
    parentTerritoryName: "APAC",
    description: "Southeast Asia market coverage",
    isActive: true,
    sortOrder: 2,
    userCount: 4,
    accountCount: 30,
    pipelineAmount: 1500000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "terr-006",
    tenantId: TENANT_ID,
    name: "Americas",
    parentTerritoryId: "terr-001",
    parentTerritoryName: "Global",
    description: "Americas region",
    isActive: true,
    sortOrder: 1,
    userCount: 11,
    accountCount: 200,
    pipelineAmount: 12000000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "terr-007",
    tenantId: TENANT_ID,
    name: "North America",
    parentTerritoryId: "terr-006",
    parentTerritoryName: "Americas",
    description: "US and Canada",
    isActive: true,
    sortOrder: 0,
    userCount: 8,
    accountCount: 170,
    pipelineAmount: 10000000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "terr-008",
    tenantId: TENANT_ID,
    name: "LATAM",
    parentTerritoryId: "terr-006",
    parentTerritoryName: "Americas",
    description: "Latin America",
    isActive: true,
    sortOrder: 1,
    userCount: 3,
    accountCount: 30,
    pipelineAmount: 2000000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "terr-009",
    tenantId: TENANT_ID,
    name: "EMEA",
    parentTerritoryId: "terr-001",
    parentTerritoryName: "Global",
    description: "Europe, Middle East and Africa",
    isActive: true,
    sortOrder: 2,
    userCount: 8,
    accountCount: 100,
    pipelineAmount: 5000000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "terr-010",
    tenantId: TENANT_ID,
    name: "Western Europe",
    parentTerritoryId: "terr-009",
    parentTerritoryName: "EMEA",
    description: "Western European countries",
    isActive: true,
    sortOrder: 0,
    userCount: 6,
    accountCount: 80,
    pipelineAmount: 4000000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "terr-011",
    tenantId: TENANT_ID,
    name: "Middle East",
    parentTerritoryId: "terr-009",
    parentTerritoryName: "EMEA",
    description: "Middle Eastern countries",
    isActive: true,
    sortOrder: 1,
    userCount: 2,
    accountCount: 20,
    pipelineAmount: 1000000,
    createdAt: "2024-01-01T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-01T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
];

// Mock user assignments
const mockUserAssignments: TerritoryUserAssignment[] = [
  {
    id: "tua-001",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    userId: "user-001",
    userName: "Tanaka Taro",
    userEmail: "tanaka@example.com",
    userRole: "Sales Rep",
    accessLevel: "ReadWrite",
    createdAt: "2024-01-15T00:00:00Z",
    createdBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "tua-002",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    userId: "user-002",
    userName: "Yamada Hanako",
    userEmail: "yamada@example.com",
    userRole: "Sales Manager",
    accessLevel: "ReadWrite",
    createdAt: "2024-01-15T00:00:00Z",
    createdBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "tua-003",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    userId: "user-003",
    userName: "Suzuki Ichiro",
    userEmail: "suzuki@example.com",
    userRole: "Sales Rep",
    accessLevel: "Read",
    createdAt: "2024-01-15T00:00:00Z",
    createdBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "tua-004",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    userId: "user-004",
    userName: "Sato Yuki",
    userEmail: "sato@example.com",
    userRole: "Sales Rep",
    accessLevel: "ReadWrite",
    createdAt: "2024-01-15T00:00:00Z",
    createdBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "tua-005",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    userId: "user-005",
    userName: "Watanabe Ken",
    userEmail: "watanabe@example.com",
    userRole: "Sales Rep",
    accessLevel: "ReadWrite",
    createdAt: "2024-01-15T00:00:00Z",
    createdBy: USER_ID,
    isDeleted: false,
  },
];

// Mock account assignments
const mockAccountAssignments: TerritoryAccountAssignment[] = [
  {
    id: "taa-001",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    accountId: "acc-001",
    accountName: "Sony Corporation",
    accountIndustry: "Electronics",
    assignmentType: "RuleBased",
    assignmentRuleId: "tar-001",
    createdAt: "2024-01-20T00:00:00Z",
    createdBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "taa-002",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    accountId: "acc-002",
    accountName: "Toyota Motor Corporation",
    accountIndustry: "Automotive",
    assignmentType: "Manual",
    createdAt: "2024-01-21T00:00:00Z",
    createdBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "taa-003",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    accountId: "acc-003",
    accountName: "Honda Motor Co., Ltd.",
    accountIndustry: "Automotive",
    assignmentType: "RuleBased",
    assignmentRuleId: "tar-001",
    createdAt: "2024-01-22T00:00:00Z",
    createdBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "taa-004",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    accountId: "acc-004",
    accountName: "Panasonic Holdings",
    accountIndustry: "Electronics",
    assignmentType: "RuleBased",
    assignmentRuleId: "tar-001",
    createdAt: "2024-01-23T00:00:00Z",
    createdBy: USER_ID,
    isDeleted: false,
  },
];

// Mock assignment rules
const mockAssignmentRules: TerritoryAssignmentRule[] = [
  {
    id: "tar-001",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    name: "Japan Accounts",
    isActive: true,
    conditions: [
      {
        id: "tc-001",
        field: "billingCountry",
        operator: "equals",
        value: "Japan",
        orderIndex: 0,
      },
    ],
    priority: 1,
    createdAt: "2024-01-10T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-10T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "tar-002",
    tenantId: TENANT_ID,
    territoryId: "terr-003",
    name: "High Value Japan",
    isActive: true,
    conditions: [
      {
        id: "tc-002",
        field: "billingCountry",
        operator: "equals",
        value: "Japan",
        orderIndex: 0,
      },
      {
        id: "tc-003",
        field: "annualRevenue",
        operator: "greaterThan",
        value: 1000000000,
        orderIndex: 1,
      },
    ],
    filterLogic: "1 AND 2",
    priority: 0,
    createdAt: "2024-01-10T00:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-10T00:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
];

// Available users for assignment
const mockAvailableUsers = [
  { id: "user-010", name: "New User 1", email: "newuser1@example.com", role: "Sales Rep" },
  { id: "user-011", name: "New User 2", email: "newuser2@example.com", role: "Sales Rep" },
  { id: "user-012", name: "New User 3", email: "newuser3@example.com", role: "Sales Manager" },
];

// Build tree structure
function buildTerritoryTree(territories: Territory[]): Territory[] {
  const territoryMap = new Map<string, Territory>();
  const rootTerritories: Territory[] = [];

  // First pass: create map and initialize children arrays
  for (const territory of territories) {
    if (!territory.isDeleted) {
      territoryMap.set(territory.id, { ...territory, children: [] });
    }
  }

  // Second pass: build tree structure
  for (const territory of territoryMap.values()) {
    if (territory.parentTerritoryId) {
      const parent = territoryMap.get(territory.parentTerritoryId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(territory);
      }
    } else {
      rootTerritories.push(territory);
    }
  }

  // Sort children by sortOrder
  const sortChildren = (t: Territory) => {
    if (t.children && t.children.length > 0) {
      t.children.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const child of t.children) {
        sortChildren(child);
      }
    }
  };

  for (const root of rootTerritories) {
    sortChildren(root);
  }

  return rootTerritories;
}

export const territoryHandlers = [
  // Get territories list (flat or tree)
  http.get("*/api/v1/territories", ({ request }) => {
    const url = new URL(request.url);
    const view = url.searchParams.get("view"); // "tree" or "list"
    const parentId = url.searchParams.get("parentId");
    const search = url.searchParams.get("search");

    let filtered = mockTerritories.filter((t) => !t.isDeleted);

    if (parentId) {
      filtered = filtered.filter((t) => t.parentTerritoryId === parentId);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower)
      );
    }

    if (view === "tree") {
      return HttpResponse.json({
        tree: buildTerritoryTree(filtered),
        totalSize: filtered.length,
      });
    }

    const response: QueryResponse<Territory> = {
      records: filtered,
      totalSize: filtered.length,
    };

    return HttpResponse.json(response);
  }),

  // Get single territory
  http.get("*/api/v1/territories/:id", ({ params }) => {
    const { id } = params;
    const territory = mockTerritories.find((t) => t.id === id && !t.isDeleted);

    if (!territory) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Territory not found",
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(territory);
  }),

  // Create territory
  http.post("*/api/v1/territories", async ({ request }) => {
    const body = (await request.json()) as Partial<Territory>;
    const now = new Date().toISOString();

    const newTerritory: Territory = {
      id: `terr-${Date.now()}`,
      tenantId: TENANT_ID,
      name: body.name || "New Territory",
      parentTerritoryId: body.parentTerritoryId,
      description: body.description,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
      userCount: 0,
      accountCount: 0,
      pipelineAmount: 0,
      createdAt: now,
      createdBy: USER_ID,
      updatedAt: now,
      updatedBy: USER_ID,
      isDeleted: false,
    };

    // Set parent name if parent exists
    if (newTerritory.parentTerritoryId) {
      const parent = mockTerritories.find((t) => t.id === newTerritory.parentTerritoryId);
      if (parent) {
        newTerritory.parentTerritoryName = parent.name;
      }
    }

    mockTerritories.push(newTerritory);

    return HttpResponse.json(newTerritory, { status: 201 });
  }),

  // Update territory
  http.patch("*/api/v1/territories/:id", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<Territory>;

    const index = mockTerritories.findIndex((t) => t.id === id && !t.isDeleted);
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Territory not found",
          },
        },
        { status: 404 }
      );
    }

    const updated: Territory = {
      ...mockTerritories[index],
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: USER_ID,
    };

    mockTerritories[index] = updated;

    return HttpResponse.json(updated);
  }),

  // Delete territory
  http.delete("*/api/v1/territories/:id", ({ params }) => {
    const { id } = params;

    const index = mockTerritories.findIndex((t) => t.id === id && !t.isDeleted);
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Territory not found",
          },
        },
        { status: 404 }
      );
    }

    // Check if has children
    const hasChildren = mockTerritories.some(
      (t) => t.parentTerritoryId === id && !t.isDeleted
    );

    if (hasChildren) {
      return HttpResponse.json(
        {
          error: {
            code: "HAS_CHILDREN",
            message: "Cannot delete territory with child territories",
          },
        },
        { status: 400 }
      );
    }

    mockTerritories[index].isDeleted = true;

    return new HttpResponse(null, { status: 204 });
  }),

  // Get territory user assignments
  http.get("*/api/v1/territories/:id/users", ({ params }) => {
    const { id } = params;

    const assignments = mockUserAssignments.filter(
      (a) => a.territoryId === id && !a.isDeleted
    );

    return HttpResponse.json({
      records: assignments,
      totalSize: assignments.length,
    });
  }),

  // Add user to territory
  http.post("*/api/v1/territories/:id/users", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as {
      userId: string;
      accessLevel: "Read" | "ReadWrite";
    };

    const now = new Date().toISOString();
    const newAssignment: TerritoryUserAssignment = {
      id: `tua-${Date.now()}`,
      tenantId: TENANT_ID,
      territoryId: id as string,
      userId: body.userId,
      userName: "New User",
      accessLevel: body.accessLevel,
      createdAt: now,
      createdBy: USER_ID,
      isDeleted: false,
    };

    mockUserAssignments.push(newAssignment);

    return HttpResponse.json(newAssignment, { status: 201 });
  }),

  // Remove user from territory
  http.delete("*/api/v1/territories/:id/users/:assignmentId", ({ params }) => {
    const { assignmentId } = params;

    const index = mockUserAssignments.findIndex(
      (a) => a.id === assignmentId && !a.isDeleted
    );
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "User assignment not found",
          },
        },
        { status: 404 }
      );
    }

    mockUserAssignments[index].isDeleted = true;

    return new HttpResponse(null, { status: 204 });
  }),

  // Get territory account assignments
  http.get("*/api/v1/territories/:id/accounts", ({ params }) => {
    const { id } = params;

    const assignments = mockAccountAssignments.filter(
      (a) => a.territoryId === id && !a.isDeleted
    );

    return HttpResponse.json({
      records: assignments,
      totalSize: assignments.length,
    });
  }),

  // Add account to territory manually
  http.post("*/api/v1/territories/:id/accounts", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { accountId: string };

    const now = new Date().toISOString();
    const newAssignment: TerritoryAccountAssignment = {
      id: `taa-${Date.now()}`,
      tenantId: TENANT_ID,
      territoryId: id as string,
      accountId: body.accountId,
      accountName: "New Account",
      assignmentType: "Manual",
      createdAt: now,
      createdBy: USER_ID,
      isDeleted: false,
    };

    mockAccountAssignments.push(newAssignment);

    return HttpResponse.json(newAssignment, { status: 201 });
  }),

  // Remove account from territory
  http.delete("*/api/v1/territories/:id/accounts/:assignmentId", ({ params }) => {
    const { assignmentId } = params;

    const index = mockAccountAssignments.findIndex(
      (a) => a.id === assignmentId && !a.isDeleted
    );
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Account assignment not found",
          },
        },
        { status: 404 }
      );
    }

    mockAccountAssignments[index].isDeleted = true;

    return new HttpResponse(null, { status: 204 });
  }),

  // Get territory assignment rules
  http.get("*/api/v1/territories/:id/rules", ({ params }) => {
    const { id } = params;

    const rules = mockAssignmentRules.filter(
      (r) => r.territoryId === id && !r.isDeleted
    );

    return HttpResponse.json({
      records: rules,
      totalSize: rules.length,
    });
  }),

  // Create assignment rule
  http.post("*/api/v1/territories/:id/rules", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<TerritoryAssignmentRule>;
    const now = new Date().toISOString();

    const newRule: TerritoryAssignmentRule = {
      id: `tar-${Date.now()}`,
      tenantId: TENANT_ID,
      territoryId: id as string,
      name: body.name || "New Rule",
      isActive: body.isActive ?? true,
      conditions: body.conditions || [],
      filterLogic: body.filterLogic,
      priority: body.priority ?? 0,
      createdAt: now,
      createdBy: USER_ID,
      updatedAt: now,
      updatedBy: USER_ID,
      isDeleted: false,
    };

    mockAssignmentRules.push(newRule);

    return HttpResponse.json(newRule, { status: 201 });
  }),

  // Update assignment rule
  http.patch("*/api/v1/territories/:id/rules/:ruleId", async ({ params, request }) => {
    const { ruleId } = params;
    const body = (await request.json()) as Partial<TerritoryAssignmentRule>;

    const index = mockAssignmentRules.findIndex(
      (r) => r.id === ruleId && !r.isDeleted
    );
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Assignment rule not found",
          },
        },
        { status: 404 }
      );
    }

    const updated: TerritoryAssignmentRule = {
      ...mockAssignmentRules[index],
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: USER_ID,
    };

    mockAssignmentRules[index] = updated;

    return HttpResponse.json(updated);
  }),

  // Delete assignment rule
  http.delete("*/api/v1/territories/:id/rules/:ruleId", ({ params }) => {
    const { ruleId } = params;

    const index = mockAssignmentRules.findIndex(
      (r) => r.id === ruleId && !r.isDeleted
    );
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Assignment rule not found",
          },
        },
        { status: 404 }
      );
    }

    mockAssignmentRules[index].isDeleted = true;

    return new HttpResponse(null, { status: 204 });
  }),

  // Run assignment rules
  http.post("*/api/v1/territories/:id/rules/run", ({ params }) => {
    const { id } = params;

    // Simulate running rules - in real implementation this would match accounts
    return HttpResponse.json({
      message: "Assignment rules executed successfully",
      accountsAssigned: 5,
      accountsUpdated: 2,
      errors: 0,
    });
  }),

  // Get available users for assignment
  http.get("*/api/v1/territories/metadata/available-users", () => {
    return HttpResponse.json({
      users: mockAvailableUsers,
    });
  }),
];
