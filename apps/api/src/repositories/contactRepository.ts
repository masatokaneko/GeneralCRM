import { BaseRepository, type ListParams } from "./baseRepository.js";
import { query } from "../db/connection.js";
import type { Contact, PaginatedResponse } from "../types/index.js";

export class ContactRepository extends BaseRepository<Contact> {
  protected tableName = "contacts";
  protected trackableObjectName = "Contact" as const;
  protected columns = [
    "id",
    "tenant_id",
    "owner_id",
    "account_id",
    "first_name",
    "last_name",
    "email",
    "phone",
    "mobile_phone",
    "title",
    "department",
    "mailing_street",
    "mailing_city",
    "mailing_state",
    "mailing_postal_code",
    "mailing_country",
    "is_primary",
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
  ): Promise<PaginatedResponse<Contact>> {
    return this.list(tenantId, {
      ...params,
      filters: { ...params.filters, accountId },
    });
  }

  protected mapToDb(record: Contact): Record<string, unknown> {
    const base = super.mapToDb(record);

    if (record.mailingAddress) {
      base.mailing_street = record.mailingAddress.street;
      base.mailing_city = record.mailingAddress.city;
      base.mailing_state = record.mailingAddress.state;
      base.mailing_postal_code = record.mailingAddress.postalCode;
      base.mailing_country = record.mailingAddress.country;
    }

    delete base.mailing_address;

    return base;
  }

  protected mapFromDb(row: Contact): Contact {
    const base = super.mapFromDb(row) as unknown as Record<string, unknown>;

    const result: Contact = {
      ...base,
      mailingAddress: {
        street: base.mailingStreet as string | undefined,
        city: base.mailingCity as string | undefined,
        state: base.mailingState as string | undefined,
        postalCode: base.mailingPostalCode as string | undefined,
        country: base.mailingCountry as string | undefined,
      },
    } as Contact;

    const resultAsRecord = result as unknown as Record<string, unknown>;
    delete resultAsRecord.mailingStreet;
    delete resultAsRecord.mailingCity;
    delete resultAsRecord.mailingState;
    delete resultAsRecord.mailingPostalCode;
    delete resultAsRecord.mailingCountry;

    return result;
  }
}

export const contactRepository = new ContactRepository();
