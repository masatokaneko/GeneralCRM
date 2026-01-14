import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError } from "../middleware/errorHandler.js";
import type { OrderItem, PaginatedResponse } from "../types/index.js";

export class OrderItemRepository {
  private tableName = "order_items";

  async findById(tenantId: string, id: string): Promise<OrderItem | null> {
    const sql = `
      SELECT
        oi.id,
        oi.tenant_id,
        oi.order_id,
        oi.product_id,
        oi.pricebook_entry_id,
        oi.quote_line_item_id,
        oi.quantity,
        oi.unit_price,
        oi.customer_unit_price,
        oi.discount,
        oi.term_months,
        oi.billing_frequency,
        oi.start_date,
        oi.end_date,
        oi.total_price,
        oi.description,
        oi.sort_order,
        oi.created_at,
        oi.created_by,
        oi.updated_at,
        oi.updated_by,
        oi.is_deleted,
        oi.system_modstamp,
        p.name as product_name,
        p.product_code
      FROM ${this.tableName} oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.tenant_id = $1 AND oi.id = $2 AND oi.is_deleted = false
    `;
    const result = await query<OrderItem>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async listByOrder(
    tenantId: string,
    orderId: string
  ): Promise<PaginatedResponse<OrderItem>> {
    const sql = `
      SELECT
        oi.id,
        oi.tenant_id,
        oi.order_id,
        oi.product_id,
        oi.pricebook_entry_id,
        oi.quote_line_item_id,
        oi.quantity,
        oi.unit_price,
        oi.customer_unit_price,
        oi.discount,
        oi.term_months,
        oi.billing_frequency,
        oi.start_date,
        oi.end_date,
        oi.total_price,
        oi.description,
        oi.sort_order,
        oi.created_at,
        oi.created_by,
        oi.updated_at,
        oi.updated_by,
        oi.is_deleted,
        oi.system_modstamp,
        p.name as product_name,
        p.product_code
      FROM ${this.tableName} oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.tenant_id = $1 AND oi.order_id = $2 AND oi.is_deleted = false
      ORDER BY oi.sort_order ASC, oi.created_at ASC
    `;
    const result = await query<OrderItem>(sql, [tenantId, orderId]);

    return {
      records: result.rows.map((r) => this.mapFromDb(r)),
      totalSize: result.rows.length,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<OrderItem>
  ): Promise<OrderItem> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    // Calculate total price
    const quantity = data.quantity || 1;
    const unitPrice = data.customerUnitPrice || data.unitPrice || 0;
    const discount = data.discount || 0;
    const termMonths = data.termMonths || 12;
    const billingPeriodMonths = this.getBillingPeriodMonths(data.billingFrequency);
    const totalPrice = quantity * unitPrice * (termMonths / billingPeriodMonths) - discount;

    // Calculate end date if start date and term months provided
    let endDate = data.endDate;
    if (data.startDate && data.termMonths && !endDate) {
      const start = new Date(data.startDate);
      endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + data.termMonths);
      endDate.setDate(endDate.getDate() - 1);
    }

    const sql = `
      INSERT INTO ${this.tableName} (
        id, tenant_id, order_id, product_id, pricebook_entry_id, quote_line_item_id,
        quantity, unit_price, customer_unit_price, discount, term_months, billing_frequency,
        start_date, end_date, total_price, description, sort_order,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `;

    const result = await query<OrderItem>(sql, [
      id,
      tenantId,
      data.orderId,
      data.productId,
      data.pricebookEntryId || null,
      data.quoteLineItemId || null,
      quantity,
      data.unitPrice || 0,
      data.customerUnitPrice || null,
      discount,
      data.termMonths || null,
      data.billingFrequency || null,
      data.startDate || null,
      endDate || null,
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
    data: Partial<OrderItem>,
    etag?: string
  ): Promise<OrderItem> {
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

      const existing = this.mapFromDb(checkResult.rows[0] as OrderItem);

      if (etag && checkResult.rows[0].system_modstamp !== etag) {
        throw new Error("Record was modified by another user");
      }

      const now = new Date();
      const newModstamp = uuidv4();

      // Merge existing with updates for recalculation
      const quantity = data.quantity ?? existing.quantity;
      const unitPrice = data.customerUnitPrice ?? data.unitPrice ?? existing.customerUnitPrice ?? existing.unitPrice;
      const discount = data.discount ?? existing.discount;
      const termMonths = data.termMonths ?? existing.termMonths ?? 12;
      const billingFrequency = data.billingFrequency ?? existing.billingFrequency;
      const billingPeriodMonths = this.getBillingPeriodMonths(billingFrequency);
      const totalPrice = quantity * unitPrice * (termMonths / billingPeriodMonths) - discount;

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

      // Always update total_price
      updateFields.push(`total_price = $${paramIndex++}`);
      values.push(totalPrice);

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

  async calculateOrderTotal(
    tenantId: string,
    orderId: string
  ): Promise<number> {
    const sql = `
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM ${this.tableName}
      WHERE tenant_id = $1 AND order_id = $2 AND is_deleted = false
    `;
    const result = await query<{ total: string }>(sql, [tenantId, orderId]);
    return parseFloat(result.rows[0].total);
  }

  private getBillingPeriodMonths(billingFrequency?: string): number {
    switch (billingFrequency) {
      case "Monthly":
        return 1;
      case "Yearly":
        return 12;
      case "ThreeYear":
        return 36;
      default:
        return 12; // Default to yearly
    }
  }

  private mapFromDb(row: OrderItem): OrderItem {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as unknown as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      mapped[camelKey] = value;
    }
    return mapped as unknown as OrderItem;
  }
}

export const orderItemRepository = new OrderItemRepository();
