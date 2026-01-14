import { v4 as uuidv4 } from "uuid";
import { query } from "../db/connection.js";
import { NotFoundError, ValidationError, ConflictError } from "../middleware/errorHandler.js";
import type {
  ApprovalInstance,
  ApprovalWorkItem,
  ApprovalHistory,
  CreateApprovalInstanceInput,
  PaginatedResponse,
} from "../types/index.js";

interface ListParams {
  limit?: number;
  cursor?: string;
  status?: string;
  targetObjectName?: string;
  targetRecordId?: string;
  submittedBy?: string;
}

interface WorkItemListParams {
  limit?: number;
  cursor?: string;
  status?: string;
  approverId?: string;
}

export class ApprovalInstanceRepository {
  // =============================================
  // Approval Instance Methods
  // =============================================

  async findInstanceById(tenantId: string, id: string): Promise<ApprovalInstance | null> {
    const sql = `
      SELECT
        ai.id,
        ai.tenant_id,
        ai.process_definition_id,
        ai.target_object_name,
        ai.target_record_id,
        ai.status,
        ai.submitted_by,
        ai.submitted_at,
        ai.completed_at,
        ai.completed_by,
        ai.current_step,
        ai.created_at,
        ai.created_by,
        ai.updated_at,
        ai.updated_by,
        ai.is_deleted,
        ai.system_modstamp,
        ap.name as process_name,
        u.display_name as submitter_name
      FROM approval_instances ai
      LEFT JOIN approval_processes ap ON ai.process_definition_id = ap.id
      LEFT JOIN users u ON ai.submitted_by = u.id
      WHERE ai.tenant_id = $1 AND ai.id = $2 AND ai.is_deleted = false
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapInstanceFromDb(result.rows[0]) : null;
  }

  async findInstanceByIdOrThrow(tenantId: string, id: string): Promise<ApprovalInstance> {
    const instance = await this.findInstanceById(tenantId, id);
    if (!instance) {
      throw new NotFoundError("approval_instances", id);
    }
    return instance;
  }

  async listInstances(
    tenantId: string,
    params: ListParams = {}
  ): Promise<PaginatedResponse<ApprovalInstance>> {
    const { limit = 50, cursor, status, targetObjectName, targetRecordId, submittedBy } = params;

    const conditions: string[] = ["ai.tenant_id = $1", "ai.is_deleted = false"];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`ai.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (targetObjectName) {
      conditions.push(`ai.target_object_name = $${paramIndex}`);
      values.push(targetObjectName);
      paramIndex++;
    }

    if (targetRecordId) {
      conditions.push(`ai.target_record_id = $${paramIndex}`);
      values.push(targetRecordId);
      paramIndex++;
    }

    if (submittedBy) {
      conditions.push(`ai.submitted_by = $${paramIndex}`);
      values.push(submittedBy);
      paramIndex++;
    }

    if (cursor) {
      conditions.push(`ai.created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `SELECT COUNT(*) FROM approval_instances ai WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT
        ai.id,
        ai.tenant_id,
        ai.process_definition_id,
        ai.target_object_name,
        ai.target_record_id,
        ai.status,
        ai.submitted_by,
        ai.submitted_at,
        ai.completed_at,
        ai.completed_by,
        ai.current_step,
        ai.created_at,
        ai.created_by,
        ai.updated_at,
        ai.updated_by,
        ai.is_deleted,
        ai.system_modstamp,
        ap.name as process_name,
        u.display_name as submitter_name
      FROM approval_instances ai
      LEFT JOIN approval_processes ap ON ai.process_definition_id = ap.id
      LEFT JOIN users u ON ai.submitted_by = u.id
      WHERE ${whereClause}
      ORDER BY ai.created_at DESC
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<Record<string, unknown>>(sql, values);
    const records = result.rows.slice(0, limit).map((r) => this.mapInstanceFromDb(r));
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore ? records[records.length - 1].createdAt.toISOString() : undefined,
    };
  }

  async submit(
    tenantId: string,
    userId: string,
    input: CreateApprovalInstanceInput
  ): Promise<ApprovalInstance> {
    const { processDefinitionId, targetObjectName, targetRecordId, comments } = input;

    // Check if there's already a pending approval for this record
    const existingCheck = await query<{ id: string }>(
      `SELECT id FROM approval_instances
       WHERE tenant_id = $1 AND target_object_name = $2 AND target_record_id = $3
       AND status = 'Pending' AND is_deleted = false`,
      [tenantId, targetObjectName, targetRecordId]
    );

    if (existingCheck.rows.length > 0) {
      throw new ValidationError([
        { field: "targetRecordId", message: "This record already has a pending approval request." },
      ]);
    }

    // Get approval process definition
    const processResult = await query<Record<string, unknown>>(
      `SELECT id, steps FROM approval_processes WHERE tenant_id = $1 AND id = $2 AND is_active = true AND is_deleted = false`,
      [tenantId, processDefinitionId]
    );

    if (processResult.rows.length === 0) {
      throw new ValidationError([
        { field: "processDefinitionId", message: "Approval process not found or not active." },
      ]);
    }

    const process = processResult.rows[0];
    const steps = process.steps as Array<{ approvers: Array<{ id: string }> }>;

    if (!steps || steps.length === 0) {
      throw new ValidationError([
        { field: "processDefinitionId", message: "Approval process has no steps defined." },
      ]);
    }

    const id = uuidv4();
    const now = new Date();

    // Create approval instance
    await query(
      `INSERT INTO approval_instances (
        id, tenant_id, process_definition_id, target_object_name, target_record_id,
        status, submitted_by, submitted_at, current_step,
        created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      ) VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7, 1, $7, $6, $7, $6, false, uuid_generate_v4())`,
      [id, tenantId, processDefinitionId, targetObjectName, targetRecordId, userId, now]
    );

    // Create work items for step 1 approvers
    const step1 = steps[0];
    for (const approver of step1.approvers || []) {
      await query(
        `INSERT INTO approval_work_items (
          id, tenant_id, approval_instance_id, step_number, approver_id,
          status, assigned_at, created_at, created_by, updated_at, updated_by,
          is_deleted, system_modstamp
        ) VALUES (uuid_generate_v4(), $1, $2, 1, $3, 'Pending', $4, $4, $5, $4, $5, false, uuid_generate_v4())`,
        [tenantId, id, approver.id, now, userId]
      );
    }

    // Create history entry
    await query(
      `INSERT INTO approval_histories (
        id, tenant_id, approval_instance_id, actor_id, action, step_number, comments,
        created_at, created_by, is_deleted
      ) VALUES (uuid_generate_v4(), $1, $2, $3, 'Submit', 1, $4, $5, $3, false)`,
      [tenantId, id, userId, comments || null, now]
    );

    return this.findInstanceByIdOrThrow(tenantId, id);
  }

  async recall(tenantId: string, userId: string, instanceId: string): Promise<ApprovalInstance> {
    const instance = await this.findInstanceByIdOrThrow(tenantId, instanceId);

    if (instance.status !== "Pending") {
      throw new ValidationError([
        { field: "status", message: "Only pending approvals can be recalled." },
      ]);
    }

    if (instance.submittedBy !== userId) {
      throw new ValidationError([
        { field: "submittedBy", message: "Only the submitter can recall an approval request." },
      ]);
    }

    const now = new Date();

    // Update instance status
    await query(
      `UPDATE approval_instances
       SET status = 'Recalled', completed_at = $3, completed_by = $4, updated_at = $3, updated_by = $4,
           system_modstamp = uuid_generate_v4()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, instanceId, now, userId]
    );

    // Cancel pending work items
    await query(
      `UPDATE approval_work_items
       SET status = 'Reassigned', updated_at = $3, updated_by = $4, system_modstamp = uuid_generate_v4()
       WHERE tenant_id = $1 AND approval_instance_id = $2 AND status = 'Pending'`,
      [tenantId, instanceId, now, userId]
    );

    // Create history entry
    await query(
      `INSERT INTO approval_histories (
        id, tenant_id, approval_instance_id, actor_id, action, created_at, created_by, is_deleted
      ) VALUES (uuid_generate_v4(), $1, $2, $3, 'Recall', $4, $3, false)`,
      [tenantId, instanceId, userId, now]
    );

    return this.findInstanceByIdOrThrow(tenantId, instanceId);
  }

  // =============================================
  // Work Item Methods
  // =============================================

  async findWorkItemById(tenantId: string, id: string): Promise<ApprovalWorkItem | null> {
    const sql = `
      SELECT
        awi.id,
        awi.tenant_id,
        awi.approval_instance_id,
        awi.step_number,
        awi.approver_id,
        awi.status,
        awi.assigned_at,
        awi.completed_at,
        awi.comments,
        awi.original_approver_id,
        awi.reassigned_by,
        awi.reassigned_at,
        awi.created_at,
        awi.created_by,
        awi.updated_at,
        awi.updated_by,
        awi.is_deleted,
        awi.system_modstamp,
        u.display_name as approver_name,
        ai.target_object_name,
        ai.target_record_id,
        ap.name as process_name
      FROM approval_work_items awi
      LEFT JOIN users u ON awi.approver_id = u.id
      LEFT JOIN approval_instances ai ON awi.approval_instance_id = ai.id
      LEFT JOIN approval_processes ap ON ai.process_definition_id = ap.id
      WHERE awi.tenant_id = $1 AND awi.id = $2 AND awi.is_deleted = false
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, id]);
    return result.rows[0] ? this.mapWorkItemFromDb(result.rows[0]) : null;
  }

  async findWorkItemByIdOrThrow(tenantId: string, id: string): Promise<ApprovalWorkItem> {
    const item = await this.findWorkItemById(tenantId, id);
    if (!item) {
      throw new NotFoundError("approval_work_items", id);
    }
    return item;
  }

  async listMyWorkItems(
    tenantId: string,
    userId: string,
    params: WorkItemListParams = {}
  ): Promise<PaginatedResponse<ApprovalWorkItem>> {
    const { limit = 50, cursor, status } = params;

    const conditions: string[] = [
      "awi.tenant_id = $1",
      "awi.approver_id = $2",
      "awi.is_deleted = false",
    ];
    const values: unknown[] = [tenantId, userId];
    let paramIndex = 3;

    if (status) {
      conditions.push(`awi.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    } else {
      // Default to pending work items
      conditions.push(`awi.status = 'Pending'`);
    }

    if (cursor) {
      conditions.push(`awi.created_at < $${paramIndex}`);
      values.push(new Date(cursor));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const countSql = `SELECT COUNT(*) FROM approval_work_items awi WHERE ${whereClause}`;
    const countResult = await query<{ count: string }>(countSql, values);
    const totalSize = parseInt(countResult.rows[0].count, 10);

    const sql = `
      SELECT
        awi.id,
        awi.tenant_id,
        awi.approval_instance_id,
        awi.step_number,
        awi.approver_id,
        awi.status,
        awi.assigned_at,
        awi.completed_at,
        awi.comments,
        awi.original_approver_id,
        awi.reassigned_by,
        awi.reassigned_at,
        awi.created_at,
        awi.created_by,
        awi.updated_at,
        awi.updated_by,
        awi.is_deleted,
        awi.system_modstamp,
        u.display_name as approver_name,
        ai.target_object_name,
        ai.target_record_id,
        ap.name as process_name
      FROM approval_work_items awi
      LEFT JOIN users u ON awi.approver_id = u.id
      LEFT JOIN approval_instances ai ON awi.approval_instance_id = ai.id
      LEFT JOIN approval_processes ap ON ai.process_definition_id = ap.id
      WHERE ${whereClause}
      ORDER BY awi.created_at DESC
      LIMIT $${paramIndex}
    `;
    values.push(limit + 1);

    const result = await query<Record<string, unknown>>(sql, values);
    const records = result.rows.slice(0, limit).map((r) => this.mapWorkItemFromDb(r));
    const hasMore = result.rows.length > limit;

    return {
      records,
      totalSize,
      nextCursor: hasMore ? records[records.length - 1].createdAt.toISOString() : undefined,
    };
  }

  async decide(
    tenantId: string,
    userId: string,
    workItemId: string,
    action: "Approve" | "Reject",
    comments?: string
  ): Promise<ApprovalWorkItem> {
    const workItem = await this.findWorkItemByIdOrThrow(tenantId, workItemId);

    if (workItem.status !== "Pending") {
      throw new ValidationError([
        { field: "status", message: "This work item is no longer pending." },
      ]);
    }

    if (workItem.approverId !== userId) {
      throw new ValidationError([
        { field: "approverId", message: "You are not the assigned approver for this work item." },
      ]);
    }

    const instance = await this.findInstanceByIdOrThrow(tenantId, workItem.approvalInstanceId);
    const now = new Date();

    // Update work item
    await query(
      `UPDATE approval_work_items
       SET status = $3, completed_at = $4, comments = $5, updated_at = $4, updated_by = $6,
           system_modstamp = uuid_generate_v4()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, workItemId, action === "Approve" ? "Approved" : "Rejected", now, comments || null, userId]
    );

    // Create history entry
    await query(
      `INSERT INTO approval_histories (
        id, tenant_id, approval_instance_id, actor_id, action, step_number, comments,
        created_at, created_by, is_deleted
      ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $3, false)`,
      [tenantId, workItem.approvalInstanceId, userId, action, workItem.stepNumber, comments || null, now]
    );

    if (action === "Reject") {
      // Rejection completes the instance
      await query(
        `UPDATE approval_instances
         SET status = 'Rejected', completed_at = $3, completed_by = $4, updated_at = $3, updated_by = $4,
             system_modstamp = uuid_generate_v4()
         WHERE tenant_id = $1 AND id = $2`,
        [tenantId, workItem.approvalInstanceId, now, userId]
      );
    } else {
      // Check if all work items for current step are approved
      const pendingResult = await query<{ count: string }>(
        `SELECT COUNT(*) FROM approval_work_items
         WHERE tenant_id = $1 AND approval_instance_id = $2 AND step_number = $3 AND status = 'Pending' AND is_deleted = false`,
        [tenantId, workItem.approvalInstanceId, workItem.stepNumber]
      );

      const pendingCount = parseInt(pendingResult.rows[0].count, 10);

      if (pendingCount === 0) {
        // All approvers for this step have approved
        // Get process definition to check for next step
        const processResult = await query<Record<string, unknown>>(
          `SELECT steps FROM approval_processes WHERE id = $1`,
          [instance.processDefinitionId]
        );

        const steps = processResult.rows[0]?.steps as Array<{ approvers: Array<{ id: string }> }>;
        const nextStep = workItem.stepNumber + 1;

        if (steps && nextStep <= steps.length) {
          // Move to next step
          await query(
            `UPDATE approval_instances
             SET current_step = $3, updated_at = $4, updated_by = $5, system_modstamp = uuid_generate_v4()
             WHERE tenant_id = $1 AND id = $2`,
            [tenantId, workItem.approvalInstanceId, nextStep, now, userId]
          );

          // Create work items for next step approvers
          const nextStepDef = steps[nextStep - 1];
          for (const approver of nextStepDef.approvers || []) {
            await query(
              `INSERT INTO approval_work_items (
                id, tenant_id, approval_instance_id, step_number, approver_id,
                status, assigned_at, created_at, created_by, updated_at, updated_by,
                is_deleted, system_modstamp
              ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'Pending', $5, $5, $6, $5, $6, false, uuid_generate_v4())`,
              [tenantId, workItem.approvalInstanceId, nextStep, approver.id, now, userId]
            );
          }
        } else {
          // Final step approved - complete the instance
          await query(
            `UPDATE approval_instances
             SET status = 'Approved', completed_at = $3, completed_by = $4, updated_at = $3, updated_by = $4,
                 system_modstamp = uuid_generate_v4()
             WHERE tenant_id = $1 AND id = $2`,
            [tenantId, workItem.approvalInstanceId, now, userId]
          );
        }
      }
    }

    return this.findWorkItemByIdOrThrow(tenantId, workItemId);
  }

  async reassign(
    tenantId: string,
    userId: string,
    workItemId: string,
    newApproverId: string,
    comments?: string
  ): Promise<ApprovalWorkItem> {
    const workItem = await this.findWorkItemByIdOrThrow(tenantId, workItemId);

    if (workItem.status !== "Pending") {
      throw new ValidationError([
        { field: "status", message: "This work item is no longer pending." },
      ]);
    }

    const now = new Date();

    // Update work item with new approver
    await query(
      `UPDATE approval_work_items
       SET approver_id = $3, original_approver_id = COALESCE(original_approver_id, approver_id),
           reassigned_by = $4, reassigned_at = $5, comments = $6,
           updated_at = $5, updated_by = $4, system_modstamp = uuid_generate_v4()
       WHERE tenant_id = $1 AND id = $2`,
      [tenantId, workItemId, newApproverId, userId, now, comments || null]
    );

    // Create history entry
    await query(
      `INSERT INTO approval_histories (
        id, tenant_id, approval_instance_id, actor_id, action, step_number, comments,
        created_at, created_by, is_deleted
      ) VALUES (uuid_generate_v4(), $1, $2, $3, 'Reassign', $4, $5, $6, $3, false)`,
      [tenantId, workItem.approvalInstanceId, userId, workItem.stepNumber, comments || null, now]
    );

    return this.findWorkItemByIdOrThrow(tenantId, workItemId);
  }

  // =============================================
  // History Methods
  // =============================================

  async getHistory(tenantId: string, instanceId: string): Promise<ApprovalHistory[]> {
    const sql = `
      SELECT
        ah.id,
        ah.tenant_id,
        ah.approval_instance_id,
        ah.actor_id,
        ah.action,
        ah.step_number,
        ah.comments,
        ah.created_at,
        ah.created_by,
        ah.is_deleted,
        u.display_name as actor_name
      FROM approval_histories ah
      LEFT JOIN users u ON ah.actor_id = u.id
      WHERE ah.tenant_id = $1 AND ah.approval_instance_id = $2 AND ah.is_deleted = false
      ORDER BY ah.created_at ASC
    `;
    const result = await query<Record<string, unknown>>(sql, [tenantId, instanceId]);
    return result.rows.map((r) => this.mapHistoryFromDb(r));
  }

  // =============================================
  // Mapping Methods
  // =============================================

  private mapInstanceFromDb(row: Record<string, unknown>): ApprovalInstance {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      processDefinitionId: row.process_definition_id as string,
      targetObjectName: row.target_object_name as string,
      targetRecordId: row.target_record_id as string,
      status: row.status as ApprovalInstance["status"],
      submittedBy: row.submitted_by as string,
      submittedAt: new Date(row.submitted_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      completedBy: row.completed_by as string | undefined,
      currentStep: row.current_step as number,
      createdAt: new Date(row.created_at as string),
      createdBy: row.created_by as string,
      updatedAt: new Date(row.updated_at as string),
      updatedBy: row.updated_by as string | undefined,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
      processName: row.process_name as string | undefined,
      submitterName: row.submitter_name as string | undefined,
    };
  }

  private mapWorkItemFromDb(row: Record<string, unknown>): ApprovalWorkItem {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      approvalInstanceId: row.approval_instance_id as string,
      stepNumber: row.step_number as number,
      approverId: row.approver_id as string,
      status: row.status as ApprovalWorkItem["status"],
      assignedAt: new Date(row.assigned_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      comments: row.comments as string | undefined,
      originalApproverId: row.original_approver_id as string | undefined,
      reassignedBy: row.reassigned_by as string | undefined,
      reassignedAt: row.reassigned_at ? new Date(row.reassigned_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      createdBy: row.created_by as string,
      updatedAt: new Date(row.updated_at as string),
      updatedBy: row.updated_by as string | undefined,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
      approverName: row.approver_name as string | undefined,
      targetObjectName: row.target_object_name as string | undefined,
      targetRecordId: row.target_record_id as string | undefined,
      processName: row.process_name as string | undefined,
    };
  }

  private mapHistoryFromDb(row: Record<string, unknown>): ApprovalHistory {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      approvalInstanceId: row.approval_instance_id as string,
      actorId: row.actor_id as string,
      action: row.action as ApprovalHistory["action"],
      stepNumber: row.step_number as number | undefined,
      comments: row.comments as string | undefined,
      createdAt: new Date(row.created_at as string),
      createdBy: row.created_by as string,
      isDeleted: row.is_deleted as boolean,
      actorName: row.actor_name as string | undefined,
    };
  }
}

export const approvalInstanceRepository = new ApprovalInstanceRepository();
