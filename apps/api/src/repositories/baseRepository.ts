import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ConflictError } from "../middleware/errorHandler.js";
import { fieldHistoryService } from "../services/fieldHistoryService.js";
import type { BaseRecord, PaginatedResponse, TrackableObjectName } from "../types/index.js";

export interface ListParams {
  limit?: number;
  cursor?: string;
  page?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  filters?: Record<string, unknown>;
}

// Access filter for record-level permission filtering
export interface AccessFilter {
  clause: string;
  params: unknown[];
  paramOffset: number;
}

export abstract class BaseRepository<T extends BaseRecord> {
  protected abstract tableName: string;
  protected abstract columns: string[];
  // Override in subclasses to enable field history tracking
  protected trackableObjectName: TrackableObjectName | null = null;

  protected getSelectColumns(): string {
    return this.columns.join(", ");
  }

  async findById(tenantId: string, id: string): Promise<T | null> {
    const sql = `
      SELECT ${this.getSelectColumns()}
      FROM ${this.tableName}
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query<T>(sql, [tenantId, id]);
    return result.rows[0] || null;
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<T> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError(this.tableName, id);
    }
    return record;
  }

  async list(
    tenantId: string,
    params: ListParams = {},
    accessFilter?: AccessFilter | null
  ): Promise<PaginatedResponse<T>> {
    const {
      limit = 50,
      cursor,
      orderBy = "created_at",
      orderDir = "DESC",
      filters = {},
    } = params;

    const conditions: string[] = ["tenant_id = $1", "is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    // Add access filter for record-level permissions
    if (accessFilter) {
      conditions.push(accessFilter.clause);
      values.push(...accessFilter.params);
      paramIndex = accessFilter.paramOffset;
    }

    // Add cursor condition
    if (cursor) {
      conditions.push(`created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    // Add filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== "") {
        const snakeKey = this.toSnakeCase(key);
        conditions.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const countSql = `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Get records
    const sql = `
      SELECT ${this.getSelectColumns()}
      FROM ${this.tableName}
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1); // Fetch one extra to check if there are more

    const result = await query<T>(sql, values);
    const records = result.rows.slice(0, limit);
    const hasMore = result.rows.length > limit;

    return {
      records: records.map((r) => this.mapFromDb(r)),
      totalSize,
      nextCursor: hasMore && records.length > 0
        ? new Date((records[records.length - 1] as Record<string, unknown>).created_at as string).toISOString()
        : undefined,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<T>
  ): Promise<T> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const record = {
      ...data,
      id,
      tenantId,
      ownerId: userId,
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
      isDeleted: false,
      systemModstamp,
    };

    const dbRecord = this.mapToDb(record as T);
    const keys = Object.keys(dbRecord);
    const values = Object.values(dbRecord);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      INSERT INTO ${this.tableName} (${keys.join(", ")})
      VALUES (${placeholders})
      RETURNING ${this.getSelectColumns()}
    `;

    const result = await query<T>(sql, values);
    return this.mapFromDb(result.rows[0]);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<T>,
    etag?: string
  ): Promise<T> {
    // Get old record for field history tracking (before transaction)
    let oldRecord: Record<string, unknown> | null = null;
    if (this.trackableObjectName) {
      const oldResult = await query<T>(
        `SELECT ${this.getSelectColumns()} FROM ${this.tableName} WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
        [tenantId, id]
      );
      if (oldResult.rows[0]) {
        oldRecord = this.mapFromDb(oldResult.rows[0]) as Record<string, unknown>;
      }
    }

    const updatedRecord = await transaction(async (client) => {
      // Check if record exists and verify etag
      const checkSql = `
        SELECT system_modstamp FROM ${this.tableName}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError(this.tableName, id);
      }

      if (etag && checkResult.rows[0].system_modstamp !== etag) {
        throw new ConflictError("Record was modified by another user");
      }

      const now = new Date();
      const newModstamp = uuidv4();

      const updateData = {
        ...data,
        updatedAt: now,
        updatedBy: userId,
        systemModstamp: newModstamp,
      };

      const dbData = this.mapToDb(updateData as T);
      const entries = Object.entries(dbData).filter(
        ([key]) => !["id", "tenant_id", "created_at", "created_by"].includes(key)
      );

      const setClause = entries
        .map(([key], i) => `${key} = $${i + 3}`)
        .join(", ");
      const values = [tenantId, id, ...entries.map(([, v]) => v)];

      const sql = `
        UPDATE ${this.tableName}
        SET ${setClause}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING ${this.getSelectColumns()}
      `;

      const result = await client.query(sql, values);
      return this.mapFromDb(result.rows[0]);
    });

    // Track field history after successful update
    if (this.trackableObjectName && oldRecord) {
      try {
        await fieldHistoryService.trackChanges(
          tenantId,
          userId,
          this.trackableObjectName,
          id,
          oldRecord,
          updatedRecord as Record<string, unknown>
        );
      } catch (error) {
        // Log but don't fail the update if history tracking fails
        console.error("Field history tracking failed:", error);
      }
    }

    return updatedRecord;
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

  // Convert camelCase to snake_case
  protected toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  // Convert snake_case to camelCase
  protected toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  // Override these in subclasses for custom mapping
  protected mapToDb(record: T): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      result[this.toSnakeCase(key)] = value;
    }
    return result;
  }

  protected mapFromDb(row: T): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      result[this.toCamelCase(key)] = value;
    }
    return result as T;
  }
}
