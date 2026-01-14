import { BaseRepository, type ListParams } from "./baseRepository.js";
import { query, transaction } from "../db/connection.js";
import type { Opportunity, PaginatedResponse } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

const STAGE_CONFIG: Record<
  string,
  { probability: number; forecastCategory: string; isClosed: boolean; isWon: boolean }
> = {
  Prospecting: { probability: 10, forecastCategory: "Pipeline", isClosed: false, isWon: false },
  Qualification: { probability: 20, forecastCategory: "Pipeline", isClosed: false, isWon: false },
  "Needs Analysis": { probability: 30, forecastCategory: "Pipeline", isClosed: false, isWon: false },
  "Value Proposition": { probability: 50, forecastCategory: "Best Case", isClosed: false, isWon: false },
  "Proposal/Price Quote": { probability: 75, forecastCategory: "Best Case", isClosed: false, isWon: false },
  "Negotiation/Review": { probability: 90, forecastCategory: "Commit", isClosed: false, isWon: false },
  "Closed Won": { probability: 100, forecastCategory: "Closed", isClosed: true, isWon: true },
  "Closed Lost": { probability: 0, forecastCategory: "Closed", isClosed: true, isWon: false },
};

export class OpportunityRepository extends BaseRepository<Opportunity> {
  protected tableName = "opportunities";
  protected trackableObjectName = "Opportunity" as const;
  protected columns = [
    "id",
    "tenant_id",
    "owner_id",
    "name",
    "account_id",
    "stage_name",
    "probability",
    "amount",
    "close_date",
    "is_closed",
    "is_won",
    "lost_reason",
    "forecast_category",
    "type",
    "lead_source",
    "next_step",
    "description",
    "pricebook_id",
    "primary_quote_id",
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
  ): Promise<PaginatedResponse<Opportunity>> {
    return this.list(tenantId, {
      ...params,
      filters: { ...params.filters, accountId },
    });
  }

  async changeStage(
    tenantId: string,
    userId: string,
    id: string,
    stageName: string
  ): Promise<Opportunity> {
    const stageConfig = STAGE_CONFIG[stageName];
    if (!stageConfig) {
      throw new Error(`Invalid stage: ${stageName}`);
    }

    return this.update(tenantId, userId, id, {
      stageName,
      probability: stageConfig.probability,
      forecastCategory: stageConfig.forecastCategory as Opportunity["forecastCategory"],
      isClosed: stageConfig.isClosed,
      isWon: stageConfig.isWon,
    } as Partial<Opportunity>);
  }

  async close(
    tenantId: string,
    userId: string,
    id: string,
    isWon: boolean,
    lostReason?: string
  ): Promise<Opportunity> {
    const stageName = isWon ? "Closed Won" : "Closed Lost";
    const stageConfig = STAGE_CONFIG[stageName];

    return this.update(tenantId, userId, id, {
      stageName,
      probability: stageConfig.probability,
      forecastCategory: stageConfig.forecastCategory as Opportunity["forecastCategory"],
      isClosed: true,
      isWon,
      lostReason: isWon ? undefined : lostReason,
    } as Partial<Opportunity>);
  }
}

export const opportunityRepository = new OpportunityRepository();
