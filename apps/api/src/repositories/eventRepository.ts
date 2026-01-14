import { v4 as uuidv4 } from "uuid";
import { query } from "../db/connection.js";
import { fieldHistoryService } from "../services/fieldHistoryService.js";
import type { Event, PaginatedResponse } from "../types/index.js";
import type { AccessFilter } from "../services/accessibleIdsService.js";

export interface EventListParams {
  ownerId?: string;
  whoType?: string;
  whoId?: string;
  whatType?: string;
  whatId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

class EventRepository {
  private toRecord(row: Record<string, unknown>): Event {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      ownerId: row.owner_id as string | undefined,
      subject: row.subject as string,
      startDateTime: new Date(row.start_date_time as string),
      endDateTime: new Date(row.end_date_time as string),
      isAllDayEvent: row.is_all_day_event as boolean,
      location: row.location as string | undefined,
      whoType: row.who_type as Event["whoType"],
      whoId: row.who_id as string | undefined,
      whatType: row.what_type as Event["whatType"],
      whatId: row.what_id as string | undefined,
      description: row.description as string | undefined,
      createdAt: new Date(row.created_at as string),
      createdBy: row.created_by as string,
      updatedAt: new Date(row.updated_at as string),
      updatedBy: row.updated_by as string,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
      ownerName: row.owner_name as string | undefined,
      whoName: row.who_name as string | undefined,
      whatName: row.what_name as string | undefined,
    };
  }

  async list(
    tenantId: string,
    params: EventListParams = {},
    accessFilter?: AccessFilter | null
  ): Promise<PaginatedResponse<Event>> {
    const {
      ownerId,
      whoType,
      whoId,
      whatType,
      whatId,
      startDateFrom,
      startDateTo,
      limit = 50,
      offset = 0,
      sortBy = "start_date_time",
      sortOrder = "asc",
    } = params;

    const conditions: string[] = ["e.tenant_id = $1", "e.is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (ownerId) {
      conditions.push(`e.owner_id = $${paramIndex++}`);
      values.push(ownerId);
    }
    if (whoType) {
      conditions.push(`e.who_type = $${paramIndex++}`);
      values.push(whoType);
    }
    if (whoId) {
      conditions.push(`e.who_id = $${paramIndex++}`);
      values.push(whoId);
    }
    if (whatType) {
      conditions.push(`e.what_type = $${paramIndex++}`);
      values.push(whatType);
    }
    if (whatId) {
      conditions.push(`e.what_id = $${paramIndex++}`);
      values.push(whatId);
    }
    if (startDateFrom) {
      conditions.push(`e.start_date_time >= $${paramIndex++}`);
      values.push(startDateFrom);
    }
    if (startDateTo) {
      conditions.push(`e.start_date_time <= $${paramIndex++}`);
      values.push(startDateTo);
    }

    // Apply access filter for record-level permissions
    if (accessFilter) {
      // Replace column references to use 'e.' alias
      const aliasedClause = accessFilter.clause.replace(/\b(owner_id|id)\b/g, "e.$1");
      conditions.push(aliasedClause);
      values.push(...accessFilter.params);
      paramIndex += accessFilter.params.length;
    }

    const whereClause = conditions.join(" AND ");
    const validSortColumns = ["created_at", "updated_at", "subject", "start_date_time", "end_date_time"];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "start_date_time";
    const order = sortOrder === "asc" ? "ASC" : "DESC";

    // Count query
    const countResult = await query(
      `SELECT COUNT(*) as count FROM events e WHERE ${whereClause}`,
      values
    );
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Data query with joins for names
    const dataQuery = `
      SELECT
        e.*,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name,
        CASE
          WHEN e.who_type = 'Lead' THEN (SELECT CONCAT(first_name, ' ', last_name) FROM leads WHERE id = e.who_id AND tenant_id = e.tenant_id)
          WHEN e.who_type = 'Contact' THEN (SELECT CONCAT(first_name, ' ', last_name) FROM contacts WHERE id = e.who_id AND tenant_id = e.tenant_id)
        END as who_name,
        CASE
          WHEN e.what_type = 'Account' THEN (SELECT name FROM accounts WHERE id = e.what_id AND tenant_id = e.tenant_id)
          WHEN e.what_type = 'Opportunity' THEN (SELECT name FROM opportunities WHERE id = e.what_id AND tenant_id = e.tenant_id)
          WHEN e.what_type = 'Quote' THEN (SELECT name FROM quotes WHERE id = e.what_id AND tenant_id = e.tenant_id)
        END as what_name
      FROM events e
      LEFT JOIN users u ON e.owner_id = u.id AND u.tenant_id = e.tenant_id
      WHERE ${whereClause}
      ORDER BY e.${sortColumn} ${order}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(limit, offset);
    const dataResult = await query(dataQuery, values);

    return {
      records: dataResult.rows.map((row) => this.toRecord(row)),
      totalSize,
    };
  }

  async findById(tenantId: string, id: string): Promise<Event | null> {
    const result = await query(
      `
      SELECT
        e.*,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name,
        CASE
          WHEN e.who_type = 'Lead' THEN (SELECT CONCAT(first_name, ' ', last_name) FROM leads WHERE id = e.who_id AND tenant_id = e.tenant_id)
          WHEN e.who_type = 'Contact' THEN (SELECT CONCAT(first_name, ' ', last_name) FROM contacts WHERE id = e.who_id AND tenant_id = e.tenant_id)
        END as who_name,
        CASE
          WHEN e.what_type = 'Account' THEN (SELECT name FROM accounts WHERE id = e.what_id AND tenant_id = e.tenant_id)
          WHEN e.what_type = 'Opportunity' THEN (SELECT name FROM opportunities WHERE id = e.what_id AND tenant_id = e.tenant_id)
          WHEN e.what_type = 'Quote' THEN (SELECT name FROM quotes WHERE id = e.what_id AND tenant_id = e.tenant_id)
        END as what_name
      FROM events e
      LEFT JOIN users u ON e.owner_id = u.id AND u.tenant_id = e.tenant_id
      WHERE e.tenant_id = $1 AND e.id = $2 AND e.is_deleted = false
      `,
      [tenantId, id]
    );
    return result.rows.length > 0 ? this.toRecord(result.rows[0]) : null;
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<Event>
  ): Promise<Event> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const result = await query(
      `
      INSERT INTO events (
        id, tenant_id, owner_id, subject, start_date_time, end_date_time,
        is_all_day_event, location, who_type, who_id, what_type, what_id,
        description,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
      `,
      [
        id,
        tenantId,
        data.ownerId || userId,
        data.subject,
        data.startDateTime,
        data.endDateTime,
        data.isAllDayEvent || false,
        data.location || null,
        data.whoType || null,
        data.whoId || null,
        data.whatType || null,
        data.whatId || null,
        data.description || null,
        now,
        userId,
        now,
        userId,
        false,
        systemModstamp,
      ]
    );

    return this.findById(tenantId, result.rows[0].id) as Promise<Event>;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<Event>,
    etag?: string
  ): Promise<Event> {
    // Get current record
    const current = await this.findById(tenantId, id);
    if (!current) {
      throw new Error("Event not found");
    }

    if (etag && current.systemModstamp !== etag) {
      const error = new Error("Record has been modified by another user");
      (error as Error & { statusCode: number }).statusCode = 409;
      throw error;
    }

    const newSystemModstamp = uuidv4();
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateableFields: Array<keyof Event> = [
      "ownerId",
      "subject",
      "startDateTime",
      "endDateTime",
      "isAllDayEvent",
      "location",
      "whoType",
      "whoId",
      "whatType",
      "whatId",
      "description",
    ];

    const fieldMap: Record<string, string> = {
      ownerId: "owner_id",
      subject: "subject",
      startDateTime: "start_date_time",
      endDateTime: "end_date_time",
      isAllDayEvent: "is_all_day_event",
      location: "location",
      whoType: "who_type",
      whoId: "who_id",
      whatType: "what_type",
      whatId: "what_id",
      description: "description",
    };

    for (const field of updateableFields) {
      if (data[field] !== undefined) {
        updates.push(`${fieldMap[field]} = $${paramIndex++}`);
        values.push(data[field]);
      }
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(userId);
    updates.push(`system_modstamp = $${paramIndex++}`);
    values.push(newSystemModstamp);

    values.push(tenantId, id);

    await query(
      `UPDATE events SET ${updates.join(", ")} WHERE tenant_id = $${paramIndex++} AND id = $${paramIndex++}`,
      values
    );

    const updatedRecord = await this.findById(tenantId, id) as Event;

    // Track field history
    try {
      await fieldHistoryService.trackChanges(
        tenantId,
        userId,
        "Event",
        id,
        current as unknown as Record<string, unknown>,
        updatedRecord as unknown as Record<string, unknown>
      );
    } catch (error) {
      console.error("Field history tracking failed for Event:", error);
    }

    return updatedRecord;
  }

  async delete(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<void> {
    await query(
      `UPDATE events SET is_deleted = true, updated_at = NOW(), updated_by = $1, system_modstamp = $4
       WHERE tenant_id = $2 AND id = $3`,
      [userId, tenantId, id, uuidv4()]
    );
  }

  async listByRelatedRecord(
    tenantId: string,
    relatedType: "who" | "what",
    objectType: string,
    objectId: string,
    limit = 10
  ): Promise<Event[]> {
    const typeColumn = relatedType === "who" ? "who_type" : "what_type";
    const idColumn = relatedType === "who" ? "who_id" : "what_id";

    const result = await query(
      `
      SELECT
        e.*,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name
      FROM events e
      LEFT JOIN users u ON e.owner_id = u.id AND u.tenant_id = e.tenant_id
      WHERE e.tenant_id = $1 AND e.${typeColumn} = $2 AND e.${idColumn} = $3 AND e.is_deleted = false
      ORDER BY e.start_date_time DESC
      LIMIT $4
      `,
      [tenantId, objectType, objectId, limit]
    );

    return result.rows.map((row) => this.toRecord(row));
  }
}

export const eventRepository = new EventRepository();
