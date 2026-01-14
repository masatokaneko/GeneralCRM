import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ConflictError } from "../middleware/errorHandler.js";
import type {
  Quota,
  CreateQuotaInput,
  UpdateQuotaInput,
  QuotaWithAttainment,
  QuotaSummary,
  PaginatedResponse,
} from "../types/index.js";

export interface QuotaListParams {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
  filters?: {
    ownerId?: string;
    periodId?: string;
  };
}

class QuotaRepository {
  private tableName = "quotas";
  private columns = [
    "tenant_id",
    "id",
    "owner_id",
    "period_id",
    "quota_amount",
    "currency_iso_code",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "is_deleted",
    "system_modstamp",
  ];

  private getSelectColumns(): string {
    return this.columns.map((c) => `q.${c}`).join(", ");
  }

  private mapFromDb(row: Record<string, unknown>): Quota {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      ownerId: row.owner_id as string,
      periodId: row.period_id as string,
      quotaAmount: parseFloat(row.quota_amount as string),
      currencyIsoCode: row.currency_iso_code as string,
      createdAt: row.created_at as Date,
      createdBy: row.created_by as string,
      updatedAt: row.updated_at as Date,
      updatedBy: row.updated_by as string,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
      ownerName: row.owner_name as string | undefined,
      periodName: row.period_name as string | undefined,
    };
  }

  async findById(tenantId: string, id: string): Promise<Quota | null> {
    const sql = `
      SELECT ${this.getSelectColumns()},
             u.display_name AS owner_name,
             fp.name AS period_name
      FROM ${this.tableName} q
      LEFT JOIN users u ON q.tenant_id = u.tenant_id AND q.owner_id = u.id
      LEFT JOIN forecast_periods fp ON q.tenant_id = fp.tenant_id AND q.period_id = fp.id
      WHERE q.tenant_id = $1 AND q.id = $2 AND q.is_deleted = false
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<Quota> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError(this.tableName, id);
    }
    return record;
  }

  async list(
    tenantId: string,
    params: QuotaListParams = {}
  ): Promise<PaginatedResponse<Quota>> {
    const {
      limit = 50,
      cursor,
      orderBy = "created_at",
      orderDir = "DESC",
      filters = {},
    } = params;

    const conditions: string[] = ["q.tenant_id = $1", "q.is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (cursor) {
      conditions.push(`q.created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    if (filters.ownerId) {
      conditions.push(`q.owner_id = $${paramIndex}`);
      values.push(filters.ownerId);
      paramIndex++;
    }

    if (filters.periodId) {
      conditions.push(`q.period_id = $${paramIndex}`);
      values.push(filters.periodId);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `SELECT COUNT(*) FROM ${this.tableName} q WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT ${this.getSelectColumns()},
             u.display_name AS owner_name,
             fp.name AS period_name
      FROM ${this.tableName} q
      LEFT JOIN users u ON q.tenant_id = u.tenant_id AND q.owner_id = u.id
      LEFT JOIN forecast_periods fp ON q.tenant_id = fp.tenant_id AND q.period_id = fp.id
      WHERE ${whereClause}
      ORDER BY q.${orderBy} ${orderDir}
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
    data: CreateQuotaInput
  ): Promise<Quota> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO ${this.tableName} (
        tenant_id, id, owner_id, period_id, quota_amount, currency_iso_code,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      tenantId,
      id,
      data.ownerId,
      data.periodId,
      data.quotaAmount,
      data.currencyIsoCode || "JPY",
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ];

    const result = await query<Record<string, unknown>>(sql, values);
    return this.findByIdOrThrow(tenantId, result.rows[0].id as string);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: UpdateQuotaInput,
    etag?: string
  ): Promise<Quota> {
    return await transaction(async (client) => {
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

      const updates: string[] = [];
      const values: unknown[] = [tenantId, id];
      let paramIndex = 3;

      if (data.quotaAmount !== undefined) {
        updates.push(`quota_amount = $${paramIndex}`);
        values.push(data.quotaAmount);
        paramIndex++;
      }

      if (data.currencyIsoCode !== undefined) {
        updates.push(`currency_iso_code = $${paramIndex}`);
        values.push(data.currencyIsoCode);
        paramIndex++;
      }

      updates.push(`updated_at = $${paramIndex}`);
      values.push(now);
      paramIndex++;

      updates.push(`updated_by = $${paramIndex}`);
      values.push(userId);
      paramIndex++;

      updates.push(`system_modstamp = $${paramIndex}`);
      values.push(newModstamp);

      const sql = `
        UPDATE ${this.tableName}
        SET ${updates.join(", ")}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING *
      `;

      await client.query(sql, values);
      return this.findByIdOrThrow(tenantId, id);
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

  async findByOwnerAndPeriod(
    tenantId: string,
    ownerId: string,
    periodId: string
  ): Promise<Quota | null> {
    const sql = `
      SELECT ${this.getSelectColumns()},
             u.display_name AS owner_name,
             fp.name AS period_name
      FROM ${this.tableName} q
      LEFT JOIN users u ON q.tenant_id = u.tenant_id AND q.owner_id = u.id
      LEFT JOIN forecast_periods fp ON q.tenant_id = fp.tenant_id AND q.period_id = fp.id
      WHERE q.tenant_id = $1 AND q.owner_id = $2 AND q.period_id = $3 AND q.is_deleted = false
    `;
    const result = await query<Record<string, unknown>>(sql, [
      tenantId,
      ownerId,
      periodId,
    ]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async calculateAttainment(
    tenantId: string,
    id: string
  ): Promise<QuotaWithAttainment> {
    const quota = await this.findByIdOrThrow(tenantId, id);

    // Get actual revenue from closed-won opportunities in the period
    const actualSql = `
      SELECT COALESCE(SUM(o.amount), 0) AS actual_revenue
      FROM opportunities o
      JOIN forecast_periods fp ON fp.tenant_id = $1 AND fp.id = $2
      WHERE o.tenant_id = $1
        AND o.owner_id = $3
        AND o.is_deleted = false
        AND o.is_closed = true
        AND o.is_won = true
        AND o.close_date >= fp.start_date
        AND o.close_date <= fp.end_date
    `;
    const actualResult = await query<{ actual_revenue: string }>(actualSql, [
      tenantId,
      quota.periodId,
      quota.ownerId,
    ]);
    const actualRevenue = parseFloat(actualResult.rows[0].actual_revenue);

    // Get forecast revenue from forecasts
    const forecastSql = `
      SELECT COALESCE(SUM(f.amount), 0) AS forecast_revenue
      FROM forecasts f
      WHERE f.tenant_id = $1
        AND f.owner_id = $2
        AND f.period_id = $3
        AND f.is_deleted = false
        AND f.forecast_category IN ('Commit', 'Closed')
    `;
    const forecastResult = await query<{ forecast_revenue: string }>(forecastSql, [
      tenantId,
      quota.ownerId,
      quota.periodId,
    ]);
    const forecastRevenue = parseFloat(forecastResult.rows[0].forecast_revenue);

    const attainmentPercentage =
      quota.quotaAmount > 0
        ? Math.round((actualRevenue / quota.quotaAmount) * 10000) / 100
        : 0;

    return {
      ...quota,
      actualRevenue,
      forecastRevenue,
      attainmentPercentage,
    };
  }

  async getSummaryByPeriod(
    tenantId: string,
    periodId: string
  ): Promise<QuotaSummary> {
    // Get total quota for the period
    const quotaSql = `
      SELECT COALESCE(SUM(q.quota_amount), 0) AS total_quota
      FROM ${this.tableName} q
      WHERE q.tenant_id = $1 AND q.period_id = $2 AND q.is_deleted = false
    `;
    const quotaResult = await query<{ total_quota: string }>(quotaSql, [
      tenantId,
      periodId,
    ]);
    const totalQuota = parseFloat(quotaResult.rows[0].total_quota);

    // Get period name
    const periodSql = `
      SELECT name FROM forecast_periods
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const periodResult = await query<{ name: string }>(periodSql, [
      tenantId,
      periodId,
    ]);
    const periodName = periodResult.rows[0]?.name || "";

    // Get actual revenue from closed-won opportunities
    const actualSql = `
      SELECT COALESCE(SUM(o.amount), 0) AS total_actual
      FROM opportunities o
      JOIN forecast_periods fp ON fp.tenant_id = $1 AND fp.id = $2
      WHERE o.tenant_id = $1
        AND o.is_deleted = false
        AND o.is_closed = true
        AND o.is_won = true
        AND o.close_date >= fp.start_date
        AND o.close_date <= fp.end_date
    `;
    const actualResult = await query<{ total_actual: string }>(actualSql, [
      tenantId,
      periodId,
    ]);
    const totalActual = parseFloat(actualResult.rows[0].total_actual);

    // Get total forecast
    const forecastSql = `
      SELECT COALESCE(SUM(f.amount), 0) AS total_forecast
      FROM forecasts f
      WHERE f.tenant_id = $1 AND f.period_id = $2 AND f.is_deleted = false
        AND f.forecast_category IN ('Commit', 'Closed')
    `;
    const forecastResult = await query<{ total_forecast: string }>(forecastSql, [
      tenantId,
      periodId,
    ]);
    const totalForecast = parseFloat(forecastResult.rows[0].total_forecast);

    const attainmentPercentage =
      totalQuota > 0
        ? Math.round((totalActual / totalQuota) * 10000) / 100
        : 0;

    return {
      periodId,
      periodName,
      totalQuota,
      totalActual,
      totalForecast,
      attainmentPercentage,
    };
  }

  async listByPeriod(
    tenantId: string,
    periodId: string
  ): Promise<Quota[]> {
    const sql = `
      SELECT ${this.getSelectColumns()},
             u.display_name AS owner_name,
             fp.name AS period_name
      FROM ${this.tableName} q
      LEFT JOIN users u ON q.tenant_id = u.tenant_id AND q.owner_id = u.id
      LEFT JOIN forecast_periods fp ON q.tenant_id = fp.tenant_id AND q.period_id = fp.id
      WHERE q.tenant_id = $1 AND q.period_id = $2 AND q.is_deleted = false
      ORDER BY q.quota_amount DESC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, periodId]);
    return result.rows.map((r) => this.mapFromDb(r));
  }

  async listByOwner(
    tenantId: string,
    ownerId: string
  ): Promise<Quota[]> {
    const sql = `
      SELECT ${this.getSelectColumns()},
             u.display_name AS owner_name,
             fp.name AS period_name
      FROM ${this.tableName} q
      LEFT JOIN users u ON q.tenant_id = u.tenant_id AND q.owner_id = u.id
      LEFT JOIN forecast_periods fp ON q.tenant_id = fp.tenant_id AND q.period_id = fp.id
      WHERE q.tenant_id = $1 AND q.owner_id = $2 AND q.is_deleted = false
      ORDER BY fp.start_date DESC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, ownerId]);
    return result.rows.map((r) => this.mapFromDb(r));
  }
}

export const quotaRepository = new QuotaRepository();
