import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ConflictError, ValidationError } from "../middleware/errorHandler.js";
import type {
  Forecast,
  CreateForecastInput,
  UpdateForecastInput,
  ForecastItem,
  CreateForecastItemInput,
  ForecastAdjustment,
  CreateForecastAdjustmentInput,
  ForecastSummary,
  ForecastCategory,
  PaginatedResponse,
} from "../types/index.js";

export interface ForecastListParams {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
  filters?: {
    ownerId?: string;
    periodId?: string;
    forecastCategory?: ForecastCategory;
  };
}

// Helper function to determine forecast category from probability
export function determineForecastCategory(probability: number): ForecastCategory {
  if (probability === 100) return "Closed";
  if (probability >= 71) return "Commit";
  if (probability >= 31) return "BestCase";
  return "Pipeline";
}

class ForecastRepository {
  private tableName = "forecasts";
  private itemsTable = "forecast_items";
  private adjustmentsTable = "forecast_adjustments";

  private forecastColumns = [
    "tenant_id",
    "id",
    "owner_id",
    "period_id",
    "forecast_category",
    "amount",
    "quantity",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "is_deleted",
    "system_modstamp",
  ];

  private getSelectColumns(): string {
    return this.forecastColumns.map((c) => `f.${c}`).join(", ");
  }

  private mapForecastFromDb(row: Record<string, unknown>): Forecast {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      ownerId: row.owner_id as string,
      periodId: row.period_id as string,
      forecastCategory: row.forecast_category as ForecastCategory,
      amount: parseFloat(row.amount as string),
      quantity: row.quantity ? parseFloat(row.quantity as string) : undefined,
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

  private mapItemFromDb(row: Record<string, unknown>): ForecastItem {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      forecastId: row.forecast_id as string,
      opportunityId: row.opportunity_id as string,
      amount: parseFloat(row.amount as string),
      probability: row.probability as number,
      closeDate: row.close_date as Date,
      stageName: row.stage_name as string,
      forecastCategory: row.forecast_category as ForecastCategory,
      snapshotDate: row.snapshot_date as Date,
      createdAt: row.created_at as Date,
      createdBy: row.created_by as string,
      updatedAt: row.updated_at as Date,
      updatedBy: row.updated_by as string,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
      opportunityName: row.opportunity_name as string | undefined,
    };
  }

  private mapAdjustmentFromDb(row: Record<string, unknown>): ForecastAdjustment {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      forecastId: row.forecast_id as string,
      adjustedBy: row.adjusted_by as string,
      adjustmentType: row.adjustment_type as ForecastAdjustment["adjustmentType"],
      originalAmount: parseFloat(row.original_amount as string),
      adjustedAmount: parseFloat(row.adjusted_amount as string),
      adjustmentReason: row.adjustment_reason as string | undefined,
      createdAt: row.created_at as Date,
      createdBy: row.created_by as string,
      updatedAt: row.updated_at as Date,
      updatedBy: row.updated_by as string,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
      adjustedByName: row.adjusted_by_name as string | undefined,
    };
  }

  // ==================== Forecast CRUD ====================

  async findById(tenantId: string, id: string): Promise<Forecast | null> {
    const sql = `
      SELECT ${this.getSelectColumns()},
             u.display_name AS owner_name,
             fp.name AS period_name
      FROM ${this.tableName} f
      LEFT JOIN users u ON f.tenant_id = u.tenant_id AND f.owner_id = u.id
      LEFT JOIN forecast_periods fp ON f.tenant_id = fp.tenant_id AND f.period_id = fp.id
      WHERE f.tenant_id = $1 AND f.id = $2 AND f.is_deleted = false
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapForecastFromDb(result.rows[0]) : null;
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<Forecast> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError(this.tableName, id);
    }
    return record;
  }

  async list(
    tenantId: string,
    params: ForecastListParams = {}
  ): Promise<PaginatedResponse<Forecast>> {
    const {
      limit = 50,
      cursor,
      orderBy = "created_at",
      orderDir = "DESC",
      filters = {},
    } = params;

    const conditions: string[] = ["f.tenant_id = $1", "f.is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (cursor) {
      conditions.push(`f.created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    if (filters.ownerId) {
      conditions.push(`f.owner_id = $${paramIndex}`);
      values.push(filters.ownerId);
      paramIndex++;
    }

    if (filters.periodId) {
      conditions.push(`f.period_id = $${paramIndex}`);
      values.push(filters.periodId);
      paramIndex++;
    }

    if (filters.forecastCategory) {
      conditions.push(`f.forecast_category = $${paramIndex}`);
      values.push(filters.forecastCategory);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `SELECT COUNT(*) FROM ${this.tableName} f WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT ${this.getSelectColumns()},
             u.display_name AS owner_name,
             fp.name AS period_name
      FROM ${this.tableName} f
      LEFT JOIN users u ON f.tenant_id = u.tenant_id AND f.owner_id = u.id
      LEFT JOIN forecast_periods fp ON f.tenant_id = fp.tenant_id AND f.period_id = fp.id
      WHERE ${whereClause}
      ORDER BY f.${orderBy} ${orderDir}
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<Record<string, unknown>>(sql, values);
    const records = result.rows.slice(0, limit).map((r) => this.mapForecastFromDb(r));
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
    data: CreateForecastInput
  ): Promise<Forecast> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO ${this.tableName} (
        tenant_id, id, owner_id, period_id, forecast_category, amount, quantity,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      tenantId,
      id,
      data.ownerId,
      data.periodId,
      data.forecastCategory,
      data.amount,
      data.quantity || null,
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
    data: UpdateForecastInput,
    etag?: string
  ): Promise<Forecast> {
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

      if (data.amount !== undefined) {
        updates.push(`amount = $${paramIndex}`);
        values.push(data.amount);
        paramIndex++;
      }

      if (data.quantity !== undefined) {
        updates.push(`quantity = $${paramIndex}`);
        values.push(data.quantity);
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

  // ==================== Forecast Items ====================

  async getItems(tenantId: string, forecastId: string): Promise<ForecastItem[]> {
    const sql = `
      SELECT fi.*, o.name AS opportunity_name
      FROM ${this.itemsTable} fi
      LEFT JOIN opportunities o ON fi.tenant_id = o.tenant_id AND fi.opportunity_id = o.id
      WHERE fi.tenant_id = $1 AND fi.forecast_id = $2 AND fi.is_deleted = false
      ORDER BY fi.amount DESC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, forecastId]);
    return result.rows.map((r) => this.mapItemFromDb(r));
  }

  async addItem(
    tenantId: string,
    userId: string,
    data: CreateForecastItemInput
  ): Promise<ForecastItem> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO ${this.itemsTable} (
        tenant_id, id, forecast_id, opportunity_id, amount, probability,
        close_date, stage_name, forecast_category, snapshot_date,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      tenantId,
      id,
      data.forecastId,
      data.opportunityId,
      data.amount,
      data.probability,
      data.closeDate,
      data.stageName,
      data.forecastCategory,
      now,
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ];

    const result = await query<Record<string, unknown>>(sql, values);
    return this.mapItemFromDb(result.rows[0]);
  }

  async removeItem(tenantId: string, userId: string, itemId: string): Promise<void> {
    const sql = `
      UPDATE ${this.itemsTable}
      SET is_deleted = true, updated_at = $3, updated_by = $4
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, itemId, new Date(), userId]);

    if (result.rowCount === 0) {
      throw new NotFoundError(this.itemsTable, itemId);
    }
  }

  // ==================== Forecast Adjustments ====================

  async getAdjustments(tenantId: string, forecastId: string): Promise<ForecastAdjustment[]> {
    const sql = `
      SELECT fa.*, u.display_name AS adjusted_by_name
      FROM ${this.adjustmentsTable} fa
      LEFT JOIN users u ON fa.tenant_id = u.tenant_id AND fa.adjusted_by = u.id
      WHERE fa.tenant_id = $1 AND fa.forecast_id = $2 AND fa.is_deleted = false
      ORDER BY fa.created_at DESC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, forecastId]);
    return result.rows.map((r) => this.mapAdjustmentFromDb(r));
  }

  async addAdjustment(
    tenantId: string,
    userId: string,
    data: CreateForecastAdjustmentInput
  ): Promise<ForecastAdjustment> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO ${this.adjustmentsTable} (
        tenant_id, id, forecast_id, adjusted_by, adjustment_type,
        original_amount, adjusted_amount, adjustment_reason,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      tenantId,
      id,
      data.forecastId,
      userId,
      data.adjustmentType,
      data.originalAmount,
      data.adjustedAmount,
      data.adjustmentReason || null,
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ];

    const result = await query<Record<string, unknown>>(sql, values);
    return this.mapAdjustmentFromDb(result.rows[0]);
  }

  // ==================== Custom Methods ====================

  async findByOwnerAndPeriod(
    tenantId: string,
    ownerId: string,
    periodId: string,
    forecastCategory?: ForecastCategory
  ): Promise<Forecast[]> {
    const conditions = [
      "f.tenant_id = $1",
      "f.owner_id = $2",
      "f.period_id = $3",
      "f.is_deleted = false",
    ];
    const values: unknown[] = [tenantId, ownerId, periodId];

    if (forecastCategory) {
      conditions.push("f.forecast_category = $4");
      values.push(forecastCategory);
    }

    const sql = `
      SELECT ${this.getSelectColumns()},
             u.display_name AS owner_name,
             fp.name AS period_name
      FROM ${this.tableName} f
      LEFT JOIN users u ON f.tenant_id = u.tenant_id AND f.owner_id = u.id
      LEFT JOIN forecast_periods fp ON f.tenant_id = fp.tenant_id AND f.period_id = fp.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY f.forecast_category
    `;
    const result = await query<Record<string, unknown>>(sql, values);
    return result.rows.map((r) => this.mapForecastFromDb(r));
  }

  async calculateFromOpportunities(
    tenantId: string,
    userId: string,
    periodId: string
  ): Promise<Forecast[]> {
    // Get period date range
    const periodSql = `
      SELECT start_date, end_date FROM forecast_periods
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const periodResult = await query<{ start_date: Date; end_date: Date }>(
      periodSql,
      [tenantId, periodId]
    );

    if (periodResult.rows.length === 0) {
      throw new NotFoundError("forecast_periods", periodId);
    }

    const { start_date, end_date } = periodResult.rows[0];

    // Get opportunities grouped by owner and forecast category
    const oppSql = `
      SELECT
        owner_id,
        CASE
          WHEN probability = 100 THEN 'Closed'
          WHEN probability >= 71 THEN 'Commit'
          WHEN probability >= 31 THEN 'BestCase'
          ELSE 'Pipeline'
        END AS forecast_category,
        SUM(COALESCE(amount, 0)) AS total_amount,
        SUM(1) AS total_quantity
      FROM opportunities
      WHERE tenant_id = $1
        AND is_deleted = false
        AND close_date >= $2
        AND close_date <= $3
      GROUP BY owner_id, forecast_category
    `;
    const oppResult = await query<{
      owner_id: string;
      forecast_category: ForecastCategory;
      total_amount: string;
      total_quantity: string;
    }>(oppSql, [tenantId, start_date, end_date]);

    const createdForecasts: Forecast[] = [];

    for (const row of oppResult.rows) {
      // Check if forecast already exists
      const existing = await this.findByOwnerAndPeriod(
        tenantId,
        row.owner_id,
        periodId,
        row.forecast_category
      );

      if (existing.length > 0) {
        // Update existing forecast
        const updated = await this.update(tenantId, userId, existing[0].id, {
          amount: parseFloat(row.total_amount),
          quantity: parseFloat(row.total_quantity),
        });
        createdForecasts.push(updated);
      } else {
        // Create new forecast
        const created = await this.create(tenantId, userId, {
          ownerId: row.owner_id,
          periodId,
          forecastCategory: row.forecast_category,
          amount: parseFloat(row.total_amount),
          quantity: parseFloat(row.total_quantity),
        });
        createdForecasts.push(created);
      }
    }

    return createdForecasts;
  }

  async getSummaryByPeriod(tenantId: string, periodId: string): Promise<ForecastSummary> {
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

    // Get totals by category
    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN forecast_category = 'Pipeline' THEN amount ELSE 0 END), 0) AS total_pipeline,
        COALESCE(SUM(CASE WHEN forecast_category = 'BestCase' THEN amount ELSE 0 END), 0) AS total_best_case,
        COALESCE(SUM(CASE WHEN forecast_category = 'Commit' THEN amount ELSE 0 END), 0) AS total_commit,
        COALESCE(SUM(CASE WHEN forecast_category = 'Closed' THEN amount ELSE 0 END), 0) AS total_closed,
        COALESCE(SUM(amount), 0) AS grand_total
      FROM ${this.tableName}
      WHERE tenant_id = $1 AND period_id = $2 AND is_deleted = false
    `;
    const result = await query<{
      total_pipeline: string;
      total_best_case: string;
      total_commit: string;
      total_closed: string;
      grand_total: string;
    }>(sql, [tenantId, periodId]);

    const row = result.rows[0];
    return {
      periodId,
      periodName,
      totalPipeline: parseFloat(row.total_pipeline),
      totalBestCase: parseFloat(row.total_best_case),
      totalCommit: parseFloat(row.total_commit),
      totalClosed: parseFloat(row.total_closed),
      grandTotal: parseFloat(row.grand_total),
    };
  }

  async listByPeriod(tenantId: string, periodId: string): Promise<Forecast[]> {
    const sql = `
      SELECT ${this.getSelectColumns()},
             u.display_name AS owner_name,
             fp.name AS period_name
      FROM ${this.tableName} f
      LEFT JOIN users u ON f.tenant_id = u.tenant_id AND f.owner_id = u.id
      LEFT JOIN forecast_periods fp ON f.tenant_id = fp.tenant_id AND f.period_id = fp.id
      WHERE f.tenant_id = $1 AND f.period_id = $2 AND f.is_deleted = false
      ORDER BY f.amount DESC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, periodId]);
    return result.rows.map((r) => this.mapForecastFromDb(r));
  }

  async listByOwner(tenantId: string, ownerId: string): Promise<Forecast[]> {
    const sql = `
      SELECT ${this.getSelectColumns()},
             u.display_name AS owner_name,
             fp.name AS period_name
      FROM ${this.tableName} f
      LEFT JOIN users u ON f.tenant_id = u.tenant_id AND f.owner_id = u.id
      LEFT JOIN forecast_periods fp ON f.tenant_id = fp.tenant_id AND f.period_id = fp.id
      WHERE f.tenant_id = $1 AND f.owner_id = $2 AND f.is_deleted = false
      ORDER BY fp.start_date DESC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, ownerId]);
    return result.rows.map((r) => this.mapForecastFromDb(r));
  }
}

export const forecastRepository = new ForecastRepository();
