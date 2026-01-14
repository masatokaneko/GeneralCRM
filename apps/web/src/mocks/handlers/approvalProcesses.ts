import { http, HttpResponse } from "msw";
import type { ApprovalProcess, ApprovalStep, ApprovalCondition, QueryResponse } from "../types";

const TENANT_ID = "tenant-001";
const USER_ID = "user-001";

// Mock approval processes data
const mockApprovalProcesses: ApprovalProcess[] = [
  {
    id: "ap-001",
    tenantId: TENANT_ID,
    name: "Quote Discount Approval",
    objectName: "Quote",
    isActive: true,
    description: "Approval required for quotes with discount over 20%",
    entryCriteria: [
      {
        id: "ec-001",
        field: "discount",
        operator: "greaterThan",
        value: 20,
        orderIndex: 0,
      },
    ],
    filterLogic: undefined,
    recordEditability: "Locked",
    steps: [
      {
        id: "step-001",
        name: "Manager Approval",
        orderIndex: 0,
        approverType: "Manager",
        stepCriteria: [
          {
            id: "sc-001",
            field: "discount",
            operator: "lessThan",
            value: 40,
            orderIndex: 0,
          },
        ],
        rejectBehavior: "BackToSubmitter",
      },
      {
        id: "step-002",
        name: "Director Approval",
        orderIndex: 1,
        approverType: "SpecificUser",
        approverId: "user-director-001",
        approverName: "John Director",
        stepCriteria: [
          {
            id: "sc-002",
            field: "discount",
            operator: "greaterThan",
            value: 40,
            orderIndex: 0,
          },
        ],
        rejectBehavior: "FinalRejection",
      },
    ],
    actions: {
      onSubmit: [
        {
          id: "act-001",
          type: "FieldUpdate",
          config: {
            field: "status",
            value: "In Review",
          },
        },
        {
          id: "act-002",
          type: "SendEmail",
          config: {
            templateId: "tmpl-approval-submit",
            recipientType: "RecordOwner",
          },
        },
      ],
      onApprove: [
        {
          id: "act-003",
          type: "FieldUpdate",
          config: {
            field: "status",
            value: "Approved",
          },
        },
        {
          id: "act-004",
          type: "SendEmail",
          config: {
            templateId: "tmpl-approval-approved",
            recipientType: "RecordOwner",
          },
        },
      ],
      onReject: [
        {
          id: "act-005",
          type: "FieldUpdate",
          config: {
            field: "status",
            value: "Draft",
          },
        },
        {
          id: "act-006",
          type: "SendEmail",
          config: {
            templateId: "tmpl-approval-rejected",
            recipientType: "RecordOwner",
          },
        },
      ],
    },
    createdAt: "2024-01-10T09:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-15T10:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "ap-002",
    tenantId: TENANT_ID,
    name: "Large Opportunity Approval",
    objectName: "Opportunity",
    isActive: true,
    description: "Approval required for opportunities over $500,000",
    entryCriteria: [
      {
        id: "ec-002",
        field: "amount",
        operator: "greaterThan",
        value: 500000,
        orderIndex: 0,
      },
      {
        id: "ec-003",
        field: "stageName",
        operator: "equals",
        value: "Negotiation",
        orderIndex: 1,
      },
    ],
    filterLogic: "1 AND 2",
    recordEditability: "AdminOnly",
    steps: [
      {
        id: "step-003",
        name: "Sales Manager Approval",
        orderIndex: 0,
        approverType: "Manager",
        rejectBehavior: "BackToSubmitter",
      },
      {
        id: "step-004",
        name: "VP Sales Approval",
        orderIndex: 1,
        approverType: "Role",
        approverId: "role-vp-sales",
        approverName: "VP Sales",
        rejectBehavior: "FinalRejection",
      },
    ],
    actions: {
      onSubmit: [
        {
          id: "act-007",
          type: "SendEmail",
          config: {
            templateId: "tmpl-opp-approval-submit",
            recipientType: "RecordOwner",
          },
        },
      ],
      onApprove: [
        {
          id: "act-008",
          type: "FieldUpdate",
          config: {
            field: "stageName",
            value: "Proposal",
          },
        },
      ],
      onReject: [
        {
          id: "act-009",
          type: "SendEmail",
          config: {
            templateId: "tmpl-opp-approval-rejected",
            recipientType: "RecordOwner",
          },
        },
      ],
    },
    createdAt: "2024-02-01T09:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-02-01T09:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "ap-003",
    tenantId: TENANT_ID,
    name: "Contract Activation Approval",
    objectName: "Contract",
    isActive: false,
    description: "Approval required before contract activation",
    entryCriteria: [
      {
        id: "ec-004",
        field: "status",
        operator: "equals",
        value: "Draft",
        orderIndex: 0,
      },
    ],
    filterLogic: undefined,
    recordEditability: "Locked",
    steps: [
      {
        id: "step-005",
        name: "Legal Review",
        orderIndex: 0,
        approverType: "Queue",
        approverId: "queue-legal",
        approverName: "Legal Team",
        rejectBehavior: "BackToSubmitter",
      },
      {
        id: "step-006",
        name: "Finance Approval",
        orderIndex: 1,
        approverType: "Queue",
        approverId: "queue-finance",
        approverName: "Finance Team",
        rejectBehavior: "BackToPreviousStep",
      },
    ],
    actions: {
      onSubmit: [],
      onApprove: [
        {
          id: "act-010",
          type: "FieldUpdate",
          config: {
            field: "status",
            value: "Activated",
          },
        },
      ],
      onReject: [],
    },
    createdAt: "2024-02-15T09:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-02-20T14:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
];

// Available objects for approval processes
const availableObjects = [
  "Quote",
  "Opportunity",
  "Contract",
  "Order",
  "Invoice",
];

// Mock users for approver selection
const mockUsers = [
  { id: "user-001", name: "John Smith", email: "john@example.com", role: "Sales Rep" },
  { id: "user-002", name: "Jane Doe", email: "jane@example.com", role: "Sales Manager" },
  { id: "user-director-001", name: "John Director", email: "director@example.com", role: "Director" },
  { id: "user-vp-001", name: "VP Sales", email: "vpsales@example.com", role: "VP Sales" },
];

// Mock queues
const mockQueues = [
  { id: "queue-legal", name: "Legal Team" },
  { id: "queue-finance", name: "Finance Team" },
  { id: "queue-support", name: "Support Team" },
];

// Mock roles
const mockRoles = [
  { id: "role-admin", name: "Administrator" },
  { id: "role-sales-rep", name: "Sales Rep" },
  { id: "role-sales-mgr", name: "Sales Manager" },
  { id: "role-vp-sales", name: "VP Sales" },
  { id: "role-ceo", name: "CEO" },
];

export const approvalProcessHandlers = [
  // Get approval processes list
  http.get("*/api/v1/approval-processes", ({ request }) => {
    const url = new URL(request.url);
    const objectName = url.searchParams.get("objectName");
    const isActive = url.searchParams.get("isActive");
    const search = url.searchParams.get("search");

    let filtered = mockApprovalProcesses.filter((p) => !p.isDeleted);

    if (objectName) {
      filtered = filtered.filter((p) => p.objectName === objectName);
    }

    if (isActive !== null) {
      filtered = filtered.filter((p) => p.isActive === (isActive === "true"));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      );
    }

    const response: QueryResponse<ApprovalProcess> = {
      records: filtered,
      totalSize: filtered.length,
    };

    return HttpResponse.json(response);
  }),

  // Get single approval process
  http.get("*/api/v1/approval-processes/:id", ({ params }) => {
    const { id } = params;
    const process = mockApprovalProcesses.find((p) => p.id === id && !p.isDeleted);

    if (!process) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Approval process not found",
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(process);
  }),

  // Create approval process
  http.post("*/api/v1/approval-processes", async ({ request }) => {
    const body = (await request.json()) as Partial<ApprovalProcess>;
    const now = new Date().toISOString();

    const newProcess: ApprovalProcess = {
      id: `ap-${Date.now()}`,
      tenantId: TENANT_ID,
      name: body.name || "New Approval Process",
      objectName: body.objectName || "Quote",
      isActive: body.isActive ?? false,
      description: body.description,
      entryCriteria: body.entryCriteria || [],
      filterLogic: body.filterLogic,
      recordEditability: body.recordEditability || "Locked",
      steps: body.steps || [],
      actions: body.actions || {
        onSubmit: [],
        onApprove: [],
        onReject: [],
      },
      createdAt: now,
      createdBy: USER_ID,
      updatedAt: now,
      updatedBy: USER_ID,
      isDeleted: false,
    };

    mockApprovalProcesses.push(newProcess);

    return HttpResponse.json(newProcess, { status: 201 });
  }),

  // Update approval process
  http.patch("*/api/v1/approval-processes/:id", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<ApprovalProcess>;

    const index = mockApprovalProcesses.findIndex((p) => p.id === id && !p.isDeleted);
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Approval process not found",
          },
        },
        { status: 404 }
      );
    }

    const updated: ApprovalProcess = {
      ...mockApprovalProcesses[index],
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: USER_ID,
    };

    mockApprovalProcesses[index] = updated;

    return HttpResponse.json(updated);
  }),

  // Delete approval process
  http.delete("*/api/v1/approval-processes/:id", ({ params }) => {
    const { id } = params;

    const index = mockApprovalProcesses.findIndex((p) => p.id === id && !p.isDeleted);
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Approval process not found",
          },
        },
        { status: 404 }
      );
    }

    mockApprovalProcesses[index].isDeleted = true;

    return new HttpResponse(null, { status: 204 });
  }),

  // Get available objects for approval processes
  http.get("*/api/v1/approval-processes/metadata/objects", () => {
    return HttpResponse.json({
      objects: availableObjects,
    });
  }),

  // Get available approvers
  http.get("*/api/v1/approval-processes/metadata/approvers", ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "User") {
      return HttpResponse.json({ approvers: mockUsers });
    } else if (type === "Queue") {
      return HttpResponse.json({ approvers: mockQueues });
    } else if (type === "Role") {
      return HttpResponse.json({ approvers: mockRoles });
    }

    return HttpResponse.json({
      users: mockUsers,
      queues: mockQueues,
      roles: mockRoles,
    });
  }),

  // Toggle approval process active status
  http.post("*/api/v1/approval-processes/:id/toggle", ({ params }) => {
    const { id } = params;

    const process = mockApprovalProcesses.find((p) => p.id === id && !p.isDeleted);
    if (!process) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Approval process not found",
          },
        },
        { status: 404 }
      );
    }

    process.isActive = !process.isActive;
    process.updatedAt = new Date().toISOString();
    process.updatedBy = USER_ID;

    return HttpResponse.json(process);
  }),

  // Clone approval process
  http.post("*/api/v1/approval-processes/:id/clone", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { name?: string };

    const original = mockApprovalProcesses.find((p) => p.id === id && !p.isDeleted);
    if (!original) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Approval process not found",
          },
        },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const cloned: ApprovalProcess = {
      ...original,
      id: `ap-${Date.now()}`,
      name: body.name || `${original.name} (Copy)`,
      isActive: false,
      createdAt: now,
      createdBy: USER_ID,
      updatedAt: now,
      updatedBy: USER_ID,
    };

    mockApprovalProcesses.push(cloned);

    return HttpResponse.json(cloned, { status: 201 });
  }),
];
