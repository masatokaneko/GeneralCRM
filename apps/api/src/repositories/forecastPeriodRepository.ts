import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ConflictError, ValidationError } from "../middleware/errorHandler.js";
import type {
  ForecastPeriod,
  CreateForecastPeriodInput,
  UpdateForecastPeriodInput,
  PaginatedResponse,
} from "../types/index.js";

export interface ForecastPeriodListParams {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
  filters?: {
    periodType?: string;
    fiscalYear?: number;
    fiscalQuarter?: number;
    isClosed?: boolean;
  };
}

class ForecastPeriodRepository {
  private tableName = "forecast_periods";
  private columns = [
    "tenant_id",
    "id",
    "name",
    "period_type",
    "start_date",
    "end_date",
    "fiscal_year",
    "fiscal_quarter",
    "fiscal_month",
    "is_closed",
    "closed_at",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "is_deleted",
    "system_modstamp",
  ];

  private getSelectColumns(): string {
    return this.columns.join(", ");
  }

  private mapToDb(record: Partial<ForecastPeriod>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const mapping: Record<string, string> = {
      tenantId: "tenant_id",
      periodType: "period_type",
      startDate: "start_date",
      endDate: "end_date",
      fiscalYear: "fiscal_year",
      fiscalQuarter: "fiscal_quarter",
      fiscalMonth: "fiscal_month",
      isClosed: "is_closed",
      closedAt: "closed_at",
      createdAt: "created_at",
      createdBy: "created_by",
      updatedAt: "updated_at",
      updatedBy: "updated_by",
      isDeleted: "is_deleted",
      systemModstamp: "system_modstamp",
    };

    for (const [key, value] of Object.entries(record)) {
      const dbKey = mapping[key] || key;
      result[dbKey] = value;
    }
    return result;
  }

  private mapFromDb(row: Record<string, unknown>): ForecastPeriod {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      periodType: row.period_type as ForecastPeriod["periodType"],
      startDate: row.start_date as Date,
      endDate: row.end_date as Date,
      fiscalYear: row.fiscal_year as number,
      fiscalQuarter: row.fiscal_quarter as number | undefined,
      fiscalMonth: row.fiscal_month as number | undefined,
      isClosed: row.is_closed as boolean,
      closedAt: row.closed_at as Date | undefined,
      createdAt: row.created_at as Date,
      createdBy: row.created_by as string,
      updatedAt: row.updated_at as Date,
      updatedBy: row.updated_by as string,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
    };
  }

  async findById(tenantId: string, id: string): Promise<ForecastPeriod | null> {
    const sql = `
      SELECT ${this.getSelectColumns()}
      FROM ${this.tableName}
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<ForecastPeriod> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError(this.tableName, id);
    }
    return record;
  }

  async list(
    tenantId: string,
    params: ForecastPeriodListParams = {}
  ): Promise<PaginatedResponse<ForecastPeriod>> {
    const {
      limit = 50,
      cursor,
      orderBy = "start_date",
      orderDir = "DESC",
      filters = {},
    } = params;

    const conditions: string[] = ["tenant_id = $1", "is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (cursor) {
      conditions.push(`created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    if (filters.periodType) {
      conditions.push(`period_type = $${paramIndex}`);
      values.push(filters.periodType);
      paramIndex++;
    }

    if (filters.fiscalYear !== undefined) {
      conditions.push(`fiscal_year = $${paramIndex}`);
      values.push(filters.fiscalYear);
      paramIndex++;
    }

    if (filters.fiscalQuarter !== undefined) {
      conditions.push(`fiscal_quarter = $${paramIndex}`);
      values.push(filters.fiscalQuarter);
      paramIndex++;
    }

    if (filters.isClosed !== undefined) {
      conditions.push(`is_closed = $${paramIndex}`);
      values.push(filters.isClosed);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `SELECT COUNT(*) FROM ${this.tableName} WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT ${this.getSelectColumns()}
      FROM ${this.tableName}
      WHERE ${whereClause}
      ORDER BY ${orderBy} ${orderDir}
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<Record<string, unknown>>(sql, values);
    const records = result.rows.slice(0, limit).map((r) => this.mapFromDb(r));
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore && records.length > 0
        ? new Date(records[records.length - 1].createdAt).toISOString()
        : undefined,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: CreateForecastPeriodInput
  ): Promise<ForecastPeriod> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const record: Partial<ForecastPeriod> = {
      id,
      tenantId,
      name: data.name,
      periodType: data.periodType,
      startDate: data.startDate,
      endDate: data.endDate,
      fiscalYear: data.fiscalYear,
      fiscalQuarter: data.fiscalQuarter,
      fiscalMonth: data.fiscalMonth,
      isClosed: data.isClosed ?? false,
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
      isDeleted: false,
      systemModstamp,
    };

    const dbRecord = this.mapToDb(record);
    const keys = Object.keys(dbRecord);
    const values = Object.values(dbRecord);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      INSERT INTO ${this.tableName} (${keys.join(", ")})
      VALUES (${placeholders})
      RETURNING ${this.getSelectColumns()}
    `;

    const result = await query<Record<string, unknown>>(sql, values);
    return this.mapFromDb(result.rows[0]);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: UpdateForecastPeriodInput,
    etag?: string
  ): Promise<ForecastPeriod> {
    return await transaction(async (client) => {
      const checkSql = `
        SELECT system_modstamp, is_closed FROM ${this.tableName}
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

      // Prevent update if period is closed
      if (checkResult.rows[0].is_closed && !data.isClosed) {
        throw new ValidationError([
          { field: "isClosed", message: "Cannot modify a closed forecast period" },
        ]);
      }

      const now = new Date();
      const newModstamp = uuidv4();

      const updateData: Partial<ForecastPeriod> = {
        ...data,
        updatedAt: now,
        updatedBy: userId,
        systemModstamp: newModstamp,
      };

      const dbData = this.mapToDb(updateData);
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

  // Custom methods

  async findByDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ForecastPeriod[]> {
    const sql = `
      SELECT ${this.getSelectColumns()}
      FROM ${this.tableName}
      WHERE tenant_id = $1
        AND is_deleted = false
        AND start_date <= $2
        AND end_date >= $3
      ORDER BY start_date ASC
    `;
    const result = await query<Record<string, unknown>>(sql, [
      tenantId,
      endDate,
      startDate,
    ]);
    return result.rows.map((r) => this.mapFromDb(r));
  }

  async findOpen(tenantId: string): Promise<ForecastPeriod[]> {
    const sql = `
      SELECT ${this.getSelectColumns()}
      FROM ${this.tableName}
      WHERE tenant_id = $1 AND is_deleted = false AND is_closed = false
      ORDER BY start_date ASC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId]);
    return result.rows.map((r) => this.mapFromDb(r));
  }

  async findCurrent(tenantId: string): Promise<ForecastPeriod | null> {
    const today = new Date();
    const sql = `
      SELECT ${this.getSelectColumns()}
      FROM ${this.tableName}
      WHERE tenant_id = $1
        AND is_deleted = false
        AND start_date <= $2
        AND end_date >= $2
      ORDER BY period_type ASC
      LIMIT 1
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, today]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async close(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<ForecastPeriod> {
    return await transaction(async (client) => {
      const checkSql = `
        SELECT is_closed FROM ${this.tableName}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError(this.tableName, id);
      }

      if (checkResult.rows[0].is_closed) {
        throw new ValidationError([
          { field: "isClosed", message: "Period is already closed" },
        ]);
      }

      const now = new Date();
      const newModstamp = uuidv4();

      const sql = `
        UPDATE ${this.tableName}
        SET is_closed = true, closed_at = $3, updated_at = $3, updated_by = $4, system_modstamp = $5
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING ${this.getSelectColumns()}
      `;

      const result = await client.query(sql, [
        tenantId,
        id,
        now,
        userId,
        newModstamp,
      ]);
      return this.mapFromDb(result.rows[0]);
    });
  }

  async findByFiscalPeriod(
    tenantId: string,
    fiscalYear: number,
    fiscalQuarter?: number,
    fiscalMonth?: number
  ): Promise<ForecastPeriod[]> {
    const conditions = [
      "tenant_id = $1",
      "is_deleted = false",
      "fiscal_year = $2",
    ];
    const values: unknown[] = [tenantId, fiscalYear];
    let paramIndex = 3;

    if (fiscalQuarter !== undefined) {
      conditions.push(`fiscal_quarter = $${paramIndex}`);
      values.push(fiscalQuarter);
      paramIndex++;
    }

    if (fiscalMonth !== undefined) {
      conditions.push(`fiscal_month = $${paramIndex}`);
      values.push(fiscalMonth);
    }

    const sql = `
      SELECT ${this.getSelectColumns()}
      FROM ${this.tableName}
      WHERE ${conditions.join(" AND ")}
      ORDER BY start_date ASC
    `;
    const result = await query<Record<string, unknown>>(sql, values);
    return result.rows.map((r) => this.mapFromDb(r));
  }
}

export const forecastPeriodRepository = new ForecastPeriodRepository();
