import { db } from "../db/index.js";
import type {
  PermissionSet,
  CreatePermissionSetInput,
  UpdatePermissionSetInput,
  PermissionSetObjectPermission,
  PermissionSetFieldPermission,
  UserPermissionSet,
} from "../types/index.js";

export const permissionSetRepository = {
  async findById(tenantId: string, id: string): Promise<PermissionSet | null> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        name,
        description,
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM permission_sets
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, id]
    );
    return result.rows[0] || null;
  },

  async findAll(
    tenantId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<PermissionSet[]> {
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
        description,
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM permission_sets
      WHERE ${conditions.join(" AND ")}
      ORDER BY name`,
      params
    );
    return result.rows;
  },

  async findByName(tenantId: string, name: string): Promise<PermissionSet | null> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        name,
        description,
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM permission_sets
      WHERE tenant_id = $1 AND name = $2 AND is_deleted = false`,
      [tenantId, name]
    );
    return result.rows[0] || null;
  },

  async create(
    tenantId: string,
    data: CreatePermissionSetInput,
    userId: string
  ): Promise<PermissionSet> {
    const result = await db.query(
      `INSERT INTO permission_sets (
        tenant_id,
        name,
        description,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        description,
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
        data.description || null,
        data.isActive ?? true,
        userId,
      ]
    );
    return result.rows[0];
  },

  async update(
    tenantId: string,
    id: string,
    data: UpdatePermissionSetInput,
    userId: string,
    etag?: string
  ): Promise<PermissionSet | null> {
    const updates: string[] = [];
    const params: unknown[] = [tenantId, id];
    let paramIndex = 3;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
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
      `UPDATE permission_sets
      SET ${updates.join(", ")}
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false${etagCondition}
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        description,
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
    // Remove all user assignments first
    await db.query(
      `DELETE FROM user_permission_sets
      WHERE tenant_id = $1 AND permission_set_id = $2`,
      [tenantId, id]
    );

    const result = await db.query(
      `UPDATE permission_sets
      SET is_deleted = true, updated_at = NOW(), updated_by = $3
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // User Permission Set Assignments
  async getUserPermissionSets(
    tenantId: string,
    userId: string
  ): Promise<PermissionSet[]> {
    const result = await db.query(
      `SELECT
        ps.id,
        ps.tenant_id as "tenantId",
        ps.name,
        ps.description,
        ps.is_active as "isActive",
        ps.created_at as "createdAt",
        ps.created_by as "createdBy",
        ps.updated_at as "updatedAt",
        ps.updated_by as "updatedBy",
        ps.is_deleted as "isDeleted",
        ps.system_modstamp as "systemModstamp"
      FROM permission_sets ps
      JOIN user_permission_sets ups ON ps.id = ups.permission_set_id
      WHERE ups.tenant_id = $1 AND ups.user_id = $2 AND ps.is_deleted = false AND ps.is_active = true
      ORDER BY ps.name`,
      [tenantId, userId]
    );
    return result.rows;
  },

  async getPermissionSetUsers(
    tenantId: string,
    permissionSetId: string
  ) {
    const result = await db.query(
      `SELECT
        u.id,
        u.tenant_id as "tenantId",
        u.username,
        u.email,
        u.display_name as "displayName",
        u.is_active as "isActive",
        ups.created_at as "assignedAt"
      FROM users u
      JOIN user_permission_sets ups ON u.id = ups.user_id
      WHERE ups.tenant_id = $1 AND ups.permission_set_id = $2 AND u.is_deleted = false
      ORDER BY u.display_name`,
      [tenantId, permissionSetId]
    );
    return result.rows;
  },

  async assignUserToPermissionSet(
    tenantId: string,
    userId: string,
    permissionSetId: string,
    assignedBy: string
  ): Promise<UserPermissionSet> {
    const result = await db.query(
      `INSERT INTO user_permission_sets (
        tenant_id,
        user_id,
        permission_set_id,
        created_by
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (tenant_id, user_id, permission_set_id) DO NOTHING
      RETURNING
        id,
        tenant_id as "tenantId",
        user_id as "userId",
        permission_set_id as "permissionSetId",
        created_at as "createdAt",
        created_by as "createdBy"`,
      [tenantId, userId, permissionSetId, assignedBy]
    );

    if (result.rows.length === 0) {
      // Already assigned, fetch existing
      const existing = await db.query(
        `SELECT
          id,
          tenant_id as "tenantId",
          user_id as "userId",
          permission_set_id as "permissionSetId",
          created_at as "createdAt",
          created_by as "createdBy"
        FROM user_permission_sets
        WHERE tenant_id = $1 AND user_id = $2 AND permission_set_id = $3`,
        [tenantId, userId, permissionSetId]
      );
      return existing.rows[0];
    }
    return result.rows[0];
  },

  async removeUserFromPermissionSet(
    tenantId: string,
    userId: string,
    permissionSetId: string
  ): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM user_permission_sets
      WHERE tenant_id = $1 AND user_id = $2 AND permission_set_id = $3`,
      [tenantId, userId, permissionSetId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // Object Permissions
  async getObjectPermissions(
    tenantId: string,
    permissionSetId: string
  ): Promise<PermissionSetObjectPermission[]> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        permission_set_id as "permissionSetId",
        object_name as "objectName",
        can_create as "canCreate",
        can_read as "canRead",
        can_update as "canUpdate",
        can_delete as "canDelete",
        view_all as "viewAll",
        modify_all as "modifyAll",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM permission_set_object_permissions
      WHERE tenant_id = $1 AND permission_set_id = $2
      ORDER BY object_name`,
      [tenantId, permissionSetId]
    );
    return result.rows;
  },

  async upsertObjectPermission(
    tenantId: string,
    permissionSetId: string,
    objectName: string,
    permissions: {
      canCreate?: boolean;
      canRead?: boolean;
      canUpdate?: boolean;
      canDelete?: boolean;
      viewAll?: boolean;
      modifyAll?: boolean;
    },
    userId: string
  ): Promise<PermissionSetObjectPermission> {
    const result = await db.query(
      `INSERT INTO permission_set_object_permissions (
        tenant_id,
        permission_set_id,
        object_name,
        can_create,
        can_read,
        can_update,
        can_delete,
        view_all,
        modify_all,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      ON CONFLICT (tenant_id, permission_set_id, object_name)
      DO UPDATE SET
        can_create = COALESCE($4, permission_set_object_permissions.can_create),
        can_read = COALESCE($5, permission_set_object_permissions.can_read),
        can_update = COALESCE($6, permission_set_object_permissions.can_update),
        can_delete = COALESCE($7, permission_set_object_permissions.can_delete),
        view_all = COALESCE($8, permission_set_object_permissions.view_all),
        modify_all = COALESCE($9, permission_set_object_permissions.modify_all),
        updated_at = NOW(),
        updated_by = $10
      RETURNING
        id,
        tenant_id as "tenantId",
        permission_set_id as "permissionSetId",
        object_name as "objectName",
        can_create as "canCreate",
        can_read as "canRead",
        can_update as "canUpdate",
        can_delete as "canDelete",
        view_all as "viewAll",
        modify_all as "modifyAll",
        created_at as "createdAt",
        updated_at as "updatedAt"`,
      [
        tenantId,
        permissionSetId,
        objectName,
        permissions.canCreate ?? false,
        permissions.canRead ?? false,
        permissions.canUpdate ?? false,
        permissions.canDelete ?? false,
        permissions.viewAll ?? false,
        permissions.modifyAll ?? false,
        userId,
      ]
    );
    return result.rows[0];
  },

  async bulkUpsertObjectPermissions(
    tenantId: string,
    permissionSetId: string,
    permissions: Array<{
      objectName: string;
      canCreate: boolean;
      canRead: boolean;
      canUpdate: boolean;
      canDelete: boolean;
      viewAll: boolean;
      modifyAll: boolean;
    }>,
    userId: string
  ): Promise<PermissionSetObjectPermission[]> {
    const results: PermissionSetObjectPermission[] = [];
    for (const perm of permissions) {
      const result = await this.upsertObjectPermission(
        tenantId,
        permissionSetId,
        perm.objectName,
        {
          canCreate: perm.canCreate,
          canRead: perm.canRead,
          canUpdate: perm.canUpdate,
          canDelete: perm.canDelete,
          viewAll: perm.viewAll,
          modifyAll: perm.modifyAll,
        },
        userId
      );
      results.push(result);
    }
    return results;
  },

  // Field Permissions
  async getFieldPermissions(
    tenantId: string,
    permissionSetId: string,
    objectName?: string
  ): Promise<PermissionSetFieldPermission[]> {
    const conditions = ["tenant_id = $1", "permission_set_id = $2"];
    const params: unknown[] = [tenantId, permissionSetId];

    if (objectName) {
      conditions.push("object_name = $3");
      params.push(objectName);
    }

    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        permission_set_id as "permissionSetId",
        object_name as "objectName",
        field_name as "fieldName",
        is_readable as "isReadable",
        is_editable as "isEditable",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM permission_set_field_permissions
      WHERE ${conditions.join(" AND ")}
      ORDER BY object_name, field_name`,
      params
    );
    return result.rows;
  },

  async upsertFieldPermission(
    tenantId: string,
    permissionSetId: string,
    objectName: string,
    fieldName: string,
    permissions: {
      isReadable?: boolean;
      isEditable?: boolean;
    },
    userId: string
  ): Promise<PermissionSetFieldPermission> {
    const result = await db.query(
      `INSERT INTO permission_set_field_permissions (
        tenant_id,
        permission_set_id,
        object_name,
        field_name,
        is_readable,
        is_editable,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      ON CONFLICT (tenant_id, permission_set_id, object_name, field_name)
      DO UPDATE SET
        is_readable = COALESCE($5, permission_set_field_permissions.is_readable),
        is_editable = COALESCE($6, permission_set_field_permissions.is_editable),
        updated_at = NOW(),
        updated_by = $7
      RETURNING
        id,
        tenant_id as "tenantId",
        permission_set_id as "permissionSetId",
        object_name as "objectName",
        field_name as "fieldName",
        is_readable as "isReadable",
        is_editable as "isEditable",
        created_at as "createdAt",
        updated_at as "updatedAt"`,
      [
        tenantId,
        permissionSetId,
        objectName,
        fieldName,
        permissions.isReadable ?? true,
        permissions.isEditable ?? false,
        userId,
      ]
    );
    return result.rows[0];
  },

  // Get effective permissions for a user (profile + all assigned permission sets)
  async getUserEffectiveObjectPermissions(
    tenantId: string,
    userId: string,
    objectName: string
  ): Promise<{
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    viewAll: boolean;
    modifyAll: boolean;
  }> {
    // Get profile permissions
    const profilePerms = await db.query(
      `SELECT
        can_create,
        can_read,
        can_update,
        can_delete,
        view_all,
        modify_all
      FROM profile_object_permissions pop
      JOIN users u ON u.profile_id = pop.profile_id
      WHERE u.tenant_id = $1 AND u.id = $2 AND pop.object_name = $3 AND u.is_deleted = false`,
      [tenantId, userId, objectName]
    );

    // Get permission set permissions
    const psPerms = await db.query(
      `SELECT
        psop.can_create,
        psop.can_read,
        psop.can_update,
        psop.can_delete,
        psop.view_all,
        psop.modify_all
      FROM permission_set_object_permissions psop
      JOIN user_permission_sets ups ON psop.permission_set_id = ups.permission_set_id
      JOIN permission_sets ps ON ps.id = psop.permission_set_id
      WHERE ups.tenant_id = $1 AND ups.user_id = $2 AND psop.object_name = $3
        AND ps.is_active = true AND ps.is_deleted = false`,
      [tenantId, userId, objectName]
    );

    // Combine permissions (OR logic - if any source grants permission, user has it)
    const allPerms = [...profilePerms.rows, ...psPerms.rows];

    return {
      canCreate: allPerms.some(p => p.can_create),
      canRead: allPerms.some(p => p.can_read),
      canUpdate: allPerms.some(p => p.can_update),
      canDelete: allPerms.some(p => p.can_delete),
      viewAll: allPerms.some(p => p.view_all),
      modifyAll: allPerms.some(p => p.modify_all),
    };
  },
};
