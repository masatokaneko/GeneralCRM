import { BaseRepository } from "./baseRepository.js";
import { transaction } from "../db/connection.js";
import type { Lead, Account, Contact, Opportunity } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

export interface ConvertLeadParams {
  createAccount?: boolean;
  existingAccountId?: string;
  createOpportunity?: boolean;
  opportunityName?: string;
}

export interface ConvertLeadResult {
  accountId: string;
  contactId: string;
  opportunityId?: string;
}

export class LeadRepository extends BaseRepository<Lead> {
  protected tableName = "leads";
  protected trackableObjectName = "Lead" as const;
  protected columns = [
    "id",
    "tenant_id",
    "owner_id",
    "first_name",
    "last_name",
    "company",
    "email",
    "phone",
    "title",
    "industry",
    "lead_source",
    "status",
    "rating",
    "street",
    "city",
    "state",
    "postal_code",
    "country",
    "is_converted",
    "converted_account_id",
    "converted_contact_id",
    "converted_opportunity_id",
    "converted_at",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "is_deleted",
    "system_modstamp",
  ];

  async convert(
    tenantId: string,
    userId: string,
    leadId: string,
    params: ConvertLeadParams
  ): Promise<ConvertLeadResult> {
    return transaction(async (client) => {
      // Get the lead
      const leadResult = await client.query(
        `SELECT * FROM leads WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
        [tenantId, leadId]
      );

      if (leadResult.rows.length === 0) {
        throw new Error("Lead not found");
      }

      const lead = this.mapFromDb(leadResult.rows[0]);

      if (lead.isConverted) {
        throw new Error("Lead is already converted");
      }

      const now = new Date();
      let accountId: string;
      let contactId: string;
      let opportunityId: string | undefined;

      // Create or use existing account
      if (params.createAccount !== false && !params.existingAccountId) {
        accountId = uuidv4();
        await client.query(
          `INSERT INTO accounts (
            id, tenant_id, owner_id, name, industry, phone,
            street, city, state, postal_code, country,
            status, created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            accountId,
            tenantId,
            userId,
            lead.company,
            lead.industry,
            lead.phone,
            lead.address?.street,
            lead.address?.city,
            lead.address?.state,
            lead.address?.postalCode,
            lead.address?.country,
            "Active",
            now,
            userId,
            now,
            userId,
            false,
            uuidv4(),
          ]
        );
      } else {
        accountId = params.existingAccountId!;
      }

      // Create contact
      contactId = uuidv4();
      await client.query(
        `INSERT INTO contacts (
          id, tenant_id, owner_id, account_id, first_name, last_name, email, phone, title,
          mailing_street, mailing_city, mailing_state, mailing_postal_code, mailing_country,
          is_primary, created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [
          contactId,
          tenantId,
          userId,
          accountId,
          lead.firstName,
          lead.lastName,
          lead.email,
          lead.phone,
          lead.title,
          lead.address?.street,
          lead.address?.city,
          lead.address?.state,
          lead.address?.postalCode,
          lead.address?.country,
          true,
          now,
          userId,
          now,
          userId,
          false,
          uuidv4(),
        ]
      );

      // Create opportunity if requested
      if (params.createOpportunity) {
        opportunityId = uuidv4();
        const closeDate = new Date();
        closeDate.setDate(closeDate.getDate() + 30);

        await client.query(
          `INSERT INTO opportunities (
            id, tenant_id, owner_id, name, account_id, stage_name, probability,
            close_date, is_closed, is_won, forecast_category, lead_source,
            created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            opportunityId,
            tenantId,
            userId,
            params.opportunityName || `${lead.company} - New Opportunity`,
            accountId,
            "Prospecting",
            10,
            closeDate,
            false,
            false,
            "Pipeline",
            lead.leadSource,
            now,
            userId,
            now,
            userId,
            false,
            uuidv4(),
          ]
        );
      }

      // Update lead as converted
      await client.query(
        `UPDATE leads SET
          is_converted = true,
          converted_account_id = $3,
          converted_contact_id = $4,
          converted_opportunity_id = $5,
          converted_at = $6,
          updated_at = $6,
          updated_by = $7,
          system_modstamp = $8
        WHERE tenant_id = $1 AND id = $2`,
        [tenantId, leadId, accountId, contactId, opportunityId, now, userId, uuidv4()]
      );

      return { accountId, contactId, opportunityId };
    });
  }

  protected mapToDb(record: Lead): Record<string, unknown> {
    const base = super.mapToDb(record);

    if (record.address) {
      base.street = record.address.street;
      base.city = record.address.city;
      base.state = record.address.state;
      base.postal_code = record.address.postalCode;
      base.country = record.address.country;
    }

    delete base.address;

    return base;
  }

  protected mapFromDb(row: Lead): Lead {
    const base = super.mapFromDb(row) as unknown as Record<string, unknown>;

    const result: Lead = {
      ...base,
      address: {
        street: base.street as string | undefined,
        city: base.city as string | undefined,
        state: base.state as string | undefined,
        postalCode: base.postalCode as string | undefined,
        country: base.country as string | undefined,
      },
    } as Lead;

    const resultAsRecord = result as unknown as Record<string, unknown>;
    delete resultAsRecord.street;
    delete resultAsRecord.city;
    delete resultAsRecord.state;
    delete resultAsRecord.postalCode;
    delete resultAsRecord.country;

    return result;
  }
}

export const leadRepository = new LeadRepository();
