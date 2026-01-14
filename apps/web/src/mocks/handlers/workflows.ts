import { http, HttpResponse } from "msw";
import type { WorkflowRule, WorkflowCondition, WorkflowAction, QueryResponse } from "../types";

const TENANT_ID = "tenant-001";
const USER_ID = "user-001";

// Mock workflow rules data
const mockWorkflowRules: WorkflowRule[] = [
  {
    id: "wf-001",
    tenantId: TENANT_ID,
    name: "Auto Close Won Opportunity",
    objectName: "Opportunity",
    triggerType: "AfterSave",
    evaluationCriteria: "CreatedOrEdited",
    isActive: true,
    description: "Automatically update fields when opportunity is closed won",
    conditions: [
      {
        id: "cond-001",
        field: "stageName",
        operator: "equals",
        value: "Closed Won",
        orderIndex: 0,
      },
    ],
    filterLogic: undefined,
    actions: [
      {
        id: "act-001",
        type: "FieldUpdate",
        config: {
          field: "forecastCategory",
          value: "Closed",
        },
        orderIndex: 0,
      },
      {
        id: "act-002",
        type: "CreateTask",
        config: {
          subject: "Send contract to customer",
          description: "Prepare and send the contract document",
          dueDate: { type: "relative", days: 3 },
          assignedTo: "RecordOwner",
          priority: "High",
        },
        orderIndex: 1,
      },
    ],
    createdAt: "2024-01-15T09:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-15T09:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "wf-002",
    tenantId: TENANT_ID,
    name: "Lead Status Update Notification",
    objectName: "Lead",
    triggerType: "AfterSave",
    evaluationCriteria: "CreatedOrEdited",
    isActive: true,
    description: "Send notification when lead status changes to Qualified",
    conditions: [
      {
        id: "cond-002",
        field: "status",
        operator: "changedTo",
        value: "Qualified",
        orderIndex: 0,
      },
    ],
    filterLogic: undefined,
    actions: [
      {
        id: "act-003",
        type: "SendNotification",
        config: {
          recipientType: "RecordOwner",
          template: "Lead qualified notification",
        },
        orderIndex: 0,
      },
    ],
    createdAt: "2024-01-20T10:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-01-20T10:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "wf-003",
    tenantId: TENANT_ID,
    name: "High Value Account Alert",
    objectName: "Account",
    triggerType: "AfterSave",
    evaluationCriteria: "CreatedAndMeetsCriteria",
    isActive: false,
    description: "Alert sales manager when high value account is created",
    conditions: [
      {
        id: "cond-003",
        field: "annualRevenue",
        operator: "greaterThan",
        value: 1000000,
        orderIndex: 0,
      },
      {
        id: "cond-004",
        field: "type",
        operator: "equals",
        value: "Customer",
        orderIndex: 1,
      },
    ],
    filterLogic: "1 AND 2",
    actions: [
      {
        id: "act-004",
        type: "SendEmail",
        config: {
          templateId: "tmpl-001",
          recipientType: "SpecificUser",
          recipientId: "user-manager-001",
        },
        orderIndex: 0,
      },
    ],
    createdAt: "2024-02-01T11:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-02-05T14:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
  {
    id: "wf-004",
    tenantId: TENANT_ID,
    name: "Quote Expiration Reminder",
    objectName: "Quote",
    triggerType: "Scheduled",
    evaluationCriteria: "CreatedAndMeetsCriteria",
    isActive: true,
    description: "Create task when quote is about to expire",
    conditions: [
      {
        id: "cond-005",
        field: "status",
        operator: "equals",
        value: "Presented",
        orderIndex: 0,
      },
    ],
    filterLogic: undefined,
    actions: [
      {
        id: "act-005",
        type: "CreateTask",
        config: {
          subject: "Follow up on expiring quote",
          description: "Quote is about to expire. Follow up with customer.",
          dueDate: { type: "relative", days: 1 },
          assignedTo: "RecordOwner",
          priority: "High",
        },
        orderIndex: 0,
      },
    ],
    createdAt: "2024-02-10T08:00:00Z",
    createdBy: USER_ID,
    updatedAt: "2024-02-10T08:00:00Z",
    updatedBy: USER_ID,
    isDeleted: false,
  },
];

// Available objects for workflow rules
const availableObjects = [
  "Account",
  "Contact",
  "Lead",
  "Opportunity",
  "Quote",
  "Order",
  "Contract",
  "Invoice",
  "Campaign",
  "Task",
  "Event",
];

// Object fields for condition builder
const objectFields: Record<string, { name: string; label: string; type: string }[]> = {
  Account: [
    { name: "name", label: "Account Name", type: "string" },
    { name: "type", label: "Type", type: "picklist" },
    { name: "industry", label: "Industry", type: "string" },
    { name: "annualRevenue", label: "Annual Revenue", type: "number" },
    { name: "numberOfEmployees", label: "Number of Employees", type: "number" },
    { name: "status", label: "Status", type: "picklist" },
  ],
  Lead: [
    { name: "status", label: "Status", type: "picklist" },
    { name: "rating", label: "Rating", type: "picklist" },
    { name: "leadSource", label: "Lead Source", type: "picklist" },
    { name: "company", label: "Company", type: "string" },
    { name: "industry", label: "Industry", type: "string" },
  ],
  Opportunity: [
    { name: "stageName", label: "Stage", type: "picklist" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "probability", label: "Probability", type: "number" },
    { name: "forecastCategory", label: "Forecast Category", type: "picklist" },
    { name: "type", label: "Type", type: "picklist" },
    { name: "closeDate", label: "Close Date", type: "date" },
  ],
  Quote: [
    { name: "status", label: "Status", type: "picklist" },
    { name: "totalPrice", label: "Total Price", type: "number" },
    { name: "discount", label: "Discount", type: "number" },
    { name: "expirationDate", label: "Expiration Date", type: "date" },
  ],
  Contact: [
    { name: "email", label: "Email", type: "string" },
    { name: "title", label: "Title", type: "string" },
    { name: "department", label: "Department", type: "string" },
    { name: "isPrimary", label: "Is Primary", type: "boolean" },
  ],
  Order: [
    { name: "status", label: "Status", type: "picklist" },
    { name: "orderType", label: "Order Type", type: "picklist" },
    { name: "totalAmount", label: "Total Amount", type: "number" },
  ],
  Contract: [
    { name: "status", label: "Status", type: "picklist" },
    { name: "contractType", label: "Contract Type", type: "picklist" },
    { name: "totalContractValue", label: "Total Contract Value", type: "number" },
  ],
  Invoice: [
    { name: "status", label: "Status", type: "picklist" },
    { name: "totalAmount", label: "Total Amount", type: "number" },
    { name: "dueDate", label: "Due Date", type: "date" },
  ],
  Campaign: [
    { name: "status", label: "Status", type: "picklist" },
    { name: "type", label: "Type", type: "picklist" },
    { name: "isActive", label: "Is Active", type: "boolean" },
  ],
  Task: [
    { name: "status", label: "Status", type: "picklist" },
    { name: "priority", label: "Priority", type: "picklist" },
  ],
  Event: [
    { name: "subject", label: "Subject", type: "string" },
    { name: "isAllDayEvent", label: "All Day Event", type: "boolean" },
  ],
};

export const workflowHandlers = [
  // Get workflow rules list
  http.get("*/api/v1/workflows", ({ request }) => {
    const url = new URL(request.url);
    const objectName = url.searchParams.get("objectName");
    const isActive = url.searchParams.get("isActive");
    const search = url.searchParams.get("search");

    let filtered = mockWorkflowRules.filter((r) => !r.isDeleted);

    if (objectName) {
      filtered = filtered.filter((r) => r.objectName === objectName);
    }

    if (isActive !== null) {
      filtered = filtered.filter((r) => r.isActive === (isActive === "true"));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchLower) ||
          r.description?.toLowerCase().includes(searchLower)
      );
    }

    const response: QueryResponse<WorkflowRule> = {
      records: filtered,
      totalSize: filtered.length,
    };

    return HttpResponse.json(response);
  }),

  // Get single workflow rule
  http.get("*/api/v1/workflows/:id", ({ params }) => {
    const { id } = params;
    const rule = mockWorkflowRules.find((r) => r.id === id && !r.isDeleted);

    if (!rule) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Workflow rule not found",
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(rule);
  }),

  // Create workflow rule
  http.post("*/api/v1/workflows", async ({ request }) => {
    const body = (await request.json()) as Partial<WorkflowRule>;
    const now = new Date().toISOString();

    const newRule: WorkflowRule = {
      id: `wf-${Date.now()}`,
      tenantId: TENANT_ID,
      name: body.name || "New Workflow Rule",
      objectName: body.objectName || "Account",
      triggerType: body.triggerType || "AfterSave",
      evaluationCriteria: body.evaluationCriteria || "CreatedOrEdited",
      isActive: body.isActive ?? false,
      description: body.description,
      conditions: body.conditions || [],
      filterLogic: body.filterLogic,
      actions: body.actions || [],
      createdAt: now,
      createdBy: USER_ID,
      updatedAt: now,
      updatedBy: USER_ID,
      isDeleted: false,
    };

    mockWorkflowRules.push(newRule);

    return HttpResponse.json(newRule, { status: 201 });
  }),

  // Update workflow rule
  http.patch("*/api/v1/workflows/:id", async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as Partial<WorkflowRule>;

    const index = mockWorkflowRules.findIndex((r) => r.id === id && !r.isDeleted);
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Workflow rule not found",
          },
        },
        { status: 404 }
      );
    }

    const updated: WorkflowRule = {
      ...mockWorkflowRules[index],
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: USER_ID,
    };

    mockWorkflowRules[index] = updated;

    return HttpResponse.json(updated);
  }),

  // Delete workflow rule
  http.delete("*/api/v1/workflows/:id", ({ params }) => {
    const { id } = params;

    const index = mockWorkflowRules.findIndex((r) => r.id === id && !r.isDeleted);
    if (index === -1) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Workflow rule not found",
          },
        },
        { status: 404 }
      );
    }

    mockWorkflowRules[index].isDeleted = true;

    return new HttpResponse(null, { status: 204 });
  }),

  // Get available objects for workflows
  http.get("*/api/v1/workflows/metadata/objects", () => {
    return HttpResponse.json({
      objects: availableObjects,
    });
  }),

  // Get fields for a specific object
  http.get("*/api/v1/workflows/metadata/fields/:objectName", ({ params }) => {
    const { objectName } = params;
    const fields = objectFields[objectName as string] || [];

    return HttpResponse.json({
      objectName,
      fields,
    });
  }),

  // Toggle workflow rule active status
  http.post("*/api/v1/workflows/:id/toggle", ({ params }) => {
    const { id } = params;

    const rule = mockWorkflowRules.find((r) => r.id === id && !r.isDeleted);
    if (!rule) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Workflow rule not found",
          },
        },
        { status: 404 }
      );
    }

    rule.isActive = !rule.isActive;
    rule.updatedAt = new Date().toISOString();
    rule.updatedBy = USER_ID;

    return HttpResponse.json(rule);
  }),
];
