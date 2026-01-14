import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ConflictError, ValidationError } from "../middleware/errorHandler.js";
import type {
  TerritoryModel,
  TerritoryModelState,
  CreateTerritoryModelInput,
  UpdateTerritoryModelInput,
  PaginatedResponse,
  ListOptions,
} from "../types/index.js";

const COLUMNS = [
  "id",
  "tenant_id",
  "name",
  "description",
  "state",
  "activated_at",
  "archived_at",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "is_deleted",
  "system_modstamp",
];

function mapFromDb(row: Record<string, unknown>): TerritoryModel {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    state: row.state as TerritoryModelState,
    activatedAt: row.activated_at as Date | undefined,
    archivedAt: row.archived_at as Date | undefined,
    createdAt: row.created_at as Date,
    createdBy: row.created_by as string,
    updatedAt: row.updated_at as Date,
    updatedBy: row.updated_by as string,
    isDeleted: row.is_deleted as boolean,
    systemModstamp: row.system_modstamp as string,
    territoryCount: row.territory_count as number | undefined,
  };
}

export const territoryModelRepository = {
  async findById(tenantId: string, id: string): Promise<TerritoryModel | null> {
    const sql = `
      SELECT tm.*,
             (SELECT COUNT(*) FROM territories WHERE model_id = tm.id AND is_deleted = false) as territory_count
      FROM territory_models tm
      WHERE tm.tenant_id = $1 AND tm.id = $2 AND tm.is_deleted = false
    `;
    const result = await query(sql, [tenantId, id]);
    return result.rows[0] ? mapFromDb(result.rows[0]) : null;
  },

  async findByIdOrThrow(tenantId: string, id: string): Promise<TerritoryModel> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError("territory_models", id);
    }
    return record;
  },

  async findActive(tenantId: string): Promise<TerritoryModel | null> {
    const sql = `
      SELECT tm.*,
             (SELECT COUNT(*) FROM territories WHERE model_id = tm.id AND is_deleted = false) as territory_count
      FROM territory_models tm
      WHERE tm.tenant_id = $1 AND tm.state = 'Active' AND tm.is_deleted = false
    `;
    const result = await query(sql, [tenantId]);
    return result.rows[0] ? mapFromDb(result.rows[0]) : null;
  },

  async list(
    tenantId: string,
    options: ListOptions = {}
  ): Promise<PaginatedResponse<TerritoryModel>> {
    const { limit = 50, cursor, orderBy = "created_at", orderDir = "DESC", filters = {} } = options;

    const conditions: string[] = ["tm.tenant_id = $1", "tm.is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    // Filter by state
    if (filters.state) {
      conditions.push(`tm.state = $${paramIndex}`);
      values.push(filters.state);
      paramIndex++;
    }

    // Search
    if (filters.search) {
      conditions.push(`(tm.name ILIKE $${paramIndex} OR tm.description ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Cursor pagination
    if (cursor) {
      conditions.push(`tm.created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Count query
    const countSql = `SELECT COUNT(*) FROM territory_models tm WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Main query
    const allowedOrderBy = ["created_at", "name", "state", "activated_at"];
    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : "created_at";
    const safeOrderDir = orderDir === "ASC" ? "ASC" : "DESC";

    const sql = `
      SELECT tm.*,
             (SELECT COUNT(*) FROM territories WHERE model_id = tm.id AND is_deleted = false) as territory_count
      FROM territory_models tm
      WHERE ${whereClause}
      ORDER BY tm.${safeOrderBy} ${safeOrderDir}
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
    data: CreateTerritoryModelInput
  ): Promise<TerritoryModel> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO territory_models (
        id, tenant_id, name, description, state,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING ${COLUMNS.join(", ")}
    `;

    const values = [
      id,
      tenantId,
      data.name,
      data.description || null,
      "Planning", // Always start in Planning state
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
    data: UpdateTerritoryModelInput,
    etag?: string
  ): Promise<TerritoryModel> {
    return transaction(async (client) => {
      const checkSql = `
        SELECT state, system_modstamp FROM territory_models
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError("territory_models", id);
      }

      if (etag && checkResult.rows[0].system_modstamp !== etag) {
        throw new ConflictError("Record was modified by another user");
      }

      // Cannot update Archived models
      if (checkResult.rows[0].state === "Archived") {
        throw new ValidationError([
          { field: "state", message: "Cannot update an archived territory model" },
        ]);
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

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(now);
      updates.push(`updated_by = $${paramIndex++}`);
      values.push(userId);
      updates.push(`system_modstamp = $${paramIndex++}`);
      values.push(newModstamp);

      const sql = `
        UPDATE territory_models
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
      // Check model state
      const checkSql = `
        SELECT state FROM territory_models
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError("territory_models", id);
      }

      // Cannot delete Active model
      if (checkResult.rows[0].state === "Active") {
        throw new ValidationError([
          { field: "state", message: "Cannot delete an active territory model. Archive it first." },
        ]);
      }

      // Check for territories using this model
      const territorySql = `
        SELECT COUNT(*) FROM territories
        WHERE tenant_id = $1 AND model_id = $2 AND is_deleted = false
      `;
      const territoryResult = await client.query<{ count: string }>(territorySql, [tenantId, id]);
      const territoryCount = parseInt(territoryResult.rows[0].count, 10);

      if (territoryCount > 0) {
        throw new ValidationError([
          { field: "id", message: `Cannot delete model with ${territoryCount} associated territories` },
        ]);
      }

      const sql = `
        UPDATE territory_models
        SET is_deleted = true, updated_at = $3, updated_by = $4
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      `;
      await client.query(sql, [tenantId, id, new Date(), userId]);
    });
  },

  // State transitions
  async activate(tenantId: string, userId: string, id: string): Promise<TerritoryModel> {
    return transaction(async (client) => {
      // Get current model
      const checkSql = `
        SELECT state FROM territory_models
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError("territory_models", id);
      }

      if (checkResult.rows[0].state !== "Planning") {
        throw new ValidationError([
          { field: "state", message: "Only models in Planning state can be activated" },
        ]);
      }

      const now = new Date();
      const newModstamp = uuidv4();

      // Archive currently active model (if any)
      const archiveSql = `
        UPDATE territory_models
        SET state = 'Archived', archived_at = $2, updated_at = $2, updated_by = $3, system_modstamp = $4
        WHERE tenant_id = $1 AND state = 'Active' AND is_deleted = false
      `;
      await client.query(archiveSql, [tenantId, now, userId, uuidv4()]);

      // Activate the new model
      const activateSql = `
        UPDATE territory_models
        SET state = 'Active', activated_at = $3, updated_at = $3, updated_by = $4, system_modstamp = $5
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING ${COLUMNS.join(", ")}
      `;
      const result = await client.query(activateSql, [tenantId, id, now, userId, newModstamp]);
      return mapFromDb(result.rows[0]);
    });
  },

  async archive(tenantId: string, userId: string, id: string): Promise<TerritoryModel> {
    return transaction(async (client) => {
      const checkSql = `
        SELECT state FROM territory_models
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError("territory_models", id);
      }

      if (checkResult.rows[0].state === "Archived") {
        throw new ValidationError([
          { field: "state", message: "Model is already archived" },
        ]);
      }

      const now = new Date();
      const newModstamp = uuidv4();

      const sql = `
        UPDATE territory_models
        SET state = 'Archived', archived_at = $3, updated_at = $3, updated_by = $4, system_modstamp = $5
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING ${COLUMNS.join(", ")}
      `;
      const result = await client.query(sql, [tenantId, id, now, userId, newModstamp]);
      return mapFromDb(result.rows[0]);
    });
  },

  async clone(
    tenantId: string,
    userId: string,
    sourceId: string,
    newName: string
  ): Promise<TerritoryModel> {
    return transaction(async (client) => {
      // Get source model
      const sourceSql = `
        SELECT * FROM territory_models
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      `;
      const sourceResult = await client.query(sourceSql, [tenantId, sourceId]);

      if (sourceResult.rows.length === 0) {
        throw new NotFoundError("territory_models", sourceId);
      }

      const source = sourceResult.rows[0];
      const newId = uuidv4();
      const now = new Date();
      const systemModstamp = uuidv4();

      // Create new model in Planning state
      const createSql = `
        INSERT INTO territory_models (
          id, tenant_id, name, description, state,
          created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
        ) VALUES ($1, $2, $3, $4, 'Planning', $5, $6, $7, $8, false, $9)
        RETURNING ${COLUMNS.join(", ")}
      `;

      const result = await client.query(createSql, [
        newId,
        tenantId,
        newName,
        source.description,
        now,
        userId,
        now,
        userId,
        systemModstamp,
      ]);

      // Clone territories if source has any
      const territoriesSql = `
        SELECT * FROM territories
        WHERE tenant_id = $1 AND model_id = $2 AND is_deleted = false
        ORDER BY parent_territory_id NULLS FIRST
      `;
      const territoriesResult = await client.query(territoriesSql, [tenantId, sourceId]);

      if (territoriesResult.rows.length > 0) {
        const idMap = new Map<string, string>();

        for (const territory of territoriesResult.rows) {
          const newTerritoryId = uuidv4();
          idMap.set(territory.id, newTerritoryId);

          const newParentId = territory.parent_territory_id
            ? idMap.get(territory.parent_territory_id)
            : null;

          const cloneSql = `
            INSERT INTO territories (
              id, tenant_id, name, parent_territory_id, model_id, territory_type_id,
              description, is_active, sort_order,
              created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, $14)
          `;
          await client.query(cloneSql, [
            newTerritoryId,
            tenantId,
            territory.name,
            newParentId,
            newId,
            territory.territory_type_id,
            territory.description,
            territory.is_active,
            territory.sort_order,
            now,
            userId,
            now,
            userId,
            uuidv4(),
          ]);

          // Also add to closure table (self-reference)
          await client.query(
            `INSERT INTO territory_closure (tenant_id, ancestor_id, descendant_id, depth) VALUES ($1, $2, $2, 0)`,
            [tenantId, newTerritoryId]
          );

          // Add parent relationship if exists
          if (newParentId) {
            await client.query(
              `INSERT INTO territory_closure (tenant_id, ancestor_id, descendant_id, depth) VALUES ($1, $2, $3, 1)`,
              [tenantId, newParentId, newTerritoryId]
            );
          }
        }
      }

      return mapFromDb(result.rows[0]);
    });
  },
};
