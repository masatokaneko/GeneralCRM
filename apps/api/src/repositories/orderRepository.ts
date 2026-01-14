import { BaseRepository, type ListParams } from "./baseRepository.js";
import type { Order, PaginatedResponse } from "../types/index.js";
import { ValidationError } from "../middleware/errorHandler.js";

export class OrderRepository extends BaseRepository<Order> {
  protected tableName = "orders";
  protected trackableObjectName = "Order" as const;
  protected columns = [
    "id",
    "tenant_id",
    "owner_id",
    "account_id",
    "opportunity_id",
    "quote_id",
    "contract_id",
    "order_number",
    "name",
    "order_type",
    "status",
    "order_date",
    "effective_date",
    "total_amount",
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
  ): Promise<PaginatedResponse<Order>> {
    return this.list(tenantId, {
      ...params,
      filters: { ...params.filters, accountId },
    });
  }

  async findByOpportunityId(
    tenantId: string,
    opportunityId: string,
    params: ListParams = {}
  ): Promise<PaginatedResponse<Order>> {
    return this.list(tenantId, {
      ...params,
      filters: { ...params.filters, opportunityId },
    });
  }

  async findByContractId(
    tenantId: string,
    contractId: string,
    params: ListParams = {}
  ): Promise<PaginatedResponse<Order>> {
    return this.list(tenantId, {
      ...params,
      filters: { ...params.filters, contractId },
    });
  }

  async activate(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Order> {
    const order = await this.findByIdOrThrow(tenantId, id);

    if (order.status !== "Draft") {
      throw new ValidationError([
        { field: "status", message: "Only Draft orders can be activated. Order must be in Draft status." },
      ]);
    }

    return this.update(tenantId, userId, id, {
      status: "Activated",
    } as Partial<Order>);
  }

  async fulfill(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Order> {
    const order = await this.findByIdOrThrow(tenantId, id);

    if (order.status !== "Activated") {
      throw new ValidationError([
        { field: "status", message: "Only Activated orders can be fulfilled. Order must be in Activated status." },
      ]);
    }

    return this.update(tenantId, userId, id, {
      status: "Fulfilled",
    } as Partial<Order>);
  }

  async cancel(
    tenantId: string,
    userId: string,
    id: string
  ): Promise<Order> {
    const order = await this.findByIdOrThrow(tenantId, id);

    if (order.status === "Fulfilled" || order.status === "Cancelled") {
      throw new ValidationError([
        { field: "status", message: "Cannot cancel fulfilled or already cancelled orders. Order cannot be cancelled in current status." },
      ]);
    }

    return this.update(tenantId, userId, id, {
      status: "Cancelled",
    } as Partial<Order>);
  }

  protected mapToDb(record: Order): Record<string, unknown> {
    const dbRecord: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (key === "billingAddress" && value) {
        const addr = value as Order["billingAddress"];
        dbRecord.billing_street = addr?.street;
        dbRecord.billing_city = addr?.city;
        dbRecord.billing_state = addr?.state;
        dbRecord.billing_postal_code = addr?.postalCode;
        dbRecord.billing_country = addr?.country;
      } else if (key === "shippingAddress" && value) {
        const addr = value as Order["shippingAddress"];
        dbRecord.shipping_street = addr?.street;
        dbRecord.shipping_city = addr?.city;
        dbRecord.shipping_state = addr?.state;
        dbRecord.shipping_postal_code = addr?.postalCode;
        dbRecord.shipping_country = addr?.country;
      } else {
        dbRecord[this.toSnakeCase(key)] = value;
      }
    }

    return dbRecord;
  }

  protected mapFromDb(row: Order): Order {
    const record = super.mapFromDb(row);
    const rowAny = row as unknown as Record<string, unknown>;

    // Map address fields
    if (
      rowAny.billing_street ||
      rowAny.billing_city ||
      rowAny.billing_state ||
      rowAny.billing_postal_code ||
      rowAny.billing_country
    ) {
      record.billingAddress = {
        street: rowAny.billing_street as string,
        city: rowAny.billing_city as string,
        state: rowAny.billing_state as string,
        postalCode: rowAny.billing_postal_code as string,
        country: rowAny.billing_country as string,
      };
    }

    if (
      rowAny.shipping_street ||
      rowAny.shipping_city ||
      rowAny.shipping_state ||
      rowAny.shipping_postal_code ||
      rowAny.shipping_country
    ) {
      record.shippingAddress = {
        street: rowAny.shipping_street as string,
        city: rowAny.shipping_city as string,
        state: rowAny.shipping_state as string,
        postalCode: rowAny.shipping_postal_code as string,
        country: rowAny.shipping_country as string,
      };
    }

    return record;
  }
}

export const orderRepository = new OrderRepository();
