import { v4 as uuidv4 } from "uuid";
import { query, transaction } from "../db/connection.js";
import { NotFoundError, ValidationError, ConflictError } from "../middleware/errorHandler.js";
import type { Invoice, PaginatedResponse, ListOptions } from "../types/index.js";
import type { AccessFilter } from "../services/accessibleIdsService.js";

export class InvoiceRepository {
  private tableName = "invoices";

  async findById(tenantId: string, id: string): Promise<Invoice | null> {
    const sql = `
      SELECT
        i.*,
        a.name as account_name,
        c.name as contract_name,
        c.contract_number,
        o.name as order_name,
        o.order_number,
        owner.display_name as owner_name,
        creator.display_name as created_by_name,
        modifier.display_name as last_modified_by_name
      FROM ${this.tableName} i
      LEFT JOIN accounts a ON i.account_id = a.id
      LEFT JOIN contracts c ON i.contract_id = c.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN users owner ON i.owner_id = owner.id
      LEFT JOIN users creator ON i.created_by = creator.id
      LEFT JOIN users modifier ON i.updated_by = modifier.id
      WHERE i.tenant_id = $1 AND i.id = $2 AND i.is_deleted = false
    `;
    const result = await query<Invoice>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async list(
    tenantId: string,
    options: ListOptions = {},
    accessFilter?: AccessFilter | null
  ): Promise<PaginatedResponse<Invoice>> {
    const {
      limit = 50,
      cursor,
      orderBy = "invoice_date",
      orderDir = "DESC",
      filters = {},
    } = options;

    let sql = `
      SELECT
        i.*,
        a.name as account_name,
        c.name as contract_name,
        o.name as order_name,
        owner.display_name as owner_name
      FROM ${this.tableName} i
      LEFT JOIN accounts a ON i.account_id = a.id
      LEFT JOIN contracts c ON i.contract_id = c.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN users owner ON i.owner_id = owner.id
      WHERE i.tenant_id = $1 AND i.is_deleted = false
    `;

    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    // Apply filters
    if (filters.accountId) {
      sql += ` AND i.account_id = $${paramIndex++}`;
      params.push(filters.accountId);
    }
    if (filters.contractId) {
      sql += ` AND i.contract_id = $${paramIndex++}`;
      params.push(filters.contractId);
    }
    if (filters.orderId) {
      sql += ` AND i.order_id = $${paramIndex++}`;
      params.push(filters.orderId);
    }
    if (filters.status) {
      sql += ` AND i.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    // Apply access filter for record-level permissions
    if (accessFilter) {
      // Replace column references to use 'i.' alias
      const aliasedClause = accessFilter.clause.replace(/\b(owner_id|id)\b/g, "i.$1");
      sql += ` AND ${aliasedClause}`;
      params.push(...accessFilter.params);
      paramIndex += accessFilter.params.length;
    }

    // Cursor pagination
    if (cursor) {
      sql += ` AND i.id > $${paramIndex++}`;
      params.push(cursor);
    }

    // Count total
    const countSql = sql.replace(
      /SELECT[\s\S]+?FROM/,
      "SELECT COUNT(DISTINCT i.id) as count FROM"
    );
    const countResult = await query<{ count: string }>(countSql, params);
    const totalSize = Number.parseInt(countResult.rows[0]?.count || "0", 10);

    // Apply ordering and limit
    const validColumns = ["invoice_date", "due_date", "total_amount", "created_at", "invoice_number"];
    const sortColumn = validColumns.includes(orderBy) ? orderBy : "invoice_date";
    sql += ` ORDER BY i.${sortColumn} ${orderDir === "ASC" ? "ASC" : "DESC"}`;
    sql += ` LIMIT $${paramIndex++}`;
    params.push(limit + 1);

    const result = await query<Invoice>(sql, params);
    const records = result.rows.slice(0, limit).map((r) => this.mapFromDb(r));
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore ? records[records.length - 1]?.id : undefined,
    };
  }

  async listByAccount(
    tenantId: string,
    accountId: string
  ): Promise<PaginatedResponse<Invoice>> {
    return this.list(tenantId, { filters: { accountId } });
  }

  async listByContract(
    tenantId: string,
    contractId: string
  ): Promise<PaginatedResponse<Invoice>> {
    return this.list(tenantId, { filters: { contractId } });
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<Invoice>
  ): Promise<Invoice> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    // Generate invoice number if not provided
    const invoiceNumber = data.invoiceNumber || `INV-${Date.now()}`;

    // Calculate balance_due
    const totalAmount = data.totalAmount || 0;
    const paidAmount = data.paidAmount || 0;
    const balanceDue = totalAmount - paidAmount;

    const sql = `
      INSERT INTO ${this.tableName} (
        id, tenant_id, account_id, contract_id, order_id,
        invoice_number, invoice_date, due_date, status,
        subtotal, tax_amount, total_amount, paid_amount, balance_due,
        billing_period_start, billing_period_end,
        billing_address_street, billing_address_city, billing_address_state,
        billing_address_postal_code, billing_address_country,
        notes, owner_id,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      )
      RETURNING *
    `;

    const result = await query<Invoice>(sql, [
      id,
      tenantId,
      data.accountId,
      data.contractId || null,
      data.orderId || null,
      invoiceNumber,
      data.invoiceDate || now,
      data.dueDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      "Draft",
      data.subtotal || 0,
      data.taxAmount || 0,
      totalAmount,
      paidAmount,
      balanceDue,
      data.billingPeriodStart || null,
      data.billingPeriodEnd || null,
      data.billingAddress?.street || null,
      data.billingAddress?.city || null,
      data.billingAddress?.state || null,
      data.billingAddress?.postalCode || null,
      data.billingAddress?.country || null,
      data.notes || null,
      data.ownerId || userId,
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
    data: Partial<Invoice>,
    etag?: string
  ): Promise<Invoice> {
    const existing = await this.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(this.tableName, id);
    }

    // INV-INV1: Only Draft invoices can be updated
    if (existing.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Only Draft invoices can be updated. Invoice must be in Draft status." },
      ]);
    }

    if (etag && existing.systemModstamp !== etag) {
      throw new ConflictError("Invoice has been modified by another user");
    }

    const now = new Date();
    const newModstamp = uuidv4();

    // Recalculate balance_due if amounts changed
    const totalAmount = data.totalAmount ?? existing.totalAmount;
    const paidAmount = data.paidAmount ?? existing.paidAmount;
    const balanceDue = totalAmount - paidAmount;

    const sql = `
      UPDATE ${this.tableName}
      SET
        account_id = COALESCE($3, account_id),
        contract_id = COALESCE($4, contract_id),
        order_id = COALESCE($5, order_id),
        invoice_date = COALESCE($6, invoice_date),
        due_date = COALESCE($7, due_date),
        subtotal = COALESCE($8, subtotal),
        tax_amount = COALESCE($9, tax_amount),
        total_amount = COALESCE($10, total_amount),
        paid_amount = COALESCE($11, paid_amount),
        balance_due = $12,
        billing_period_start = COALESCE($13, billing_period_start),
        billing_period_end = COALESCE($14, billing_period_end),
        billing_address_street = COALESCE($15, billing_address_street),
        billing_address_city = COALESCE($16, billing_address_city),
        billing_address_state = COALESCE($17, billing_address_state),
        billing_address_postal_code = COALESCE($18, billing_address_postal_code),
        billing_address_country = COALESCE($19, billing_address_country),
        notes = COALESCE($20, notes),
        owner_id = COALESCE($21, owner_id),
        updated_at = $22,
        updated_by = $23,
        system_modstamp = $24
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      RETURNING *
    `;

    const result = await query<Invoice>(sql, [
      tenantId,
      id,
      data.accountId,
      data.contractId,
      data.orderId,
      data.invoiceDate,
      data.dueDate,
      data.subtotal,
      data.taxAmount,
      data.totalAmount,
      data.paidAmount,
      balanceDue,
      data.billingPeriodStart,
      data.billingPeriodEnd,
      data.billingAddress?.street,
      data.billingAddress?.city,
      data.billingAddress?.state,
      data.billingAddress?.postalCode,
      data.billingAddress?.country,
      data.notes,
      data.ownerId,
      now,
      userId,
      newModstamp,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError(this.tableName, id);
    }

    return this.mapFromDb(result.rows[0]);
  }

  // INV-INV3: Send invoice - TotalAmount must be > 0
  async send(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Invoice> {
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

      const invoice = this.mapFromDb(checkResult.rows[0]);

      if (invoice.status !== "Draft") {
        throw new ValidationError([
          { field: "status", message: "Only Draft invoices can be sent. Invoice must be in Draft status." },
        ]);
      }

      // INV-INV3: TotalAmount > 0
      if (!invoice.totalAmount || invoice.totalAmount <= 0) {
        throw new ValidationError([
          { field: "totalAmount", message: "Invoice total amount must be greater than zero." },
        ]);
      }

      const now = new Date();
      const newModstamp = uuidv4();

      const sql = `
        UPDATE ${this.tableName}
        SET status = 'Sent', sent_at = $3,
            updated_at = $4, updated_by = $5, system_modstamp = $6
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING *
      `;

      const result = await client.query(sql, [
        tenantId,
        id,
        now,
        now,
        userId,
        newModstamp,
      ]);

      return this.mapFromDb(result.rows[0]);
    });
  }

  async recordPayment(
    tenantId: string,
    userId: string,
    id: string,
    paymentAmount: number
  ): Promise<Invoice> {
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

      const invoice = this.mapFromDb(checkResult.rows[0]);

      if (invoice.status !== "Sent" && invoice.status !== "PartialPaid" && invoice.status !== "Overdue") {
        throw new ValidationError([
          { field: "status", message: "Can only record payment for Sent, PartialPaid, or Overdue invoices." },
        ]);
      }

      const newPaidAmount = (invoice.paidAmount || 0) + paymentAmount;
      const newBalanceDue = (invoice.totalAmount || 0) - newPaidAmount;

      let newStatus: string;
      let paidAt: Date | null = null;

      if (newBalanceDue <= 0) {
        newStatus = "Paid";
        paidAt = new Date();
      } else {
        newStatus = "PartialPaid";
      }

      const now = new Date();
      const newModstamp = uuidv4();

      const sql = `
        UPDATE ${this.tableName}
        SET status = $3, paid_amount = $4, balance_due = $5, paid_at = $6,
            updated_at = $7, updated_by = $8, system_modstamp = $9
        WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
        RETURNING *
      `;

      const result = await client.query(sql, [
        tenantId,
        id,
        newStatus,
        newPaidAmount,
        Math.max(0, newBalanceDue),
        paidAt,
        now,
        userId,
        newModstamp,
      ]);

      return this.mapFromDb(result.rows[0]);
    });
  }

  async markOverdue(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Invoice> {
    const existing = await this.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(this.tableName, id);
    }

    if (existing.status !== "Sent" && existing.status !== "PartialPaid") {
      throw new ValidationError([
        { field: "status", message: "Only Sent or PartialPaid invoices can be marked as Overdue." },
      ]);
    }

    const now = new Date();
    const newModstamp = uuidv4();

    const sql = `
      UPDATE ${this.tableName}
      SET status = 'Overdue',
          updated_at = $3, updated_by = $4, system_modstamp = $5
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      RETURNING *
    `;

    const result = await query<Invoice>(sql, [
      tenantId,
      id,
      now,
      userId,
      newModstamp,
    ]);

    return this.mapFromDb(result.rows[0]);
  }

  async cancel(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Invoice> {
    const existing = await this.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(this.tableName, id);
    }

    if (existing.status !== "Draft" && existing.status !== "Sent") {
      throw new ValidationError([
        { field: "status", message: "Only Draft or Sent invoices can be cancelled." },
      ]);
    }

    const now = new Date();
    const newModstamp = uuidv4();

    const sql = `
      UPDATE ${this.tableName}
      SET status = 'Cancelled',
          updated_at = $3, updated_by = $4, system_modstamp = $5
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      RETURNING *
    `;

    const result = await query<Invoice>(sql, [
      tenantId,
      id,
      now,
      userId,
      newModstamp,
    ]);

    return this.mapFromDb(result.rows[0]);
  }

  async void(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Invoice> {
    const existing = await this.findById(tenantId, id);
    if (!existing) {
      throw new NotFoundError(this.tableName, id);
    }

    // Void can be used for any status except already Void
    if (existing.status === "Void") {
      throw new ValidationError([
        { field: "status", message: "Invoice is already voided." },
      ]);
    }

    const now = new Date();
    const newModstamp = uuidv4();

    const sql = `
      UPDATE ${this.tableName}
      SET status = 'Void',
          updated_at = $3, updated_by = $4, system_modstamp = $5
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
      RETURNING *
    `;

    const result = await query<Invoice>(sql, [
      tenantId,
      id,
      now,
      userId,
      newModstamp,
    ]);

    return this.mapFromDb(result.rows[0]);
  }

  async delete(tenantId: string, userId: string, id: string): Promise<void> {
    const existing = await this.findById(tenantId, id);
    if (existing && existing.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Only Draft invoices can be deleted. Invoice must be in Draft status." },
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

  private mapFromDb(row: Invoice): Invoice {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as unknown as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      mapped[camelKey] = value;
    }

    // Map billing address
    if (
      mapped.billingAddressStreet ||
      mapped.billingAddressCity ||
      mapped.billingAddressState
    ) {
      mapped.billingAddress = {
        street: mapped.billingAddressStreet,
        city: mapped.billingAddressCity,
        state: mapped.billingAddressState,
        postalCode: mapped.billingAddressPostalCode,
        country: mapped.billingAddressCountry,
      };
    }

    return mapped as unknown as Invoice;
  }
}

export const invoiceRepository = new InvoiceRepository();
