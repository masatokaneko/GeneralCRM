import { db } from "../db/index.js";
import type { ObjectShare, CreateObjectShareInput } from "../types/index.js";

// Map object names to their share table names and record ID column names
const SHARE_TABLE_MAP: Record<string, { table: string; recordColumn: string }> = {
  Account: { table: "account_shares", recordColumn: "account_id" },
  Opportunity: { table: "opportunity_shares", recordColumn: "opportunity_id" },
  Lead: { table: "lead_shares", recordColumn: "lead_id" },
  Contract: { table: "contract_shares", recordColumn: "contract_id" },
  Invoice: { table: "invoice_shares", recordColumn: "invoice_id" },
};

export const objectShareRepository = {
  getShareTableInfo(objectName: string) {
    const info = SHARE_TABLE_MAP[objectName];
    if (!info) {
      throw new Error(`No share table configured for object: ${objectName}`);
    }
    return info;
  },

  async findByRecord(
    tenantId: string,
    objectName: string,
    recordId: string
  ): Promise<ObjectShare[]> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    const result = await db.query(
      `SELECT
        s.id,
        s.tenant_id as "tenantId",
        '${objectName}' as "objectName",
        s.${recordColumn} as "recordId",
        s.subject_type as "subjectType",
        s.subject_id as "subjectId",
        s.access_level as "accessLevel",
        s.row_cause as "rowCause",
        s.sharing_rule_id as "sharingRuleId",
        s.created_at as "createdAt",
        s.created_by as "createdBy",
        s.is_deleted as "isDeleted",
        CASE
          WHEN s.subject_type = 'User' THEN u.display_name
          WHEN s.subject_type = 'Role' THEN r.name
          WHEN s.subject_type = 'Group' THEN pg.name
        END as "subjectName"
      FROM ${table} s
      LEFT JOIN users u ON s.subject_type = 'User' AND u.id = s.subject_id
      LEFT JOIN roles r ON s.subject_type = 'Role' AND r.id = s.subject_id
      LEFT JOIN public_groups pg ON s.subject_type = 'Group' AND pg.id = s.subject_id
      WHERE s.tenant_id = $1 AND s.${recordColumn} = $2 AND s.is_deleted = false
      ORDER BY s.row_cause, s.subject_type`,
      [tenantId, recordId]
    );
    return result.rows;
  },

  async findBySubject(
    tenantId: string,
    objectName: string,
    subjectType: string,
    subjectId: string
  ): Promise<ObjectShare[]> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    const result = await db.query(
      `SELECT
        s.id,
        s.tenant_id as "tenantId",
        '${objectName}' as "objectName",
        s.${recordColumn} as "recordId",
        s.subject_type as "subjectType",
        s.subject_id as "subjectId",
        s.access_level as "accessLevel",
        s.row_cause as "rowCause",
        s.sharing_rule_id as "sharingRuleId",
        s.created_at as "createdAt",
        s.created_by as "createdBy",
        s.is_deleted as "isDeleted"
      FROM ${table} s
      WHERE s.tenant_id = $1 AND s.subject_type = $2 AND s.subject_id = $3 AND s.is_deleted = false
      ORDER BY s.created_at`,
      [tenantId, subjectType, subjectId]
    );
    return result.rows;
  },

  async create(
    tenantId: string,
    objectName: string,
    data: CreateObjectShareInput,
    userId: string
  ): Promise<ObjectShare> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    const result = await db.query(
      `INSERT INTO ${table} (
        tenant_id,
        ${recordColumn},
        subject_type,
        subject_id,
        access_level,
        row_cause,
        sharing_rule_id,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tenant_id, ${recordColumn}, subject_type, subject_id, row_cause)
      DO UPDATE SET
        access_level = EXCLUDED.access_level,
        sharing_rule_id = EXCLUDED.sharing_rule_id,
        is_deleted = false
      RETURNING
        id,
        tenant_id as "tenantId",
        '${objectName}' as "objectName",
        ${recordColumn} as "recordId",
        subject_type as "subjectType",
        subject_id as "subjectId",
        access_level as "accessLevel",
        row_cause as "rowCause",
        sharing_rule_id as "sharingRuleId",
        created_at as "createdAt",
        created_by as "createdBy",
        is_deleted as "isDeleted"`,
      [
        tenantId,
        data.recordId,
        data.subjectType,
        data.subjectId,
        data.accessLevel,
        data.rowCause,
        data.sharingRuleId || null,
        userId,
      ]
    );
    return result.rows[0];
  },

  async delete(
    tenantId: string,
    objectName: string,
    recordId: string,
    subjectType: string,
    subjectId: string,
    rowCause?: string
  ): Promise<boolean> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    let query = `UPDATE ${table}
      SET is_deleted = true
      WHERE tenant_id = $1 AND ${recordColumn} = $2 AND subject_type = $3 AND subject_id = $4 AND is_deleted = false`;
    const params: unknown[] = [tenantId, recordId, subjectType, subjectId];

    if (rowCause) {
      query += ` AND row_cause = $5`;
      params.push(rowCause);
    }

    const result = await db.query(query, params);
    return (result.rowCount ?? 0) > 0;
  },

  async deleteByRecord(
    tenantId: string,
    objectName: string,
    recordId: string,
    rowCause?: string
  ): Promise<number> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    let query = `UPDATE ${table}
      SET is_deleted = true
      WHERE tenant_id = $1 AND ${recordColumn} = $2 AND is_deleted = false`;
    const params: unknown[] = [tenantId, recordId];

    if (rowCause) {
      query += ` AND row_cause = $3`;
      params.push(rowCause);
    }

    const result = await db.query(query, params);
    return result.rowCount ?? 0;
  },

  async deleteByRule(
    tenantId: string,
    sharingRuleId: string
  ): Promise<number> {
    // Delete shares from all share tables that were created by this rule
    let totalDeleted = 0;

    for (const [_, info] of Object.entries(SHARE_TABLE_MAP)) {
      const result = await db.query(
        `UPDATE ${info.table}
        SET is_deleted = true
        WHERE tenant_id = $1 AND sharing_rule_id = $2 AND is_deleted = false`,
        [tenantId, sharingRuleId]
      );
      totalDeleted += result.rowCount ?? 0;
    }

    return totalDeleted;
  },

  // Manual sharing (user-initiated)
  async createManualShare(
    tenantId: string,
    objectName: string,
    recordId: string,
    subjectType: "User" | "Role" | "Group",
    subjectId: string,
    accessLevel: "Read" | "ReadWrite",
    userId: string
  ): Promise<ObjectShare> {
    return this.create(
      tenantId,
      objectName,
      {
        recordId,
        subjectType,
        subjectId,
        accessLevel,
        rowCause: "Manual",
      },
      userId
    );
  },

  async deleteManualShare(
    tenantId: string,
    objectName: string,
    recordId: string,
    subjectType: string,
    subjectId: string
  ): Promise<boolean> {
    return this.delete(tenantId, objectName, recordId, subjectType, subjectId, "Manual");
  },

  // Check if user has access to a record
  async hasAccess(
    tenantId: string,
    userId: string,
    objectName: string,
    recordId: string,
    requiredAccess: "Read" | "ReadWrite" = "Read"
  ): Promise<boolean> {
    const result = await db.query(
      `SELECT has_record_access($1, $2, $3, $4, $5) as has_access`,
      [tenantId, userId, objectName, recordId, requiredAccess]
    );
    return result.rows[0]?.has_access ?? false;
  },

  // Get accessible record IDs for a user
  async getAccessibleRecordIds(
    tenantId: string,
    userId: string,
    objectName: string,
    requiredAccess: "Read" | "ReadWrite" = "Read"
  ): Promise<string[]> {
    const { table, recordColumn } = this.getShareTableInfo(objectName);

    // Get user's role and groups for access calculation
    const userInfo = await db.query(
      `SELECT role_id FROM users WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, userId]
    );
    const userRoleId = userInfo.rows[0]?.role_id;

    const userGroups = await db.query(
      `SELECT DISTINCT group_id FROM public_group_members
      WHERE tenant_id = $1 AND member_type = 'User' AND member_id = $2`,
      [tenantId, userId]
    );
    const userGroupIds = userGroups.rows.map(r => r.group_id);

    // Build access conditions
    const accessCondition = requiredAccess === "ReadWrite"
      ? `AND s.access_level = 'ReadWrite'`
      : "";

    // Query for accessible records
    let params: unknown[] = [tenantId, userId];
    let conditions = [`(s.subject_type = 'User' AND s.subject_id = $2)`];
    let paramIndex = 3;

    if (userRoleId) {
      conditions.push(`(s.subject_type = 'Role' AND s.subject_id = $${paramIndex++})`);
      params.push(userRoleId);
    }

    if (userGroupIds.length > 0) {
      conditions.push(`(s.subject_type = 'Group' AND s.subject_id = ANY($${paramIndex++}))`);
      params.push(userGroupIds);
    }

    const result = await db.query(
      `SELECT DISTINCT s.${recordColumn} as record_id
      FROM ${table} s
      WHERE s.tenant_id = $1
        AND s.is_deleted = false
        AND (${conditions.join(" OR ")})
        ${accessCondition}`,
      params
    );

    return result.rows.map(r => r.record_id);
  },
};
