import { db } from "../db/index.js";
import type {
  ProfileObjectPermission,
  ProfileFieldPermission,
  OWDAccessLevel,
} from "../types/index.js";

// Object permission result
export interface ObjectPermissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  viewAll: boolean;
  modifyAll: boolean;
}

// Field permission result
export interface FieldPermissions {
  fieldName: string;
  isReadable: boolean;
  isEditable: boolean;
}

// Record access level
export type RecordAccessLevel = "None" | "Read" | "ReadWrite";

// Full permission context
export interface PermissionContext {
  tenantId: string;
  userId: string;
  profileId: string | null;
  roleId: string | null;
  permissionSetIds: string[];
}

export const permissionService = {
  /**
   * Get user's permission context (profile, role, permission sets)
   */
  async getPermissionContext(
    tenantId: string,
    userId: string
  ): Promise<PermissionContext> {
    // Get user's profile and role
    const userResult = await db.query(
      `SELECT profile_id, role_id FROM users
       WHERE tenant_id = $1 AND id = $2 AND is_active = true`,
      [tenantId, userId]
    );

    const user = userResult.rows[0];
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Get user's permission sets
    const permSetResult = await db.query(
      `SELECT ps.id FROM permission_sets ps
       JOIN user_permission_sets ups ON ps.id = ups.permission_set_id
       WHERE ups.tenant_id = $1 AND ups.user_id = $2
         AND ps.is_active = true AND ps.is_deleted = false`,
      [tenantId, userId]
    );

    return {
      tenantId,
      userId,
      profileId: user.profile_id,
      roleId: user.role_id,
      permissionSetIds: permSetResult.rows.map((r) => r.id),
    };
  },

  /**
   * Get effective object permissions for a user (profile + permission sets combined)
   */
  async getObjectPermissions(
    tenantId: string,
    userId: string,
    objectName: string
  ): Promise<ObjectPermissions> {
    const ctx = await this.getPermissionContext(tenantId, userId);

    // Default: no permissions
    const result: ObjectPermissions = {
      canCreate: false,
      canRead: false,
      canUpdate: false,
      canDelete: false,
      viewAll: false,
      modifyAll: false,
    };

    // 1. Get profile permissions
    if (ctx.profileId) {
      const profilePerms = await db.query(
        `SELECT can_create, can_read, can_update, can_delete, view_all, modify_all
         FROM profile_object_permissions
         WHERE tenant_id = $1 AND profile_id = $2 AND object_name = $3`,
        [tenantId, ctx.profileId, objectName]
      );

      if (profilePerms.rows[0]) {
        const p = profilePerms.rows[0];
        result.canCreate = p.can_create;
        result.canRead = p.can_read;
        result.canUpdate = p.can_update;
        result.canDelete = p.can_delete;
        result.viewAll = p.view_all;
        result.modifyAll = p.modify_all;
      }
    }

    // 2. Add permission set permissions (additive)
    if (ctx.permissionSetIds.length > 0) {
      const psPerms = await db.query(
        `SELECT can_create, can_read, can_update, can_delete, view_all, modify_all
         FROM permission_set_object_permissions
         WHERE tenant_id = $1 AND permission_set_id = ANY($2) AND object_name = $3`,
        [tenantId, ctx.permissionSetIds, objectName]
      );

      // Permission sets are additive (OR logic)
      for (const p of psPerms.rows) {
        result.canCreate = result.canCreate || p.can_create;
        result.canRead = result.canRead || p.can_read;
        result.canUpdate = result.canUpdate || p.can_update;
        result.canDelete = result.canDelete || p.can_delete;
        result.viewAll = result.viewAll || p.view_all;
        result.modifyAll = result.modifyAll || p.modify_all;
      }
    }

    return result;
  },

  /**
   * Get effective field permissions for a user
   */
  async getFieldPermissions(
    tenantId: string,
    userId: string,
    objectName: string,
    fieldNames?: string[]
  ): Promise<FieldPermissions[]> {
    const ctx = await this.getPermissionContext(tenantId, userId);

    // Build field permissions map
    const fieldMap = new Map<string, FieldPermissions>();

    // 1. Get profile field permissions
    if (ctx.profileId) {
      let query = `SELECT field_name, is_readable, is_editable
         FROM profile_field_permissions
         WHERE tenant_id = $1 AND profile_id = $2 AND object_name = $3`;
      const params: unknown[] = [tenantId, ctx.profileId, objectName];

      if (fieldNames && fieldNames.length > 0) {
        query += ` AND field_name = ANY($4)`;
        params.push(fieldNames);
      }

      const profileFields = await db.query(query, params);

      for (const f of profileFields.rows) {
        fieldMap.set(f.field_name, {
          fieldName: f.field_name,
          isReadable: f.is_readable,
          isEditable: f.is_editable,
        });
      }
    }

    // 2. Add permission set field permissions (additive)
    if (ctx.permissionSetIds.length > 0) {
      let query = `SELECT field_name, is_readable, is_editable
         FROM permission_set_field_permissions
         WHERE tenant_id = $1 AND permission_set_id = ANY($2) AND object_name = $3`;
      const params: unknown[] = [tenantId, ctx.permissionSetIds, objectName];

      if (fieldNames && fieldNames.length > 0) {
        query += ` AND field_name = ANY($4)`;
        params.push(fieldNames);
      }

      const psFields = await db.query(query, params);

      for (const f of psFields.rows) {
        const existing = fieldMap.get(f.field_name);
        if (existing) {
          // Additive: OR logic
          existing.isReadable = existing.isReadable || f.is_readable;
          existing.isEditable = existing.isEditable || f.is_editable;
        } else {
          fieldMap.set(f.field_name, {
            fieldName: f.field_name,
            isReadable: f.is_readable,
            isEditable: f.is_editable,
          });
        }
      }
    }

    return Array.from(fieldMap.values());
  },

  /**
   * Check if user has specific field permission
   */
  async hasFieldPermission(
    tenantId: string,
    userId: string,
    objectName: string,
    fieldName: string,
    requiredPermission: "read" | "edit"
  ): Promise<boolean> {
    const permissions = await this.getFieldPermissions(
      tenantId,
      userId,
      objectName,
      [fieldName]
    );

    const fieldPerm = permissions.find((p) => p.fieldName === fieldName);
    if (!fieldPerm) {
      // No explicit permission = default readable, not editable
      return requiredPermission === "read";
    }

    return requiredPermission === "read"
      ? fieldPerm.isReadable
      : fieldPerm.isEditable;
  },

  /**
   * Get Organization-Wide Default for an object
   */
  async getOWD(
    tenantId: string,
    objectName: string
  ): Promise<{
    internalAccess: OWDAccessLevel;
    externalAccess: OWDAccessLevel;
    grantAccessUsingHierarchies: boolean;
  }> {
    const result = await db.query(
      `SELECT internal_access, external_access, grant_access_using_hierarchies
       FROM org_wide_defaults
       WHERE tenant_id = $1 AND object_name = $2`,
      [tenantId, objectName]
    );

    if (result.rows[0]) {
      return {
        internalAccess: result.rows[0].internal_access,
        externalAccess: result.rows[0].external_access,
        grantAccessUsingHierarchies:
          result.rows[0].grant_access_using_hierarchies,
      };
    }

    // Default if not configured
    return {
      internalAccess: "Private",
      externalAccess: "Private",
      grantAccessUsingHierarchies: true,
    };
  },

  /**
   * Get user's role hierarchy path (from user to root)
   */
  async getUserRolePath(tenantId: string, userId: string): Promise<string[]> {
    const result = await db.query(
      `WITH RECURSIVE role_path AS (
        -- Start with user's role
        SELECT r.id, r.parent_role_id, 1 as depth
        FROM roles r
        JOIN users u ON r.id = u.role_id
        WHERE u.tenant_id = $1 AND u.id = $2 AND r.is_deleted = false

        UNION ALL

        -- Walk up the hierarchy
        SELECT r.id, r.parent_role_id, rp.depth + 1
        FROM roles r
        JOIN role_path rp ON r.id = rp.parent_role_id
        WHERE r.is_deleted = false
      )
      SELECT id FROM role_path ORDER BY depth`,
      [tenantId, userId]
    );

    return result.rows.map((r) => r.id);
  },

  /**
   * Check if sourceRoleId is an ancestor of targetRoleId
   */
  async isAncestorRole(
    tenantId: string,
    sourceRoleId: string,
    targetRoleId: string
  ): Promise<boolean> {
    const result = await db.query(
      `WITH RECURSIVE ancestors AS (
        SELECT id, parent_role_id
        FROM roles
        WHERE tenant_id = $1 AND id = $3 AND is_deleted = false

        UNION ALL

        SELECT r.id, r.parent_role_id
        FROM roles r
        JOIN ancestors a ON r.id = a.parent_role_id
        WHERE r.is_deleted = false
      )
      SELECT 1 FROM ancestors WHERE id = $2 LIMIT 1`,
      [tenantId, sourceRoleId, targetRoleId]
    );

    return result.rows.length > 0;
  },

  /**
   * Get record owner ID
   */
  async getRecordOwnerId(
    tenantId: string,
    objectName: string,
    recordId: string
  ): Promise<string | null> {
    const tableMap: Record<string, string> = {
      Account: "accounts",
      Contact: "contacts",
      Lead: "leads",
      Opportunity: "opportunities",
      Quote: "quotes",
      Order: "orders",
      Contract: "contracts",
      Invoice: "invoices",
      Task: "tasks",
      Event: "events",
    };

    const tableName = tableMap[objectName];
    if (!tableName) {
      return null;
    }

    const result = await db.query(
      `SELECT owner_id FROM ${tableName}
       WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, recordId]
    );

    return result.rows[0]?.owner_id ?? null;
  },

  /**
   * Get parent record for ControlledByParent objects
   */
  async getParentRecordAccess(
    tenantId: string,
    userId: string,
    objectName: string,
    recordId: string
  ): Promise<RecordAccessLevel> {
    // Define parent relationships
    const parentMap: Record<string, { table: string; parentIdField: string; parentObject: string }> = {
      Contact: { table: "contacts", parentIdField: "account_id", parentObject: "Account" },
      Quote: { table: "quotes", parentIdField: "opportunity_id", parentObject: "Opportunity" },
      Task: { table: "tasks", parentIdField: "what_id", parentObject: "Account" }, // Simplified
      Event: { table: "events", parentIdField: "what_id", parentObject: "Account" }, // Simplified
    };

    const parentInfo = parentMap[objectName];
    if (!parentInfo) {
      return "None";
    }

    // Get parent record ID
    const result = await db.query(
      `SELECT ${parentInfo.parentIdField} as parent_id FROM ${parentInfo.table}
       WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, recordId]
    );

    const parentId = result.rows[0]?.parent_id;
    if (!parentId) {
      return "None";
    }

    // Get access to parent record
    return this.getRecordAccess(tenantId, userId, parentInfo.parentObject, parentId);
  },

  /**
   * Check if user has access to a record via sharing
   */
  async getShareAccess(
    tenantId: string,
    userId: string,
    objectName: string,
    recordId: string
  ): Promise<RecordAccessLevel> {
    // Get user's role and groups
    const userResult = await db.query(
      `SELECT role_id FROM users WHERE tenant_id = $1 AND id = $2 AND is_active = true`,
      [tenantId, userId]
    );
    const userRoleId = userResult.rows[0]?.role_id;

    const groupResult = await db.query(
      `SELECT DISTINCT group_id FROM public_group_members
       WHERE tenant_id = $1 AND member_type = 'User' AND member_id = $2`,
      [tenantId, userId]
    );
    const userGroupIds = groupResult.rows.map((r) => r.group_id);

    // Map object name to share table
    const shareTableMap: Record<string, { table: string; recordColumn: string }> = {
      Account: { table: "account_shares", recordColumn: "account_id" },
      Opportunity: { table: "opportunity_shares", recordColumn: "opportunity_id" },
      Lead: { table: "lead_shares", recordColumn: "lead_id" },
      Contract: { table: "contract_shares", recordColumn: "contract_id" },
      Invoice: { table: "invoice_shares", recordColumn: "invoice_id" },
    };

    const shareInfo = shareTableMap[objectName];
    if (!shareInfo) {
      return "None";
    }

    // Build query to check shares
    let query = `
      SELECT MAX(CASE WHEN access_level = 'ReadWrite' THEN 2 ELSE 1 END) as access_level
      FROM ${shareInfo.table}
      WHERE tenant_id = $1
        AND ${shareInfo.recordColumn} = $2
        AND is_deleted = false
        AND (
          (subject_type = 'User' AND subject_id = $3)
    `;
    const params: unknown[] = [tenantId, recordId, userId];
    let paramIndex = 4;

    if (userRoleId) {
      query += ` OR (subject_type = 'Role' AND subject_id = $${paramIndex++})`;
      params.push(userRoleId);
    }

    if (userGroupIds.length > 0) {
      query += ` OR (subject_type = 'Group' AND subject_id = ANY($${paramIndex++}))`;
      params.push(userGroupIds);
    }

    query += `)`;

    const result = await db.query(query, params);
    const accessLevel = result.rows[0]?.access_level;

    if (accessLevel === 2) return "ReadWrite";
    if (accessLevel === 1) return "Read";
    return "None";
  },

  /**
   * Main permission evaluation: Get record access level
   * Implements the full permission algorithm from the spec
   */
  async getRecordAccess(
    tenantId: string,
    userId: string,
    objectName: string,
    recordId: string
  ): Promise<RecordAccessLevel> {
    // 1. Check system override (ModifyAll / ViewAll)
    const objPerms = await this.getObjectPermissions(tenantId, userId, objectName);

    if (!objPerms.canRead) {
      return "None"; // No object-level read permission
    }

    if (objPerms.modifyAll) {
      return "ReadWrite"; // Full access via ModifyAll
    }

    if (objPerms.viewAll) {
      // ViewAll grants read, but check if can also write
      // (only if objPerms.canUpdate is true and record access allows)
    }

    // 2. Get OWD
    const owd = await this.getOWD(tenantId, objectName);

    // Handle ControlledByParent
    if (owd.internalAccess === "ControlledByParent") {
      return this.getParentRecordAccess(tenantId, userId, objectName, recordId);
    }

    // Public access
    if (owd.internalAccess === "PublicReadWrite") {
      return "ReadWrite";
    }

    // 3. Check ownership
    const ownerId = await this.getRecordOwnerId(tenantId, objectName, recordId);
    if (ownerId === userId) {
      return "ReadWrite"; // Owner has full access
    }

    // 4. Check role hierarchy access (if enabled)
    if (owd.grantAccessUsingHierarchies && ownerId) {
      // Get owner's role
      const ownerResult = await db.query(
        `SELECT role_id FROM users WHERE tenant_id = $1 AND id = $2 AND is_active = true`,
        [tenantId, ownerId]
      );
      const ownerRoleId = ownerResult.rows[0]?.role_id;

      if (ownerRoleId) {
        // Get current user's role
        const userResult = await db.query(
          `SELECT role_id FROM users WHERE tenant_id = $1 AND id = $2 AND is_active = true`,
          [tenantId, userId]
        );
        const userRoleId = userResult.rows[0]?.role_id;

        if (userRoleId) {
          // Check if user's role is ancestor of owner's role
          const isAncestor = await this.isAncestorRole(
            tenantId,
            userRoleId,
            ownerRoleId
          );
          if (isAncestor) {
            return "ReadWrite"; // Manager access
          }
        }
      }
    }

    // 5. Check share records
    const shareAccess = await this.getShareAccess(
      tenantId,
      userId,
      objectName,
      recordId
    );

    if (shareAccess !== "None") {
      return shareAccess;
    }

    // 6. Public read-only OWD
    if (owd.internalAccess === "PublicReadOnly") {
      return "Read";
    }

    // 7. ViewAll fallback
    if (objPerms.viewAll) {
      return "Read";
    }

    // No access
    return "None";
  },

  /**
   * Check if user can perform an action on a record
   */
  async canPerformAction(
    tenantId: string,
    userId: string,
    objectName: string,
    recordId: string | null,
    action: "create" | "read" | "update" | "delete"
  ): Promise<boolean> {
    const objPerms = await this.getObjectPermissions(tenantId, userId, objectName);

    // Check object-level permission first
    switch (action) {
      case "create":
        return objPerms.canCreate;
      case "read":
        if (!objPerms.canRead) return false;
        break;
      case "update":
        if (!objPerms.canUpdate) return false;
        break;
      case "delete":
        if (!objPerms.canDelete) return false;
        break;
    }

    // For read/update/delete, also check record-level access
    if (recordId) {
      const recordAccess = await this.getRecordAccess(
        tenantId,
        userId,
        objectName,
        recordId
      );

      if (action === "read") {
        return recordAccess !== "None";
      } else {
        // update and delete require ReadWrite access
        return recordAccess === "ReadWrite";
      }
    }

    return true;
  },

  /**
   * Filter a list of record IDs to only those the user can access
   */
  async filterAccessibleRecords(
    tenantId: string,
    userId: string,
    objectName: string,
    recordIds: string[],
    requiredAccess: "Read" | "ReadWrite" = "Read"
  ): Promise<string[]> {
    const accessible: string[] = [];

    for (const recordId of recordIds) {
      const access = await this.getRecordAccess(tenantId, userId, objectName, recordId);
      if (access === "ReadWrite") {
        accessible.push(recordId);
      } else if (access === "Read" && requiredAccess === "Read") {
        accessible.push(recordId);
      }
    }

    return accessible;
  },

  /**
   * Apply field-level security to a record (mask inaccessible fields)
   */
  async applyFieldSecurity<T extends Record<string, unknown>>(
    tenantId: string,
    userId: string,
    objectName: string,
    record: T,
    mode: "read" | "edit" = "read"
  ): Promise<T> {
    const fieldNames = Object.keys(record);
    const permissions = await this.getFieldPermissions(
      tenantId,
      userId,
      objectName,
      fieldNames
    );

    // Create permission map
    const permMap = new Map<string, FieldPermissions>();
    for (const p of permissions) {
      permMap.set(p.fieldName, p);
    }

    // Apply masking
    const result = { ...record };
    for (const fieldName of fieldNames) {
      const perm = permMap.get(fieldName);

      if (mode === "read") {
        // Mask if not readable
        if (perm && !perm.isReadable) {
          (result as Record<string, unknown>)[fieldName] = null;
        }
      } else {
        // Mask if not editable
        if (perm && !perm.isEditable) {
          (result as Record<string, unknown>)[fieldName] = null;
        }
      }
    }

    return result;
  },
};
