import { v4 as uuidv4 } from "uuid";
import { BaseRepository } from "./baseRepository.js";
import { query } from "../db/connection.js";
import type { Product } from "../types/index.js";

export class ProductRepository extends BaseRepository<Product> {
  protected tableName = "products";
  protected trackableObjectName = "Product" as const;
  protected columns = [
    "id",
    "tenant_id",
    "name",
    "product_code",
    "description",
    "family",
    "is_active",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "is_deleted",
    "system_modstamp",
  ];

  async create(
    tenantId: string,
    userId: string,
    data: Partial<Product>
  ): Promise<Product> {
    const id = uuidv4();
    const now = new Date();
    const systemModstamp = uuidv4();

    const record = {
      ...data,
      id,
      tenantId,
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId,
      isDeleted: false,
      systemModstamp,
    };

    const dbRecord = this.mapToDb(record as Product);
    const keys = Object.keys(dbRecord);
    const values = Object.values(dbRecord);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      INSERT INTO ${this.tableName} (${keys.join(", ")})
      VALUES (${placeholders})
      RETURNING ${this.getSelectColumns()}
    `;

    const result = await query<Product>(sql, values);
    return this.mapFromDb(result.rows[0]);
  }
}

export const productRepository = new ProductRepository();
