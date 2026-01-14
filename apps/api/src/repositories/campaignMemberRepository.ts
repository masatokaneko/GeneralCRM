import { v4 as uuidv4 } from "uuid";
import { query } from "../db/connection.js";
import { NotFoundError, ConflictError, ValidationError } from "../middleware/errorHandler.js";
import type {
  CampaignMember,
  CreateCampaignMemberInput,
  UpdateCampaignMemberInput,
  PaginatedResponse,
} from "../types/index.js";

interface ListParams {
  limit?: number;
  cursor?: string;
  campaignId?: string;
  memberType?: string;
  status?: string;
}

export class CampaignMemberRepository {
  async findById(tenantId: string, id: string): Promise<CampaignMember | null> {
    const sql = `
      SELECT
        cm.id,
        cm.tenant_id,
        cm.campaign_id,
        cm.member_type,
        cm.member_id,
        cm.status,
        cm.first_responded_date,
        cm.has_responded,
        cm.description,
        cm.created_at,
        cm.created_by,
        cm.updated_at,
        cm.updated_by,
        cm.is_deleted,
        cm.system_modstamp,
        c.name as campaign_name,
        CASE
          WHEN cm.member_type = 'Lead' THEN CONCAT(l.first_name, ' ', l.last_name)
          WHEN cm.member_type = 'Contact' THEN CONCAT(ct.first_name, ' ', ct.last_name)
        END as member_name,
        CASE
          WHEN cm.member_type = 'Lead' THEN l.email
          WHEN cm.member_type = 'Contact' THEN ct.email
        END as member_email
      FROM campaign_members cm
      JOIN campaigns c ON cm.campaign_id = c.id
      LEFT JOIN leads l ON cm.member_type = 'Lead' AND cm.member_id = l.id
      LEFT JOIN contacts ct ON cm.member_type = 'Contact' AND cm.member_id = ct.id
      WHERE cm.tenant_id = $1 AND cm.id = $2 AND cm.is_deleted = false
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<CampaignMember> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError("campaign_members", id);
    }
    return record;
  }

  async list(
    tenantId: string,
    params: ListParams = {}
  ): Promise<PaginatedResponse<CampaignMember>> {
    const { limit = 50, cursor, campaignId, memberType, status } = params;

    const conditions: string[] = ["cm.tenant_id = $1", "cm.is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (campaignId) {
      conditions.push(`cm.campaign_id = $${paramIndex}`);
      values.push(campaignId);
      paramIndex++;
    }

    if (memberType) {
      conditions.push(`cm.member_type = $${paramIndex}`);
      values.push(memberType);
      paramIndex++;
    }

    if (status) {
      conditions.push(`cm.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`cm.created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Count
    const countSql = `SELECT COUNT(*) FROM campaign_members cm WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Select
    const sql = `
      SELECT
        cm.id,
        cm.tenant_id,
        cm.campaign_id,
        cm.member_type,
        cm.member_id,
        cm.status,
        cm.first_responded_date,
        cm.has_responded,
        cm.description,
        cm.created_at,
        cm.created_by,
        cm.updated_at,
        cm.updated_by,
        cm.is_deleted,
        cm.system_modstamp,
        c.name as campaign_name,
        CASE
          WHEN cm.member_type = 'Lead' THEN CONCAT(l.first_name, ' ', l.last_name)
          WHEN cm.member_type = 'Contact' THEN CONCAT(ct.first_name, ' ', ct.last_name)
        END as member_name,
        CASE
          WHEN cm.member_type = 'Lead' THEN l.email
          WHEN cm.member_type = 'Contact' THEN ct.email
        END as member_email
      FROM campaign_members cm
      JOIN campaigns c ON cm.campaign_id = c.id
      LEFT JOIN leads l ON cm.member_type = 'Lead' AND cm.member_id = l.id
      LEFT JOIN contacts ct ON cm.member_type = 'Contact' AND cm.member_id = ct.id
      WHERE ${whereClause}
      ORDER BY cm.created_at DESC
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<Record<string, unknown>>(sql, values);
    const rawRecords = result.rows.slice(0, limit);
    const hasMore = result.rows.length > limit;
    const mappedRecords = rawRecords.map((r) => this.mapFromDb(r));

    return {
      records: mappedRecords,
      totalSize,
      nextCursor: hasMore ? mappedRecords[mappedRecords.length - 1].createdAt.toISOString() : undefined,
    };
  }

  async findByCampaignId(tenantId: string, campaignId: string): Promise<CampaignMember[]> {
    const result = await this.list(tenantId, { campaignId, limit: 1000 });
    return result.records;
  }

  async findByMember(
    tenantId: string,
    memberType: string,
    memberId: string
  ): Promise<CampaignMember[]> {
    const sql = `
      SELECT
        cm.id,
        cm.tenant_id,
        cm.campaign_id,
        cm.member_type,
        cm.member_id,
        cm.status,
        cm.first_responded_date,
        cm.has_responded,
        cm.description,
        cm.created_at,
        cm.created_by,
        cm.updated_at,
        cm.updated_by,
        cm.is_deleted,
        cm.system_modstamp,
        c.name as campaign_name
      FROM campaign_members cm
      JOIN campaigns c ON cm.campaign_id = c.id AND c.is_deleted = false
      WHERE cm.tenant_id = $1 AND cm.member_type = $2 AND cm.member_id = $3 AND cm.is_deleted = false
      ORDER BY cm.created_at DESC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, memberType, memberId]);
    return result.rows.map((r) => this.mapFromDb(r));
  }

  async create(
    tenantId: string,
    userId: string,
    data: CreateCampaignMemberInput
  ): Promise<CampaignMember> {
    // Check for existing member
    const existsCheck = await query<{ id: string }>(
      `SELECT id FROM campaign_members
       WHERE tenant_id = $1 AND campaign_id = $2 AND member_type = $3 AND member_id = $4 AND is_deleted = false`,
      [tenantId, data.campaignId, data.memberType, data.memberId]
    );

    if (existsCheck.rows.length > 0) {
      throw new ValidationError([
        { field: "memberId", message: "This member is already part of the campaign." },
      ]);
    }

    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO campaign_members (
        id, tenant_id, campaign_id, member_type, member_id, status, description,
        has_responded, created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      id,
      tenantId,
      data.campaignId,
      data.memberType,
      data.memberId,
      data.status || "Sent",
      data.description || null,
      false,
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ];

    const result = await query<{ id: string }>(sql, values);
    return this.findById(tenantId, result.rows[0].id) as Promise<CampaignMember>;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: UpdateCampaignMemberInput,
    etag?: string
  ): Promise<CampaignMember> {
    const existing = await this.findByIdOrThrow(tenantId, id);

    if (etag && existing.systemModstamp !== etag) {
      throw new ConflictError(`CampaignMember ${id} was modified by another user`);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(data.status);
      paramIndex++;

      // If status indicates response, update response tracking
      if (["Responded", "Clicked", "Converted"].includes(data.status)) {
        updates.push(`has_responded = true`);
        if (!existing.firstRespondedDate) {
          updates.push(`first_responded_date = NOW()`);
        }
      }
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(data.description);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramIndex}`);
    values.push(userId);
    paramIndex++;
    updates.push(`system_modstamp = uuid_generate_v4()`);

    values.push(tenantId, id);

    const sql = `
      UPDATE campaign_members
      SET ${updates.join(", ")}
      WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1} AND is_deleted = false
      RETURNING *
    `;

    await query(sql, values);
    return this.findById(tenantId, id) as Promise<CampaignMember>;
  }

  async delete(tenantId: string, userId: string, id: string): Promise<void> {
    await this.findByIdOrThrow(tenantId, id);

    const sql = `
      UPDATE campaign_members
      SET is_deleted = true, updated_at = NOW(), updated_by = $3, system_modstamp = uuid_generate_v4()
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    await query(sql, [tenantId, id, userId]);
  }

  private mapFromDb(row: Record<string, unknown>): CampaignMember {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      campaignId: row.campaign_id as string,
      memberType: row.member_type as CampaignMember["memberType"],
      memberId: row.member_id as string,
      status: row.status as CampaignMember["status"],
      firstRespondedDate: row.first_responded_date
        ? new Date(row.first_responded_date as string)
        : undefined,
      hasResponded: row.has_responded as boolean,
      description: row.description as string | undefined,
      createdAt: new Date(row.created_at as string),
      createdBy: row.created_by as string,
      updatedAt: new Date(row.updated_at as string),
      updatedBy: row.updated_by as string,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
      campaignName: row.campaign_name as string | undefined,
      memberName: row.member_name as string | undefined,
      memberEmail: row.member_email as string | undefined,
    };
  }
}

export const campaignMemberRepository = new CampaignMemberRepository();
