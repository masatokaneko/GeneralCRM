import { v4 as uuidv4 } from "uuid";
import { query } from "../db/connection.js";
import { NotFoundError, ConflictError } from "../middleware/errorHandler.js";
import type { InvoiceLineItem, PaginatedResponse } from "../types/index.js";

export class InvoiceLineItemRepository {
  private tableName = "invoice_line_items";

  async findById(tenantId: string, id: string): Promise<InvoiceLineItem | null> {
    const sql = `
      SELECT
        ili.*,
        p.name as product_name,
        p.product_code
      FROM ${this.tableName} ili
      LEFT JOIN products p ON ili.product_id = p.id
      WHERE ili.tenant_id = $1 AND ili.id = $2 AND ili.is_deleted = false
    `;
    const result = await query<InvoiceLineItem>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async listByInvoice(
    tenantId: string,
    invoiceId: string
  ): Promise<PaginatedResponse<InvoiceLineItem>> {
    const sql = `
      SELECT
        ili.*,
        p.name as product_name,
        p.product_code
      FROM ${this.tableName} ili
      LEFT JOIN products p ON ili.product_id = p.id
      WHERE ili.tenant_id = $1 AND ili.invoice_id = $2 AND ili.is_deleted = false
      ORDER BY ili.sort_order ASC, ili.created_at ASC
    `;
    const result = await query<InvoiceLineItem>(sql, [tenantId, invoiceId]);

    return {
      records: result.rows.map((r) => this.mapFromDb(r)),
      totalSize: result.rows.length,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<InvoiceLineItem>
  ): Promise<InvoiceLineItem> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    // Calculate amount if not provided
    const quantity = data.quantity || 1;
    const unitPrice = data.unitPrice || 0;
    const amount = data.amount || quantity * unitPrice;

    // Calculate tax
    const taxRate = data.taxRate || 0;
    const taxAmount = data.taxAmount || (amount * taxRate) / 100;

    // Get next sort order
    const sortOrderSql = `
      SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order
      FROM ${this.tableName}
      WHERE tenant_id = $1 AND invoice_id = $2 AND is_deleted = false
    `;
    const sortResult = await query<{ next_order: number }>(sortOrderSql, [
      tenantId,
      data.invoiceId,
    ]);
    const sortOrder = data.sortOrder ?? sortResult.rows[0].next_order;

    const sql = `
      INSERT INTO ${this.tableName} (
        id, tenant_id, invoice_id, contract_line_item_id, order_item_id,
        pool_consumption_id, product_id, description,
        quantity, unit_price, amount, tax_rate, tax_amount,
        billing_period_start, billing_period_end, sort_order,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const result = await query<InvoiceLineItem>(sql, [
      id,
      tenantId,
      data.invoiceId,
      data.contractLineItemId || null,
      data.orderItemId || null,
      data.poolConsumptionId || null,
      data.productId,
      data.description || "",
      quantity,
      unitPrice,
      amount,
      taxRate,
      taxAmount,
      data.billingPeriodStart || null,
      data.billingPeriodEnd || null,
      sortOrder,
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
    data: Partial<InvoiceLineItem>,
    etag?: string
  ): Promise<InvoiceLineItem> {
    const existing = await this.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(this.tableName, id);
    }

    if (etag && existing.systemModstamp !== etag) {
      throw new ConflictError("Invoice line item has been modified by another user");
    }

    const now = new Date();
    const newModstamp = uuidv4();

    // Recalculate amount if quantity or price changed
    const quantity = data.quantity ?? existing.quantity;
    const unitPrice = data.unitPrice ?? existing.unitPrice;
    const amount = data.amount ?? quantity * unitPrice;

    // Recalculate tax
    const taxRate = data.taxRate ?? existing.taxRate ?? 0;
    const taxAmount = data.taxAmount ?? (amount * taxRate) / 100;

    const sql = `
      UPDATE ${this.tableName}
      SET
        product_id = COALESCE($3, product_id),
        description = COALESCE($4, description),
        quantity = COALESCE($5, quantity),
        unit_price = COALESCE($6, unit_price),
        amount = $7,
        tax_rate = COALESCE($8, tax_rate),
        tax_amount = $9,
        billing_period_start = COALESCE($10, billing_period_start),
        billing_period_end = COALESCE($11, billing_period_end),
        sort_order = COALESCE($12, sort_order),
        updated_at = $13,
        updated_by = $14,
        system_modstamp = $15
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      RETURNING *
    `;

    const result = await query<InvoiceLineItem>(sql, [
      tenantId,
      id,
      data.productId,
      data.description,
      data.quantity,
      data.unitPrice,
      amount,
      data.taxRate,
      taxAmount,
      data.billingPeriodStart,
      data.billingPeriodEnd,
      data.sortOrder,
      now,
      userId,
      newModstamp,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError(this.tableName, id);
    }

    return this.mapFromDb(result.rows[0]);
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

  async calculateInvoiceTotal(
    tenantId: string,
    invoiceId: string
  ): Promise<{ subtotal: number; taxAmount: number; totalAmount: number }> {
    const sql = `
      SELECT
        COALESCE(SUM(amount), 0) as subtotal,
        COALESCE(SUM(tax_amount), 0) as tax_amount
      FROM ${this.tableName}
      WHERE tenant_id = $1 AND invoice_id = $2 AND is_deleted = false
    `;
    const result = await query<{ subtotal: string; tax_amount: string }>(sql, [
      tenantId,
      invoiceId,
    ]);

    const subtotal = Number.parseFloat(result.rows[0]?.subtotal || "0");
    const taxAmount = Number.parseFloat(result.rows[0]?.tax_amount || "0");

    return {
      subtotal,
      taxAmount,
      totalAmount: subtotal + taxAmount,
    };
  }

  private mapFromDb(row: InvoiceLineItem): InvoiceLineItem {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as unknown as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      mapped[camelKey] = value;
    }
    return mapped as unknown as InvoiceLineItem;
  }
}

export const invoiceLineItemRepository = new InvoiceLineItemRepository();
