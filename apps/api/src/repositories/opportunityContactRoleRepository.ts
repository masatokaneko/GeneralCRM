import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ConflictError } from "../middleware/errorHandler.js";
import type { OpportunityContactRole, PaginatedResponse } from "../types/index.js";

export class OpportunityContactRoleRepository {
  private tableName = "opportunity_contact_roles";

  async findById(
    tenantId: string,
    id: string
  ): Promise<OpportunityContactRole | null> {
    const sql = `
      SELECT
        ocr.id,
        ocr.tenant_id,
        ocr.opportunity_id,
        ocr.contact_id,
        ocr.role,
        ocr.is_primary,
        ocr.influence_level,
        ocr.stance,
        ocr.created_at,
        ocr.created_by,
        ocr.updated_at,
        ocr.updated_by,
        ocr.is_deleted,
        ocr.system_modstamp,
        CONCAT(c.first_name, ' ', c.last_name) as contact_name,
        c.email as contact_email,
        c.title as contact_title
      FROM ${this.tableName} ocr
      LEFT JOIN contacts c ON ocr.contact_id = c.id
      WHERE ocr.tenant_id = $1 AND ocr.id = $2 AND ocr.is_deleted = false
    `;
    const result = await query<OpportunityContactRole>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async listByOpportunity(
    tenantId: string,
    opportunityId: string
  ): Promise<PaginatedResponse<OpportunityContactRole>> {
    const sql = `
      SELECT
        ocr.id,
        ocr.tenant_id,
        ocr.opportunity_id,
        ocr.contact_id,
        ocr.role,
        ocr.is_primary,
        ocr.influence_level,
        ocr.stance,
        ocr.created_at,
        ocr.created_by,
        ocr.updated_at,
        ocr.updated_by,
        ocr.is_deleted,
        ocr.system_modstamp,
        CONCAT(c.first_name, ' ', c.last_name) as contact_name,
        c.email as contact_email,
        c.title as contact_title
      FROM ${this.tableName} ocr
      LEFT JOIN contacts c ON ocr.contact_id = c.id
      WHERE ocr.tenant_id = $1 AND ocr.opportunity_id = $2 AND ocr.is_deleted = false
      ORDER BY ocr.is_primary DESC, ocr.created_at ASC
    `;
    const result = await query<OpportunityContactRole>(sql, [
      tenantId,
      opportunityId,
    ]);

    return {
      records: result.rows.map((r) => this.mapFromDb(r)),
      totalSize: result.rows.length,
    };
  }

  async listByContact(
    tenantId: string,
    contactId: string
  ): Promise<PaginatedResponse<OpportunityContactRole>> {
    const sql = `
      SELECT
        ocr.id,
        ocr.tenant_id,
        ocr.opportunity_id,
        ocr.contact_id,
        ocr.role,
        ocr.is_primary,
        ocr.influence_level,
        ocr.stance,
        ocr.created_at,
        ocr.created_by,
        ocr.updated_at,
        ocr.updated_by,
        ocr.is_deleted,
        ocr.system_modstamp,
        CONCAT(c.first_name, ' ', c.last_name) as contact_name,
        c.email as contact_email,
        c.title as contact_title
      FROM ${this.tableName} ocr
      LEFT JOIN contacts c ON ocr.contact_id = c.id
      WHERE ocr.tenant_id = $1 AND ocr.contact_id = $2 AND ocr.is_deleted = false
      ORDER BY ocr.created_at DESC
    `;
    const result = await query<OpportunityContactRole>(sql, [
      tenantId,
      contactId,
    ]);

    return {
      records: result.rows.map((r) => this.mapFromDb(r)),
      totalSize: result.rows.length,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<OpportunityContactRole>
  ): Promise<OpportunityContactRole> {
    return transaction(async (client) => {
      const id = uuidv4();
      const now = new Date();
      const systemModstamp = uuidv4();

      // Check if contact already exists for this opportunity
      const existingCheck = await client.query(
        `SELECT id FROM ${this.tableName}
         WHERE tenant_id = $1 AND opportunity_id = $2 AND contact_id = $3 AND is_deleted = false`,
        [tenantId, data.opportunityId, data.contactId]
      );
      if (existingCheck.rows.length > 0) {
        throw new ConflictError("Contact is already associated with this opportunity");
      }

      // If setting as primary, unset any existing primary
      if (data.isPrimary) {
        await client.query(
          `UPDATE ${this.tableName}
           SET is_primary = false, updated_at = $3, updated_by = $4
           WHERE tenant_id = $1 AND opportunity_id = $2 AND is_primary = true AND is_deleted = false`,
          [tenantId, data.opportunityId, now, userId]
        );
      }

      const sql = `
        INSERT INTO ${this.tableName} (
          id, tenant_id, opportunity_id, contact_id, role, is_primary,
          influence_level, stance,
          created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await client.query(sql, [
        id,
        tenantId,
        data.opportunityId,
        data.contactId,
        data.role || "Other",
        data.isPrimary || false,
        data.influenceLevel || null,
        data.stance || null,
        now,
        userId,
        now,
        userId,
        false,
        systemModstamp,
      ]);

      return this.mapFromDb(result.rows[0]);
    });
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<OpportunityContactRole>,
    etag?: string
  ): Promise<OpportunityContactRole> {
    return transaction(async (client) => {
      const checkSql = `
        SELECT * FROM ${this.tableName}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError(this.tableName, id);
      }

      const existing = checkResult.rows[0];

      if (etag && existing.system_modstamp !== etag) {
        throw new Error("Record was modified by another user");
      }

      const now = new Date();
      const newModstamp = uuidv4();

      // If setting as primary, unset any existing primary
      if (data.isPrimary && !existing.is_primary) {
        await client.query(
          `UPDATE ${this.tableName}
           SET is_primary = false, updated_at = $3, updated_by = $4
           WHERE tenant_id = $1 AND opportunity_id = $2 AND is_primary = true AND is_deleted = false`,
          [tenantId, existing.opportunity_id, now, userId]
        );
      }

      const updateFields: string[] = [];
      const values: unknown[] = [tenantId, id];
      let paramIndex = 3;

      if (data.role !== undefined) {
        updateFields.push(`role = $${paramIndex++}`);
        values.push(data.role);
      }
      if (data.isPrimary !== undefined) {
        updateFields.push(`is_primary = $${paramIndex++}`);
        values.push(data.isPrimary);
      }
      if (data.influenceLevel !== undefined) {
        updateFields.push(`influence_level = $${paramIndex++}`);
        values.push(data.influenceLevel);
      }
      if (data.stance !== undefined) {
        updateFields.push(`stance = $${paramIndex++}`);
        values.push(data.stance);
      }

      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(now);
      updateFields.push(`updated_by = $${paramIndex++}`);
      values.push(userId);
      updateFields.push(`system_modstamp = $${paramIndex++}`);
      values.push(newModstamp);

      const sql = `
        UPDATE ${this.tableName}
        SET ${updateFields.join(", ")}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING *
      `;

      const result = await client.query(sql, values);
      return this.mapFromDb(result.rows[0]);
    });
  }

  async delete(tenantId: string, userId: string, id: string): Promise<void> {
    const sql = `
      UPDATE ${this.tableName}
      SET is_deleted = true, updated_at = $3, updated_by = $4
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query(sql, [tenantId, id, new Date(), userId]);

    if (result.rowCount === 0) {
      throw new NotFoundError(this.tableName, id);
    }
  }

  async setPrimary(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<OpportunityContactRole> {
    return transaction(async (client) => {
      const checkSql = `
        SELECT * FROM ${this.tableName}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError(this.tableName, id);
      }

      const existing = checkResult.rows[0];
      const now = new Date();
      const newModstamp = uuidv4();

      // Unset any existing primary for this opportunity
      await client.query(
        `UPDATE ${this.tableName}
         SET is_primary = false, updated_at = $3, updated_by = $4
         WHERE tenant_id = $1 AND opportunity_id = $2 AND is_primary = true AND is_deleted = false`,
        [tenantId, existing.opportunity_id, now, userId]
      );

      // Set this one as primary
      const sql = `
        UPDATE ${this.tableName}
        SET is_primary = true, updated_at = $3, updated_by = $4, system_modstamp = $5
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING *
      `;
      const result = await client.query(sql, [tenantId, id, now, userId, newModstamp]);
      return this.mapFromDb(result.rows[0]);
    });
  }

  private mapFromDb(row: OpportunityContactRole): OpportunityContactRole {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as unknown as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      mapped[camelKey] = value;
    }
    return mapped as unknown as OpportunityContactRole;
  }
}

export const opportunityContactRoleRepository = new OpportunityContactRoleRepository();
