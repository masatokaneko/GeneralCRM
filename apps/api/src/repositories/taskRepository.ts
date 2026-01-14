import { v4 as uuidv4 } from "uuid";
import { query } from "../db/connection.js";
import { fieldHistoryService } from "../services/fieldHistoryService.js";
import type { Task, PaginatedResponse } from "../types/index.js";
import type { AccessFilter } from "../services/accessibleIdsService.js";

export interface TaskListParams {
  status?: string;
  priority?: string;
  ownerId?: string;
  whoType?: string;
  whoId?: string;
  whatType?: string;
  whatId?: string;
  isClosed?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

class TaskRepository {
  private toRecord(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      ownerId: row.owner_id as string | undefined,
      subject: row.subject as string,
      status: row.status as Task["status"],
      priority: row.priority as Task["priority"],
      activityDate: row.activity_date ? new Date(row.activity_date as string) : undefined,
      dueDate: row.due_date ? new Date(row.due_date as string) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      whoType: row.who_type as Task["whoType"],
      whoId: row.who_id as string | undefined,
      whatType: row.what_type as Task["whatType"],
      whatId: row.what_id as string | undefined,
      description: row.description as string | undefined,
      isClosed: row.is_closed as boolean,
      createdAt: new Date(row.created_at as string),
      createdBy: row.created_by as string,
      updatedAt: new Date(row.updated_at as string),
      updatedBy: row.updated_by as string,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
      ownerName: row.owner_name as string | undefined,
      whoName: row.who_name as string | undefined,
      whatName: row.what_name as string | undefined,
    };
  }

  async list(
    tenantId: string,
    params: TaskListParams = {},
    accessFilter?: AccessFilter | null
  ): Promise<PaginatedResponse<Task>> {
    const {
      status,
      priority,
      ownerId,
      whoType,
      whoId,
      whatType,
      whatId,
      isClosed,
      limit = 50,
      offset = 0,
      sortBy = "created_at",
      sortOrder = "desc",
    } = params;

    const conditions: string[] = ["t.tenant_id = $1", "t.is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`t.status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority) {
      conditions.push(`t.priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (ownerId) {
      conditions.push(`t.owner_id = $${paramIndex++}`);
      values.push(ownerId);
    }
    if (whoType) {
      conditions.push(`t.who_type = $${paramIndex++}`);
      values.push(whoType);
    }
    if (whoId) {
      conditions.push(`t.who_id = $${paramIndex++}`);
      values.push(whoId);
    }
    if (whatType) {
      conditions.push(`t.what_type = $${paramIndex++}`);
      values.push(whatType);
    }
    if (whatId) {
      conditions.push(`t.what_id = $${paramIndex++}`);
      values.push(whatId);
    }
    if (isClosed !== undefined) {
      conditions.push(`t.is_closed = $${paramIndex++}`);
      values.push(isClosed);
    }

    // Apply access filter for record-level permissions
    if (accessFilter) {
      // Replace column references to use 't.' alias
      const aliasedClause = accessFilter.clause.replace(/\b(owner_id|id)\b/g, "t.$1");
      conditions.push(aliasedClause);
      values.push(...accessFilter.params);
      paramIndex += accessFilter.params.length;
    }

    const whereClause = conditions.join(" AND ");
    const validSortColumns = ["created_at", "updated_at", "subject", "status", "priority", "due_date", "activity_date"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "created_at";
    const order = sortOrder === "asc" ? "ASC" : "DESC";

    // Count query
    const countResult = await query(
      `SELECT COUNT(*) as count FROM tasks t WHERE ${whereClause}`,
      values
    );
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Data query with joins for names
    const dataQuery = `
      SELECT
        t.*,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name,
        CASE
          WHEN t.who_type = 'Lead' THEN (SELECT CONCAT(first_name, ' ', last_name) FROM leads WHERE id = t.who_id AND tenant_id = t.tenant_id)
          WHEN t.who_type = 'Contact' THEN (SELECT CONCAT(first_name, ' ', last_name) FROM contacts WHERE id = t.who_id AND tenant_id = t.tenant_id)
        END as who_name,
        CASE
          WHEN t.what_type = 'Account' THEN (SELECT name FROM accounts WHERE id = t.what_id AND tenant_id = t.tenant_id)
          WHEN t.what_type = 'Opportunity' THEN (SELECT name FROM opportunities WHERE id = t.what_id AND tenant_id = t.tenant_id)
          WHEN t.what_type = 'Quote' THEN (SELECT name FROM quotes WHERE id = t.what_id AND tenant_id = t.tenant_id)
        END as what_name
      FROM tasks t
      LEFT JOIN users u ON t.owner_id = u.id AND u.tenant_id = t.tenant_id
      WHERE ${whereClause}
      ORDER BY t.${sortColumn} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(limit, offset);
    const dataResult = await query(dataQuery, values);

    return {
      records: dataResult.rows.map((row) => this.toRecord(row)),
      totalSize,
    };
  }

  async findById(tenantId: string, id: string): Promise<Task | null> {
    const result = await query(
      `
      SELECT
        t.*,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name,
        CASE
          WHEN t.who_type = 'Lead' THEN (SELECT CONCAT(first_name, ' ', last_name) FROM leads WHERE id = t.who_id AND tenant_id = t.tenant_id)
          WHEN t.who_type = 'Contact' THEN (SELECT CONCAT(first_name, ' ', last_name) FROM contacts WHERE id = t.who_id AND tenant_id = t.tenant_id)
        END as who_name,
        CASE
          WHEN t.what_type = 'Account' THEN (SELECT name FROM accounts WHERE id = t.what_id AND tenant_id = t.tenant_id)
          WHEN t.what_type = 'Opportunity' THEN (SELECT name FROM opportunities WHERE id = t.what_id AND tenant_id = t.tenant_id)
          WHEN t.what_type = 'Quote' THEN (SELECT name FROM quotes WHERE id = t.what_id AND tenant_id = t.tenant_id)
        END as what_name
      FROM tasks t
      LEFT JOIN users u ON t.owner_id = u.id AND u.tenant_id = t.tenant_id
      WHERE t.tenant_id = $1 AND t.id = $2 AND t.is_deleted = false
      `,
      [tenantId, id]
    );
    return result.rows.length > 0 ? this.toRecord(result.rows[0]) : null;
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<Task>
  ): Promise<Task> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const result = await query(
      `
      INSERT INTO tasks (
        id, tenant_id, owner_id, subject, status, priority,
        activity_date, due_date, who_type, who_id, what_type, what_id,
        description, is_closed,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
      `,
      [
        id,
        tenantId,
        data.ownerId || userId,
        data.subject,
        data.status || "NotStarted",
        data.priority || "Normal",
        data.activityDate || null,
        data.dueDate || null,
        data.whoType || null,
        data.whoId || null,
        data.whatType || null,
        data.whatId || null,
        data.description || null,
        false,
        now,
        userId,
        now,
        userId,
        false,
        systemModstamp,
      ]
    );

    return this.findById(tenantId, result.rows[0].id) as Promise<Task>;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<Task>,
    etag?: string
  ): Promise<Task> {
    // Get current record
    const current = await this.findById(tenantId, id);
    if (!current) {
      throw new Error("Task not found");
    }

    if (etag && current.systemModstamp !== etag) {
      const error = new Error("Record has been modified by another user");
      (error as Error & { statusCode: number }).statusCode = 409;
      throw error;
    }

    const newSystemModstamp = uuidv4();
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateableFields: Array<keyof Task> = [
      "ownerId",
      "subject",
      "status",
      "priority",
      "activityDate",
      "dueDate",
      "whoType",
      "whoId",
      "whatType",
      "whatId",
      "description",
    ];

    const fieldMap: Record<string, string> = {
      ownerId: "owner_id",
      subject: "subject",
      status: "status",
      priority: "priority",
      activityDate: "activity_date",
      dueDate: "due_date",
      whoType: "who_type",
      whoId: "who_id",
      whatType: "what_type",
      whatId: "what_id",
      description: "description",
    };

    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        updates.push(`${fieldMap[field]} = $${paramIndex++}`);
        values.push(data[field]);
      }
    }

    // Handle status change to Completed
    if (data.status === "Completed" && current.status !== "Completed") {
      updates.push(`completed_at = $${paramIndex++}`);
      values.push(new Date());
      updates.push(`is_closed = $${paramIndex++}`);
      values.push(true);
    } else if (data.status && data.status !== "Completed" && current.status === "Completed") {
      updates.push(`completed_at = $${paramIndex++}`);
      values.push(null);
      updates.push(`is_closed = $${paramIndex++}`);
      values.push(false);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(userId);
    updates.push(`system_modstamp = $${paramIndex++}`);
    values.push(newSystemModstamp);

    values.push(tenantId, id);

    await query(
      `UPDATE tasks SET ${updates.join(", ")} WHERE tenant_id = $${paramIndex++} AND id = $${paramIndex++}`,
      values
    );

    const updatedRecord = await this.findById(tenantId, id) as Task;

    // Track field history
    try {
      await fieldHistoryService.trackChanges(
        tenantId,
        userId,
        "Task",
        id,
        current as unknown as Record<string, unknown>,
        updatedRecord as unknown as Record<string, unknown>
      );
    } catch (error) {
      console.error("Field history tracking failed for Task:", error);
    }

    return updatedRecord;
  }

  async complete(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Task> {
    return this.update(tenantId, userId, id, { status: "Completed" });
  }

  async delete(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<void> {
    await query(
      `UPDATE tasks SET is_deleted = true, updated_at = NOW(), updated_by = $1, system_modstamp = $4
       WHERE tenant_id = $2 AND id = $3`,
      [userId, tenantId, id, uuidv4()]
    );
  }

  async listByRelatedRecord(
    tenantId: string,
    relatedType: "who" | "what",
    objectType: string,
    objectId: string,
    limit = 10
  ): Promise<Task[]> {
    const typeColumn = relatedType === "who" ? "who_type" : "what_type";
    const idColumn = relatedType === "who" ? "who_id" : "what_id";

    const result = await query(
      `
      SELECT
        t.*,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name
      FROM tasks t
      LEFT JOIN users u ON t.owner_id = u.id AND u.tenant_id = t.tenant_id
      WHERE t.tenant_id = $1 AND t.${typeColumn} = $2 AND t.${idColumn} = $3 AND t.is_deleted = false
      ORDER BY t.created_at DESC
      LIMIT $4
      `,
      [tenantId, objectType, objectId, limit]
    );

    return result.rows.map((row) => this.toRecord(row));
  }
}

export const taskRepository = new TaskRepository();
