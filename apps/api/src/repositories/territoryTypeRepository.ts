import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ConflictError, ValidationError } from "../middleware/errorHandler.js";
import type {
  TerritoryType,
  CreateTerritoryTypeInput,
  UpdateTerritoryTypeInput,
  PaginatedResponse,
  ListOptions,
} from "../types/index.js";

const COLUMNS = [
  "id",
  "tenant_id",
  "name",
  "description",
  "priority",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "is_deleted",
  "system_modstamp",
];

function mapFromDb(row: Record<string, unknown>): TerritoryType {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    priority: row.priority as number,
    createdAt: row.created_at as Date,
    createdBy: row.created_by as string,
    updatedAt: row.updated_at as Date,
    updatedBy: row.updated_by as string,
    isDeleted: row.is_deleted as boolean,
    systemModstamp: row.system_modstamp as string,
  };
}

export const territoryTypeRepository = {
  async findById(tenantId: string, id: string): Promise<TerritoryType | null> {
    const sql = `
      SELECT ${COLUMNS.join(", ")}
      FROM territory_types
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, id]);
    return result.rows[0] ? mapFromDb(result.rows[0]) : null;
  },

  async findByIdOrThrow(tenantId: string, id: string): Promise<TerritoryType> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError("territory_types", id);
    }
    return record;
  },

  async list(
    tenantId: string,
    options: ListOptions = {}
  ): Promise<PaginatedResponse<TerritoryType>> {
    const { limit = 50, cursor, orderBy = "priority", orderDir = "ASC", filters = {} } = options;

    const conditions: string[] = ["tenant_id = $1", "is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    // Search
    if (filters.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Cursor pagination
    if (cursor) {
      conditions.push(`created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Count query
    const countSql = `SELECT COUNT(*) FROM territory_types WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Main query
    const allowedOrderBy = ["created_at", "name", "priority"];
    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : "priority";
    const safeOrderDir = orderDir === "DESC" ? "DESC" : "ASC";

    const sql = `
      SELECT ${COLUMNS.join(", ")}
      FROM territory_types
      WHERE ${whereClause}
      ORDER BY ${safeOrderBy} ${safeOrderDir}, name
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

  async findByPriority(tenantId: string): Promise<TerritoryType[]> {
    const sql = `
      SELECT ${COLUMNS.join(", ")}
      FROM territory_types
      WHERE tenant_id = $1 AND is_deleted = false
      ORDER BY priority ASC, name
    `;
    const result = await query(sql, [tenantId]);
    return result.rows.map(mapFromDb);
  },

  async create(
    tenantId: string,
    userId: string,
    data: CreateTerritoryTypeInput
  ): Promise<TerritoryType> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO territory_types (
        id, tenant_id, name, description, priority,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING ${COLUMNS.join(", ")}
    `;

    const values = [
      id,
      tenantId,
      data.name,
      data.description || null,
      data.priority ?? 0,
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
    data: UpdateTerritoryTypeInput,
    etag?: string
  ): Promise<TerritoryType> {
    return transaction(async (client) => {
      const checkSql = `
        SELECT system_modstamp FROM territory_types
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError("territory_types", id);
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
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        values.push(data.priority);
      }

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(now);
      updates.push(`updated_by = $${paramIndex++}`);
      values.push(userId);
      updates.push(`system_modstamp = $${paramIndex++}`);
      values.push(newModstamp);

      const sql = `
        UPDATE territory_types
        SET ${updates.join(", ")}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING ${COLUMNS.join(", ")}
      `;

      const result = await client.query(sql, values);
      return mapFromDb(result.rows[0]);
    });
  },

  async delete(tenantId: string, userId: string, id: string): Promise<void> {
    return transaction(async (client) => {
      // Check for territories using this type
      const territorySql = `
        SELECT COUNT(*) FROM territories
        WHERE tenant_id = $1 AND territory_type_id = $2 AND is_deleted = false
      `;
      const territoryResult = await client.query<{ count: string }>(territorySql, [tenantId, id]);
      const territoryCount = parseInt(territoryResult.rows[0].count, 10);

      if (territoryCount > 0) {
        throw new ValidationError([
          { field: "id", message: `Cannot delete type with ${territoryCount} associated territories` },
        ]);
      }

      const sql = `
        UPDATE territory_types
        SET is_deleted = true, updated_at = $3, updated_by = $4
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      `;
      const result = await client.query(sql, [tenantId, id, new Date(), userId]);

      if (result.rowCount === 0) {
        throw new NotFoundError("territory_types", id);
      }
    });
  },
};
