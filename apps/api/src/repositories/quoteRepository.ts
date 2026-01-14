import { BaseRepository, type ListParams } from "./baseRepository.js";
import { query, transaction } from "../db/connection.js";
import type { Quote, PaginatedResponse } from "../types/index.js";

export class QuoteRepository extends BaseRepository<Quote> {
  protected tableName = "quotes";
  protected trackableObjectName = "Quote" as const;
  protected columns = [
    "id",
    "tenant_id",
    "owner_id",
    "name",
    "opportunity_id",
    "status",
    "is_primary",
    "expiration_date",
    "subtotal",
    "discount",
    "total_price",
    "tax_amount",
    "grand_total",
    "billing_street",
    "billing_city",
    "billing_state",
    "billing_postal_code",
    "billing_country",
    "shipping_street",
    "shipping_city",
    "shipping_state",
    "shipping_postal_code",
    "shipping_country",
    "pricebook_id",
    "description",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "is_deleted",
    "system_modstamp",
  ];

  async findByOpportunityId(
    tenantId: string,
    opportunityId: string,
    params: ListParams = {}
  ): Promise<PaginatedResponse<Quote>> {
    return this.list(tenantId, {
      ...params,
      filters: { ...params.filters, opportunityId },
    });
  }

  async setPrimary(
    tenantId: string,
    userId: string,
    quoteId: string,
    opportunityId: string
  ): Promise<Quote> {
    return transaction(async (client) => {
      // Remove primary flag from other quotes
      await client.query(
        `UPDATE quotes SET is_primary = false, updated_at = $3, updated_by = $4
         WHERE tenant_id = $1 AND opportunity_id = $2 AND is_deleted = false`,
        [tenantId, opportunityId, new Date(), userId]
      );

      // Set this quote as primary
      const result = await client.query(
        `UPDATE quotes SET is_primary = true, updated_at = $3, updated_by = $4, system_modstamp = $5
         WHERE tenant_id = $1 AND id = $2 AND is_deleted = false
         RETURNING *`,
        [tenantId, quoteId, new Date(), userId, crypto.randomUUID()]
      );

      // Update opportunity's primary quote
      await client.query(
        `UPDATE opportunities SET primary_quote_id = $3, updated_at = $4, updated_by = $5
         WHERE tenant_id = $1 AND id = $2 AND is_deleted = false`,
        [tenantId, opportunityId, quoteId, new Date(), userId]
      );

      return this.mapFromDb(result.rows[0]);
    });
  }

  async changeStatus(
    tenantId: string,
    userId: string,
    id: string,
    status: Quote["status"]
  ): Promise<Quote> {
    return this.update(tenantId, userId, id, { status } as Partial<Quote>);
  }

  protected mapToDb(record: Quote): Record<string, unknown> {
    const base = super.mapToDb(record);

    if (record.billingAddress) {
      base.billing_street = record.billingAddress.street;
      base.billing_city = record.billingAddress.city;
      base.billing_state = record.billingAddress.state;
      base.billing_postal_code = record.billingAddress.postalCode;
      base.billing_country = record.billingAddress.country;
    }
    if (record.shippingAddress) {
      base.shipping_street = record.shippingAddress.street;
      base.shipping_city = record.shippingAddress.city;
      base.shipping_state = record.shippingAddress.state;
      base.shipping_postal_code = record.shippingAddress.postalCode;
      base.shipping_country = record.shippingAddress.country;
    }

    delete base.billing_address;
    delete base.shipping_address;

    return base;
  }

  protected mapFromDb(row: Quote): Quote {
    const base = super.mapFromDb(row) as unknown as Record<string, unknown>;

    const result: Quote = {
      ...base,
      billingAddress: {
        street: base.billingStreet as string | undefined,
        city: base.billingCity as string | undefined,
        state: base.billingState as string | undefined,
        postalCode: base.billingPostalCode as string | undefined,
        country: base.billingCountry as string | undefined,
      },
      shippingAddress: {
        street: base.shippingStreet as string | undefined,
        city: base.shippingCity as string | undefined,
        state: base.shippingState as string | undefined,
        postalCode: base.shippingPostalCode as string | undefined,
        country: base.shippingCountry as string | undefined,
      },
    } as Quote;

    const resultAsRecord = result as unknown as Record<string, unknown>;
    delete resultAsRecord.billingStreet;
    delete resultAsRecord.billingCity;
    delete resultAsRecord.billingState;
    delete resultAsRecord.billingPostalCode;
    delete resultAsRecord.billingCountry;
    delete resultAsRecord.shippingStreet;
    delete resultAsRecord.shippingCity;
    delete resultAsRecord.shippingState;
    delete resultAsRecord.shippingPostalCode;
    delete resultAsRecord.shippingCountry;

    return result;
  }
}

export const quoteRepository = new QuoteRepository();
