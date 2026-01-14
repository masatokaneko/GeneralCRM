import { v4 as uuidv4 } from "uuid";
import { BaseRepository } from "./baseRepository.js";
import { query } from "../db/connection.js";
import type { PricebookEntry, PaginatedResponse } from "../types/index.js";
import type { ListParams } from "./baseRepository.js";

export class PricebookEntryRepository extends BaseRepository<PricebookEntry> {
  protected tableName = "pricebook_entries";
  protected columns = [
    "id",
    "tenant_id",
    "pricebook_id",
    "product_id",
    "unit_price",
    "is_active",
    "use_standard_price",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "is_deleted",
    "system_modstamp",
  ];

  async create(
    tenantId: string,
    userId: string,
    data: Partial<PricebookEntry>
  ): Promise<PricebookEntry> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const record = {
      ...data,
      id,
      tenantId,
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
      isDeleted: false,
      systemModstamp,
    };

    const dbRecord = this.mapToDb(record as PricebookEntry);
    const keys = Object.keys(dbRecord);
    const values = Object.values(dbRecord);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      INSERT INTO ${this.tableName} (${keys.join(", ")})
      VALUES (${placeholders})
      RETURNING ${this.getSelectColumns()}
    `;

    const result = await query<PricebookEntry>(sql, values);
    return this.mapFromDb(result.rows[0]);
  }

  async listWithDetails(
    tenantId: string,
    params: ListParams = {}
  ): Promise<PaginatedResponse<PricebookEntry>> {
    const { limit = 50, cursor, filters = {} } = params;

    const conditions: string[] = [
      "pe.tenant_id = $1",
      "pe.is_deleted = false",
    ];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (cursor) {
      conditions.push(`pe.created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    if (filters.pricebookId) {
      conditions.push(`pe.pricebook_id = $${paramIndex}`);
      values.push(filters.pricebookId);
      paramIndex++;
    }

    if (filters.productId) {
      conditions.push(`pe.product_id = $${paramIndex}`);
      values.push(filters.productId);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `
      SELECT COUNT(*)
      FROM ${this.tableName} pe
      WHERE ${whereClause}
    `;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT
        pe.id,
        pe.tenant_id,
        pe.pricebook_id,
        pe.product_id,
        pe.unit_price,
        pe.is_active,
        pe.use_standard_price,
        pe.created_at,
        pe.created_by,
        pe.updated_at,
        pe.updated_by,
        pe.is_deleted,
        pe.system_modstamp,
        p.name as product_name,
        pb.name as pricebook_name
      FROM ${this.tableName} pe
      LEFT JOIN products p ON pe.product_id = p.id AND p.is_deleted = false
      LEFT JOIN pricebooks pb ON pe.pricebook_id = pb.id AND pb.is_deleted = false
      WHERE ${whereClause}
      ORDER BY pe.created_at DESC
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<PricebookEntry>(sql, values);
    const records = result.rows.slice(0, limit);
    const hasMore = result.rows.length > limit;

    return {
      records: records.map((r) => this.mapFromDb(r)),
      totalSize,
      nextCursor: hasMore
        ? records[records.length - 1].createdAt.toISOString()
        : undefined,
    };
  }

  async findByPricebookAndProduct(
    tenantId: string,
    pricebookId: string,
    productId: string
  ): Promise<PricebookEntry | null> {
    const sql = `
      SELECT ${this.getSelectColumns()}
      FROM ${this.tableName}
      WHERE tenant_id = $1
        AND pricebook_id = $2
        AND product_id = $3
        AND is_deleted = false
    `;
    const result = await query<PricebookEntry>(sql, [
      tenantId,
      pricebookId,
      productId,
    ]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }
}

export const pricebookEntryRepository = new PricebookEntryRepository();
