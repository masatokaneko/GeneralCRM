import { db } from "../db/index.js";
import type {
  PermissionProfile,
  CreatePermissionProfileInput,
  UpdatePermissionProfileInput,
  ProfileObjectPermission,
  ProfileFieldPermission,
} from "../types/index.js";

export const permissionProfileRepository = {
  async findById(tenantId: string, id: string): Promise<PermissionProfile | null> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        name,
        description,
        is_system as "isSystem",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM permission_profiles
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, id]
    );
    return result.rows[0] || null;
  },

  async findAll(
    tenantId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<PermissionProfile[]> {
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
        is_system as "isSystem",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM permission_profiles
      WHERE ${conditions.join(" AND ")}
      ORDER BY is_system DESC, name`,
      params
    );
    return result.rows;
  },

  async findByName(tenantId: string, name: string): Promise<PermissionProfile | null> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        name,
        description,
        is_system as "isSystem",
        is_active as "isActive",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM permission_profiles
      WHERE tenant_id = $1 AND name = $2 AND is_deleted = false`,
      [tenantId, name]
    );
    return result.rows[0] || null;
  },

  async create(
    tenantId: string,
    data: CreatePermissionProfileInput,
    userId: string
  ): Promise<PermissionProfile> {
    const result = await db.query(
      `INSERT INTO permission_profiles (
        tenant_id,
        name,
        description,
        is_system,
        is_active,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        description,
        is_system as "isSystem",
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
        data.isSystem ?? false,
        data.isActive ?? true,
        userId,
      ]
    );
    return result.rows[0];
  },

  async update(
    tenantId: string,
    id: string,
    data: UpdatePermissionProfileInput,
    userId: string,
    etag?: string
  ): Promise<PermissionProfile | null> {
    // Check if system profile
    const existing = await this.findById(tenantId, id);
    if (existing?.isSystem && data.name !== undefined) {
      throw new Error("Cannot rename system profile");
    }

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
      `UPDATE permission_profiles
      SET ${updates.join(", ")}
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false${etagCondition}
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        description,
        is_system as "isSystem",
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
    // Check if system profile
    const existing = await this.findById(tenantId, id);
    if (existing?.isSystem) {
      throw new Error("Cannot delete system profile");
    }

    // Check if profile has users assigned
    const usersCheck = await db.query(
      `SELECT COUNT(*) as count FROM users
      WHERE tenant_id = $1 AND profile_id = $2 AND is_deleted = false`,
      [tenantId, id]
    );
    if (parseInt(usersCheck.rows[0].count) > 0) {
      throw new Error("Cannot delete profile with assigned users");
    }

    const result = await db.query(
      `UPDATE permission_profiles
      SET is_deleted = true, updated_at = NOW(), updated_by = $3
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // Object Permissions
  async getObjectPermissions(
    tenantId: string,
    profileId: string
  ): Promise<ProfileObjectPermission[]> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        profile_id as "profileId",
        object_name as "objectName",
        can_create as "canCreate",
        can_read as "canRead",
        can_update as "canUpdate",
        can_delete as "canDelete",
        view_all as "viewAll",
        modify_all as "modifyAll",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM profile_object_permissions
      WHERE tenant_id = $1 AND profile_id = $2
      ORDER BY object_name`,
      [tenantId, profileId]
    );
    return result.rows;
  },

  async getObjectPermission(
    tenantId: string,
    profileId: string,
    objectName: string
  ): Promise<ProfileObjectPermission | null> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        profile_id as "profileId",
        object_name as "objectName",
        can_create as "canCreate",
        can_read as "canRead",
        can_update as "canUpdate",
        can_delete as "canDelete",
        view_all as "viewAll",
        modify_all as "modifyAll",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM profile_object_permissions
      WHERE tenant_id = $1 AND profile_id = $2 AND object_name = $3`,
      [tenantId, profileId, objectName]
    );
    return result.rows[0] || null;
  },

  async upsertObjectPermission(
    tenantId: string,
    profileId: string,
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
  ): Promise<ProfileObjectPermission> {
    const result = await db.query(
      `INSERT INTO profile_object_permissions (
        tenant_id,
        profile_id,
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
      ON CONFLICT (tenant_id, profile_id, object_name)
      DO UPDATE SET
        can_create = COALESCE($4, profile_object_permissions.can_create),
        can_read = COALESCE($5, profile_object_permissions.can_read),
        can_update = COALESCE($6, profile_object_permissions.can_update),
        can_delete = COALESCE($7, profile_object_permissions.can_delete),
        view_all = COALESCE($8, profile_object_permissions.view_all),
        modify_all = COALESCE($9, profile_object_permissions.modify_all),
        updated_at = NOW(),
        updated_by = $10
      RETURNING
        id,
        tenant_id as "tenantId",
        profile_id as "profileId",
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
        profileId,
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
    profileId: string,
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
  ): Promise<ProfileObjectPermission[]> {
    const results: ProfileObjectPermission[] = [];
    for (const perm of permissions) {
      const result = await this.upsertObjectPermission(
        tenantId,
        profileId,
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
    profileId: string,
    objectName?: string
  ): Promise<ProfileFieldPermission[]> {
    const conditions = ["tenant_id = $1", "profile_id = $2"];
    const params: unknown[] = [tenantId, profileId];

    if (objectName) {
      conditions.push("object_name = $3");
      params.push(objectName);
    }

    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        profile_id as "profileId",
        object_name as "objectName",
        field_name as "fieldName",
        is_readable as "isReadable",
        is_editable as "isEditable",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM profile_field_permissions
      WHERE ${conditions.join(" AND ")}
      ORDER BY object_name, field_name`,
      params
    );
    return result.rows;
  },

  async upsertFieldPermission(
    tenantId: string,
    profileId: string,
    objectName: string,
    fieldName: string,
    permissions: {
      isReadable?: boolean;
      isEditable?: boolean;
    },
    userId: string
  ): Promise<ProfileFieldPermission> {
    const result = await db.query(
      `INSERT INTO profile_field_permissions (
        tenant_id,
        profile_id,
        object_name,
        field_name,
        is_readable,
        is_editable,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
      ON CONFLICT (tenant_id, profile_id, object_name, field_name)
      DO UPDATE SET
        is_readable = COALESCE($5, profile_field_permissions.is_readable),
        is_editable = COALESCE($6, profile_field_permissions.is_editable),
        updated_at = NOW(),
        updated_by = $7
      RETURNING
        id,
        tenant_id as "tenantId",
        profile_id as "profileId",
        object_name as "objectName",
        field_name as "fieldName",
        is_readable as "isReadable",
        is_editable as "isEditable",
        created_at as "createdAt",
        updated_at as "updatedAt"`,
      [
        tenantId,
        profileId,
        objectName,
        fieldName,
        permissions.isReadable ?? true,
        permissions.isEditable ?? false,
        userId,
      ]
    );
    return result.rows[0];
  },

  async bulkUpsertFieldPermissions(
    tenantId: string,
    profileId: string,
    permissions: Array<{
      objectName: string;
      fieldName: string;
      isReadable: boolean;
      isEditable: boolean;
    }>,
    userId: string
  ): Promise<ProfileFieldPermission[]> {
    const results: ProfileFieldPermission[] = [];
    for (const perm of permissions) {
      const result = await this.upsertFieldPermission(
        tenantId,
        profileId,
        perm.objectName,
        perm.fieldName,
        {
          isReadable: perm.isReadable,
          isEditable: perm.isEditable,
        },
        userId
      );
      results.push(result);
    }
    return results;
  },

  async deleteFieldPermission(
    tenantId: string,
    profileId: string,
    objectName: string,
    fieldName: string
  ): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM profile_field_permissions
      WHERE tenant_id = $1 AND profile_id = $2 AND object_name = $3 AND field_name = $4`,
      [tenantId, profileId, objectName, fieldName]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // Helper to get user's effective object permission
  async getUserObjectPermission(
    tenantId: string,
    userId: string,
    objectName: string
  ): Promise<ProfileObjectPermission | null> {
    const result = await db.query(
      `SELECT
        pop.id,
        pop.tenant_id as "tenantId",
        pop.profile_id as "profileId",
        pop.object_name as "objectName",
        pop.can_create as "canCreate",
        pop.can_read as "canRead",
        pop.can_update as "canUpdate",
        pop.can_delete as "canDelete",
        pop.view_all as "viewAll",
        pop.modify_all as "modifyAll",
        pop.created_at as "createdAt",
        pop.updated_at as "updatedAt"
      FROM profile_object_permissions pop
      JOIN users u ON u.profile_id = pop.profile_id
      WHERE u.tenant_id = $1 AND u.id = $2 AND pop.object_name = $3 AND u.is_deleted = false`,
      [tenantId, userId, objectName]
    );
    return result.rows[0] || null;
  },

  // Get users assigned to a profile
  async getUsersInProfile(tenantId: string, profileId: string) {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        username,
        email,
        display_name as "displayName",
        profile_id as "profileId",
        role_id as "roleId",
        is_active as "isActive"
      FROM users
      WHERE tenant_id = $1 AND profile_id = $2 AND is_deleted = false
      ORDER BY display_name`,
      [tenantId, profileId]
    );
    return result.rows;
  },
};
