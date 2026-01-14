import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError } from "../middleware/errorHandler.js";
import type { OpportunityLineItem, PaginatedResponse } from "../types/index.js";

export class OpportunityLineItemRepository {
  private tableName = "opportunity_line_items";

  async findById(
    tenantId: string,
    id: string
  ): Promise<OpportunityLineItem | null> {
    const sql = `
      SELECT
        oli.id,
        oli.tenant_id,
        oli.opportunity_id,
        oli.pricebook_entry_id,
        oli.product_id,
        oli.quantity,
        oli.unit_price,
        oli.customer_unit_price,
        oli.discount,
        oli.term_months,
        oli.billing_frequency,
        oli.start_date,
        oli.end_date,
        oli.total_price,
        oli.description,
        oli.sort_order,
        oli.created_at,
        oli.created_by,
        oli.updated_at,
        oli.updated_by,
        oli.is_deleted,
        oli.system_modstamp,
        p.name as product_name,
        p.product_code
      FROM ${this.tableName} oli
      LEFT JOIN products p ON oli.product_id = p.id
      WHERE oli.tenant_id = $1 AND oli.id = $2 AND oli.is_deleted = false
    `;
    const result = await query<OpportunityLineItem>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async listByOpportunity(
    tenantId: string,
    opportunityId: string
  ): Promise<PaginatedResponse<OpportunityLineItem>> {
    const sql = `
      SELECT
        oli.id,
        oli.tenant_id,
        oli.opportunity_id,
        oli.pricebook_entry_id,
        oli.product_id,
        oli.quantity,
        oli.unit_price,
        oli.customer_unit_price,
        oli.discount,
        oli.term_months,
        oli.billing_frequency,
        oli.start_date,
        oli.end_date,
        oli.total_price,
        oli.description,
        oli.sort_order,
        oli.created_at,
        oli.created_by,
        oli.updated_at,
        oli.updated_by,
        oli.is_deleted,
        oli.system_modstamp,
        p.name as product_name,
        p.product_code
      FROM ${this.tableName} oli
      LEFT JOIN products p ON oli.product_id = p.id
      WHERE oli.tenant_id = $1 AND oli.opportunity_id = $2 AND oli.is_deleted = false
      ORDER BY oli.sort_order ASC, oli.created_at ASC
    `;
    const result = await query<OpportunityLineItem>(sql, [
      tenantId,
      opportunityId,
    ]);

    return {
      records: result.rows.map((r) => this.mapFromDb(r)),
      totalSize: result.rows.length,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<OpportunityLineItem>
  ): Promise<OpportunityLineItem> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    // Calculate total price based on subscription model
    const quantity = data.quantity || 1;
    const unitPrice = data.customerUnitPrice ?? data.unitPrice ?? 0;
    const discount = data.discount || 0;
    const termMonths = data.termMonths || 1;
    const billingFrequency = data.billingFrequency;

    // Calculate billing period months based on frequency
    let billingPeriodMonths = 12; // Default yearly
    if (billingFrequency === "Monthly") billingPeriodMonths = 1;
    else if (billingFrequency === "ThreeYear") billingPeriodMonths = 36;

    // TotalPrice = UnitPrice × Quantity × (TermMonths / BillingPeriodMonths) - Discount
    const totalPrice =
      unitPrice * quantity * (termMonths / billingPeriodMonths) - discount;

    // Calculate end date if start date and term months are provided
    let endDate: Date | null = null;
    if (data.startDate && termMonths) {
      endDate = new Date(data.startDate);
      endDate.setMonth(endDate.getMonth() + termMonths);
      endDate.setDate(endDate.getDate() - 1);
    }

    const sql = `
      INSERT INTO ${this.tableName} (
        id, tenant_id, opportunity_id, pricebook_entry_id, product_id,
        quantity, unit_price, customer_unit_price, discount,
        term_months, billing_frequency, start_date, end_date, total_price,
        description, sort_order,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const result = await query<OpportunityLineItem>(sql, [
      id,
      tenantId,
      data.opportunityId,
      data.pricebookEntryId,
      data.productId,
      quantity,
      data.unitPrice || 0,
      data.customerUnitPrice || null,
      discount,
      termMonths || null,
      billingFrequency || null,
      data.startDate || null,
      endDate,
      totalPrice,
      data.description || null,
      data.sortOrder || 0,
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ]);

    return this.mapFromDb(result.rows[0]);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<OpportunityLineItem>,
    etag?: string
  ): Promise<OpportunityLineItem> {
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

      const updateFields: string[] = [];
      const values: unknown[] = [tenantId, id];
      let paramIndex = 3;

      if (data.quantity !== undefined) {
        updateFields.push(`quantity = $${paramIndex++}`);
        values.push(data.quantity);
      }
      if (data.unitPrice !== undefined) {
        updateFields.push(`unit_price = $${paramIndex++}`);
        values.push(data.unitPrice);
      }
      if (data.customerUnitPrice !== undefined) {
        updateFields.push(`customer_unit_price = $${paramIndex++}`);
        values.push(data.customerUnitPrice);
      }
      if (data.discount !== undefined) {
        updateFields.push(`discount = $${paramIndex++}`);
        values.push(data.discount);
      }
      if (data.termMonths !== undefined) {
        updateFields.push(`term_months = $${paramIndex++}`);
        values.push(data.termMonths);
      }
      if (data.billingFrequency !== undefined) {
        updateFields.push(`billing_frequency = $${paramIndex++}`);
        values.push(data.billingFrequency);
      }
      if (data.startDate !== undefined) {
        updateFields.push(`start_date = $${paramIndex++}`);
        values.push(data.startDate);
      }
      if (data.endDate !== undefined) {
        updateFields.push(`end_date = $${paramIndex++}`);
        values.push(data.endDate);
      }
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.sortOrder !== undefined) {
        updateFields.push(`sort_order = $${paramIndex++}`);
        values.push(data.sortOrder);
      }

      // Recalculate total price if pricing fields changed
      const quantity = data.quantity ?? existing.quantity;
      const unitPrice = data.customerUnitPrice ?? data.unitPrice ?? existing.customer_unit_price ?? existing.unit_price;
      const discount = data.discount ?? existing.discount ?? 0;
      const termMonths = data.termMonths ?? existing.term_months ?? 1;
      const billingFrequency = data.billingFrequency ?? existing.billing_frequency;

      let billingPeriodMonths = 12;
      if (billingFrequency === "Monthly") billingPeriodMonths = 1;
      else if (billingFrequency === "ThreeYear") billingPeriodMonths = 36;

      const totalPrice = unitPrice * quantity * (termMonths / billingPeriodMonths) - discount;
      updateFields.push(`total_price = $${paramIndex++}`);
      values.push(totalPrice);

      // Recalculate end date if start date or term months changed
      const startDate = data.startDate ?? existing.start_date;
      if (startDate && termMonths) {
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + termMonths);
        endDate.setDate(endDate.getDate() - 1);
        updateFields.push(`end_date = $${paramIndex++}`);
        values.push(endDate);
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

  async calculateOpportunityTotal(
    tenantId: string,
    opportunityId: string
  ): Promise<number> {
    const sql = `
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM ${this.tableName}
      WHERE tenant_id = $1 AND opportunity_id = $2 AND is_deleted = false
    `;
    const result = await query<{ total: string }>(sql, [
      tenantId,
      opportunityId,
    ]);
    return parseFloat(result.rows[0].total);
  }

  private mapFromDb(row: OpportunityLineItem): OpportunityLineItem {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as unknown as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      mapped[camelKey] = value;
    }
    return mapped as unknown as OpportunityLineItem;
  }
}

export const opportunityLineItemRepository =
  new OpportunityLineItemRepository();
