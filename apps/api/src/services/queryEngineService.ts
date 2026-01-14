import { db } from "../db/index.js";
import { accessibleIdsService } from "./accessibleIdsService.js";
import { permissionService } from "./permissionService.js";

// Supported aggregation functions
export type AggregationFunction = "count" | "sum" | "avg" | "min" | "max";

// Filter operators
export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in"
  | "notIn"
  | "isNull"
  | "isNotNull";

// Where clause definition
export interface WhereClause {
  field: string;
  operator: FilterOperator;
  value?: unknown;
}

// Aggregation definition
export interface AggregationSpec {
  field: string;
  function: AggregationFunction;
  alias?: string;
}

// Order by definition
export interface OrderBySpec {
  field: string;
  direction: "ASC" | "DESC";
}

// Query request
export interface QueryRequest {
  objectName: string;
  select: string[];
  where?: WhereClause[];
  orderBy?: OrderBySpec[];
  groupBy?: string[];
  aggregations?: AggregationSpec[];
  limit?: number;
  offset?: number;
}

// Query result
export interface QueryResult {
  records: Record<string, unknown>[];
  totalSize: number;
  aggregations?: Record<string, unknown>;
}

// Table mapping for objects
const TABLE_MAP: Record<string, { table: string; alias: string }> = {
  Account: { table: "accounts", alias: "a" },
  Contact: { table: "contacts", alias: "c" },
  Lead: { table: "leads", alias: "l" },
  Opportunity: { table: "opportunities", alias: "o" },
  Quote: { table: "quotes", alias: "q" },
  Order: { table: "orders", alias: "ord" },
  Contract: { table: "contracts", alias: "con" },
  Invoice: { table: "invoices", alias: "i" },
  Task: { table: "tasks", alias: "t" },
  Event: { table: "events", alias: "e" },
  Campaign: { table: "campaigns", alias: "cam" },
  Product: { table: "products", alias: "p" },
};

// Field mapping from camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Field mapping from snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export const queryEngineService = {
  /**
   * Execute a query with permission filtering
   */
  async execute(
    tenantId: string,
    userId: string,
    request: QueryRequest
  ): Promise<QueryResult> {
    const tableInfo = TABLE_MAP[request.objectName];
    if (!tableInfo) {
      throw new Error(`Unknown object: ${request.objectName}`);
    }

    // Check object-level read permission
    const objPerms = await permissionService.getObjectPermissions(
      tenantId,
      userId,
      request.objectName
    );

    if (!objPerms.canRead) {
      throw new Error(`No read access to ${request.objectName}`);
    }

    // Build the query
    const { sql, params } = await this.buildQuery(
      tenantId,
      userId,
      request,
      tableInfo
    );

    // Execute query
    const result = await db.query(sql, params);

    // Map results to camelCase
    const records = result.rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        mapped[toCamelCase(key)] = value;
      }
      return mapped;
    });

    // Get total count (without limit/offset)
    const countResult = await this.executeCount(
      tenantId,
      userId,
      request,
      tableInfo
    );

    return {
      records,
      totalSize: countResult,
    };
  },

  /**
   * Build SQL query from request
   */
  async buildQuery(
    tenantId: string,
    userId: string,
    request: QueryRequest,
    tableInfo: { table: string; alias: string }
  ): Promise<{ sql: string; params: unknown[] }> {
    const { table, alias } = tableInfo;
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    // Build SELECT clause
    let selectClause: string;
    if (request.aggregations && request.aggregations.length > 0) {
      // Aggregation query
      const aggParts: string[] = [];
      for (const agg of request.aggregations) {
        const colName = toSnakeCase(agg.field);
        const aggAlias = agg.alias || `${agg.function}_${agg.field}`;
        if (agg.function === "count" && agg.field === "*") {
          aggParts.push(`COUNT(*) as ${toSnakeCase(aggAlias)}`);
        } else {
          aggParts.push(`${agg.function.toUpperCase()}(${alias}.${colName}) as ${toSnakeCase(aggAlias)}`);
        }
      }

      // Include groupBy fields in select
      if (request.groupBy && request.groupBy.length > 0) {
        const groupFields = request.groupBy.map(
          (f) => `${alias}.${toSnakeCase(f)}`
        );
        selectClause = [...groupFields, ...aggParts].join(", ");
      } else {
        selectClause = aggParts.join(", ");
      }
    } else {
      // Regular select
      const fields = request.select.map((f) => `${alias}.${toSnakeCase(f)}`);
      selectClause = fields.join(", ");
    }

    // Build WHERE clause
    const conditions: string[] = [
      `${alias}.tenant_id = $1`,
      `${alias}.is_deleted = false`,
    ];

    // Add request where clauses
    if (request.where) {
      for (const w of request.where) {
        const colName = toSnakeCase(w.field);
        const clause = this.buildWhereCondition(
          `${alias}.${colName}`,
          w.operator,
          w.value,
          paramIndex
        );
        conditions.push(clause.sql);
        if (clause.params.length > 0) {
          params.push(...clause.params);
          paramIndex += clause.params.length;
        }
      }
    }

    // Add permission filter
    const accessFilter = await accessibleIdsService.getAccessibleIdsFilter(
      tenantId,
      userId,
      request.objectName,
      paramIndex
    );

    if (accessFilter) {
      // Replace column references with alias
      const aliasedClause = accessFilter.clause.replace(
        /\b(owner_id|id)\b/g,
        `${alias}.$1`
      );
      conditions.push(aliasedClause);
      params.push(...accessFilter.params);
      paramIndex += accessFilter.params.length;
    }

    const whereClause = conditions.join(" AND ");

    // Build GROUP BY clause
    let groupByClause = "";
    if (request.groupBy && request.groupBy.length > 0) {
      const groupFields = request.groupBy.map(
        (f) => `${alias}.${toSnakeCase(f)}`
      );
      groupByClause = `GROUP BY ${groupFields.join(", ")}`;
    }

    // Build ORDER BY clause
    let orderByClause = "";
    if (request.orderBy && request.orderBy.length > 0) {
      const orderParts = request.orderBy.map(
        (o) => `${alias}.${toSnakeCase(o.field)} ${o.direction}`
      );
      orderByClause = `ORDER BY ${orderParts.join(", ")}`;
    }

    // Build LIMIT/OFFSET
    let limitClause = "";
    if (request.limit) {
      limitClause = `LIMIT $${paramIndex}`;
      params.push(request.limit);
      paramIndex++;

      if (request.offset) {
        limitClause += ` OFFSET $${paramIndex}`;
        params.push(request.offset);
        paramIndex++;
      }
    }

    const sql = `
      SELECT ${selectClause}
      FROM ${table} ${alias}
      WHERE ${whereClause}
      ${groupByClause}
      ${orderByClause}
      ${limitClause}
    `.trim();

    return { sql, params };
  },

  /**
   * Execute count query
   */
  async executeCount(
    tenantId: string,
    userId: string,
    request: QueryRequest,
    tableInfo: { table: string; alias: string }
  ): Promise<number> {
    const { table, alias } = tableInfo;
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    // Build WHERE clause
    const conditions: string[] = [
      `${alias}.tenant_id = $1`,
      `${alias}.is_deleted = false`,
    ];

    if (request.where) {
      for (const w of request.where) {
        const colName = toSnakeCase(w.field);
        const clause = this.buildWhereCondition(
          `${alias}.${colName}`,
          w.operator,
          w.value,
          paramIndex
        );
        conditions.push(clause.sql);
        if (clause.params.length > 0) {
          params.push(...clause.params);
          paramIndex += clause.params.length;
        }
      }
    }

    // Add permission filter
    const accessFilter = await accessibleIdsService.getAccessibleIdsFilter(
      tenantId,
      userId,
      request.objectName,
      paramIndex
    );

    if (accessFilter) {
      const aliasedClause = accessFilter.clause.replace(
        /\b(owner_id|id)\b/g,
        `${alias}.$1`
      );
      conditions.push(aliasedClause);
      params.push(...accessFilter.params);
    }

    const whereClause = conditions.join(" AND ");

    const sql = `SELECT COUNT(*) as count FROM ${table} ${alias} WHERE ${whereClause}`;
    const result = await db.query(sql, params);

    return parseInt((result.rows[0] as { count: string })?.count || "0", 10);
  },

  /**
   * Build a single where condition
   */
  buildWhereCondition(
    column: string,
    operator: FilterOperator,
    value: unknown,
    paramIndex: number
  ): { sql: string; params: unknown[] } {
    switch (operator) {
      case "eq":
        return { sql: `${column} = $${paramIndex}`, params: [value] };
      case "ne":
        return { sql: `${column} != $${paramIndex}`, params: [value] };
      case "gt":
        return { sql: `${column} > $${paramIndex}`, params: [value] };
      case "gte":
        return { sql: `${column} >= $${paramIndex}`, params: [value] };
      case "lt":
        return { sql: `${column} < $${paramIndex}`, params: [value] };
      case "lte":
        return { sql: `${column} <= $${paramIndex}`, params: [value] };
      case "like":
        return { sql: `${column} LIKE $${paramIndex}`, params: [value] };
      case "ilike":
        return { sql: `${column} ILIKE $${paramIndex}`, params: [value] };
      case "in":
        return { sql: `${column} = ANY($${paramIndex})`, params: [value] };
      case "notIn":
        return { sql: `${column} != ALL($${paramIndex})`, params: [value] };
      case "isNull":
        return { sql: `${column} IS NULL`, params: [] };
      case "isNotNull":
        return { sql: `${column} IS NOT NULL`, params: [] };
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  },

  /**
   * Execute aggregation query
   */
  async executeAggregation(
    tenantId: string,
    userId: string,
    objectName: string,
    aggregations: AggregationSpec[],
    where?: WhereClause[],
    groupBy?: string[]
  ): Promise<Record<string, unknown>[]> {
    const result = await this.execute(tenantId, userId, {
      objectName,
      select: [],
      aggregations,
      where,
      groupBy,
    });

    return result.records;
  },
};
