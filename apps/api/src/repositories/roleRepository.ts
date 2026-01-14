import { db } from "../db/index.js";
import type { Role, CreateRoleInput, UpdateRoleInput } from "../types/index.js";

export const roleRepository = {
  async findById(tenantId: string, id: string): Promise<Role | null> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        name,
        parent_role_id as "parentRoleId",
        description,
        sort_order as "sortOrder",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM roles
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, id]
    );
    return result.rows[0] || null;
  },

  async findAll(
    tenantId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<Role[]> {
    const conditions = ["tenant_id = $1", "is_deleted = false"];
    const params: unknown[] = [tenantId];

    if (options.activeOnly) {
      conditions.push("is_active = true");
    }

    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        name,
        parent_role_id as "parentRoleId",
        description,
        sort_order as "sortOrder",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM roles
      WHERE ${conditions.join(" AND ")}
      ORDER BY sort_order, name`,
      params
    );
    return result.rows;
  },

  async findByParent(tenantId: string, parentRoleId: string | null): Promise<Role[]> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        name,
        parent_role_id as "parentRoleId",
        description,
        sort_order as "sortOrder",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM roles
      WHERE tenant_id = $1 AND is_deleted = false
        AND ${parentRoleId ? "parent_role_id = $2" : "parent_role_id IS NULL"}
      ORDER BY sort_order, name`,
      parentRoleId ? [tenantId, parentRoleId] : [tenantId]
    );
    return result.rows;
  },

  async getHierarchy(tenantId: string): Promise<Role[]> {
    // Returns all roles in a format suitable for building a tree
    const result = await db.query(
      `WITH RECURSIVE role_tree AS (
        SELECT
          id,
          tenant_id,
          name,
          parent_role_id,
          description,
          sort_order,
          is_active,
          created_at,
          created_by,
          updated_at,
          updated_by,
          is_deleted,
          system_modstamp,
          0 as level,
          ARRAY[sort_order, id] as path
        FROM roles
        WHERE tenant_id = $1 AND parent_role_id IS NULL AND is_deleted = false

        UNION ALL

        SELECT
          r.id,
          r.tenant_id,
          r.name,
          r.parent_role_id,
          r.description,
          r.sort_order,
          r.is_active,
          r.created_at,
          r.created_by,
          r.updated_at,
          r.updated_by,
          r.is_deleted,
          r.system_modstamp,
          rt.level + 1,
          rt.path || ARRAY[r.sort_order, r.id]
        FROM roles r
        INNER JOIN role_tree rt ON r.parent_role_id = rt.id
        WHERE r.tenant_id = $1 AND r.is_deleted = false
      )
      SELECT
        id,
        tenant_id as "tenantId",
        name,
        parent_role_id as "parentRoleId",
        description,
        sort_order as "sortOrder",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp",
        level
      FROM role_tree
      ORDER BY path`,
      [tenantId]
    );
    return result.rows;
  },

  async getDescendants(tenantId: string, roleId: string): Promise<Role[]> {
    const result = await db.query(
      `SELECT
        r.id,
        r.tenant_id as "tenantId",
        r.name,
        r.parent_role_id as "parentRoleId",
        r.description,
        r.sort_order as "sortOrder",
        r.is_active as "isActive",
        r.created_at as "createdAt",
        r.created_by as "createdBy",
        r.updated_at as "updatedAt",
        r.updated_by as "updatedBy",
        r.is_deleted as "isDeleted",
        r.system_modstamp as "systemModstamp",
        d.depth
      FROM get_role_descendants($1, $2) d
      JOIN roles r ON r.id = d.role_id
      WHERE d.depth > 0
      ORDER BY d.depth, r.sort_order, r.name`,
      [tenantId, roleId]
    );
    return result.rows;
  },

  async getAncestors(tenantId: string, roleId: string): Promise<Role[]> {
    const result = await db.query(
      `SELECT
        r.id,
        r.tenant_id as "tenantId",
        r.name,
        r.parent_role_id as "parentRoleId",
        r.description,
        r.sort_order as "sortOrder",
        r.is_active as "isActive",
        r.created_at as "createdAt",
        r.created_by as "createdBy",
        r.updated_at as "updatedAt",
        r.updated_by as "updatedBy",
        r.is_deleted as "isDeleted",
        r.system_modstamp as "systemModstamp",
        a.depth
      FROM get_role_ancestors($1, $2) a
      JOIN roles r ON r.id = a.role_id
      WHERE a.depth > 0
      ORDER BY a.depth DESC`,
      [tenantId, roleId]
    );
    return result.rows;
  },

  async getUsersInRole(tenantId: string, roleId: string) {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        username,
        email,
        display_name as "displayName",
        role_id as "roleId",
        is_active as "isActive"
      FROM users
      WHERE tenant_id = $1 AND role_id = $2 AND is_deleted = false
      ORDER BY display_name`,
      [tenantId, roleId]
    );
    return result.rows;
  },

  async create(tenantId: string, data: CreateRoleInput, userId: string): Promise<Role> {
    const result = await db.query(
      `INSERT INTO roles (
        tenant_id,
        name,
        parent_role_id,
        description,
        sort_order,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        parent_role_id as "parentRoleId",
        description,
        sort_order as "sortOrder",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"`,
      [
        tenantId,
        data.name,
        data.parentRoleId || null,
        data.description || null,
        data.sortOrder || 0,
        data.isActive ?? true,
        userId,
      ]
    );
    return result.rows[0];
  },

  async update(
    tenantId: string,
    id: string,
    data: UpdateRoleInput,
    userId: string,
    etag?: string
  ): Promise<Role | null> {
    // Build update fields
    const updates: string[] = [];
    const params: unknown[] = [tenantId, id];
    let paramIndex = 3;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.parentRoleId !== undefined) {
      updates.push(`parent_role_id = $${paramIndex++}`);
      params.push(data.parentRoleId);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      params.push(data.sortOrder);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(data.isActive);
    }

    if (updates.length === 0) {
      return this.findById(tenantId, id);
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramIndex++}`);
    params.push(userId);
    updates.push(`system_modstamp = uuid_generate_v4()`);

    let etagCondition = "";
    if (etag) {
      etagCondition = ` AND system_modstamp = $${paramIndex++}`;
      params.push(etag);
    }

    const result = await db.query(
      `UPDATE roles
      SET ${updates.join(", ")}
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false${etagCondition}
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        parent_role_id as "parentRoleId",
        description,
        sort_order as "sortOrder",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"`,
      params
    );
    return result.rows[0] || null;
  },

  async delete(tenantId: string, id: string, userId: string): Promise<boolean> {
    // Check if role has users assigned
    const usersCheck = await db.query(
      `SELECT COUNT(*) as count FROM users
      WHERE tenant_id = $1 AND role_id = $2 AND is_deleted = false`,
      [tenantId, id]
    );
    if (parseInt(usersCheck.rows[0].count) > 0) {
      throw new Error("Cannot delete role with assigned users");
    }

    // Check if role has child roles
    const childCheck = await db.query(
      `SELECT COUNT(*) as count FROM roles
      WHERE tenant_id = $1 AND parent_role_id = $2 AND is_deleted = false`,
      [tenantId, id]
    );
    if (parseInt(childCheck.rows[0].count) > 0) {
      throw new Error("Cannot delete role with child roles");
    }

    const result = await db.query(
      `UPDATE roles
      SET is_deleted = true, updated_at = NOW(), updated_by = $3
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async validateHierarchy(tenantId: string, roleId: string, newParentId: string | null): Promise<boolean> {
    if (!newParentId) return true; // Setting to root is always valid

    // Check if newParentId would create a cycle
    const descendants = await this.getDescendants(tenantId, roleId);
    const descendantIds = descendants.map((r) => r.id);

    if (descendantIds.includes(newParentId)) {
      return false; // Would create cycle
    }

    return true;
  },
};
