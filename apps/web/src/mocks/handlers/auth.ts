import { http, HttpResponse, delay } from "msw";
import { db, DEFAULT_TENANT_ID, STAGE_DEFINITIONS } from "../db";

export const authHandlers = [
  // Get current user info
  http.get("/v1/me", async () => {
    await delay(50);
    const user = db.getCurrentUser();

    return HttpResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      tenantId: user.tenantId,
      role: {
        id: user.roleId,
        name: user.roleName,
      },
      profile: {
        id: user.profileId,
        name: user.profileName,
      },
      permissions: {
        Account: {
          create: true,
          read: true,
          update: true,
          delete: true,
          viewAll: false,
          modifyAll: false,
        },
        Contact: {
          create: true,
          read: true,
          update: true,
          delete: true,
          viewAll: false,
          modifyAll: false,
        },
        Lead: {
          create: true,
          read: true,
          update: true,
          delete: true,
          viewAll: false,
          modifyAll: false,
        },
        Opportunity: {
          create: true,
          read: true,
          update: true,
          delete: true,
          viewAll: false,
          modifyAll: false,
        },
        Quote: {
          create: true,
          read: true,
          update: true,
          delete: true,
          viewAll: false,
          modifyAll: false,
        },
      },
    });
  }),
];

export const metadataHandlers = [
  // Get all objects
  http.get("/v1/metadata/objects", async () => {
    await delay(50);

    return HttpResponse.json({
      objects: [
        {
          name: "Account",
          label: "Account",
          labelPlural: "Accounts",
          isCustom: false,
        },
        {
          name: "Contact",
          label: "Contact",
          labelPlural: "Contacts",
          isCustom: false,
        },
        {
          name: "Lead",
          label: "Lead",
          labelPlural: "Leads",
          isCustom: false,
        },
        {
          name: "Opportunity",
          label: "Opportunity",
          labelPlural: "Opportunities",
          isCustom: false,
        },
        {
          name: "Quote",
          label: "Quote",
          labelPlural: "Quotes",
          isCustom: false,
        },
        {
          name: "Product",
          label: "Product",
          labelPlural: "Products",
          isCustom: false,
        },
        {
          name: "Pricebook",
          label: "Price Book",
          labelPlural: "Price Books",
          isCustom: false,
        },
      ],
    });
  }),

  // Describe object
  http.get("/v1/metadata/objects/:objectName/describe", async ({ params }) => {
    await delay(100);
    const { objectName } = params;

    const objectDescriptions: Record<
      string,
      {
        name: string;
        label: string;
        fields: Array<{
          name: string;
          label: string;
          type: string;
          required: boolean;
          readable: boolean;
          editable: boolean;
          referenceTo?: string[];
          picklistValues?: Array<{ value: string; label: string; isActive: boolean }>;
        }>;
        stageDefinitions?: typeof STAGE_DEFINITIONS;
      }
    > = {
      Account: {
        name: "Account",
        label: "Account",
        fields: [
          { name: "id", label: "ID", type: "string", required: false, readable: true, editable: false },
          { name: "name", label: "Account Name", type: "string", required: true, readable: true, editable: true },
          {
            name: "type",
            label: "Type",
            type: "picklist",
            required: false,
            readable: true,
            editable: true,
            picklistValues: [
              { value: "Prospect", label: "Prospect", isActive: true },
              { value: "Customer", label: "Customer", isActive: true },
              { value: "Partner", label: "Partner", isActive: true },
              { value: "Competitor", label: "Competitor", isActive: true },
              { value: "Other", label: "Other", isActive: true },
            ],
          },
          { name: "parentId", label: "Parent Account", type: "reference", required: false, readable: true, editable: true, referenceTo: ["Account"] },
          { name: "industry", label: "Industry", type: "string", required: false, readable: true, editable: true },
          { name: "website", label: "Website", type: "url", required: false, readable: true, editable: true },
          { name: "phone", label: "Phone", type: "phone", required: false, readable: true, editable: true },
          { name: "annualRevenue", label: "Annual Revenue", type: "decimal", required: false, readable: true, editable: true },
          { name: "numberOfEmployees", label: "Employees", type: "integer", required: false, readable: true, editable: true },
          { name: "ownerId", label: "Owner", type: "reference", required: true, readable: true, editable: true, referenceTo: ["User"] },
          { name: "createdAt", label: "Created Date", type: "datetime", required: false, readable: true, editable: false },
          { name: "updatedAt", label: "Last Modified Date", type: "datetime", required: false, readable: true, editable: false },
        ],
      },
      Contact: {
        name: "Contact",
        label: "Contact",
        fields: [
          { name: "id", label: "ID", type: "string", required: false, readable: true, editable: false },
          { name: "accountId", label: "Account", type: "reference", required: true, readable: true, editable: true, referenceTo: ["Account"] },
          { name: "firstName", label: "First Name", type: "string", required: false, readable: true, editable: true },
          { name: "lastName", label: "Last Name", type: "string", required: true, readable: true, editable: true },
          { name: "email", label: "Email", type: "email", required: false, readable: true, editable: true },
          { name: "phone", label: "Phone", type: "phone", required: false, readable: true, editable: true },
          { name: "title", label: "Title", type: "string", required: false, readable: true, editable: true },
          { name: "department", label: "Department", type: "string", required: false, readable: true, editable: true },
          { name: "isPrimary", label: "Primary Contact", type: "boolean", required: false, readable: true, editable: true },
          { name: "ownerId", label: "Owner", type: "reference", required: true, readable: true, editable: true, referenceTo: ["User"] },
        ],
      },
      Lead: {
        name: "Lead",
        label: "Lead",
        fields: [
          { name: "id", label: "ID", type: "string", required: false, readable: true, editable: false },
          { name: "firstName", label: "First Name", type: "string", required: false, readable: true, editable: true },
          { name: "lastName", label: "Last Name", type: "string", required: true, readable: true, editable: true },
          { name: "company", label: "Company", type: "string", required: true, readable: true, editable: true },
          { name: "email", label: "Email", type: "email", required: false, readable: true, editable: true },
          { name: "phone", label: "Phone", type: "phone", required: false, readable: true, editable: true },
          { name: "title", label: "Title", type: "string", required: false, readable: true, editable: true },
          {
            name: "status",
            label: "Status",
            type: "picklist",
            required: true,
            readable: true,
            editable: true,
            picklistValues: [
              { value: "New", label: "New", isActive: true },
              { value: "Working", label: "Working", isActive: true },
              { value: "Qualified", label: "Qualified", isActive: true },
              { value: "Unqualified", label: "Unqualified", isActive: true },
            ],
          },
          {
            name: "rating",
            label: "Rating",
            type: "picklist",
            required: false,
            readable: true,
            editable: true,
            picklistValues: [
              { value: "Hot", label: "Hot", isActive: true },
              { value: "Warm", label: "Warm", isActive: true },
              { value: "Cold", label: "Cold", isActive: true },
            ],
          },
          { name: "isConverted", label: "Converted", type: "boolean", required: false, readable: true, editable: false },
          { name: "ownerId", label: "Owner", type: "reference", required: true, readable: true, editable: true, referenceTo: ["User"] },
        ],
      },
      Opportunity: {
        name: "Opportunity",
        label: "Opportunity",
        fields: [
          { name: "id", label: "ID", type: "string", required: false, readable: true, editable: false },
          { name: "name", label: "Opportunity Name", type: "string", required: true, readable: true, editable: true },
          { name: "accountId", label: "Account", type: "reference", required: true, readable: true, editable: true, referenceTo: ["Account"] },
          {
            name: "stageName",
            label: "Stage",
            type: "picklist",
            required: true,
            readable: true,
            editable: true,
            picklistValues: STAGE_DEFINITIONS.map((s) => ({
              value: s.stageName,
              label: s.stageName,
              isActive: true,
            })),
          },
          { name: "probability", label: "Probability (%)", type: "integer", required: false, readable: true, editable: false },
          { name: "amount", label: "Amount", type: "decimal", required: false, readable: true, editable: true },
          { name: "closeDate", label: "Close Date", type: "date", required: true, readable: true, editable: true },
          { name: "isClosed", label: "Closed", type: "boolean", required: false, readable: true, editable: false },
          { name: "isWon", label: "Won", type: "boolean", required: false, readable: true, editable: false },
          { name: "lostReason", label: "Lost Reason", type: "string", required: false, readable: true, editable: true },
          { name: "forecastCategory", label: "Forecast Category", type: "string", required: false, readable: true, editable: false },
          { name: "ownerId", label: "Owner", type: "reference", required: true, readable: true, editable: true, referenceTo: ["User"] },
        ],
        stageDefinitions: STAGE_DEFINITIONS,
      },
      Quote: {
        name: "Quote",
        label: "Quote",
        fields: [
          { name: "id", label: "ID", type: "string", required: false, readable: true, editable: false },
          { name: "name", label: "Quote Name", type: "string", required: true, readable: true, editable: true },
          { name: "opportunityId", label: "Opportunity", type: "reference", required: true, readable: true, editable: true, referenceTo: ["Opportunity"] },
          {
            name: "status",
            label: "Status",
            type: "picklist",
            required: true,
            readable: true,
            editable: true,
            picklistValues: [
              { value: "Draft", label: "Draft", isActive: true },
              { value: "Presented", label: "Presented", isActive: true },
              { value: "Accepted", label: "Accepted", isActive: true },
              { value: "Rejected", label: "Rejected", isActive: true },
            ],
          },
          { name: "isPrimary", label: "Primary", type: "boolean", required: false, readable: true, editable: true },
          { name: "expirationDate", label: "Expiration Date", type: "date", required: false, readable: true, editable: true },
          { name: "subtotal", label: "Subtotal", type: "decimal", required: false, readable: true, editable: false },
          { name: "discount", label: "Discount", type: "decimal", required: false, readable: true, editable: true },
          { name: "totalPrice", label: "Total Price", type: "decimal", required: false, readable: true, editable: false },
          { name: "grandTotal", label: "Grand Total", type: "decimal", required: false, readable: true, editable: false },
          { name: "ownerId", label: "Owner", type: "reference", required: true, readable: true, editable: true, referenceTo: ["User"] },
        ],
      },
    };

    const description = objectDescriptions[objectName as string];
    if (!description) {
      return HttpResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: `Object ${objectName} not found`,
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json(description);
  }),
];
