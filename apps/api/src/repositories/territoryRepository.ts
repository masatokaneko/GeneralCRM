import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ConflictError, ValidationError } from "../middleware/errorHandler.js";
import type { PaginatedResponse } from "../types/index.js";

// Territory Types
export interface Territory {
  id: string;
  tenantId: string;
  name: string;
  parentTerritoryId?: string;
  parentTerritoryName?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  userCount?: number;
  accountCount?: number;
  children?: Territory[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

export interface TerritoryUserAssignment {
  id: string;
  tenantId: string;
  territoryId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  accessLevel: "Read" | "ReadWrite";
  createdAt: Date;
  createdBy: string;
  isDeleted: boolean;
}

export interface TerritoryAccountAssignment {
  id: string;
  tenantId: string;
  territoryId: string;
  accountId: string;
  accountName?: string;
  assignmentType: "Manual" | "RuleBased";
  assignmentRuleId?: string;
  createdAt: Date;
  createdBy: string;
  isDeleted: boolean;
}

export interface TerritoryCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number;
  orderIndex: number;
}

export interface TerritoryAssignmentRule {
  id: string;
  tenantId: string;
  territoryId: string;
  name: string;
  isActive: boolean;
  conditions: TerritoryCondition[];
  filterLogic?: string;
  priority: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

interface ListOptions {
  view?: "tree" | "list";
  parentId?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

const TERRITORY_COLUMNS = [
  "id",
  "tenant_id",
  "name",
  "parent_territory_id",
  "description",
  "is_active",
  "sort_order",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "is_deleted",
  "system_modstamp",
];

function mapTerritoryFromDb(row: Record<string, unknown>): Territory {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    name: row.name as string,
    parentTerritoryId: row.parent_territory_id as string | undefined,
    parentTerritoryName: row.parent_territory_name as string | undefined,
    description: row.description as string | undefined,
    isActive: row.is_active as boolean,
    sortOrder: row.sort_order as number,
    userCount: row.user_count as number | undefined,
    accountCount: row.account_count as number | undefined,
    createdAt: row.created_at as Date,
    createdBy: row.created_by as string,
    updatedAt: row.updated_at as Date,
    updatedBy: row.updated_by as string,
    isDeleted: row.is_deleted as boolean,
    systemModstamp: row.system_modstamp as string,
  };
}

function mapUserAssignmentFromDb(row: Record<string, unknown>): TerritoryUserAssignment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    territoryId: row.territory_id as string,
    userId: row.user_id as string,
    userName: row.user_name as string | undefined,
    userEmail: row.user_email as string | undefined,
    accessLevel: row.access_level as "Read" | "ReadWrite",
    createdAt: row.created_at as Date,
    createdBy: row.created_by as string,
    isDeleted: row.is_deleted as boolean,
  };
}

function mapAccountAssignmentFromDb(row: Record<string, unknown>): TerritoryAccountAssignment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    territoryId: row.territory_id as string,
    accountId: row.account_id as string,
    accountName: row.account_name as string | undefined,
    assignmentType: row.assignment_type as "Manual" | "RuleBased",
    assignmentRuleId: row.assignment_rule_id as string | undefined,
    createdAt: row.created_at as Date,
    createdBy: row.created_by as string,
    isDeleted: row.is_deleted as boolean,
  };
}

function mapRuleFromDb(row: Record<string, unknown>): TerritoryAssignmentRule {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    territoryId: row.territory_id as string,
    name: row.name as string,
    isActive: row.is_active as boolean,
    conditions: (row.conditions as TerritoryCondition[]) || [],
    filterLogic: row.filter_logic as string | undefined,
    priority: row.priority as number,
    createdAt: row.created_at as Date,
    createdBy: row.created_by as string,
    updatedAt: row.updated_at as Date,
    updatedBy: row.updated_by as string,
    isDeleted: row.is_deleted as boolean,
    systemModstamp: row.system_modstamp as string,
  };
}

export const territoryRepository = {
  // ===== Territory CRUD =====

  async findById(tenantId: string, id: string): Promise<Territory | null> {
    const sql = `
      SELECT t.*,
             pt.name as parent_territory_name,
             (SELECT COUNT(*) FROM territory_user_assignments WHERE territory_id = t.id AND is_deleted = false) as user_count,
             (SELECT COUNT(*) FROM territory_account_assignments WHERE territory_id = t.id AND is_deleted = false) as account_count
      FROM territories t
      LEFT JOIN territories pt ON t.parent_territory_id = pt.id
      WHERE t.tenant_id = $1 AND t.id = $2 AND t.is_deleted = false
    `;
    const result = await query(sql, [tenantId, id]);
    return result.rows[0] ? mapTerritoryFromDb(result.rows[0]) : null;
  },

  async findByIdOrThrow(tenantId: string, id: string): Promise<Territory> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError("territories", id);
    }
    return record;
  },

  async findAll(
    tenantId: string,
    options: ListOptions = {}
  ): Promise<PaginatedResponse<Territory>> {
    const { view = "list", parentId, search, limit = 50, cursor } = options;

    if (view === "tree") {
      // Return hierarchical tree structure
      const territories = await this.buildTree(tenantId, search);
      return {
        records: territories,
        totalSize: territories.length,
      };
    }

    // Flat list
    const conditions: string[] = ["t.tenant_id = $1", "t.is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (parentId !== undefined) {
      if (parentId === "") {
        conditions.push("t.parent_territory_id IS NULL");
      } else {
        conditions.push(`t.parent_territory_id = $${paramIndex}`);
        values.push(parentId);
        paramIndex++;
      }
    }

    if (search) {
      conditions.push(`(t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`t.created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const countSql = `SELECT COUNT(*) FROM territories t WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Get records with counts
    const sql = `
      SELECT t.*,
             pt.name as parent_territory_name,
             (SELECT COUNT(*) FROM territory_user_assignments WHERE territory_id = t.id AND is_deleted = false) as user_count,
             (SELECT COUNT(*) FROM territory_account_assignments WHERE territory_id = t.id AND is_deleted = false) as account_count
      FROM territories t
      LEFT JOIN territories pt ON t.parent_territory_id = pt.id
      WHERE ${whereClause}
      ORDER BY t.sort_order, t.name
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query(sql, values);
    const records = result.rows.slice(0, limit).map(mapTerritoryFromDb);
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore ? records[records.length - 1].createdAt.toISOString() : undefined,
    };
  },

  async buildTree(tenantId: string, search?: string): Promise<Territory[]> {
    let searchCondition = "";
    const values: unknown[] = [tenantId];

    if (search) {
      searchCondition = ` AND (t.name ILIKE $2 OR t.description ILIKE $2)`;
      values.push(`%${search}%`);
    }

    const sql = `
      SELECT t.*,
             pt.name as parent_territory_name,
             (SELECT COUNT(*) FROM territory_user_assignments WHERE territory_id = t.id AND is_deleted = false) as user_count,
             (SELECT COUNT(*) FROM territory_account_assignments WHERE territory_id = t.id AND is_deleted = false) as account_count
      FROM territories t
      LEFT JOIN territories pt ON t.parent_territory_id = pt.id
      WHERE t.tenant_id = $1 AND t.is_deleted = false${searchCondition}
      ORDER BY t.sort_order, t.name
    `;

    const result = await query(sql, values);
    const territories = result.rows.map(mapTerritoryFromDb);

    // Build tree structure
    const territoryMap = new Map<string, Territory>();
    territories.forEach((t) => {
      t.children = [];
      territoryMap.set(t.id, t);
    });

    const roots: Territory[] = [];
    territories.forEach((t) => {
      if (t.parentTerritoryId && territoryMap.has(t.parentTerritoryId)) {
        territoryMap.get(t.parentTerritoryId)!.children!.push(t);
      } else {
        roots.push(t);
      }
    });

    return roots;
  },

  async create(tenantId: string, userId: string, data: Partial<Territory>): Promise<Territory> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO territories (
        id, tenant_id, name, parent_territory_id, description, is_active, sort_order,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      RETURNING ${TERRITORY_COLUMNS.join(", ")}
    `;

    const values = [
      id,
      tenantId,
      data.name,
      data.parentTerritoryId || null,
      data.description || null,
      data.isActive ?? true,
      data.sortOrder ?? 0,
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ];

    const result = await query(sql, values);
    return mapTerritoryFromDb(result.rows[0]);
  },

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<Territory>,
    etag?: string
  ): Promise<Territory> {
    return transaction(async (client) => {
      const checkSql = `
        SELECT system_modstamp FROM territories
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError("territories", id);
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
      if (data.parentTerritoryId !== undefined) {
        updates.push(`parent_territory_id = $${paramIndex++}`);
        values.push(data.parentTerritoryId || null);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
      }
      if (data.sortOrder !== undefined) {
        updates.push(`sort_order = $${paramIndex++}`);
        values.push(data.sortOrder);
      }

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(now);
      updates.push(`updated_by = $${paramIndex++}`);
      values.push(userId);
      updates.push(`system_modstamp = $${paramIndex++}`);
      values.push(newModstamp);

      const sql = `
        UPDATE territories
        SET ${updates.join(", ")}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING ${TERRITORY_COLUMNS.join(", ")}
      `;

      const result = await client.query(sql, values);
      return mapTerritoryFromDb(result.rows[0]);
    });
  },

  async delete(tenantId: string, userId: string, id: string): Promise<void> {
    // Check for children
    const childrenSql = `
      SELECT COUNT(*) FROM territories
      WHERE tenant_id = $1 AND parent_territory_id = $2 AND is_deleted = false
    `;
    const childrenResult = await query<{ count: string }>(childrenSql, [tenantId, id]);
    const childCount = parseInt(childrenResult.rows[0].count, 10);

    if (childCount > 0) {
      throw new ValidationError([
        { field: "id", message: "Cannot delete territory with child territories" },
      ]);
    }

    const sql = `
      UPDATE territories
      SET is_deleted = true, updated_at = $3, updated_by = $4
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, id, new Date(), userId]);

    if (result.rowCount === 0) {
      throw new NotFoundError("territories", id);
    }
  },

  // ===== User Assignments =====

  async getUserAssignments(tenantId: string, territoryId: string): Promise<TerritoryUserAssignment[]> {
    const sql = `
      SELECT tua.*,
             COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
             u.email as user_email
      FROM territory_user_assignments tua
      LEFT JOIN users u ON tua.user_id = u.id
      WHERE tua.tenant_id = $1 AND tua.territory_id = $2 AND tua.is_deleted = false
      ORDER BY user_name
    `;
    const result = await query(sql, [tenantId, territoryId]);
    return result.rows.map(mapUserAssignmentFromDb);
  },

  async addUserAssignment(
    tenantId: string,
    userId: string,
    territoryId: string,
    data: { userId: string; accessLevel?: "Read" | "ReadWrite" }
  ): Promise<TerritoryUserAssignment> {
    const id = uuidv4();
    const now = new Date();

    const sql = `
      INSERT INTO territory_user_assignments (
        id, tenant_id, territory_id, user_id, access_level, created_at, created_by, is_deleted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tenant_id, territory_id, user_id)
      DO UPDATE SET is_deleted = false, access_level = EXCLUDED.access_level
      RETURNING id, tenant_id, territory_id, user_id, access_level, created_at, created_by, is_deleted
    `;

    const result = await query(sql, [
      id,
      tenantId,
      territoryId,
      data.userId,
      data.accessLevel || "Read",
      now,
      userId,
      false,
    ]);

    // Get with user info
    const fetchSql = `
      SELECT tua.*,
             COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
             u.email as user_email
      FROM territory_user_assignments tua
      LEFT JOIN users u ON tua.user_id = u.id
      WHERE tua.id = $1
    `;
    const fetchResult = await query(fetchSql, [result.rows[0].id]);
    return mapUserAssignmentFromDb(fetchResult.rows[0]);
  },

  async removeUserAssignment(tenantId: string, assignmentId: string): Promise<void> {
    const sql = `
      UPDATE territory_user_assignments
      SET is_deleted = true
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, assignmentId]);

    if (result.rowCount === 0) {
      throw new NotFoundError("territory_user_assignments", assignmentId);
    }
  },

  // ===== Account Assignments =====

  async getAccountAssignments(tenantId: string, territoryId: string): Promise<TerritoryAccountAssignment[]> {
    const sql = `
      SELECT taa.*, a.name as account_name
      FROM territory_account_assignments taa
      LEFT JOIN accounts a ON taa.account_id = a.id
      WHERE taa.tenant_id = $1 AND taa.territory_id = $2 AND taa.is_deleted = false
      ORDER BY account_name
    `;
    const result = await query(sql, [tenantId, territoryId]);
    return result.rows.map(mapAccountAssignmentFromDb);
  },

  async addAccountAssignment(
    tenantId: string,
    userId: string,
    territoryId: string,
    data: { accountId: string; assignmentType?: "Manual" | "RuleBased"; assignmentRuleId?: string }
  ): Promise<TerritoryAccountAssignment> {
    const id = uuidv4();
    const now = new Date();

    const sql = `
      INSERT INTO territory_account_assignments (
        id, tenant_id, territory_id, account_id, assignment_type, assignment_rule_id,
        created_at, created_by, is_deleted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tenant_id, territory_id, account_id)
      DO UPDATE SET is_deleted = false, assignment_type = EXCLUDED.assignment_type
      RETURNING id, tenant_id, territory_id, account_id, assignment_type, assignment_rule_id, created_at, created_by, is_deleted
    `;

    const result = await query(sql, [
      id,
      tenantId,
      territoryId,
      data.accountId,
      data.assignmentType || "Manual",
      data.assignmentRuleId || null,
      now,
      userId,
      false,
    ]);

    // Get with account info
    const fetchSql = `
      SELECT taa.*, a.name as account_name
      FROM territory_account_assignments taa
      LEFT JOIN accounts a ON taa.account_id = a.id
      WHERE taa.id = $1
    `;
    const fetchResult = await query(fetchSql, [result.rows[0].id]);
    return mapAccountAssignmentFromDb(fetchResult.rows[0]);
  },

  async removeAccountAssignment(tenantId: string, assignmentId: string): Promise<void> {
    const sql = `
      UPDATE territory_account_assignments
      SET is_deleted = true
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, assignmentId]);

    if (result.rowCount === 0) {
      throw new NotFoundError("territory_account_assignments", assignmentId);
    }
  },

  // ===== Assignment Rules =====

  async getRules(tenantId: string, territoryId: string): Promise<TerritoryAssignmentRule[]> {
    const sql = `
      SELECT * FROM territory_assignment_rules
      WHERE tenant_id = $1 AND territory_id = $2 AND is_deleted = false
      ORDER BY priority DESC, name
    `;
    const result = await query(sql, [tenantId, territoryId]);
    return result.rows.map(mapRuleFromDb);
  },

  async createRule(
    tenantId: string,
    userId: string,
    territoryId: string,
    data: Partial<TerritoryAssignmentRule>
  ): Promise<TerritoryAssignmentRule> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO territory_assignment_rules (
        id, tenant_id, territory_id, name, is_active, conditions, filter_logic, priority,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const result = await query(sql, [
      id,
      tenantId,
      territoryId,
      data.name,
      data.isActive ?? true,
      JSON.stringify(data.conditions || []),
      data.filterLogic || null,
      data.priority ?? 0,
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ]);

    return mapRuleFromDb(result.rows[0]);
  },

  async updateRule(
    tenantId: string,
    userId: string,
    territoryId: string,
    ruleId: string,
    data: Partial<TerritoryAssignmentRule>
  ): Promise<TerritoryAssignmentRule> {
    const now = new Date();
    const newModstamp = uuidv4();

    const updates: string[] = [];
    const values: unknown[] = [tenantId, territoryId, ruleId];
    let paramIndex = 4;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }
    if (data.conditions !== undefined) {
      updates.push(`conditions = $${paramIndex++}`);
      values.push(JSON.stringify(data.conditions));
    }
    if (data.filterLogic !== undefined) {
      updates.push(`filter_logic = $${paramIndex++}`);
      values.push(data.filterLogic);
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
      UPDATE territory_assignment_rules
      SET ${updates.join(", ")}
      WHERE tenant_id = $1 AND territory_id = $2 AND id = $3 AND is_deleted = false
      RETURNING *
    `;

    const result = await query(sql, values);
    if (result.rows.length === 0) {
      throw new NotFoundError("territory_assignment_rules", ruleId);
    }

    return mapRuleFromDb(result.rows[0]);
  },

  async deleteRule(tenantId: string, userId: string, territoryId: string, ruleId: string): Promise<void> {
    const sql = `
      UPDATE territory_assignment_rules
      SET is_deleted = true, updated_at = $4, updated_by = $5
      WHERE tenant_id = $1 AND territory_id = $2 AND id = $3 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, territoryId, ruleId, new Date(), userId]);

    if (result.rowCount === 0) {
      throw new NotFoundError("territory_assignment_rules", ruleId);
    }
  },

  async runRules(
    tenantId: string,
    userId: string,
    territoryId: string
  ): Promise<{ matched: number; assigned: number }> {
    // Get active rules for this territory
    const rules = await this.getRules(tenantId, territoryId);
    const activeRules = rules.filter((r) => r.isActive);

    if (activeRules.length === 0) {
      return { matched: 0, assigned: 0 };
    }

    // For now, return placeholder - actual implementation would evaluate conditions
    // against accounts and assign matching ones
    return { matched: 0, assigned: 0 };
  },

  // ===== Available Users =====

  async getAvailableUsers(tenantId: string): Promise<Array<{ id: string; name: string; email: string }>> {
    const sql = `
      SELECT id, COALESCE(first_name || ' ' || last_name, email) as name, email
      FROM users
      WHERE tenant_id = $1 AND is_deleted = false
      ORDER BY first_name, last_name
      LIMIT 100
    `;
    const result = await query<{ id: string; name: string; email: string }>(sql, [tenantId]);
    return result.rows;
  },

  // ===== Closure Table Operations =====

  async rebuildClosure(tenantId: string, territoryId: string): Promise<void> {
    return transaction(async (client) => {
      // Get the territory
      const territorySql = `
        SELECT id, parent_territory_id FROM territories
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      `;
      const territoryResult = await client.query(territorySql, [tenantId, territoryId]);

      if (territoryResult.rows.length === 0) {
        throw new NotFoundError("territories", territoryId);
      }

      const territory = territoryResult.rows[0];

      // Delete existing closure entries for this territory as descendant
      await client.query(
        `DELETE FROM territory_closure WHERE tenant_id = $1 AND descendant_id = $2`,
        [tenantId, territoryId]
      );

      // Add self-reference (depth 0)
      await client.query(
        `INSERT INTO territory_closure (tenant_id, ancestor_id, descendant_id, depth) VALUES ($1, $2, $2, 0)`,
        [tenantId, territoryId]
      );

      // If has parent, copy parent's ancestors and add parent relationship
      if (territory.parent_territory_id) {
        // Copy all ancestors of parent + parent itself
        const copySql = `
          INSERT INTO territory_closure (tenant_id, ancestor_id, descendant_id, depth)
          SELECT tenant_id, ancestor_id, $2, depth + 1
          FROM territory_closure
          WHERE tenant_id = $1 AND descendant_id = $3
        `;
        await client.query(copySql, [tenantId, territoryId, territory.parent_territory_id]);
      }

      // Rebuild closure for all descendants recursively
      const descendantsSql = `
        SELECT id FROM territories
        WHERE tenant_id = $1 AND parent_territory_id = $2 AND is_deleted = false
      `;
      const descendantsResult = await client.query(descendantsSql, [tenantId, territoryId]);

      for (const descendant of descendantsResult.rows) {
        // Recursively rebuild - but we need to do this carefully
        // For now, just update direct children
        await client.query(
          `DELETE FROM territory_closure WHERE tenant_id = $1 AND descendant_id = $2`,
          [tenantId, descendant.id]
        );

        // Add self-reference
        await client.query(
          `INSERT INTO territory_closure (tenant_id, ancestor_id, descendant_id, depth) VALUES ($1, $2, $2, 0)`,
          [tenantId, descendant.id]
        );

        // Copy ancestors from current territory
        const copyDescSql = `
          INSERT INTO territory_closure (tenant_id, ancestor_id, descendant_id, depth)
          SELECT tenant_id, ancestor_id, $2, depth + 1
          FROM territory_closure
          WHERE tenant_id = $1 AND descendant_id = $3
        `;
        await client.query(copyDescSql, [tenantId, descendant.id, territoryId]);
      }
    });
  },

  async getAncestors(tenantId: string, territoryId: string): Promise<Territory[]> {
    const sql = `
      SELECT t.*,
             pt.name as parent_territory_name,
             tc.depth
      FROM territory_closure tc
      JOIN territories t ON tc.ancestor_id = t.id
      LEFT JOIN territories pt ON t.parent_territory_id = pt.id
      WHERE tc.tenant_id = $1 AND tc.descendant_id = $2 AND tc.depth > 0 AND t.is_deleted = false
      ORDER BY tc.depth DESC
    `;
    const result = await query(sql, [tenantId, territoryId]);
    return result.rows.map((row) => ({
      ...mapTerritoryFromDb(row),
      depth: row.depth as number,
    }));
  },

  async getDescendants(tenantId: string, territoryId: string): Promise<Territory[]> {
    const sql = `
      SELECT t.*,
             pt.name as parent_territory_name,
             tc.depth
      FROM territory_closure tc
      JOIN territories t ON tc.descendant_id = t.id
      LEFT JOIN territories pt ON t.parent_territory_id = pt.id
      WHERE tc.tenant_id = $1 AND tc.ancestor_id = $2 AND tc.depth > 0 AND t.is_deleted = false
      ORDER BY tc.depth, t.sort_order, t.name
    `;
    const result = await query(sql, [tenantId, territoryId]);
    return result.rows.map((row) => ({
      ...mapTerritoryFromDb(row),
      depth: row.depth as number,
    }));
  },

  async getSubtree(tenantId: string, territoryId: string): Promise<Territory[]> {
    // Include self and all descendants
    const sql = `
      SELECT t.*,
             pt.name as parent_territory_name,
             tc.depth,
             (SELECT COUNT(*) FROM territory_user_assignments WHERE territory_id = t.id AND is_deleted = false) as user_count,
             (SELECT COUNT(*) FROM territory_account_assignments WHERE territory_id = t.id AND is_deleted = false) as account_count
      FROM territory_closure tc
      JOIN territories t ON tc.descendant_id = t.id
      LEFT JOIN territories pt ON t.parent_territory_id = pt.id
      WHERE tc.tenant_id = $1 AND tc.ancestor_id = $2 AND t.is_deleted = false
      ORDER BY tc.depth, t.sort_order, t.name
    `;
    const result = await query(sql, [tenantId, territoryId]);
    return result.rows.map((row) => ({
      ...mapTerritoryFromDb(row),
      depth: row.depth as number,
    }));
  },

  // ===== Model-based queries =====

  async findByModel(tenantId: string, modelId: string): Promise<Territory[]> {
    const sql = `
      SELECT t.*,
             pt.name as parent_territory_name,
             (SELECT COUNT(*) FROM territory_user_assignments WHERE territory_id = t.id AND is_deleted = false) as user_count,
             (SELECT COUNT(*) FROM territory_account_assignments WHERE territory_id = t.id AND is_deleted = false) as account_count
      FROM territories t
      LEFT JOIN territories pt ON t.parent_territory_id = pt.id
      WHERE t.tenant_id = $1 AND t.model_id = $2 AND t.is_deleted = false
      ORDER BY t.sort_order, t.name
    `;
    const result = await query(sql, [tenantId, modelId]);
    return result.rows.map(mapTerritoryFromDb);
  },

  async updateModel(
    tenantId: string,
    userId: string,
    territoryId: string,
    modelId: string | null
  ): Promise<Territory> {
    const now = new Date();
    const newModstamp = uuidv4();

    const sql = `
      UPDATE territories
      SET model_id = $3, updated_at = $4, updated_by = $5, system_modstamp = $6
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      RETURNING ${TERRITORY_COLUMNS.join(", ")}
    `;

    const result = await query(sql, [tenantId, territoryId, modelId, now, userId, newModstamp]);

    if (result.rows.length === 0) {
      throw new NotFoundError("territories", territoryId);
    }

    return mapTerritoryFromDb(result.rows[0]);
  },

  async updateType(
    tenantId: string,
    userId: string,
    territoryId: string,
    typeId: string | null
  ): Promise<Territory> {
    const now = new Date();
    const newModstamp = uuidv4();

    const sql = `
      UPDATE territories
      SET territory_type_id = $3, updated_at = $4, updated_by = $5, system_modstamp = $6
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      RETURNING ${TERRITORY_COLUMNS.join(", ")}
    `;

    const result = await query(sql, [tenantId, territoryId, typeId, now, userId, newModstamp]);

    if (result.rows.length === 0) {
      throw new NotFoundError("territories", territoryId);
    }

    return mapTerritoryFromDb(result.rows[0]);
  },
};
