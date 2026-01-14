import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";
import { contractLineItemRepository } from "./contractLineItemRepository.js";
import type { PoolConsumption, PaginatedResponse, ContractLineItem } from "../types/index.js";

export class PoolConsumptionRepository {
  private tableName = "pool_consumptions";

  async findById(tenantId: string, id: string): Promise<PoolConsumption | null> {
    const sql = `
      SELECT
        pc.id,
        pc.tenant_id,
        pc.contract_line_item_id,
        pc.consumption_date,
        pc.quantity,
        pc.unit_price,
        pc.amount,
        pc.description,
        pc.requested_by,
        pc.requested_at,
        pc.status,
        pc.approved_by,
        pc.approved_at,
        pc.rejection_reason,
        pc.invoice_line_item_id,
        pc.external_reference,
        pc.created_at,
        pc.created_by,
        pc.updated_at,
        pc.updated_by,
        pc.is_deleted,
        pc.system_modstamp,
        req.display_name as requester_name,
        app.display_name as approver_name,
        p.name as product_name,
        c.name as contract_name
      FROM ${this.tableName} pc
      LEFT JOIN users req ON pc.requested_by = req.id
      LEFT JOIN users app ON pc.approved_by = app.id
      LEFT JOIN contract_line_items cli ON pc.contract_line_item_id = cli.id
      LEFT JOIN products p ON cli.product_id = p.id
      LEFT JOIN contracts c ON cli.contract_id = c.id
      WHERE pc.tenant_id = $1 AND pc.id = $2 AND pc.is_deleted = false
    `;
    const result = await query<PoolConsumption>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async listByContractLineItem(
    tenantId: string,
    contractLineItemId: string
  ): Promise<PaginatedResponse<PoolConsumption>> {
    const sql = `
      SELECT
        pc.id,
        pc.tenant_id,
        pc.contract_line_item_id,
        pc.consumption_date,
        pc.quantity,
        pc.unit_price,
        pc.amount,
        pc.description,
        pc.requested_by,
        pc.requested_at,
        pc.status,
        pc.approved_by,
        pc.approved_at,
        pc.rejection_reason,
        pc.invoice_line_item_id,
        pc.external_reference,
        pc.created_at,
        pc.created_by,
        pc.updated_at,
        pc.updated_by,
        pc.is_deleted,
        pc.system_modstamp,
        req.display_name as requester_name,
        app.display_name as approver_name
      FROM ${this.tableName} pc
      LEFT JOIN users req ON pc.requested_by = req.id
      LEFT JOIN users app ON pc.approved_by = app.id
      WHERE pc.tenant_id = $1 AND pc.contract_line_item_id = $2 AND pc.is_deleted = false
      ORDER BY pc.consumption_date DESC, pc.created_at DESC
    `;
    const result = await query<PoolConsumption>(sql, [tenantId, contractLineItemId]);

    return {
      records: result.rows.map((r) => this.mapFromDb(r)),
      totalSize: result.rows.length,
    };
  }

  async listByContract(
    tenantId: string,
    contractId: string
  ): Promise<PaginatedResponse<PoolConsumption>> {
    const sql = `
      SELECT
        pc.id,
        pc.tenant_id,
        pc.contract_line_item_id,
        pc.consumption_date,
        pc.quantity,
        pc.unit_price,
        pc.amount,
        pc.description,
        pc.requested_by,
        pc.requested_at,
        pc.status,
        pc.approved_by,
        pc.approved_at,
        pc.rejection_reason,
        pc.invoice_line_item_id,
        pc.external_reference,
        pc.created_at,
        pc.created_by,
        pc.updated_at,
        pc.updated_by,
        pc.is_deleted,
        pc.system_modstamp,
        req.display_name as requester_name,
        app.display_name as approver_name,
        p.name as product_name
      FROM ${this.tableName} pc
      LEFT JOIN users req ON pc.requested_by = req.id
      LEFT JOIN users app ON pc.approved_by = app.id
      LEFT JOIN contract_line_items cli ON pc.contract_line_item_id = cli.id
      LEFT JOIN products p ON cli.product_id = p.id
      WHERE pc.tenant_id = $1 AND cli.contract_id = $2 AND pc.is_deleted = false
      ORDER BY pc.consumption_date DESC, pc.created_at DESC
    `;
    const result = await query<PoolConsumption>(sql, [tenantId, contractId]);

    return {
      records: result.rows.map((r) => this.mapFromDb(r)),
      totalSize: result.rows.length,
    };
  }

  async listPending(tenantId: string): Promise<PaginatedResponse<PoolConsumption>> {
    const sql = `
      SELECT
        pc.id,
        pc.tenant_id,
        pc.contract_line_item_id,
        pc.consumption_date,
        pc.quantity,
        pc.unit_price,
        pc.amount,
        pc.description,
        pc.requested_by,
        pc.requested_at,
        pc.status,
        pc.approved_by,
        pc.approved_at,
        pc.rejection_reason,
        pc.invoice_line_item_id,
        pc.external_reference,
        pc.created_at,
        pc.created_by,
        pc.updated_at,
        pc.updated_by,
        pc.is_deleted,
        pc.system_modstamp,
        req.display_name as requester_name,
        p.name as product_name,
        c.name as contract_name
      FROM ${this.tableName} pc
      LEFT JOIN users req ON pc.requested_by = req.id
      LEFT JOIN contract_line_items cli ON pc.contract_line_item_id = cli.id
      LEFT JOIN products p ON cli.product_id = p.id
      LEFT JOIN contracts c ON cli.contract_id = c.id
      WHERE pc.tenant_id = $1 AND pc.status = 'Pending' AND pc.is_deleted = false
      ORDER BY pc.requested_at ASC
    `;
    const result = await query<PoolConsumption>(sql, [tenantId]);

    return {
      records: result.rows.map((r) => this.mapFromDb(r)),
      totalSize: result.rows.length,
    };
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<PoolConsumption>
  ): Promise<PoolConsumption> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    // Calculate amount if not provided
    const quantity = data.quantity || 1;
    const unitPrice = data.unitPrice || 0;
    const amount = data.amount || quantity * unitPrice;

    // INV-PC2: Only PoF contracts can have consumptions
    // INV-PC3: Consumption date must be within contract period
    // These validations should be done at the route level where we have contract info

    const sql = `
      INSERT INTO ${this.tableName} (
        id, tenant_id, contract_line_item_id, consumption_date,
        quantity, unit_price, amount, description,
        requested_by, requested_at, status,
        external_reference,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const result = await query<PoolConsumption>(sql, [
      id,
      tenantId,
      data.contractLineItemId,
      data.consumptionDate,
      quantity,
      unitPrice,
      amount,
      data.description || null,
      userId, // requestedBy
      now, // requestedAt
      "Pending",
      data.externalReference || null,
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ]);

    return this.mapFromDb(result.rows[0]);
  }

  // INV-PC1: Approve consumption with balance check
  async approve(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<PoolConsumption> {
    return transaction(async (client) => {
      // Lock the consumption record
      const checkSql = `
        SELECT * FROM ${this.tableName}
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        FOR UPDATE
      `;
      const checkResult = await client.query(checkSql, [tenantId, id]);

      if (checkResult.rows.length === 0) {
        throw new NotFoundError(this.tableName, id);
      }

      const consumption = this.mapFromDb(checkResult.rows[0] as PoolConsumption);

      if (consumption.status !== "Pending") {
        throw new ValidationError([
          { field: "status", message: "Only pending consumptions can be approved. Consumption must be in Pending status." },
        ]);
      }

      // Get the contract line item to check balance
      const lineItem = await contractLineItemRepository.findById(
        tenantId,
        consumption.contractLineItemId
      );

      if (!lineItem) {
        throw new ValidationError([
          { field: "contractLineItemId", message: "Contract line item not found. Contract line item does not exist." },
        ]);
      }

      // INV-PC1: Check if remaining amount is sufficient
      const currentRemaining = lineItem.remainingAmount || 0;
      if (currentRemaining < consumption.amount) {
        throw new ValidationError([
          {
            field: "amount",
            message: `Insufficient balance: Cannot consume ${consumption.amount}. Only ${currentRemaining} remaining.`,
          },
        ]);
      }

      // Update consumption status
      const now = new Date();
      const newModstamp = uuidv4();

      const updateSql = `
        UPDATE ${this.tableName}
        SET status = 'Approved', approved_by = $3, approved_at = $4,
            updated_at = $5, updated_by = $6, system_modstamp = $7
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING *
      `;

      const updateResult = await client.query(updateSql, [
        tenantId,
        id,
        userId,
        now,
        now,
        userId,
        newModstamp,
      ]);

      // Deduct from contract line item balance
      await contractLineItemRepository.updateConsumption(
        tenantId,
        userId,
        consumption.contractLineItemId,
        consumption.amount
      );

      return this.mapFromDb(updateResult.rows[0]);
    });
  }

  async reject(
    tenantId: string,
    userId: string,
    id: string,
    reason: string
  ): Promise<PoolConsumption> {
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

      const consumption = this.mapFromDb(checkResult.rows[0] as PoolConsumption);

      if (consumption.status !== "Pending") {
        throw new ValidationError([
          { field: "status", message: "Only pending consumptions can be rejected. Consumption must be in Pending status." },
        ]);
      }

      const now = new Date();
      const newModstamp = uuidv4();

      const sql = `
        UPDATE ${this.tableName}
        SET status = 'Rejected', rejection_reason = $3,
            updated_at = $4, updated_by = $5, system_modstamp = $6
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING *
      `;

      const result = await client.query(sql, [
        tenantId,
        id,
        reason,
        now,
        userId,
        newModstamp,
      ]);

      return this.mapFromDb(result.rows[0]);
    });
  }

  async cancel(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<PoolConsumption> {
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

      const consumption = this.mapFromDb(checkResult.rows[0] as PoolConsumption);

      // Can cancel Pending or Approved (not yet invoiced)
      if (consumption.status !== "Pending" && consumption.status !== "Approved") {
        throw new ValidationError([
          { field: "status", message: "Only Pending or Approved consumptions can be cancelled. Consumption must be in Pending or Approved status." },
        ]);
      }

      const wasApproved = consumption.status === "Approved";

      const now = new Date();
      const newModstamp = uuidv4();

      const sql = `
        UPDATE ${this.tableName}
        SET status = 'Cancelled',
            updated_at = $3, updated_by = $4, system_modstamp = $5
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING *
      `;

      const result = await client.query(sql, [
        tenantId,
        id,
        now,
        userId,
        newModstamp,
      ]);

      // If it was approved, revert the consumption
      if (wasApproved) {
        await contractLineItemRepository.revertConsumption(
          tenantId,
          userId,
          consumption.contractLineItemId,
          consumption.amount
        );
      }

      return this.mapFromDb(result.rows[0]);
    });
  }

  async delete(tenantId: string, userId: string, id: string): Promise<void> {
    // Only allow deletion of Pending consumptions
    const existing = await this.findById(tenantId, id);
    if (existing && existing.status !== "Pending") {
      throw new ValidationError([
        { field: "status", message: "Only Pending consumptions can be deleted. Consumption must be in Pending status to delete." },
      ]);
    }

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

  private mapFromDb(row: PoolConsumption): PoolConsumption {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as unknown as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      mapped[camelKey] = value;
    }
    return mapped as unknown as PoolConsumption;
  }
}

export const poolConsumptionRepository = new PoolConsumptionRepository();
