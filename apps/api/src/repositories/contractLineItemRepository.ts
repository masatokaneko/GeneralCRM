import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";
import type { ContractLineItem, PaginatedResponse } from "../types/index.js";

export class ContractLineItemRepository {
  private tableName = "contract_line_items";

  async findById(tenantId: string, id: string): Promise<ContractLineItem | null> {
    const sql = `
      SELECT
        cli.id,
        cli.tenant_id,
        cli.contract_id,
        cli.product_id,
        cli.pricebook_entry_id,
        cli.source_order_item_id,
        cli.quantity,
        cli.unit_price,
        cli.customer_unit_price,
        cli.term_months,
        cli.billing_frequency,
        cli.start_date,
        cli.end_date,
        cli.total_price,
        cli.consumed_amount,
        cli.remaining_amount,
        cli.status,
        cli.description,
        cli.sort_order,
        cli.created_at,
        cli.created_by,
        cli.updated_at,
        cli.updated_by,
        cli.is_deleted,
        cli.system_modstamp,
        p.name as product_name,
        p.product_code
      FROM ${this.tableName} cli
      LEFT JOIN products p ON cli.product_id = p.id
      WHERE cli.tenant_id = $1 AND cli.id = $2 AND cli.is_deleted = false
    `;
    const result = await query<ContractLineItem>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async listByContract(
    tenantId: string,
    contractId: string
  ): Promise<PaginatedResponse<ContractLineItem>> {
    const sql = `
      SELECT
        cli.id,
        cli.tenant_id,
        cli.contract_id,
        cli.product_id,
        cli.pricebook_entry_id,
        cli.source_order_item_id,
        cli.quantity,
        cli.unit_price,
        cli.customer_unit_price,
        cli.term_months,
        cli.billing_frequency,
        cli.start_date,
        cli.end_date,
        cli.total_price,
        cli.consumed_amount,
        cli.remaining_amount,
        cli.status,
        cli.description,
        cli.sort_order,
        cli.created_at,
        cli.created_by,
        cli.updated_at,
        cli.updated_by,
        cli.is_deleted,
        cli.system_modstamp,
        p.name as product_name,
        p.product_code
      FROM ${this.tableName} cli
      LEFT JOIN products p ON cli.product_id = p.id
      WHERE cli.tenant_id = $1 AND cli.contract_id = $2 AND cli.is_deleted = false
      ORDER BY cli.sort_order ASC, cli.created_at ASC
    `;
    const result = await query<ContractLineItem>(sql, [tenantId, contractId]);

    return {
      records: result.rows.map((r) => this.mapFromDb(r)),
      totalSize: result.rows.length,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<ContractLineItem>
  ): Promise<ContractLineItem> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    // Calculate total price
    const quantity = data.quantity || 1;
    const unitPrice = data.customerUnitPrice || data.unitPrice || 0;
    const termMonths = data.termMonths || 12;
    const billingPeriodMonths = this.getBillingPeriodMonths(data.billingFrequency);
    const totalPrice = quantity * unitPrice * (termMonths / billingPeriodMonths);

    // For PoF contracts, remaining amount equals total price initially
    const remainingAmount = data.remainingAmount ?? totalPrice;
    const consumedAmount = data.consumedAmount ?? 0;

    // Calculate end date if not provided
    let endDate = data.endDate;
    if (data.startDate && data.termMonths && !endDate) {
      const start = new Date(data.startDate);
      endDate = new Date(start);
      endDate.setMonth(endDate.getMonth() + data.termMonths);
      endDate.setDate(endDate.getDate() - 1);
    }

    const sql = `
      INSERT INTO ${this.tableName} (
        id, tenant_id, contract_id, product_id, pricebook_entry_id, source_order_item_id,
        quantity, unit_price, customer_unit_price, term_months, billing_frequency,
        start_date, end_date, total_price, consumed_amount, remaining_amount, status,
        description, sort_order,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *
    `;

    const result = await query<ContractLineItem>(sql, [
      id,
      tenantId,
      data.contractId,
      data.productId,
      data.pricebookEntryId || null,
      data.sourceOrderItemId || null,
      quantity,
      data.unitPrice || 0,
      data.customerUnitPrice || null,
      data.termMonths || null,
      data.billingFrequency || null,
      data.startDate || null,
      endDate || null,
      totalPrice,
      consumedAmount,
      remainingAmount,
      data.status || "Active",
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
    data: Partial<ContractLineItem>,
    etag?: string
  ): Promise<ContractLineItem> {
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

      const existing = this.mapFromDb(checkResult.rows[0] as ContractLineItem);

      if (etag && checkResult.rows[0].system_modstamp !== etag) {
        throw new Error("Record was modified by another user");
      }

      const now = new Date();
      const newModstamp = uuidv4();

      // Merge existing with updates for recalculation
      const quantity = data.quantity ?? existing.quantity;
      const unitPrice = data.customerUnitPrice ?? data.unitPrice ?? existing.customerUnitPrice ?? existing.unitPrice;
      const termMonths = data.termMonths ?? existing.termMonths ?? 12;
      const billingFrequency = data.billingFrequency ?? existing.billingFrequency;
      const billingPeriodMonths = this.getBillingPeriodMonths(billingFrequency);
      const totalPrice = quantity * unitPrice * (termMonths / billingPeriodMonths);

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
      if (data.consumedAmount !== undefined) {
        updateFields.push(`consumed_amount = $${paramIndex++}`);
        values.push(data.consumedAmount);
      }
      if (data.remainingAmount !== undefined) {
        updateFields.push(`remaining_amount = $${paramIndex++}`);
        values.push(data.remainingAmount);
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(data.status);
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

  async calculateContractTotal(
    tenantId: string,
    contractId: string
  ): Promise<number> {
    const sql = `
      SELECT COALESCE(SUM(total_price), 0) as total
      FROM ${this.tableName}
      WHERE tenant_id = $1 AND contract_id = $2 AND is_deleted = false
    `;
    const result = await query<{ total: string }>(sql, [tenantId, contractId]);
    return parseFloat(result.rows[0].total);
  }

  // INV-CLI2: Update consumed and remaining amounts for PoF consumption
  async updateConsumption(
    tenantId: string,
    userId: string,
    id: string,
    consumeAmount: number
  ): Promise<ContractLineItem> {
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

      const existing = this.mapFromDb(checkResult.rows[0] as ContractLineItem);
      const currentRemaining = existing.remainingAmount || 0;
      const currentConsumed = existing.consumedAmount || 0;

      // INV-CLI2: RemainingAmount >= 0
      if (currentRemaining < consumeAmount) {
        throw new ValidationError([
          {
            field: "remainingAmount",
            message: `Insufficient remaining balance: Cannot consume ${consumeAmount}. Only ${currentRemaining} remaining.`,
          },
        ]);
      }

      const newRemaining = currentRemaining - consumeAmount;
      const newConsumed = currentConsumed + consumeAmount;
      const now = new Date();
      const newModstamp = uuidv4();

      const sql = `
        UPDATE ${this.tableName}
        SET consumed_amount = $3, remaining_amount = $4, updated_at = $5, updated_by = $6, system_modstamp = $7
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING *
      `;

      const result = await client.query(sql, [
        tenantId,
        id,
        newConsumed,
        newRemaining,
        now,
        userId,
        newModstamp,
      ]);
      return this.mapFromDb(result.rows[0]);
    });
  }

  // Revert consumption (for rejection or cancellation)
  async revertConsumption(
    tenantId: string,
    userId: string,
    id: string,
    revertAmount: number
  ): Promise<ContractLineItem> {
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

      const existing = this.mapFromDb(checkResult.rows[0] as ContractLineItem);
      const currentRemaining = existing.remainingAmount || 0;
      const currentConsumed = existing.consumedAmount || 0;

      const newRemaining = currentRemaining + revertAmount;
      const newConsumed = Math.max(0, currentConsumed - revertAmount);
      const now = new Date();
      const newModstamp = uuidv4();

      const sql = `
        UPDATE ${this.tableName}
        SET consumed_amount = $3, remaining_amount = $4, updated_at = $5, updated_by = $6, system_modstamp = $7
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING *
      `;

      const result = await client.query(sql, [
        tenantId,
        id,
        newConsumed,
        newRemaining,
        now,
        userId,
        newModstamp,
      ]);
      return this.mapFromDb(result.rows[0]);
    });
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

  private mapFromDb(row: ContractLineItem): ContractLineItem {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as unknown as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      mapped[camelKey] = value;
    }
    return mapped as unknown as ContractLineItem;
  }
}

export const contractLineItemRepository = new ContractLineItemRepository();
