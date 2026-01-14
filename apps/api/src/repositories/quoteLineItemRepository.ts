import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError } from "../middleware/errorHandler.js";
import type { QuoteLineItem, PaginatedResponse } from "../types/index.js";

export class QuoteLineItemRepository {
  private tableName = "quote_line_items";

  async findById(tenantId: string, id: string): Promise<QuoteLineItem | null> {
    const sql = `
      SELECT
        qli.id,
        qli.tenant_id,
        qli.quote_id,
        qli.product_id,
        qli.pricebook_entry_id,
        qli.name,
        qli.description,
        qli.quantity,
        qli.unit_price,
        qli.customer_unit_price,
        qli.discount,
        qli.term_months,
        qli.billing_frequency,
        qli.start_date,
        qli.end_date,
        qli.total_price,
        qli.sort_order,
        qli.created_at,
        qli.created_by,
        qli.updated_at,
        qli.updated_by,
        qli.is_deleted,
        qli.system_modstamp,
        p.name as product_name,
        p.product_code
      FROM ${this.tableName} qli
      LEFT JOIN products p ON qli.product_id = p.id
      WHERE qli.tenant_id = $1 AND qli.id = $2 AND qli.is_deleted = false
    `;
    const result = await query<QuoteLineItem>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async listByQuote(
    tenantId: string,
    quoteId: string
  ): Promise<PaginatedResponse<QuoteLineItem>> {
    const sql = `
      SELECT
        qli.id,
        qli.tenant_id,
        qli.quote_id,
        qli.product_id,
        qli.pricebook_entry_id,
        qli.name,
        qli.description,
        qli.quantity,
        qli.unit_price,
        qli.customer_unit_price,
        qli.discount,
        qli.term_months,
        qli.billing_frequency,
        qli.start_date,
        qli.end_date,
        qli.total_price,
        qli.sort_order,
        qli.created_at,
        qli.created_by,
        qli.updated_at,
        qli.updated_by,
        qli.is_deleted,
        qli.system_modstamp,
        p.name as product_name,
        p.product_code
      FROM ${this.tableName} qli
      LEFT JOIN products p ON qli.product_id = p.id
      WHERE qli.tenant_id = $1 AND qli.quote_id = $2 AND qli.is_deleted = false
      ORDER BY qli.sort_order ASC, qli.created_at ASC
    `;
    const result = await query<QuoteLineItem>(sql, [tenantId, quoteId]);

    return {
      records: result.rows.map((r) => this.mapFromDb(r)),
      totalSize: result.rows.length,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<QuoteLineItem>
  ): Promise<QuoteLineItem> {
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
        id, tenant_id, quote_id, product_id, pricebook_entry_id, name,
        description, quantity, unit_price, customer_unit_price, discount,
        term_months, billing_frequency, start_date, end_date, total_price, sort_order,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `;

    const result = await query<QuoteLineItem>(sql, [
      id,
      tenantId,
      data.quoteId,
      data.productId || null,
      data.pricebookEntryId || null,
      data.name,
      data.description || null,
      quantity,
      data.unitPrice || 0,
      data.customerUnitPrice || null,
      discount,
      termMonths || null,
      billingFrequency || null,
      data.startDate || null,
      endDate,
      totalPrice,
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
    data: Partial<QuoteLineItem>,
    etag?: string
  ): Promise<QuoteLineItem> {
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

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(data.name);
      }
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

  async calculateQuoteTotal(
    tenantId: string,
    quoteId: string
  ): Promise<{ subtotal: number; totalPrice: number }> {
    const sql = `
      SELECT
        COALESCE(SUM(quantity * unit_price), 0) as subtotal,
        COALESCE(SUM(total_price), 0) as total_price
      FROM ${this.tableName}
      WHERE tenant_id = $1 AND quote_id = $2 AND is_deleted = false
    `;
    const result = await query<{ subtotal: string; total_price: string }>(sql, [
      tenantId,
      quoteId,
    ]);
    return {
      subtotal: parseFloat(result.rows[0].subtotal),
      totalPrice: parseFloat(result.rows[0].total_price),
    };
  }

  private mapFromDb(row: QuoteLineItem): QuoteLineItem {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as unknown as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      mapped[camelKey] = value;
    }
    return mapped as unknown as QuoteLineItem;
  }
}

export const quoteLineItemRepository = new QuoteLineItemRepository();
