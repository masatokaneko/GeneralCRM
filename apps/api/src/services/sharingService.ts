import { db } from "../db/index.js";
import type {
  SharingRule,
  ShareRowCause,
  ShareAccessLevel,
} from "../types/index.js";

// Share record to create
interface ShareRecord {
  recordId: string;
  subjectType: "User" | "Role" | "Group";
  subjectId: string;
  accessLevel: ShareAccessLevel;
  rowCause: ShareRowCause;
  sharingRuleId?: string;
}

// Share table configuration
const SHARE_TABLES: Record<string, { table: string; recordColumn: string; sourceTable: string }> = {
  Account: {
    table: "account_shares",
    recordColumn: "account_id",
    sourceTable: "accounts",
  },
  Opportunity: {
    table: "opportunity_shares",
    recordColumn: "opportunity_id",
    sourceTable: "opportunities",
  },
  Lead: {
    table: "lead_shares",
    recordColumn: "lead_id",
    sourceTable: "leads",
  },
  Contract: {
    table: "contract_shares",
    recordColumn: "contract_id",
    sourceTable: "contracts",
  },
  Invoice: {
    table: "invoice_shares",
    recordColumn: "invoice_id",
    sourceTable: "invoices",
  },
};

export const sharingService = {
  /**
   * Get share table info for an object
   */
  getShareTableInfo(objectName: string) {
    const info = SHARE_TABLES[objectName];
    if (!info) {
      throw new Error(`No share table configured for object: ${objectName}`);
    }
    return info;
  },

  /**
   * Create owner share for a record
   */
  async createOwnerShare(
    tenantId: string,
    objectName: string,
    recordId: string,
    ownerId: string,
    createdBy: string
  ): Promise<void> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    await db.query(
      `INSERT INTO ${table} (
        tenant_id, ${recordColumn}, subject_type, subject_id,
        access_level, row_cause, created_by
      ) VALUES ($1, $2, 'User', $3, 'ReadWrite', 'Owner', $4)
      ON CONFLICT (tenant_id, ${recordColumn}, subject_type, subject_id, row_cause)
      DO UPDATE SET access_level = 'ReadWrite', is_deleted = false`,
      [tenantId, recordId, ownerId, createdBy]
    );
  },

  /**
   * Update owner share when record owner changes
   */
  async updateOwnerShare(
    tenantId: string,
    objectName: string,
    recordId: string,
    oldOwnerId: string,
    newOwnerId: string,
    modifiedBy: string
  ): Promise<void> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    // Delete old owner share
    await db.query(
      `UPDATE ${table}
       SET is_deleted = true
       WHERE tenant_id = $1 AND ${recordColumn} = $2
         AND subject_type = 'User' AND subject_id = $3
         AND row_cause = 'Owner' AND is_deleted = false`,
      [tenantId, recordId, oldOwnerId]
    );

    // Create new owner share
    await this.createOwnerShare(tenantId, objectName, recordId, newOwnerId, modifiedBy);

    // Re-evaluate sharing rules for this record
    await this.recalculateRecordShares(tenantId, objectName, recordId, modifiedBy);
  },

  /**
   * Create role hierarchy shares for a record
   */
  async createRoleHierarchyShares(
    tenantId: string,
    objectName: string,
    recordId: string,
    ownerId: string,
    createdBy: string
  ): Promise<void> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    // Check if role hierarchy is enabled for this object
    const owdResult = await db.query(
      `SELECT grant_access_using_hierarchies
       FROM org_wide_defaults
       WHERE tenant_id = $1 AND object_name = $2`,
      [tenantId, objectName]
    );

    if (!owdResult.rows[0]?.grant_access_using_hierarchies) {
      return; // Role hierarchy not enabled
    }

    // Get owner's role
    const ownerResult = await db.query(
      `SELECT role_id FROM users
       WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, ownerId]
    );

    const ownerRoleId = ownerResult.rows[0]?.role_id;
    if (!ownerRoleId) {
      return; // Owner has no role
    }

    // Get all ancestor roles
    const ancestorsResult = await db.query(
      `WITH RECURSIVE ancestors AS (
        SELECT parent_role_id as id
        FROM roles
        WHERE tenant_id = $1 AND id = $2 AND parent_role_id IS NOT NULL AND is_deleted = false

        UNION ALL

        SELECT r.parent_role_id
        FROM roles r
        JOIN ancestors a ON r.id = a.id
        WHERE r.parent_role_id IS NOT NULL AND r.is_deleted = false
      )
      SELECT DISTINCT id FROM ancestors WHERE id IS NOT NULL`,
      [tenantId, ownerRoleId]
    );

    // Create shares for each ancestor role
    for (const row of ancestorsResult.rows) {
      await db.query(
        `INSERT INTO ${table} (
          tenant_id, ${recordColumn}, subject_type, subject_id,
          access_level, row_cause, created_by
        ) VALUES ($1, $2, 'Role', $3, 'ReadWrite', 'RoleHierarchy', $4)
        ON CONFLICT (tenant_id, ${recordColumn}, subject_type, subject_id, row_cause)
        DO UPDATE SET access_level = 'ReadWrite', is_deleted = false`,
        [tenantId, recordId, row.id, createdBy]
      );
    }
  },

  /**
   * Get members of a sharing source (Role, RoleAndSubordinates, PublicGroup)
   */
  async getSourceMembers(
    tenantId: string,
    sourceType: string,
    sourceId: string
  ): Promise<string[]> {
    switch (sourceType) {
      case "Role": {
        // Get users in this role
        const result = await db.query(
          `SELECT id FROM users
           WHERE tenant_id = $1 AND role_id = $2 AND is_deleted = false`,
          [tenantId, sourceId]
        );
        return result.rows.map((r) => r.id);
      }

      case "RoleAndSubordinates": {
        // Get users in this role and all subordinate roles
        const result = await db.query(
          `WITH RECURSIVE role_tree AS (
            SELECT id FROM roles WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
            UNION ALL
            SELECT r.id FROM roles r
            JOIN role_tree rt ON r.parent_role_id = rt.id
            WHERE r.is_deleted = false
          )
          SELECT u.id FROM users u
          JOIN role_tree rt ON u.role_id = rt.id
          WHERE u.tenant_id = $1 AND u.is_deleted = false`,
          [tenantId, sourceId]
        );
        return result.rows.map((r) => r.id);
      }

      case "PublicGroup": {
        // Get expanded group members
        const result = await db.query(
          `SELECT * FROM get_group_members_expanded($1, $2)`,
          [tenantId, sourceId]
        );
        return result.rows.map((r) => r.user_id);
      }

      default:
        return [];
    }
  },

  /**
   * Get target subject (User, Role, RoleAndSubordinates, PublicGroup)
   */
  async getTargetSubjects(
    tenantId: string,
    targetType: string,
    targetId: string
  ): Promise<Array<{ subjectType: "User" | "Role" | "Group"; subjectId: string }>> {
    switch (targetType) {
      case "User":
        return [{ subjectType: "User", subjectId: targetId }];

      case "Role":
        return [{ subjectType: "Role", subjectId: targetId }];

      case "RoleAndSubordinates": {
        // Get this role and all subordinate roles
        const result = await db.query(
          `WITH RECURSIVE role_tree AS (
            SELECT id FROM roles WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
            UNION ALL
            SELECT r.id FROM roles r
            JOIN role_tree rt ON r.parent_role_id = rt.id
            WHERE r.is_deleted = false
          )
          SELECT id FROM role_tree`,
          [tenantId, targetId]
        );
        return result.rows.map((r) => ({ subjectType: "Role" as const, subjectId: r.id }));
      }

      case "PublicGroup":
        return [{ subjectType: "Group", subjectId: targetId }];

      default:
        return [];
    }
  },

  /**
   * Apply owner-based sharing rule to a record
   */
  async applyOwnerBasedRule(
    tenantId: string,
    rule: SharingRule,
    recordId: string,
    ownerId: string,
    createdBy: string
  ): Promise<number> {
    if (!rule.sourceType || !rule.sourceId) {
      return 0;
    }

    // Check if owner is a member of the source
    const sourceMembers = await this.getSourceMembers(
      tenantId,
      rule.sourceType,
      rule.sourceId
    );

    if (!sourceMembers.includes(ownerId)) {
      return 0; // Owner not in source group
    }

    // Get target subjects
    const targets = await this.getTargetSubjects(
      tenantId,
      rule.targetType,
      rule.targetId
    );

    const { table, recordColumn } = this.getShareTableInfo(rule.objectName);
    let sharesCreated = 0;

    for (const target of targets) {
      const result = await db.query(
        `INSERT INTO ${table} (
          tenant_id, ${recordColumn}, subject_type, subject_id,
          access_level, row_cause, sharing_rule_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, 'Rule', $6, $7)
        ON CONFLICT (tenant_id, ${recordColumn}, subject_type, subject_id, row_cause)
        DO UPDATE SET
          access_level = GREATEST(${table}.access_level, EXCLUDED.access_level),
          sharing_rule_id = EXCLUDED.sharing_rule_id,
          is_deleted = false
        RETURNING id`,
        [
          tenantId,
          recordId,
          target.subjectType,
          target.subjectId,
          rule.accessLevel,
          rule.id,
          createdBy,
        ]
      );

      if (result.rowCount && result.rowCount > 0) {
        sharesCreated++;
      }
    }

    return sharesCreated;
  },

  /**
   * Evaluate criteria-based rule filter against a record
   */
  async evaluateFilter(
    tenantId: string,
    objectName: string,
    recordId: string,
    filterCriteria: Record<string, unknown>
  ): Promise<boolean> {
    const { sourceTable } = this.getShareTableInfo(objectName);

    // Simple filter evaluation: field = value
    // In production, this would support complex filter logic
    const conditions: string[] = [];
    const params: unknown[] = [tenantId, recordId];
    let paramIndex = 3;

    for (const [field, value] of Object.entries(filterCriteria)) {
      if (value === null) {
        conditions.push(`${field} IS NULL`);
      } else if (Array.isArray(value)) {
        conditions.push(`${field} = ANY($${paramIndex++})`);
        params.push(value);
      } else {
        conditions.push(`${field} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (conditions.length === 0) {
      return true; // No filter = match all
    }

    const query = `SELECT 1 FROM ${sourceTable}
                   WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
                   AND ${conditions.join(" AND ")}
                   LIMIT 1`;

    const result = await db.query(query, params);
    return result.rows.length > 0;
  },

  /**
   * Apply criteria-based sharing rule to a record
   */
  async applyCriteriaBasedRule(
    tenantId: string,
    rule: SharingRule,
    recordId: string,
    createdBy: string
  ): Promise<number> {
    if (!rule.filterCriteria) {
      return 0;
    }

    // Evaluate filter
    const matches = await this.evaluateFilter(
      tenantId,
      rule.objectName,
      recordId,
      rule.filterCriteria
    );

    if (!matches) {
      return 0;
    }

    // Get target subjects
    const targets = await this.getTargetSubjects(
      tenantId,
      rule.targetType,
      rule.targetId
    );

    const { table, recordColumn } = this.getShareTableInfo(rule.objectName);
    let sharesCreated = 0;

    for (const target of targets) {
      const result = await db.query(
        `INSERT INTO ${table} (
          tenant_id, ${recordColumn}, subject_type, subject_id,
          access_level, row_cause, sharing_rule_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, 'Rule', $6, $7)
        ON CONFLICT (tenant_id, ${recordColumn}, subject_type, subject_id, row_cause)
        DO UPDATE SET
          access_level = GREATEST(${table}.access_level, EXCLUDED.access_level),
          sharing_rule_id = EXCLUDED.sharing_rule_id,
          is_deleted = false
        RETURNING id`,
        [
          tenantId,
          recordId,
          target.subjectType,
          target.subjectId,
          rule.accessLevel,
          rule.id,
          createdBy,
        ]
      );

      if (result.rowCount && result.rowCount > 0) {
        sharesCreated++;
      }
    }

    return sharesCreated;
  },

  /**
   * Apply all sharing rules to a single record
   */
  async applyRulesToRecord(
    tenantId: string,
    objectName: string,
    recordId: string,
    ownerId: string,
    createdBy: string
  ): Promise<number> {
    // Get active sharing rules for this object
    const rulesResult = await db.query(
      `SELECT * FROM sharing_rules
       WHERE tenant_id = $1 AND object_name = $2
         AND is_active = true AND is_deleted = false`,
      [tenantId, objectName]
    );

    let totalShares = 0;

    for (const row of rulesResult.rows) {
      const rule: SharingRule = {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        objectName: row.object_name,
        ruleType: row.rule_type,
        description: row.description,
        isActive: row.is_active,
        sourceType: row.source_type,
        sourceId: row.source_id,
        targetType: row.target_type,
        targetId: row.target_id,
        accessLevel: row.access_level,
        filterCriteria: row.filter_criteria,
        createdAt: row.created_at,
        createdBy: row.created_by,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
        isDeleted: row.is_deleted,
        systemModstamp: row.system_modstamp,
      };

      if (rule.ruleType === "OwnerBased") {
        totalShares += await this.applyOwnerBasedRule(
          tenantId,
          rule,
          recordId,
          ownerId,
          createdBy
        );
      } else if (rule.ruleType === "CriteriaBased") {
        totalShares += await this.applyCriteriaBasedRule(
          tenantId,
          rule,
          recordId,
          createdBy
        );
      }
    }

    return totalShares;
  },

  /**
   * Calculate all shares for a newly created record
   */
  async calculateNewRecordShares(
    tenantId: string,
    objectName: string,
    recordId: string,
    ownerId: string,
    createdBy: string
  ): Promise<void> {
    // 1. Create owner share
    await this.createOwnerShare(tenantId, objectName, recordId, ownerId, createdBy);

    // 2. Create role hierarchy shares
    await this.createRoleHierarchyShares(tenantId, objectName, recordId, ownerId, createdBy);

    // 3. Apply sharing rules
    await this.applyRulesToRecord(tenantId, objectName, recordId, ownerId, createdBy);
  },

  /**
   * Recalculate shares for a record (after rule or record change)
   */
  async recalculateRecordShares(
    tenantId: string,
    objectName: string,
    recordId: string,
    modifiedBy: string
  ): Promise<void> {
    const { table, recordColumn, sourceTable } = this.getShareTableInfo(objectName);

    // Get record owner
    const recordResult = await db.query(
      `SELECT owner_id FROM ${sourceTable}
       WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, recordId]
    );

    const ownerId = recordResult.rows[0]?.owner_id;
    if (!ownerId) {
      return; // Record not found
    }

    // Delete all rule-based and hierarchy-based shares (keep Owner and Manual)
    await db.query(
      `UPDATE ${table}
       SET is_deleted = true
       WHERE tenant_id = $1 AND ${recordColumn} = $2
         AND row_cause IN ('Rule', 'RoleHierarchy')
         AND is_deleted = false`,
      [tenantId, recordId]
    );

    // Re-create role hierarchy shares
    await this.createRoleHierarchyShares(tenantId, objectName, recordId, ownerId, modifiedBy);

    // Re-apply sharing rules
    await this.applyRulesToRecord(tenantId, objectName, recordId, ownerId, modifiedBy);
  },

  /**
   * Recalculate all shares for a sharing rule
   */
  async recalculateRuleShares(
    tenantId: string,
    ruleId: string,
    modifiedBy: string
  ): Promise<{ processed: number; sharesCreated: number }> {
    // Get the rule
    const ruleResult = await db.query(
      `SELECT * FROM sharing_rules
       WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, ruleId]
    );

    const ruleRow = ruleResult.rows[0];
    if (!ruleRow) {
      throw new Error(`Sharing rule not found: ${ruleId}`);
    }

    const rule: SharingRule = {
      id: ruleRow.id,
      tenantId: ruleRow.tenant_id,
      name: ruleRow.name,
      objectName: ruleRow.object_name,
      ruleType: ruleRow.rule_type,
      description: ruleRow.description,
      isActive: ruleRow.is_active,
      sourceType: ruleRow.source_type,
      sourceId: ruleRow.source_id,
      targetType: ruleRow.target_type,
      targetId: ruleRow.target_id,
      accessLevel: ruleRow.access_level,
      filterCriteria: ruleRow.filter_criteria,
      createdAt: ruleRow.created_at,
      createdBy: ruleRow.created_by,
      updatedAt: ruleRow.updated_at,
      updatedBy: ruleRow.updated_by,
      isDeleted: ruleRow.is_deleted,
      systemModstamp: ruleRow.system_modstamp,
    };

    const { table, recordColumn, sourceTable } = this.getShareTableInfo(rule.objectName);

    // Delete existing shares from this rule
    await db.query(
      `UPDATE ${table}
       SET is_deleted = true
       WHERE tenant_id = $1 AND sharing_rule_id = $2 AND is_deleted = false`,
      [tenantId, ruleId]
    );

    if (!rule.isActive) {
      return { processed: 0, sharesCreated: 0 };
    }

    // Get all records for this object
    const recordsResult = await db.query(
      `SELECT id, owner_id FROM ${sourceTable}
       WHERE tenant_id = $1 AND is_deleted = false`,
      [tenantId]
    );

    let sharesCreated = 0;

    for (const record of recordsResult.rows) {
      if (rule.ruleType === "OwnerBased") {
        sharesCreated += await this.applyOwnerBasedRule(
          tenantId,
          rule,
          record.id,
          record.owner_id,
          modifiedBy
        );
      } else if (rule.ruleType === "CriteriaBased") {
        sharesCreated += await this.applyCriteriaBasedRule(
          tenantId,
          rule,
          record.id,
          modifiedBy
        );
      }
    }

    return { processed: recordsResult.rows.length, sharesCreated };
  },

  /**
   * Delete a record's shares (when record is deleted)
   */
  async deleteRecordShares(
    tenantId: string,
    objectName: string,
    recordId: string
  ): Promise<number> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    const result = await db.query(
      `UPDATE ${table}
       SET is_deleted = true
       WHERE tenant_id = $1 AND ${recordColumn} = $2 AND is_deleted = false`,
      [tenantId, recordId]
    );

    return result.rowCount ?? 0;
  },

  /**
   * Create manual share
   */
  async createManualShare(
    tenantId: string,
    objectName: string,
    recordId: string,
    subjectType: "User" | "Role" | "Group",
    subjectId: string,
    accessLevel: ShareAccessLevel,
    createdBy: string
  ): Promise<string> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    const result = await db.query(
      `INSERT INTO ${table} (
        tenant_id, ${recordColumn}, subject_type, subject_id,
        access_level, row_cause, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'Manual', $6)
      ON CONFLICT (tenant_id, ${recordColumn}, subject_type, subject_id, row_cause)
      DO UPDATE SET access_level = EXCLUDED.access_level, is_deleted = false
      RETURNING id`,
      [tenantId, recordId, subjectType, subjectId, accessLevel, createdBy]
    );

    return result.rows[0].id;
  },

  /**
   * Delete manual share
   */
  async deleteManualShare(
    tenantId: string,
    objectName: string,
    recordId: string,
    subjectType: string,
    subjectId: string
  ): Promise<boolean> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    const result = await db.query(
      `UPDATE ${table}
       SET is_deleted = true
       WHERE tenant_id = $1 AND ${recordColumn} = $2
         AND subject_type = $3 AND subject_id = $4
         AND row_cause = 'Manual' AND is_deleted = false`,
      [tenantId, recordId, subjectType, subjectId]
    );

    return (result.rowCount ?? 0) > 0;
  },

  /**
   * Get all shares for a record
   */
  async getRecordShares(
    tenantId: string,
    objectName: string,
    recordId: string
  ): Promise<Array<{
    id: string;
    subjectType: string;
    subjectId: string;
    subjectName?: string;
    accessLevel: string;
    rowCause: string;
    sharingRuleId?: string;
    sharingRuleName?: string;
  }>> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    const result = await db.query(
      `SELECT
        s.id,
        s.subject_type as "subjectType",
        s.subject_id as "subjectId",
        s.access_level as "accessLevel",
        s.row_cause as "rowCause",
        s.sharing_rule_id as "sharingRuleId",
        sr.name as "sharingRuleName",
        CASE
          WHEN s.subject_type = 'User' THEN u.display_name
          WHEN s.subject_type = 'Role' THEN r.name
          WHEN s.subject_type = 'Group' THEN pg.name
        END as "subjectName"
      FROM ${table} s
      LEFT JOIN users u ON s.subject_type = 'User' AND u.id = s.subject_id
      LEFT JOIN roles r ON s.subject_type = 'Role' AND r.id = s.subject_id
      LEFT JOIN public_groups pg ON s.subject_type = 'Group' AND pg.id = s.subject_id
      LEFT JOIN sharing_rules sr ON s.sharing_rule_id = sr.id
      WHERE s.tenant_id = $1 AND s.${recordColumn} = $2 AND s.is_deleted = false
      ORDER BY
        CASE s.row_cause
          WHEN 'Owner' THEN 1
          WHEN 'RoleHierarchy' THEN 2
          WHEN 'Rule' THEN 3
          WHEN 'Manual' THEN 4
          WHEN 'Team' THEN 5
          ELSE 6
        END,
        s.subject_type`,
      [tenantId, recordId]
    );

    return result.rows;
  },
};
