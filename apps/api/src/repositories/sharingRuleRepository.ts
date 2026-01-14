import { db } from "../db/index.js";
import type {
  SharingRule,
  CreateSharingRuleInput,
  UpdateSharingRuleInput,
  PublicGroup,
  CreatePublicGroupInput,
  UpdatePublicGroupInput,
  PublicGroupMember,
} from "../types/index.js";

export const sharingRuleRepository = {
  // Sharing Rules
  async findById(tenantId: string, id: string): Promise<SharingRule | null> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        name,
        object_name as "objectName",
        rule_type as "ruleType",
        description,
        is_active as "isActive",
        source_type as "sourceType",
        source_id as "sourceId",
        target_type as "targetType",
        target_id as "targetId",
        access_level as "accessLevel",
        filter_criteria as "filterCriteria",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM sharing_rules
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, id]
    );
    return result.rows[0] || null;
  },

  async findAll(
    tenantId: string,
    options: { objectName?: string; activeOnly?: boolean } = {}
  ): Promise<SharingRule[]> {
    const conditions = ["tenant_id = $1", "is_deleted = false"];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.objectName) {
      conditions.push(`object_name = $${paramIndex++}`);
      params.push(options.objectName);
    }

    if (options.activeOnly) {
      conditions.push("is_active = true");
    }

    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        name,
        object_name as "objectName",
        rule_type as "ruleType",
        description,
        is_active as "isActive",
        source_type as "sourceType",
        source_id as "sourceId",
        target_type as "targetType",
        target_id as "targetId",
        access_level as "accessLevel",
        filter_criteria as "filterCriteria",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM sharing_rules
      WHERE ${conditions.join(" AND ")}
      ORDER BY object_name, name`,
      params
    );
    return result.rows;
  },

  async findByObject(tenantId: string, objectName: string): Promise<SharingRule[]> {
    return this.findAll(tenantId, { objectName, activeOnly: true });
  },

  async create(
    tenantId: string,
    data: CreateSharingRuleInput,
    userId: string
  ): Promise<SharingRule> {
    const result = await db.query(
      `INSERT INTO sharing_rules (
        tenant_id,
        name,
        object_name,
        rule_type,
        description,
        is_active,
        source_type,
        source_id,
        target_type,
        target_id,
        access_level,
        filter_criteria,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        object_name as "objectName",
        rule_type as "ruleType",
        description,
        is_active as "isActive",
        source_type as "sourceType",
        source_id as "sourceId",
        target_type as "targetType",
        target_id as "targetId",
        access_level as "accessLevel",
        filter_criteria as "filterCriteria",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"`,
      [
        tenantId,
        data.name,
        data.objectName,
        data.ruleType,
        data.description || null,
        data.isActive ?? true,
        data.sourceType || null,
        data.sourceId || null,
        data.targetType,
        data.targetId,
        data.accessLevel || "Read",
        data.filterCriteria ? JSON.stringify(data.filterCriteria) : null,
        userId,
      ]
    );
    return result.rows[0];
  },

  async update(
    tenantId: string,
    id: string,
    data: UpdateSharingRuleInput,
    userId: string,
    etag?: string
  ): Promise<SharingRule | null> {
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
    if (data.sourceType !== undefined) {
      updates.push(`source_type = $${paramIndex++}`);
      params.push(data.sourceType);
    }
    if (data.sourceId !== undefined) {
      updates.push(`source_id = $${paramIndex++}`);
      params.push(data.sourceId);
    }
    if (data.targetType !== undefined) {
      updates.push(`target_type = $${paramIndex++}`);
      params.push(data.targetType);
    }
    if (data.targetId !== undefined) {
      updates.push(`target_id = $${paramIndex++}`);
      params.push(data.targetId);
    }
    if (data.accessLevel !== undefined) {
      updates.push(`access_level = $${paramIndex++}`);
      params.push(data.accessLevel);
    }
    if (data.filterCriteria !== undefined) {
      updates.push(`filter_criteria = $${paramIndex++}`);
      params.push(data.filterCriteria ? JSON.stringify(data.filterCriteria) : null);
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
      `UPDATE sharing_rules
      SET ${updates.join(", ")}
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false${etagCondition}
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        object_name as "objectName",
        rule_type as "ruleType",
        description,
        is_active as "isActive",
        source_type as "sourceType",
        source_id as "sourceId",
        target_type as "targetType",
        target_id as "targetId",
        access_level as "accessLevel",
        filter_criteria as "filterCriteria",
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
    const result = await db.query(
      `UPDATE sharing_rules
      SET is_deleted = true, updated_at = NOW(), updated_by = $3
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // Public Groups
  async findGroupById(tenantId: string, id: string): Promise<PublicGroup | null> {
    const result = await db.query(
      `SELECT
        id,
        tenant_id as "tenantId",
        name,
        description,
        is_active as "isActive",
        does_include_bosses as "doesIncludeBosses",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM public_groups
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, id]
    );
    return result.rows[0] || null;
  },

  async findAllGroups(
    tenantId: string,
    options: { activeOnly?: boolean } = {}
  ): Promise<PublicGroup[]> {
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
        does_include_bosses as "doesIncludeBosses",
        created_at as "createdAt",
        created_by as "createdBy",
        updated_at as "updatedAt",
        updated_by as "updatedBy",
        is_deleted as "isDeleted",
        system_modstamp as "systemModstamp"
      FROM public_groups
      WHERE ${conditions.join(" AND ")}
      ORDER BY name`,
      params
    );
    return result.rows;
  },

  async createGroup(
    tenantId: string,
    data: CreatePublicGroupInput,
    userId: string
  ): Promise<PublicGroup> {
    const result = await db.query(
      `INSERT INTO public_groups (
        tenant_id,
        name,
        description,
        is_active,
        does_include_bosses,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        description,
        is_active as "isActive",
        does_include_bosses as "doesIncludeBosses",
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
        data.doesIncludeBosses ?? false,
        userId,
      ]
    );
    return result.rows[0];
  },

  async updateGroup(
    tenantId: string,
    id: string,
    data: UpdatePublicGroupInput,
    userId: string
  ): Promise<PublicGroup | null> {
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
    if (data.doesIncludeBosses !== undefined) {
      updates.push(`does_include_bosses = $${paramIndex++}`);
      params.push(data.doesIncludeBosses);
    }

    if (updates.length === 0) {
      return this.findGroupById(tenantId, id);
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramIndex++}`);
    params.push(userId);

    const result = await db.query(
      `UPDATE public_groups
      SET ${updates.join(", ")}
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      RETURNING
        id,
        tenant_id as "tenantId",
        name,
        description,
        is_active as "isActive",
        does_include_bosses as "doesIncludeBosses",
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

  async deleteGroup(tenantId: string, id: string, userId: string): Promise<boolean> {
    // Remove all members first
    await db.query(
      `DELETE FROM public_group_members WHERE tenant_id = $1 AND group_id = $2`,
      [tenantId, id]
    );

    const result = await db.query(
      `UPDATE public_groups
      SET is_deleted = true, updated_at = NOW(), updated_by = $3
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
      [tenantId, id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  // Group Members
  async getGroupMembers(tenantId: string, groupId: string): Promise<PublicGroupMember[]> {
    const result = await db.query(
      `SELECT
        pgm.id,
        pgm.tenant_id as "tenantId",
        pgm.group_id as "groupId",
        pgm.member_type as "memberType",
        pgm.member_id as "memberId",
        pgm.created_at as "createdAt",
        pgm.created_by as "createdBy",
        CASE
          WHEN pgm.member_type = 'User' THEN u.display_name
          WHEN pgm.member_type IN ('Role', 'RoleAndSubordinates') THEN r.name
          WHEN pgm.member_type = 'Group' THEN pg.name
        END as "memberName"
      FROM public_group_members pgm
      LEFT JOIN users u ON pgm.member_type = 'User' AND u.id = pgm.member_id
      LEFT JOIN roles r ON pgm.member_type IN ('Role', 'RoleAndSubordinates') AND r.id = pgm.member_id
      LEFT JOIN public_groups pg ON pgm.member_type = 'Group' AND pg.id = pgm.member_id
      WHERE pgm.tenant_id = $1 AND pgm.group_id = $2
      ORDER BY pgm.member_type, "memberName"`,
      [tenantId, groupId]
    );
    return result.rows;
  },

  async addGroupMember(
    tenantId: string,
    groupId: string,
    memberType: "User" | "Role" | "RoleAndSubordinates" | "Group",
    memberId: string,
    userId: string
  ): Promise<PublicGroupMember> {
    const result = await db.query(
      `INSERT INTO public_group_members (
        tenant_id,
        group_id,
        member_type,
        member_id,
        created_by
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tenant_id, group_id, member_type, member_id) DO NOTHING
      RETURNING
        id,
        tenant_id as "tenantId",
        group_id as "groupId",
        member_type as "memberType",
        member_id as "memberId",
        created_at as "createdAt",
        created_by as "createdBy"`,
      [tenantId, groupId, memberType, memberId, userId]
    );

    if (result.rows.length === 0) {
      // Already exists, fetch existing
      const existing = await db.query(
        `SELECT
          id,
          tenant_id as "tenantId",
          group_id as "groupId",
          member_type as "memberType",
          member_id as "memberId",
          created_at as "createdAt",
          created_by as "createdBy"
        FROM public_group_members
        WHERE tenant_id = $1 AND group_id = $2 AND member_type = $3 AND member_id = $4`,
        [tenantId, groupId, memberType, memberId]
      );
      return existing.rows[0];
    }
    return result.rows[0];
  },

  async removeGroupMember(
    tenantId: string,
    groupId: string,
    memberType: string,
    memberId: string
  ): Promise<boolean> {
    const result = await db.query(
      `DELETE FROM public_group_members
      WHERE tenant_id = $1 AND group_id = $2 AND member_type = $3 AND member_id = $4`,
      [tenantId, groupId, memberType, memberId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
