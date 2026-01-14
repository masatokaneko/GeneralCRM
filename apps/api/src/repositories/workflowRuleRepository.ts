import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ConflictError } from "../middleware/errorHandler.js";
import type { PaginatedResponse } from "../types/index.js";

// Workflow Rule Types
export interface WorkflowCondition {
  id: string;
  field: string;
  operator: string;
  value?: string | number | boolean;
  orderIndex: number;
}

export interface WorkflowAction {
  id: string;
  type: string;
  config: Record<string, unknown>;
  orderIndex: number;
}

export interface WorkflowRule {
  id: string;
  tenantId: string;
  name: string;
  objectName: string;
  triggerType: "BeforeSave" | "AfterSave" | "Async" | "Scheduled";
  evaluationCriteria: "Created" | "CreatedOrEdited" | "CreatedAndMeetsCriteria";
  isActive: boolean;
  description?: string;
  conditions: WorkflowCondition[];
  filterLogic?: string;
  actions: WorkflowAction[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

interface ListOptions {
  objectName?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  cursor?: string;
}

// Supported objects for workflow rules
const SUPPORTED_OBJECTS = [
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

// Object field metadata (simplified for now)
const OBJECT_FIELDS: Record<string, Array<{ name: string; label: string; type: string }>> = {
  Account: [
    { name: "name", label: "Account Name", type: "string" },
    { name: "industry", label: "Industry", type: "string" },
    { name: "type", label: "Type", type: "string" },
    { name: "annualRevenue", label: "Annual Revenue", type: "number" },
    { name: "numberOfEmployees", label: "Number of Employees", type: "number" },
  ],
  Contact: [
    { name: "firstName", label: "First Name", type: "string" },
    { name: "lastName", label: "Last Name", type: "string" },
    { name: "email", label: "Email", type: "string" },
    { name: "phone", label: "Phone", type: "string" },
    { name: "title", label: "Title", type: "string" },
  ],
  Lead: [
    { name: "firstName", label: "First Name", type: "string" },
    { name: "lastName", label: "Last Name", type: "string" },
    { name: "email", label: "Email", type: "string" },
    { name: "company", label: "Company", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "leadSource", label: "Lead Source", type: "string" },
  ],
  Opportunity: [
    { name: "name", label: "Opportunity Name", type: "string" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "stageName", label: "Stage", type: "string" },
    { name: "probability", label: "Probability", type: "number" },
    { name: "closeDate", label: "Close Date", type: "date" },
  ],
  Quote: [
    { name: "name", label: "Quote Name", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "totalPrice", label: "Total Price", type: "number" },
    { name: "expirationDate", label: "Expiration Date", type: "date" },
  ],
  Order: [
    { name: "name", label: "Order Name", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "totalAmount", label: "Total Amount", type: "number" },
  ],
  Contract: [
    { name: "name", label: "Contract Name", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "startDate", label: "Start Date", type: "date" },
    { name: "endDate", label: "End Date", type: "date" },
    { name: "totalContractValue", label: "Total Value", type: "number" },
  ],
  Invoice: [
    { name: "invoiceNumber", label: "Invoice Number", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "totalAmount", label: "Total Amount", type: "number" },
    { name: "dueDate", label: "Due Date", type: "date" },
  ],
  Campaign: [
    { name: "name", label: "Campaign Name", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "type", label: "Type", type: "string" },
    { name: "startDate", label: "Start Date", type: "date" },
    { name: "endDate", label: "End Date", type: "date" },
  ],
  Task: [
    { name: "subject", label: "Subject", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "priority", label: "Priority", type: "string" },
    { name: "dueDate", label: "Due Date", type: "date" },
  ],
  Event: [
    { name: "subject", label: "Subject", type: "string" },
    { name: "startDateTime", label: "Start Date/Time", type: "datetime" },
    { name: "endDateTime", label: "End Date/Time", type: "datetime" },
    { name: "isAllDayEvent", label: "All Day Event", type: "boolean" },
  ],
};

const TABLE_NAME = "workflow_rules";
const COLUMNS = [
  "id",
  "tenant_id",
  "name",
  "object_name",
  "trigger_type",
  "evaluation_criteria",
  "is_active",
  "description",
  "conditions",
  "filter_logic",
  "actions",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "is_deleted",
  "system_modstamp",
];

function mapFromDb(row: Record<string, unknown>): WorkflowRule {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    objectName: row.object_name as string,
    triggerType: row.trigger_type as WorkflowRule["triggerType"],
    evaluationCriteria: row.evaluation_criteria as WorkflowRule["evaluationCriteria"],
    isActive: row.is_active as boolean,
    description: row.description as string | undefined,
    conditions: (row.conditions as WorkflowCondition[]) || [],
    filterLogic: row.filter_logic as string | undefined,
    actions: (row.actions as WorkflowAction[]) || [],
    createdAt: row.created_at as Date,
    createdBy: row.created_by as string,
    updatedAt: row.updated_at as Date,
    updatedBy: row.updated_by as string,
    isDeleted: row.is_deleted as boolean,
    systemModstamp: row.system_modstamp as string,
  };
}

export const workflowRuleRepository = {
  async findById(tenantId: string, id: string): Promise<WorkflowRule | null> {
    const sql = `
      SELECT ${COLUMNS.join(", ")}
      FROM ${TABLE_NAME}
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, id]);
    return result.rows[0] ? mapFromDb(result.rows[0]) : null;
  },

  async findByIdOrThrow(tenantId: string, id: string): Promise<WorkflowRule> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError(TABLE_NAME, id);
    }
    return record;
  },

  async findAll(
    tenantId: string,
    options: ListOptions = {}
  ): Promise<PaginatedResponse<WorkflowRule>> {
    const { objectName, isActive, search, limit = 50, cursor } = options;

    const conditions: string[] = ["tenant_id = $1", "is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (objectName) {
      conditions.push(`object_name = $${paramIndex}`);
      values.push(objectName);
      paramIndex++;
    }

    if (isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const countSql = `SELECT COUNT(*) FROM ${TABLE_NAME} WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Get records
    const sql = `
      SELECT ${COLUMNS.join(", ")}
      FROM ${TABLE_NAME}
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query(sql, values);
    const records = result.rows.slice(0, limit).map(mapFromDb);
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore ? records[records.length - 1].createdAt.toISOString() : undefined,
    };
  },

  async create(
    tenantId: string,
    userId: string,
    data: Partial<WorkflowRule>
  ): Promise<WorkflowRule> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO ${TABLE_NAME} (
        id, tenant_id, name, object_name, trigger_type, evaluation_criteria,
        is_active, description, conditions, filter_logic, actions,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING ${COLUMNS.join(", ")}
    `;

    const values = [
      id,
      tenantId,
      data.name,
      data.objectName,
      data.triggerType || "AfterSave",
      data.evaluationCriteria || "CreatedOrEdited",
      data.isActive ?? false,
      data.description || null,
      JSON.stringify(data.conditions || []),
      data.filterLogic || null,
      JSON.stringify(data.actions || []),
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ];

    const result = await query(sql, values);
    return mapFromDb(result.rows[0]);
  },

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<WorkflowRule>,
    etag?: string
  ): Promise<WorkflowRule> {
    return transaction(async (client) => {
      // Check if record exists and verify etag
      const checkSql = `
        SELECT system_modstamp FROM ${TABLE_NAME}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError(TABLE_NAME, id);
      }

      if (etag && checkResult.rows[0].system_modstamp !== etag) {
        throw new ConflictError("Record was modified by another user");
      }

      const now = new Date();
      const newModstamp = uuidv4();

      const updates: string[] = [];
      const values: unknown[] = [tenantId, id];
      let paramIndex = 3;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
      if (data.objectName !== undefined) {
        updates.push(`object_name = $${paramIndex++}`);
        values.push(data.objectName);
      }
      if (data.triggerType !== undefined) {
        updates.push(`trigger_type = $${paramIndex++}`);
        values.push(data.triggerType);
      }
      if (data.evaluationCriteria !== undefined) {
        updates.push(`evaluation_criteria = $${paramIndex++}`);
        values.push(data.evaluationCriteria);
      }
      if (data.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.conditions !== undefined) {
        updates.push(`conditions = $${paramIndex++}`);
        values.push(JSON.stringify(data.conditions));
      }
      if (data.filterLogic !== undefined) {
        updates.push(`filter_logic = $${paramIndex++}`);
        values.push(data.filterLogic);
      }
      if (data.actions !== undefined) {
        updates.push(`actions = $${paramIndex++}`);
        values.push(JSON.stringify(data.actions));
      }

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(now);
      updates.push(`updated_by = $${paramIndex++}`);
      values.push(userId);
      updates.push(`system_modstamp = $${paramIndex++}`);
      values.push(newModstamp);

      const sql = `
        UPDATE ${TABLE_NAME}
        SET ${updates.join(", ")}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING ${COLUMNS.join(", ")}
      `;

      const result = await client.query(sql, values);
      return mapFromDb(result.rows[0]);
    });
  },

  async delete(tenantId: string, userId: string, id: string): Promise<void> {
    const sql = `
      UPDATE ${TABLE_NAME}
      SET is_deleted = true, updated_at = $3, updated_by = $4
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, id, new Date(), userId]);

    if (result.rowCount === 0) {
      throw new NotFoundError(TABLE_NAME, id);
    }
  },

  async toggle(tenantId: string, userId: string, id: string): Promise<WorkflowRule> {
    return transaction(async (client) => {
      const checkSql = `
        SELECT is_active FROM ${TABLE_NAME}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError(TABLE_NAME, id);
      }

      const currentIsActive = checkResult.rows[0].is_active;
      const now = new Date();
      const newModstamp = uuidv4();

      const sql = `
        UPDATE ${TABLE_NAME}
        SET is_active = $3, updated_at = $4, updated_by = $5, system_modstamp = $6
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING ${COLUMNS.join(", ")}
      `;

      const result = await client.query(sql, [
        tenantId,
        id,
        !currentIsActive,
        now,
        userId,
        newModstamp,
      ]);
      return mapFromDb(result.rows[0]);
    });
  },

  getSupportedObjects(): string[] {
    return SUPPORTED_OBJECTS;
  },

  getObjectFields(objectName: string): Array<{ name: string; label: string; type: string }> {
    return OBJECT_FIELDS[objectName] || [];
  },
};
