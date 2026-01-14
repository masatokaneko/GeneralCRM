import { v4 as uuidv4 } from "uuid";
import { query } from "../db/connection.js";
import { NotFoundError, ConflictError } from "../middleware/errorHandler.js";
import type { PaginatedResponse, ListOptions } from "../types/index.js";

// Report definition type
export interface ReportDefinition {
  id: string;
  tenantId: string;
  folderId?: string;
  name: string;
  description?: string;
  reportType: "Tabular" | "Summary" | "Matrix" | "Joined";
  baseObject: string;
  definition: ReportQueryDefinition;
  chartConfig?: ChartConfig;
  isPublic: boolean;
  ownerId?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  ownerName?: string;
  folderName?: string;
}

// Report query definition stored as JSON
export interface ReportQueryDefinition {
  select: string[];
  filters?: Array<{
    field: string;
    operator: string;
    value?: unknown;
  }>;
  orderBy?: Array<{
    field: string;
    direction: "ASC" | "DESC";
  }>;
  groupBy?: string[];
  aggregations?: Array<{
    field: string;
    function: string;
    alias?: string;
  }>;
  limit?: number;
}

// Chart configuration
export interface ChartConfig {
  type: "bar" | "line" | "pie" | "donut" | "funnel";
  title?: string;
  xAxis?: {
    field: string;
    label?: string;
  };
  yAxis?: {
    field: string;
    label?: string;
  };
  series?: Array<{
    field: string;
    label?: string;
    color?: string;
  }>;
}

// Report run type
export interface ReportRun {
  id: string;
  tenantId: string;
  reportId: string;
  status: "Running" | "Completed" | "Failed" | "Cancelled";
  startedAt: Date;
  completedAt?: Date;
  rowCount?: number;
  resultData?: unknown;
  errorMessage?: string;
  runBy?: string;
  parameters?: Record<string, unknown>;
}

class ReportRepository {
  private tableName = "report_definitions";

  async findById(tenantId: string, id: string): Promise<ReportDefinition | null> {
    const sql = `
      SELECT
        r.*,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name,
        f.name as folder_name
      FROM ${this.tableName} r
      LEFT JOIN users u ON r.owner_id = u.id
      LEFT JOIN report_folders f ON r.folder_id = f.id
      WHERE r.tenant_id = $1 AND r.id = $2 AND r.is_deleted = false
    `;
    const result = await query(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async list(
    tenantId: string,
    userId: string,
    options: ListOptions = {}
  ): Promise<PaginatedResponse<ReportDefinition>> {
    const {
      limit = 50,
      cursor,
      orderBy = "updated_at",
      orderDir = "DESC",
      filters = {},
    } = options;

    let sql = `
      SELECT
        r.*,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name,
        f.name as folder_name
      FROM ${this.tableName} r
      LEFT JOIN users u ON r.owner_id = u.id
      LEFT JOIN report_folders f ON r.folder_id = f.id
      WHERE r.tenant_id = $1 AND r.is_deleted = false
      AND (r.is_public = true OR r.owner_id = $2)
    `;

    const params: unknown[] = [tenantId, userId];
    let paramIndex = 3;

    // Apply filters
    if (filters.folderId) {
      sql += ` AND r.folder_id = $${paramIndex++}`;
      params.push(filters.folderId);
    }
    if (filters.reportType) {
      sql += ` AND r.report_type = $${paramIndex++}`;
      params.push(filters.reportType);
    }
    if (filters.baseObject) {
      sql += ` AND r.base_object = $${paramIndex++}`;
      params.push(filters.baseObject);
    }
    if (filters.search) {
      sql += ` AND (r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Cursor pagination
    if (cursor) {
      sql += ` AND r.id > $${paramIndex++}`;
      params.push(cursor);
    }

    // Count total
    const countSql = sql.replace(
      /SELECT[\s\S]+?FROM/,
      "SELECT COUNT(DISTINCT r.id) as count FROM"
    );
    const countResult = await query<{ count: string }>(countSql, params);
    const totalSize = parseInt(countResult.rows[0]?.count || "0", 10);

    // Apply ordering and limit
    const validColumns = ["name", "updated_at", "created_at", "report_type"];
    const sortColumn = validColumns.includes(orderBy) ? orderBy : "updated_at";
    sql += ` ORDER BY r.${sortColumn} ${orderDir === "ASC" ? "ASC" : "DESC"}`;
    sql += ` LIMIT $${paramIndex++}`;
    params.push(limit + 1);

    const result = await query(sql, params);
    const records = result.rows.slice(0, limit).map((r) => this.mapFromDb(r));
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore ? records[records.length - 1]?.id : undefined,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<ReportDefinition>
  ): Promise<ReportDefinition> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO ${this.tableName} (
        id, tenant_id, folder_id, name, description, report_type, base_object,
        definition, chart_config, is_public, owner_id,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING *
    `;

    await query(sql, [
      id,
      tenantId,
      data.folderId || null,
      data.name,
      data.description || null,
      data.reportType || "Tabular",
      data.baseObject,
      JSON.stringify(data.definition || { select: ["id", "name"] }),
      data.chartConfig ? JSON.stringify(data.chartConfig) : null,
      data.isPublic || false,
      data.ownerId || userId,
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ]);

    return this.findById(tenantId, id) as Promise<ReportDefinition>;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<ReportDefinition>,
    etag?: string
  ): Promise<ReportDefinition> {
    const existing = await this.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(this.tableName, id);
    }

    if (etag && existing.systemModstamp !== etag) {
      throw new ConflictError("Report has been modified by another user");
    }

    const now = new Date();
    const newModstamp = uuidv4();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateFields: Array<keyof ReportDefinition> = [
      "folderId",
      "name",
      "description",
      "reportType",
      "baseObject",
      "isPublic",
    ];

    const fieldMap: Record<string, string> = {
      folderId: "folder_id",
      name: "name",
      description: "description",
      reportType: "report_type",
      baseObject: "base_object",
      isPublic: "is_public",
    };

    for (const field of updateFields) {
      if (data[field] !== undefined) {
        updates.push(`${fieldMap[field]} = $${paramIndex++}`);
        values.push(data[field]);
      }
    }

    // Handle JSON fields
    if (data.definition !== undefined) {
      updates.push(`definition = $${paramIndex++}`);
      values.push(JSON.stringify(data.definition));
    }
    if (data.chartConfig !== undefined) {
      updates.push(`chart_config = $${paramIndex++}`);
      values.push(data.chartConfig ? JSON.stringify(data.chartConfig) : null);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(now);
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(userId);
    updates.push(`system_modstamp = $${paramIndex++}`);
    values.push(newModstamp);

    values.push(tenantId, id);

    await query(
      `UPDATE ${this.tableName} SET ${updates.join(", ")} WHERE tenant_id = $${paramIndex++} AND id = $${paramIndex++}`,
      values
    );

    return this.findById(tenantId, id) as Promise<ReportDefinition>;
  }

  async delete(tenantId: string, userId: string, id: string): Promise<void> {
    const sql = `
      UPDATE ${this.tableName}
      SET is_deleted = true, updated_at = $3, updated_by = $4
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, id, new Date(), userId]);

    if (result.rowCount === 0) {
      throw new NotFoundError(this.tableName, id);
    }
  }

  // Report Runs

  async createRun(
    tenantId: string,
    userId: string,
    reportId: string,
    parameters?: Record<string, unknown>
  ): Promise<ReportRun> {
    const id = uuidv4();
    const now = new Date();

    const sql = `
      INSERT INTO report_runs (
        id, tenant_id, report_id, status, started_at, run_by, parameters
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(sql, [
      id,
      tenantId,
      reportId,
      "Running",
      now,
      userId,
      parameters ? JSON.stringify(parameters) : null,
    ]);

    return this.mapRunFromDb(result.rows[0]);
  }

  async updateRun(
    tenantId: string,
    runId: string,
    status: "Completed" | "Failed" | "Cancelled",
    resultData?: unknown,
    errorMessage?: string
  ): Promise<ReportRun> {
    const now = new Date();
    const rowCount = Array.isArray(resultData) ? resultData.length : null;

    const sql = `
      UPDATE report_runs
      SET status = $3, completed_at = $4, row_count = $5,
          result_data = $6, error_message = $7
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;

    const result = await query(sql, [
      tenantId,
      runId,
      status,
      now,
      rowCount,
      resultData ? JSON.stringify(resultData) : null,
      errorMessage || null,
    ]);

    return this.mapRunFromDb(result.rows[0]);
  }

  async findRunById(tenantId: string, runId: string): Promise<ReportRun | null> {
    const sql = `
      SELECT * FROM report_runs
      WHERE tenant_id = $1 AND id = $2
    `;
    const result = await query(sql, [tenantId, runId]);
    return result.rows[0] ? this.mapRunFromDb(result.rows[0]) : null;
  }

  async listRuns(
    tenantId: string,
    reportId: string,
    limit = 10
  ): Promise<ReportRun[]> {
    const sql = `
      SELECT * FROM report_runs
      WHERE tenant_id = $1 AND report_id = $2
      ORDER BY started_at DESC
      LIMIT $3
    `;
    const result = await query(sql, [tenantId, reportId, limit]);
    return result.rows.map((r) => this.mapRunFromDb(r));
  }

  private mapFromDb(row: Record<string, unknown>): ReportDefinition {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      folderId: row.folder_id as string | undefined,
      name: row.name as string,
      description: row.description as string | undefined,
      reportType: row.report_type as ReportDefinition["reportType"],
      baseObject: row.base_object as string,
      definition: row.definition as ReportQueryDefinition,
      chartConfig: row.chart_config as ChartConfig | undefined,
      isPublic: row.is_public as boolean,
      ownerId: row.owner_id as string | undefined,
      createdAt: new Date(row.created_at as string),
      createdBy: row.created_by as string,
      updatedAt: new Date(row.updated_at as string),
      updatedBy: row.updated_by as string,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
      ownerName: row.owner_name as string | undefined,
      folderName: row.folder_name as string | undefined,
    };
  }

  private mapRunFromDb(row: Record<string, unknown>): ReportRun {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      reportId: row.report_id as string,
      status: row.status as ReportRun["status"],
      startedAt: new Date(row.started_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      rowCount: row.row_count as number | undefined,
      resultData: row.result_data as unknown,
      errorMessage: row.error_message as string | undefined,
      runBy: row.run_by as string | undefined,
      parameters: row.parameters as Record<string, unknown> | undefined,
    };
  }
}

export const reportRepository = new ReportRepository();
