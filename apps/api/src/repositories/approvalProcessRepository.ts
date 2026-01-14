import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ConflictError } from "../middleware/errorHandler.js";
import type { PaginatedResponse } from "../types/index.js";

// Approval Process Types
export interface ApprovalCondition {
  id: string;
  field: string;
  operator: string;
  value?: string | number | boolean;
  orderIndex: number;
}

export interface ApprovalStep {
  id: string;
  name: string;
  orderIndex: number;
  approverType: "Manager" | "ManagersManager" | "SpecificUser" | "Queue" | "Role";
  approverId?: string;
  approverName?: string;
  stepCriteria?: ApprovalCondition[];
  filterLogic?: string;
  rejectBehavior: "FinalRejection" | "BackToSubmitter" | "BackToPreviousStep";
}

export interface ApprovalAction {
  id: string;
  type: "FieldUpdate" | "SendEmail" | "OutboundMessage";
  config: Record<string, unknown>;
}

export interface ApprovalActions {
  onSubmit: ApprovalAction[];
  onApprove: ApprovalAction[];
  onReject: ApprovalAction[];
}

export interface ApprovalProcess {
  id: string;
  tenantId: string;
  name: string;
  objectName: string;
  isActive: boolean;
  description?: string;
  entryCriteria: ApprovalCondition[];
  filterLogic?: string;
  recordEditability: "Locked" | "AdminOnly";
  steps: ApprovalStep[];
  actions: ApprovalActions;
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

// Supported objects for approval processes
const SUPPORTED_OBJECTS = ["Quote", "Opportunity", "Contract", "Order", "Invoice"];

const TABLE_NAME = "approval_processes";
const COLUMNS = [
  "id",
  "tenant_id",
  "name",
  "object_name",
  "is_active",
  "description",
  "entry_criteria",
  "filter_logic",
  "record_editability",
  "steps",
  "actions",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "is_deleted",
  "system_modstamp",
];

function mapFromDb(row: Record<string, unknown>): ApprovalProcess {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    objectName: row.object_name as string,
    isActive: row.is_active as boolean,
    description: row.description as string | undefined,
    entryCriteria: (row.entry_criteria as ApprovalCondition[]) || [],
    filterLogic: row.filter_logic as string | undefined,
    recordEditability: (row.record_editability as "Locked" | "AdminOnly") || "Locked",
    steps: (row.steps as ApprovalStep[]) || [],
    actions: (row.actions as ApprovalActions) || { onSubmit: [], onApprove: [], onReject: [] },
    createdAt: row.created_at as Date,
    createdBy: row.created_by as string,
    updatedAt: row.updated_at as Date,
    updatedBy: row.updated_by as string,
    isDeleted: row.is_deleted as boolean,
    systemModstamp: row.system_modstamp as string,
  };
}

export const approvalProcessRepository = {
  async findById(tenantId: string, id: string): Promise<ApprovalProcess | null> {
    const sql = `
      SELECT ${COLUMNS.join(", ")}
      FROM ${TABLE_NAME}
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, id]);
    return result.rows[0] ? mapFromDb(result.rows[0]) : null;
  },

  async findByIdOrThrow(tenantId: string, id: string): Promise<ApprovalProcess> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError(TABLE_NAME, id);
    }
    return record;
  },

  async findAll(
    tenantId: string,
    options: ListOptions = {}
  ): Promise<PaginatedResponse<ApprovalProcess>> {
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
    data: Partial<ApprovalProcess>
  ): Promise<ApprovalProcess> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO ${TABLE_NAME} (
        id, tenant_id, name, object_name, is_active, description,
        entry_criteria, filter_logic, record_editability, steps, actions,
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
      data.isActive ?? false,
      data.description || null,
      JSON.stringify(data.entryCriteria || []),
      data.filterLogic || null,
      data.recordEditability || "Locked",
      JSON.stringify(data.steps || []),
      JSON.stringify(data.actions || { onSubmit: [], onApprove: [], onReject: [] }),
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
    data: Partial<ApprovalProcess>,
    etag?: string
  ): Promise<ApprovalProcess> {
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
      if (data.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.entryCriteria !== undefined) {
        updates.push(`entry_criteria = $${paramIndex++}`);
        values.push(JSON.stringify(data.entryCriteria));
      }
      if (data.filterLogic !== undefined) {
        updates.push(`filter_logic = $${paramIndex++}`);
        values.push(data.filterLogic);
      }
      if (data.recordEditability !== undefined) {
        updates.push(`record_editability = $${paramIndex++}`);
        values.push(data.recordEditability);
      }
      if (data.steps !== undefined) {
        updates.push(`steps = $${paramIndex++}`);
        values.push(JSON.stringify(data.steps));
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

  async toggle(tenantId: string, userId: string, id: string): Promise<ApprovalProcess> {
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

  async clone(tenantId: string, userId: string, id: string): Promise<ApprovalProcess> {
    const original = await this.findByIdOrThrow(tenantId, id);

    const newId = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    // Generate new IDs for steps and actions
    const clonedSteps = original.steps.map((step) => ({
      ...step,
      id: uuidv4(),
      stepCriteria: step.stepCriteria?.map((c) => ({ ...c, id: uuidv4() })),
    }));

    const clonedActions: ApprovalActions = {
      onSubmit: original.actions.onSubmit.map((a) => ({ ...a, id: uuidv4() })),
      onApprove: original.actions.onApprove.map((a) => ({ ...a, id: uuidv4() })),
      onReject: original.actions.onReject.map((a) => ({ ...a, id: uuidv4() })),
    };

    const clonedEntryCriteria = original.entryCriteria.map((c) => ({ ...c, id: uuidv4() }));

    const sql = `
      INSERT INTO ${TABLE_NAME} (
        id, tenant_id, name, object_name, is_active, description,
        entry_criteria, filter_logic, record_editability, steps, actions,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING ${COLUMNS.join(", ")}
    `;

    const values = [
      newId,
      tenantId,
      `${original.name} (Copy)`,
      original.objectName,
      false, // New clone is inactive
      original.description,
      JSON.stringify(clonedEntryCriteria),
      original.filterLogic,
      original.recordEditability,
      JSON.stringify(clonedSteps),
      JSON.stringify(clonedActions),
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

  getSupportedObjects(): string[] {
    return SUPPORTED_OBJECTS;
  },

  async getAvailableApprovers(
    tenantId: string,
    type?: string
  ): Promise<Array<{ id: string; name: string; type: string }>> {
    const approvers: Array<{ id: string; name: string; type: string }> = [];

    // Get users
    if (!type || type === "User") {
      const userSql = `
        SELECT id, COALESCE(first_name || ' ' || last_name, email) as name
        FROM users
        WHERE tenant_id = $1 AND is_deleted = false
        ORDER BY first_name, last_name
        LIMIT 100
      `;
      const userResult = await query<{ id: string; name: string }>(userSql, [tenantId]);
      approvers.push(...userResult.rows.map((u) => ({ ...u, type: "User" })));
    }

    // Get roles
    if (!type || type === "Role") {
      const roleSql = `
        SELECT id, name
        FROM roles
        WHERE tenant_id = $1 AND is_deleted = false
        ORDER BY name
        LIMIT 100
      `;
      const roleResult = await query<{ id: string; name: string }>(roleSql, [tenantId]);
      approvers.push(...roleResult.rows.map((r) => ({ ...r, type: "Role" })));
    }

    return approvers;
  },
};
