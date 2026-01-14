import { v4 as uuidv4 } from "uuid";
import { query } from "../db/connection.js";
import { NotFoundError, ConflictError, ValidationError } from "../middleware/errorHandler.js";
import type {
  ValidationRule,
  CreateValidationRuleInput,
  UpdateValidationRuleInput,
  PaginatedResponse,
  ValidationObjectName,
} from "../types/index.js";

interface ListParams {
  limit?: number;
  cursor?: string;
  objectName?: ValidationObjectName;
  isActive?: boolean;
}

export class ValidationRuleRepository {
  async findById(tenantId: string, id: string): Promise<ValidationRule | null> {
    const sql = `
      SELECT
        id,
        tenant_id,
        object_name,
        rule_name,
        description,
        is_active,
        condition_expression,
        error_message,
        error_field,
        execution_order,
        apply_on_create,
        apply_on_update,
        created_at,
        created_by,
        updated_at,
        updated_by,
        is_deleted,
        system_modstamp
      FROM validation_rules
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapFromDb(result.rows[0]) : null;
  }

  async findByIdOrThrow(tenantId: string, id: string): Promise<ValidationRule> {
    const record = await this.findById(tenantId, id);
    if (!record) {
      throw new NotFoundError("validation_rules", id);
    }
    return record;
  }

  async list(
    tenantId: string,
    params: ListParams = {}
  ): Promise<PaginatedResponse<ValidationRule>> {
    const { limit = 50, cursor, objectName, isActive } = params;

    const conditions: string[] = ["tenant_id = $1", "is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (objectName) {
      conditions.push(`object_name = $${paramIndex}`);
      values.push(objectName);
      paramIndex++;
    }

    if (isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Count
    const countSql = `SELECT COUNT(*) FROM validation_rules WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    // Select
    const sql = `
      SELECT
        id,
        tenant_id,
        object_name,
        rule_name,
        description,
        is_active,
        condition_expression,
        error_message,
        error_field,
        execution_order,
        apply_on_create,
        apply_on_update,
        created_at,
        created_by,
        updated_at,
        updated_by,
        is_deleted,
        system_modstamp
      FROM validation_rules
      WHERE ${whereClause}
      ORDER BY execution_order ASC, rule_name ASC
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<Record<string, unknown>>(sql, values);
    const records = result.rows.slice(0, limit).map((r) => this.mapFromDb(r));
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore ? records[records.length - 1].createdAt.toISOString() : undefined,
    };
  }

  /**
   * Get all active validation rules for an object
   * Used by validation engine during save pipeline
   */
  async findActiveByObjectName(
    tenantId: string,
    objectName: ValidationObjectName
  ): Promise<ValidationRule[]> {
    const sql = `
      SELECT
        id,
        tenant_id,
        object_name,
        rule_name,
        description,
        is_active,
        condition_expression,
        error_message,
        error_field,
        execution_order,
        apply_on_create,
        apply_on_update,
        created_at,
        created_by,
        updated_at,
        updated_by,
        is_deleted,
        system_modstamp
      FROM validation_rules
      WHERE tenant_id = $1
        AND object_name = $2
        AND is_active = true
        AND is_deleted = false
      ORDER BY execution_order ASC, rule_name ASC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, objectName]);
    return result.rows.map((r) => this.mapFromDb(r));
  }

  async create(
    tenantId: string,
    userId: string,
    data: CreateValidationRuleInput
  ): Promise<ValidationRule> {
    // Check for duplicate rule name
    const existsCheck = await query<{ id: string }>(
      `SELECT id FROM validation_rules
       WHERE tenant_id = $1 AND object_name = $2 AND rule_name = $3 AND is_deleted = false`,
      [tenantId, data.objectName, data.ruleName]
    );

    if (existsCheck.rows.length > 0) {
      throw new ValidationError([
        { field: "ruleName", message: "A validation rule with this name already exists for this object." },
      ]);
    }

    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const sql = `
      INSERT INTO validation_rules (
        id, tenant_id, object_name, rule_name, description,
        is_active, condition_expression, error_message, error_field,
        execution_order, apply_on_create, apply_on_update,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id
    `;

    const values = [
      id,
      tenantId,
      data.objectName,
      data.ruleName,
      data.description || null,
      data.isActive ?? true,
      JSON.stringify(data.conditionExpression),
      data.errorMessage,
      data.errorField || null,
      data.executionOrder ?? 100,
      data.applyOnCreate ?? true,
      data.applyOnUpdate ?? true,
      now,
      userId,
      now,
      userId,
      false,
      systemModstamp,
    ];

    await query(sql, values);
    return this.findById(tenantId, id) as Promise<ValidationRule>;
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: UpdateValidationRuleInput,
    etag?: string
  ): Promise<ValidationRule> {
    const existing = await this.findByIdOrThrow(tenantId, id);

    if (etag && existing.systemModstamp !== etag) {
      throw new ConflictError(`ValidationRule ${id} was modified by another user`);
    }

    // Check for duplicate rule name if changing
    if (data.ruleName && data.ruleName !== existing.ruleName) {
      const existsCheck = await query<{ id: string }>(
        `SELECT id FROM validation_rules
         WHERE tenant_id = $1 AND object_name = $2 AND rule_name = $3 AND id != $4 AND is_deleted = false`,
        [tenantId, existing.objectName, data.ruleName, id]
      );

      if (existsCheck.rows.length > 0) {
        throw new ValidationError([
          { field: "ruleName", message: "A validation rule with this name already exists for this object." },
        ]);
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.ruleName !== undefined) {
      updates.push(`rule_name = $${paramIndex}`);
      values.push(data.ruleName);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(data.description);
      paramIndex++;
    }

    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(data.isActive);
      paramIndex++;
    }

    if (data.conditionExpression !== undefined) {
      updates.push(`condition_expression = $${paramIndex}`);
      values.push(JSON.stringify(data.conditionExpression));
      paramIndex++;
    }

    if (data.errorMessage !== undefined) {
      updates.push(`error_message = $${paramIndex}`);
      values.push(data.errorMessage);
      paramIndex++;
    }

    if (data.errorField !== undefined) {
      updates.push(`error_field = $${paramIndex}`);
      values.push(data.errorField);
      paramIndex++;
    }

    if (data.executionOrder !== undefined) {
      updates.push(`execution_order = $${paramIndex}`);
      values.push(data.executionOrder);
      paramIndex++;
    }

    if (data.applyOnCreate !== undefined) {
      updates.push(`apply_on_create = $${paramIndex}`);
      values.push(data.applyOnCreate);
      paramIndex++;
    }

    if (data.applyOnUpdate !== undefined) {
      updates.push(`apply_on_update = $${paramIndex}`);
      values.push(data.applyOnUpdate);
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramIndex}`);
    values.push(userId);
    paramIndex++;
    updates.push(`system_modstamp = uuid_generate_v4()`);

    values.push(tenantId, id);

    const sql = `
      UPDATE validation_rules
      SET ${updates.join(", ")}
      WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1} AND is_deleted = false
      RETURNING id
    `;

    await query(sql, values);
    return this.findById(tenantId, id) as Promise<ValidationRule>;
  }

  async delete(tenantId: string, userId: string, id: string): Promise<void> {
    await this.findByIdOrThrow(tenantId, id);

    const sql = `
      UPDATE validation_rules
      SET is_deleted = true, updated_at = NOW(), updated_by = $3, system_modstamp = uuid_generate_v4()
      WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
    `;
    await query(sql, [tenantId, id, userId]);
  }

  private mapFromDb(row: Record<string, unknown>): ValidationRule {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      objectName: row.object_name as ValidationObjectName,
      ruleName: row.rule_name as string,
      description: row.description as string | undefined,
      isActive: row.is_active as boolean,
      conditionExpression: row.condition_expression as ValidationRule["conditionExpression"],
      errorMessage: row.error_message as string,
      errorField: row.error_field as string | undefined,
      executionOrder: row.execution_order as number,
      applyOnCreate: row.apply_on_create as boolean,
      applyOnUpdate: row.apply_on_update as boolean,
      createdAt: new Date(row.created_at as string),
      createdBy: row.created_by as string,
      updatedAt: new Date(row.updated_at as string),
      updatedBy: row.updated_by as string,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
    };
  }
}

export const validationRuleRepository = new ValidationRuleRepository();
