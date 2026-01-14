import { BaseRepository, type ListParams, type AccessFilter } from "./baseRepository.js";
import { query } from "../db/connection.js";
import type { Campaign, PaginatedResponse } from "../types/index.js";

export class CampaignRepository extends BaseRepository<Campaign> {
  protected tableName = "campaigns";
  protected trackableObjectName = "Campaign" as const;
  protected columns = [
    "id",
    "tenant_id",
    "owner_id",
    "name",
    "type",
    "status",
    "description",
    "start_date",
    "end_date",
    "budgeted_cost",
    "actual_cost",
    "expected_revenue",
    "expected_response",
    "number_sent",
    "number_of_leads",
    "number_of_converted_leads",
    "number_of_contacts",
    "number_of_responses",
    "number_of_opportunities",
    "amount_all_opportunities",
    "amount_won_opportunities",
    "parent_campaign_id",
    "is_active",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "is_deleted",
    "system_modstamp",
  ];

  async list(
    tenantId: string,
    params: ListParams = {},
    accessFilter?: AccessFilter | null
  ): Promise<PaginatedResponse<Campaign>> {
    const {
      limit = 50,
      cursor,
      orderBy = "created_at",
      orderDir = "DESC",
      filters = {},
      search,
    } = params;

    const conditions: string[] = ["c.tenant_id = $1", "c.is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    // Add access filter
    if (accessFilter) {
      const adjustedClause = accessFilter.clause.replace(/owner_id/g, "c.owner_id");
      conditions.push(adjustedClause);
      values.push(...accessFilter.params);
      paramIndex = accessFilter.paramOffset;
    }

    // Search
    if (search) {
      conditions.push(`(c.name ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    // Cursor
    if (cursor) {
      conditions.push(`c.created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    // Filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== "") {
        const snakeKey = this.toSnakeCase(key);
        conditions.push(`c.${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    const whereClause = conditions.join(" AND ");

    // Count
    const countSql = `SELECT COUNT(*) FROM campaigns c WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Select with JOIN for owner and parent campaign names
    const sql = `
      SELECT
        c.id,
        c.tenant_id,
        c.owner_id,
        c.name,
        c.type,
        c.status,
        c.description,
        c.start_date,
        c.end_date,
        c.budgeted_cost,
        c.actual_cost,
        c.expected_revenue,
        c.expected_response,
        c.number_sent,
        c.number_of_leads,
        c.number_of_converted_leads,
        c.number_of_contacts,
        c.number_of_responses,
        c.number_of_opportunities,
        c.amount_all_opportunities,
        c.amount_won_opportunities,
        c.parent_campaign_id,
        c.is_active,
        c.created_at,
        c.created_by,
        c.updated_at,
        c.updated_by,
        c.is_deleted,
        c.system_modstamp,
        u.display_name as owner_name,
        pc.name as parent_campaign_name
      FROM campaigns c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN campaigns pc ON c.parent_campaign_id = pc.id AND pc.is_deleted = false
      WHERE ${whereClause}
      ORDER BY c.${orderBy} ${orderDir}
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<Campaign>(sql, values);
    const records = result.rows.slice(0, limit);
    const hasMore = result.rows.length > limit;

    return {
      records: records.map((r) => this.mapFromDb(r)),
      totalSize,
      nextCursor: hasMore ? records[records.length - 1].createdAt.toISOString() : undefined,
    };
  }

  async findById(tenantId: string, id: string): Promise<Campaign | null> {
    const sql = `
      SELECT
        c.id,
        c.tenant_id,
        c.owner_id,
        c.name,
        c.type,
        c.status,
        c.description,
        c.start_date,
        c.end_date,
        c.budgeted_cost,
        c.actual_cost,
        c.expected_revenue,
        c.expected_response,
        c.number_sent,
        c.number_of_leads,
        c.number_of_converted_leads,
        c.number_of_contacts,
        c.number_of_responses,
        c.number_of_opportunities,
        c.amount_all_opportunities,
        c.amount_won_opportunities,
        c.parent_campaign_id,
        c.is_active,
        c.created_at,
        c.created_by,
        c.updated_at,
        c.updated_by,
        c.is_deleted,
        c.system_modstamp,
        u.display_name as owner_name,
        pc.name as parent_campaign_name
      FROM campaigns c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN campaigns pc ON c.parent_campaign_id = pc.id AND pc.is_deleted = false
      WHERE c.tenant_id = $1 AND c.id = $2 AND c.is_deleted = false
    `;
    const result = await query<Campaign>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async findByParentCampaignId(
    tenantId: string,
    parentCampaignId: string,
    accessFilter?: AccessFilter | null
  ): Promise<Campaign[]> {
    const conditions: string[] = [
      "c.tenant_id = $1",
      "c.parent_campaign_id = $2",
      "c.is_deleted = false",
    ];
    const values: unknown[] = [tenantId, parentCampaignId];
    let paramIndex = 3;

    if (accessFilter) {
      const adjustedClause = accessFilter.clause.replace(/owner_id/g, "c.owner_id");
      conditions.push(adjustedClause);
      values.push(...accessFilter.params);
      paramIndex = accessFilter.paramOffset;
    }

    const sql = `
      SELECT
        c.id,
        c.tenant_id,
        c.owner_id,
        c.name,
        c.type,
        c.status,
        c.description,
        c.start_date,
        c.end_date,
        c.budgeted_cost,
        c.actual_cost,
        c.expected_revenue,
        c.expected_response,
        c.number_sent,
        c.number_of_leads,
        c.number_of_converted_leads,
        c.number_of_contacts,
        c.number_of_responses,
        c.number_of_opportunities,
        c.amount_all_opportunities,
        c.amount_won_opportunities,
        c.parent_campaign_id,
        c.is_active,
        c.created_at,
        c.created_by,
        c.updated_at,
        c.updated_by,
        c.is_deleted,
        c.system_modstamp,
        u.display_name as owner_name,
        pc.name as parent_campaign_name
      FROM campaigns c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN campaigns pc ON c.parent_campaign_id = pc.id AND pc.is_deleted = false
      WHERE ${conditions.join(" AND ")}
      ORDER BY c.created_at DESC
    `;

    const result = await query<Campaign>(sql, values);
    return result.rows.map((r) => this.mapFromDb(r));
  }

  async updateStats(tenantId: string, campaignId: string): Promise<void> {
    // Update campaign statistics based on campaign members and related opportunities
    const sql = `
      UPDATE campaigns
      SET
        number_of_leads = (
          SELECT COUNT(*) FROM campaign_members
          WHERE campaign_id = $2 AND member_type = 'Lead' AND is_deleted = false
        ),
        number_of_contacts = (
          SELECT COUNT(*) FROM campaign_members
          WHERE campaign_id = $2 AND member_type = 'Contact' AND is_deleted = false
        ),
        number_of_responses = (
          SELECT COUNT(*) FROM campaign_members
          WHERE campaign_id = $2 AND has_responded = true AND is_deleted = false
        ),
        updated_at = NOW(),
        system_modstamp = uuid_generate_v4()
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    await query(sql, [tenantId, campaignId]);
  }
}

export const campaignRepository = new CampaignRepository();
