import { db } from "../db/index.js";
import { permissionService } from "./permissionService.js";

// Access filter to be applied to list queries
export interface AccessFilter {
  clause: string;
  params: unknown[];
  paramOffset: number;
}

// Table mapping for objects
const TABLE_MAP: Record<string, string> = {
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
  Campaign: "campaigns",
  Product: "products",
  Pricebook: "pricebooks",
};

// Share table mapping
const SHARE_TABLE_MAP: Record<string, { table: string; recordColumn: string }> = {
  Account: { table: "account_shares", recordColumn: "account_id" },
  Opportunity: { table: "opportunity_shares", recordColumn: "opportunity_id" },
  Lead: { table: "lead_shares", recordColumn: "lead_id" },
  Contract: { table: "contract_shares", recordColumn: "contract_id" },
  Invoice: { table: "invoice_shares", recordColumn: "invoice_id" },
};

// Parent relationship mapping for ControlledByParent objects
const PARENT_MAP: Record<string, { parentIdField: string; parentObject: string }> = {
  Contact: { parentIdField: "account_id", parentObject: "Account" },
  Quote: { parentIdField: "opportunity_id", parentObject: "Opportunity" },
};

export const accessibleIdsService = {
  /**
   * Get accessible IDs filter for list queries.
   * Returns null if user has access to all records (ViewAll/ModifyAll or PublicReadWrite).
   * Returns AccessFilter with SQL clause and params otherwise.
   */
  async getAccessibleIdsFilter(
    tenantId: string,
    userId: string,
    objectName: string,
    paramOffset: number = 2
  ): Promise<AccessFilter | null> {
    // 1. Check object permissions for ViewAll/ModifyAll
    const objPerms = await permissionService.getObjectPermissions(
      tenantId,
      userId,
      objectName
    );

    if (!objPerms.canRead) {
      // No read permission - return filter that matches nothing
      return {
        clause: "1 = 0",
        params: [],
        paramOffset,
      };
    }

    if (objPerms.modifyAll || objPerms.viewAll) {
      // User can see all records
      return null;
    }

    // 2. Get OWD settings
    const owd = await permissionService.getOWD(tenantId, objectName);

    // Handle PublicReadWrite - everyone can see all
    if (owd.internalAccess === "PublicReadWrite") {
      return null;
    }

    // Handle ControlledByParent - delegate to parent object
    if (owd.internalAccess === "ControlledByParent") {
      return this.getControlledByParentFilter(
        tenantId,
        userId,
        objectName,
        paramOffset
      );
    }

    // 3. Build access filter for Private/PublicReadOnly
    return this.buildAccessFilter(
      tenantId,
      userId,
      objectName,
      owd.grantAccessUsingHierarchies,
      paramOffset
    );
  },

  /**
   * Build access filter for ControlledByParent objects
   */
  async getControlledByParentFilter(
    tenantId: string,
    userId: string,
    objectName: string,
    paramOffset: number
  ): Promise<AccessFilter | null> {
    const parentInfo = PARENT_MAP[objectName];
    if (!parentInfo) {
      // Unknown parent - deny all
      return {
        clause: "1 = 0",
        params: [],
        paramOffset,
      };
    }

    // Get filter for parent object
    const parentFilter = await this.getAccessibleIdsFilter(
      tenantId,
      userId,
      parentInfo.parentObject,
      paramOffset
    );

    if (parentFilter === null) {
      // Parent allows all - child also allows all
      return null;
    }

    // Build subquery to check parent access
    const parentTable = TABLE_MAP[parentInfo.parentObject];
    if (!parentTable) {
      return {
        clause: "1 = 0",
        params: [],
        paramOffset,
      };
    }

    // Filter: parent_id IN (accessible parent IDs)
    const clause = `${parentInfo.parentIdField} IN (
      SELECT id FROM ${parentTable}
      WHERE tenant_id = $1 AND is_deleted = false
      AND (${parentFilter.clause})
    )`;

    return {
      clause,
      params: parentFilter.params,
      paramOffset: parentFilter.paramOffset,
    };
  },

  /**
   * Build the main access filter combining owner, role hierarchy, and shares
   */
  async buildAccessFilter(
    tenantId: string,
    userId: string,
    objectName: string,
    useRoleHierarchy: boolean,
    paramOffset: number
  ): Promise<AccessFilter> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let currentParam = paramOffset;

    // Condition 1: User is the owner
    conditions.push(`owner_id = $${currentParam}`);
    params.push(userId);
    currentParam++;

    // Condition 2: Role hierarchy access (if enabled)
    if (useRoleHierarchy) {
      // Get all users in roles below current user's role
      const roleHierarchyClause = await this.getRoleHierarchyClause(
        tenantId,
        userId,
        currentParam
      );
      if (roleHierarchyClause) {
        conditions.push(roleHierarchyClause.clause);
        params.push(...roleHierarchyClause.params);
        currentParam = roleHierarchyClause.nextParam;
      }
    }

    // Condition 3: Share records (if share table exists for this object)
    const shareClause = await this.getShareClause(
      tenantId,
      userId,
      objectName,
      currentParam
    );
    if (shareClause) {
      conditions.push(shareClause.clause);
      params.push(...shareClause.params);
      currentParam = shareClause.nextParam;
    }

    return {
      clause: `(${conditions.join(" OR ")})`,
      params,
      paramOffset: currentParam,
    };
  },

  /**
   * Build clause for role hierarchy access
   * Users can see records owned by users in subordinate roles
   */
  async getRoleHierarchyClause(
    tenantId: string,
    userId: string,
    paramOffset: number
  ): Promise<{ clause: string; params: unknown[]; nextParam: number } | null> {
    // Get user's role
    const userResult = await db.query(
      `SELECT role_id FROM users WHERE tenant_id = $1 AND id = $2 AND is_active = true`,
      [tenantId, userId]
    );
    const userRoleId = userResult.rows[0]?.role_id;

    if (!userRoleId) {
      return null;
    }

    // Build subquery to find all subordinate roles and their users
    // This is a recursive CTE that finds all roles below the current user's role
    const clause = `owner_id IN (
      SELECT u.id FROM users u
      WHERE u.tenant_id = $1 AND u.is_active = true
      AND u.role_id IN (
        WITH RECURSIVE subordinate_roles AS (
          SELECT id FROM roles
          WHERE tenant_id = $1 AND parent_role_id = $${paramOffset} AND is_deleted = false
          UNION ALL
          SELECT r.id FROM roles r
          JOIN subordinate_roles sr ON r.parent_role_id = sr.id
          WHERE r.is_deleted = false
        )
        SELECT id FROM subordinate_roles
      )
    )`;

    return {
      clause,
      params: [userRoleId],
      nextParam: paramOffset + 1,
    };
  },

  /**
   * Build clause for share-based access
   */
  async getShareClause(
    tenantId: string,
    userId: string,
    objectName: string,
    paramOffset: number
  ): Promise<{ clause: string; params: unknown[]; nextParam: number } | null> {
    const shareInfo = SHARE_TABLE_MAP[objectName];
    if (!shareInfo) {
      return null; // No share table for this object
    }

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

    // Build conditions for share access
    const shareConditions: string[] = [];
    const params: unknown[] = [];
    let currentParam = paramOffset;

    // Direct user share
    shareConditions.push(`(subject_type = 'User' AND subject_id = $${currentParam})`);
    params.push(userId);
    currentParam++;

    // Role share
    if (userRoleId) {
      shareConditions.push(`(subject_type = 'Role' AND subject_id = $${currentParam})`);
      params.push(userRoleId);
      currentParam++;
    }

    // Group shares
    if (userGroupIds.length > 0) {
      shareConditions.push(`(subject_type = 'Group' AND subject_id = ANY($${currentParam}))`);
      params.push(userGroupIds);
      currentParam++;
    }

    // Build subquery to find records with share access
    const clause = `id IN (
      SELECT ${shareInfo.recordColumn} FROM ${shareInfo.table}
      WHERE tenant_id = $1 AND is_deleted = false
      AND (${shareConditions.join(" OR ")})
    )`;

    return {
      clause,
      params,
      nextParam: currentParam,
    };
  },
};
