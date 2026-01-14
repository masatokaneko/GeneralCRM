import { BaseRepository } from "./baseRepository.js";
import type { Account } from "../types/index.js";

export class AccountRepository extends BaseRepository<Account> {
  protected tableName = "accounts";
  protected trackableObjectName = "Account" as const;
  protected columns = [
    "id",
    "tenant_id",
    "owner_id",
    "name",
    "type",
    "parent_id",
    "industry",
    "website",
    "phone",
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
    "annual_revenue",
    "number_of_employees",
    "status",
    "description",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "is_deleted",
    "system_modstamp",
  ];

  protected mapToDb(record: Account): Record<string, unknown> {
    const base = super.mapToDb(record);

    // Flatten address objects
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

    // Remove nested objects
    delete base.billing_address;
    delete base.shipping_address;

    return base;
  }

  protected mapFromDb(row: Account): Account {
    const base = super.mapFromDb(row) as unknown as Record<string, unknown>;

    // Reconstruct address objects
    const result: Account = {
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
    } as Account;

    // Remove flat address fields
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

export const accountRepository = new AccountRepository();
