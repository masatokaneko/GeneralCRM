import { BaseRepository, type ListParams } from "./baseRepository.js";
import type { Contract, PaginatedResponse } from "../types/index.js";
import { ValidationError } from "../middleware/errorHandler.js";

export class ContractRepository extends BaseRepository<Contract> {
  protected tableName = "contracts";
  protected trackableObjectName = "Contract" as const;
  protected columns = [
    "id",
    "tenant_id",
    "owner_id",
    "account_id",
    "contract_number",
    "name",
    "contract_type",
    "status",
    "start_date",
    "end_date",
    "term_months",
    "billing_frequency",
    "total_contract_value",
    "remaining_value",
    "auto_renewal",
    "renewal_term_months",
    "renewal_notice_date",
    "activated_at",
    "activated_by",
    "terminated_at",
    "termination_reason",
    "primary_order_id",
    "source_contract_id",
    "description",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "is_deleted",
    "system_modstamp",
  ];

  async findByAccountId(
    tenantId: string,
    accountId: string,
    params: ListParams = {}
  ): Promise<PaginatedResponse<Contract>> {
    return this.list(tenantId, {
      ...params,
      filters: { ...params.filters, accountId },
    });
  }

  async findByOrderId(
    tenantId: string,
    orderId: string,
    params: ListParams = {}
  ): Promise<PaginatedResponse<Contract>> {
    return this.list(tenantId, {
      ...params,
      filters: { ...params.filters, primaryOrderId: orderId },
    });
  }

  // INV-CON3: EndDate = StartDate + TermMonths - 1日
  private calculateEndDate(startDate: Date, termMonths: number): Date {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + termMonths);
    endDate.setDate(endDate.getDate() - 1);
    return endDate;
  }

  async create(
    tenantId: string,
    userId: string,
    data: Partial<Contract>
  ): Promise<Contract> {
    // Auto-calculate end date if start date and term months are provided
    if (data.startDate && data.termMonths && !data.endDate) {
      data.endDate = this.calculateEndDate(
        new Date(data.startDate),
        data.termMonths
      );
    }

    // Set remaining value equal to total contract value initially
    if (data.totalContractValue !== undefined && data.remainingValue === undefined) {
      data.remainingValue = data.totalContractValue;
    }

    return super.create(tenantId, userId, data);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<Contract>,
    etag?: string
  ): Promise<Contract> {
    const existing = await this.findByIdOrThrow(tenantId, id);

    // Recalculate end date if start date or term months changed
    if (data.startDate || data.termMonths) {
      const startDate = data.startDate
        ? new Date(data.startDate)
        : existing.startDate
          ? new Date(existing.startDate)
          : null;
      const termMonths = data.termMonths ?? existing.termMonths;

      if (startDate && termMonths) {
        data.endDate = this.calculateEndDate(startDate, termMonths);
      }
    }

    return super.update(tenantId, userId, id, data, etag);
  }

  // Submit for approval: Draft → InApproval
  async submitForApproval(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Contract> {
    const contract = await this.findByIdOrThrow(tenantId, id);

    if (contract.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Only Draft contracts can be submitted for approval." },
      ]);
    }

    return this.update(tenantId, userId, id, {
      status: "InApproval",
    } as Partial<Contract>);
  }

  // Activate contract: InApproval → Activated
  async activate(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Contract> {
    const contract = await this.findByIdOrThrow(tenantId, id);

    if (contract.status !== "InApproval" && contract.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Only Draft or InApproval contracts can be activated." },
      ]);
    }

    return this.update(tenantId, userId, id, {
      status: "Activated",
      activatedAt: new Date(),
      activatedBy: userId,
    } as unknown as Partial<Contract>);
  }

  // Terminate contract: Activated → Terminated
  async terminate(
    tenantId: string,
    userId: string,
    id: string,
    reason?: string
  ): Promise<Contract> {
    const contract = await this.findByIdOrThrow(tenantId, id);

    if (contract.status !== "Activated") {
      throw new ValidationError([
        { field: "status", message: "Only Activated contracts can be terminated. Contract must be in Activated status." },
      ]);
    }

    return this.update(tenantId, userId, id, {
      status: "Terminated",
      terminatedAt: new Date(),
      terminationReason: reason,
    } as unknown as Partial<Contract>);
  }

  // Expire contract: Activated → Expired (when end date is reached)
  async expire(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Contract> {
    const contract = await this.findByIdOrThrow(tenantId, id);

    if (contract.status !== "Activated") {
      throw new ValidationError([
        { field: "status", message: "Only Activated contracts can be expired. Contract must be in Activated status." },
      ]);
    }

    return this.update(tenantId, userId, id, {
      status: "Expired",
    } as Partial<Contract>);
  }

  // Renew contract: Creates a new contract with source_contract_id
  async renew(
    tenantId: string,
    userId: string,
    id: string,
    renewalData?: Partial<Contract>
  ): Promise<Contract> {
    const originalContract = await this.findByIdOrThrow(tenantId, id);

    if (originalContract.status !== "Activated" && originalContract.status !== "Expired") {
      throw new ValidationError([
        { field: "status", message: "Only Activated or Expired contracts can be renewed. Contract must be in Activated or Expired status." },
      ]);
    }

    // Calculate new dates
    const newTermMonths = renewalData?.termMonths ?? originalContract.renewalTermMonths ?? originalContract.termMonths;
    const newStartDate = originalContract.endDate
      ? new Date(originalContract.endDate)
      : new Date();
    newStartDate.setDate(newStartDate.getDate() + 1);

    const newEndDate = this.calculateEndDate(newStartDate, newTermMonths);

    // Generate new contract number
    const contractNumber = `${originalContract.contractNumber}-R${Date.now()}`;

    const newContractData: Partial<Contract> = {
      accountId: originalContract.accountId,
      name: `${originalContract.name} (Renewal)`,
      contractNumber,
      contractType: originalContract.contractType,
      termMonths: newTermMonths,
      billingFrequency: originalContract.billingFrequency,
      startDate: newStartDate,
      endDate: newEndDate,
      totalContractValue: renewalData?.totalContractValue ?? originalContract.totalContractValue,
      remainingValue: renewalData?.totalContractValue ?? originalContract.totalContractValue,
      autoRenewal: originalContract.autoRenewal,
      renewalTermMonths: originalContract.renewalTermMonths,
      sourceContractId: id,
      description: originalContract.description,
      ...renewalData,
    };

    return this.create(tenantId, userId, newContractData);
  }

  protected mapFromDb(row: Contract): Contract {
    const record = super.mapFromDb(row);
    return record;
  }
}

export const contractRepository = new ContractRepository();
