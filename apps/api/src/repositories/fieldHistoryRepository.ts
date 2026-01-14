import { v4 as uuidv4 } from "uuid";
import { query } from "../db/connection.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";
import type {
  FieldHistory,
  FieldTrackingSetting,
  CreateFieldTrackingInput,
  UpdateFieldTrackingInput,
  PaginatedResponse,
  TrackableObjectName,
  FieldChange,
} from "../types/index.js";

interface HistoryListParams {
  limit?: number;
  cursor?: string;
  objectName?: TrackableObjectName;
  recordId?: string;
  fieldName?: string;
  changedBy?: string;
}

interface TrackingListParams {
  limit?: number;
  cursor?: string;
  objectName?: TrackableObjectName;
  isTracked?: boolean;
}

export class FieldHistoryRepository {
  // ==================== Field History ====================

  async findHistoryById(tenantId: string, id: string): Promise<FieldHistory | null> {
    const sql = `
      SELECT
        fh.id,
        fh.tenant_id,
        fh.object_name,
        fh.record_id,
        fh.field_name,
        fh.old_value,
        fh.new_value,
        fh.changed_at,
        fh.changed_by,
        u.display_name as changed_by_name
      FROM field_histories fh
      LEFT JOIN users u ON fh.changed_by = u.id
      WHERE fh.tenant_id = $1 AND fh.id = $2
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapHistoryFromDb(result.rows[0]) : null;
  }

  async listHistory(
    tenantId: string,
    params: HistoryListParams = {}
  ): Promise<PaginatedResponse<FieldHistory>> {
    const { limit = 50, cursor, objectName, recordId, fieldName, changedBy } = params;

    const conditions: string[] = ["fh.tenant_id = $1"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (objectName) {
      conditions.push(`fh.object_name = $${paramIndex}`);
      values.push(objectName);
      paramIndex++;
    }

    if (recordId) {
      conditions.push(`fh.record_id = $${paramIndex}`);
      values.push(recordId);
      paramIndex++;
    }

    if (fieldName) {
      conditions.push(`fh.field_name = $${paramIndex}`);
      values.push(fieldName);
      paramIndex++;
    }

    if (changedBy) {
      conditions.push(`fh.changed_by = $${paramIndex}`);
      values.push(changedBy);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`fh.changed_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Count
    const countSql = `SELECT COUNT(*) FROM field_histories fh WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Select
    const sql = `
      SELECT
        fh.id,
        fh.tenant_id,
        fh.object_name,
        fh.record_id,
        fh.field_name,
        fh.old_value,
        fh.new_value,
        fh.changed_at,
        fh.changed_by,
        u.display_name as changed_by_name
      FROM field_histories fh
      LEFT JOIN users u ON fh.changed_by = u.id
      WHERE ${whereClause}
      ORDER BY fh.changed_at DESC
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<Record<string, unknown>>(sql, values);
    const records = result.rows.slice(0, limit).map((r) => this.mapHistoryFromDb(r));
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore ? records[records.length - 1].changedAt.toISOString() : undefined,
    };
  }

  /**
   * Get history for a specific record
   */
  async findByRecordId(
    tenantId: string,
    objectName: TrackableObjectName,
    recordId: string,
    limit = 100
  ): Promise<FieldHistory[]> {
    const sql = `
      SELECT
        fh.id,
        fh.tenant_id,
        fh.object_name,
        fh.record_id,
        fh.field_name,
        fh.old_value,
        fh.new_value,
        fh.changed_at,
        fh.changed_by,
        u.display_name as changed_by_name
      FROM field_histories fh
      LEFT JOIN users u ON fh.changed_by = u.id
      WHERE fh.tenant_id = $1 AND fh.object_name = $2 AND fh.record_id = $3
      ORDER BY fh.changed_at DESC
      LIMIT $4
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, objectName, recordId, limit]);
    return result.rows.map((r) => this.mapHistoryFromDb(r));
  }

  /**
   * Record field changes (batch insert)
   */
  async recordChanges(
    tenantId: string,
    userId: string,
    objectName: TrackableObjectName,
    recordId: string,
    changes: FieldChange[]
  ): Promise<void> {
    if (changes.length === 0) return;

    const now = new Date();
    const valuePlaceholders: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const change of changes) {
      const id = uuidv4();
      valuePlaceholders.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8})`
      );
      values.push(
        id,
        tenantId,
        objectName,
        recordId,
        change.fieldName,
        JSON.stringify(change.oldValue),
        JSON.stringify(change.newValue),
        now,
        userId
      );
      paramIndex += 9;
    }

    const sql = `
      INSERT INTO field_histories (id, tenant_id, object_name, record_id, field_name, old_value, new_value, changed_at, changed_by)
      VALUES ${valuePlaceholders.join(", ")}
    `;

    await query(sql, values);
  }

  // ==================== Field Tracking Settings ====================

  async findTrackingById(tenantId: string, id: string): Promise<FieldTrackingSetting | null> {
    const sql = `
      SELECT id, tenant_id, object_name, field_name, is_tracked, created_at, created_by, updated_at, updated_by
      FROM field_tracking_settings
      WHERE tenant_id = $1 AND id = $2
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapTrackingFromDb(result.rows[0]) : null;
  }

  async findTrackingByIdOrThrow(tenantId: string, id: string): Promise<FieldTrackingSetting> {
    const record = await this.findTrackingById(tenantId, id);
    if (!record) {
      throw new NotFoundError("field_tracking_settings", id);
    }
    return record;
  }

  async listTracking(
    tenantId: string,
    params: TrackingListParams = {}
  ): Promise<PaginatedResponse<FieldTrackingSetting>> {
    const { limit = 100, cursor, objectName, isTracked } = params;

    const conditions: string[] = ["tenant_id = $1"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (objectName) {
      conditions.push(`object_name = $${paramIndex}`);
      values.push(objectName);
      paramIndex++;
    }

    if (isTracked !== undefined) {
      conditions.push(`is_tracked = $${paramIndex}`);
      values.push(isTracked);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Count
    const countSql = `SELECT COUNT(*) FROM field_tracking_settings WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Select
    const sql = `
      SELECT id, tenant_id, object_name, field_name, is_tracked, created_at, created_by, updated_at, updated_by
      FROM field_tracking_settings
      WHERE ${whereClause}
      ORDER BY object_name ASC, field_name ASC
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<Record<string, unknown>>(sql, values);
    const records = result.rows.slice(0, limit).map((r) => this.mapTrackingFromDb(r));
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore ? records[records.length - 1].createdAt.toISOString() : undefined,
    };
  }

  /**
   * Get tracked fields for an object
   */
  async getTrackedFields(tenantId: string, objectName: TrackableObjectName): Promise<string[]> {
    const sql = `
      SELECT field_name
      FROM field_tracking_settings
      WHERE tenant_id = $1 AND object_name = $2 AND is_tracked = true
    `;
    const result = await query<{ field_name: string }>(sql, [tenantId, objectName]);
    return result.rows.map((r) => r.field_name);
  }

  async createTracking(
    tenantId: string,
    userId: string,
    data: CreateFieldTrackingInput
  ): Promise<FieldTrackingSetting> {
    // Check for duplicate
    const existsCheck = await query<{ id: string }>(
      `SELECT id FROM field_tracking_settings WHERE tenant_id = $1 AND object_name = $2 AND field_name = $3`,
      [tenantId, data.objectName, data.fieldName]
    );

    if (existsCheck.rows.length > 0) {
      throw new ValidationError([
        { field: "fieldName", message: "Tracking setting already exists for this field." },
      ]);
    }

    const id = uuidv4();
    const now = new Date();

    const sql = `
      INSERT INTO field_tracking_settings (id, tenant_id, object_name, field_name, is_tracked, created_at, created_by, updated_at, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    await query(sql, [
      id,
      tenantId,
      data.objectName,
      data.fieldName,
      data.isTracked ?? true,
      now,
      userId,
      now,
      userId,
    ]);

    return this.findTrackingById(tenantId, id) as Promise<FieldTrackingSetting>;
  }

  async updateTracking(
    tenantId: string,
    userId: string,
    id: string,
    data: UpdateFieldTrackingInput
  ): Promise<FieldTrackingSetting> {
    await this.findTrackingByIdOrThrow(tenantId, id);

    const sql = `
      UPDATE field_tracking_settings
      SET is_tracked = $1, updated_at = NOW(), updated_by = $2
      WHERE tenant_id = $3 AND id = $4
      RETURNING id
    `;

    await query(sql, [data.isTracked, userId, tenantId, id]);
    return this.findTrackingById(tenantId, id) as Promise<FieldTrackingSetting>;
  }

  async deleteTracking(tenantId: string, id: string): Promise<void> {
    await this.findTrackingByIdOrThrow(tenantId, id);

    const sql = `DELETE FROM field_tracking_settings WHERE tenant_id = $1 AND id = $2`;
    await query(sql, [tenantId, id]);
  }

  // ==================== Mappers ====================

  private mapHistoryFromDb(row: Record<string, unknown>): FieldHistory {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      objectName: row.object_name as TrackableObjectName,
      recordId: row.record_id as string,
      fieldName: row.field_name as string,
      oldValue: row.old_value,
      newValue: row.new_value,
      changedAt: new Date(row.changed_at as string),
      changedBy: row.changed_by as string,
      changedByName: row.changed_by_name as string | undefined,
    };
  }

  private mapTrackingFromDb(row: Record<string, unknown>): FieldTrackingSetting {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      objectName: row.object_name as TrackableObjectName,
      fieldName: row.field_name as string,
      isTracked: row.is_tracked as boolean,
      createdAt: new Date(row.created_at as string),
      createdBy: row.created_by as string,
      updatedAt: new Date(row.updated_at as string),
      updatedBy: row.updated_by as string,
    };
  }
}

export const fieldHistoryRepository = new FieldHistoryRepository();
