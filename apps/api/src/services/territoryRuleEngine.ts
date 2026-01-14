import { query } from "../db/connection.js";
import { territoryRepository, type TerritoryAssignmentRule, type TerritoryAccountAssignment } from "../repositories/territoryRepository.js";
import type { Account, TerritoryFilterCondition, TerritoryRuleOperator, TerritoryRuleRunResult } from "../types/index.js";

/**
 * Territory Rule Engine
 * Evaluates filter_logic DSL conditions and auto-assigns accounts to territories
 */
export class TerritoryRuleEngine {
  /**
   * Evaluate a single rule against a list of accounts
   */
  evaluateRule(
    rule: TerritoryAssignmentRule,
    accounts: Account[]
  ): { matched: boolean; matchedAccountIds: string[] } {
    if (!rule.isActive) {
      return { matched: false, matchedAccountIds: [] };
    }

    const conditions = rule.conditions;
    const filterLogic = rule.filterLogic;

    if (!conditions || conditions.length === 0) {
      return { matched: false, matchedAccountIds: [] };
    }

    const matchedAccountIds: string[] = [];

    for (const account of accounts) {
      const conditionResults = conditions.map((condition, index) => ({
        index: index + 1,
        result: this.evaluateCondition(account, condition),
      }));

      let isMatch: boolean;

      if (filterLogic) {
        // Parse filter logic like "1 AND (2 OR 3)"
        isMatch = this.evaluateFilterLogic(filterLogic, conditionResults);
      } else {
        // Default: all conditions must be true (AND)
        isMatch = conditionResults.every((r) => r.result);
      }

      if (isMatch) {
        matchedAccountIds.push(account.id);
      }
    }

    return {
      matched: matchedAccountIds.length > 0,
      matchedAccountIds,
    };
  }

  /**
   * Evaluate a single condition against an account
   */
  private evaluateCondition(
    account: Account,
    condition: { field: string; operator: string; value: string | number }
  ): boolean {
    const fieldValue = this.getFieldValue(account, condition.field);
    const operator = condition.operator as TerritoryRuleOperator;
    const compareValue = condition.value;

    return this.evaluateOperator(fieldValue, operator, compareValue);
  }

  /**
   * Get field value from account (supports nested fields with dot notation)
   */
  private getFieldValue(account: Account, field: string): unknown {
    const parts = field.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = account;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return null;
      }
      // Convert camelCase field names to match Account interface
      const camelField = part.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      value = value[camelField] ?? value[part];
    }

    return value;
  }

  /**
   * Evaluate an operator
   */
  private evaluateOperator(
    fieldValue: unknown,
    operator: TerritoryRuleOperator,
    compareValue: unknown
  ): boolean {
    switch (operator) {
      case "equals":
        return fieldValue === compareValue;

      case "notEquals":
        return fieldValue !== compareValue;

      case "contains":
        if (typeof fieldValue !== "string" || typeof compareValue !== "string") {
          return false;
        }
        return fieldValue.toLowerCase().includes(compareValue.toLowerCase());

      case "notContains":
        if (typeof fieldValue !== "string" || typeof compareValue !== "string") {
          return true;
        }
        return !fieldValue.toLowerCase().includes(compareValue.toLowerCase());

      case "startsWith":
        if (typeof fieldValue !== "string" || typeof compareValue !== "string") {
          return false;
        }
        return fieldValue.toLowerCase().startsWith(compareValue.toLowerCase());

      case "endsWith":
        if (typeof fieldValue !== "string" || typeof compareValue !== "string") {
          return false;
        }
        return fieldValue.toLowerCase().endsWith(compareValue.toLowerCase());

      case "greaterThan":
        if (typeof fieldValue !== "number" || typeof compareValue !== "number") {
          return false;
        }
        return fieldValue > compareValue;

      case "lessThan":
        if (typeof fieldValue !== "number" || typeof compareValue !== "number") {
          return false;
        }
        return fieldValue < compareValue;

      case "greaterOrEqual":
        if (typeof fieldValue !== "number" || typeof compareValue !== "number") {
          return false;
        }
        return fieldValue >= compareValue;

      case "lessOrEqual":
        if (typeof fieldValue !== "number" || typeof compareValue !== "number") {
          return false;
        }
        return fieldValue <= compareValue;

      case "in":
        if (!Array.isArray(compareValue)) {
          return false;
        }
        return compareValue.includes(fieldValue);

      case "notIn":
        if (!Array.isArray(compareValue)) {
          return true;
        }
        return !compareValue.includes(fieldValue);

      case "isNull":
        return fieldValue === null || fieldValue === undefined;

      case "isNotNull":
        return fieldValue !== null && fieldValue !== undefined;

      default:
        return false;
    }
  }

  /**
   * Evaluate filter logic expression like "1 AND (2 OR 3)"
   */
  private evaluateFilterLogic(
    logic: string,
    conditionResults: Array<{ index: number; result: boolean }>
  ): boolean {
    // Create a map of condition index to result
    const resultMap = new Map<number, boolean>();
    for (const cr of conditionResults) {
      resultMap.set(cr.index, cr.result);
    }

    // Replace condition numbers with their boolean results
    let expression = logic.toUpperCase();

    // Sort by index descending to avoid replacing "1" in "10"
    const indices = [...resultMap.keys()].sort((a, b) => b - a);

    for (const index of indices) {
      const regex = new RegExp(`\\b${index}\\b`, "g");
      expression = expression.replace(regex, resultMap.get(index) ? "true" : "false");
    }

    // Replace logical operators
    expression = expression
      .replace(/\bAND\b/gi, "&&")
      .replace(/\bOR\b/gi, "||")
      .replace(/\bNOT\b/gi, "!");

    // Evaluate the expression safely
    try {
      // Only allow: true, false, &&, ||, !, (, ), whitespace
      if (!/^[truefalse&|!() ]+$/i.test(expression)) {
        return false;
      }
      // eslint-disable-next-line no-new-func
      return new Function(`return ${expression}`)();
    } catch {
      return false;
    }
  }

  /**
   * Run all rules for a territory and assign matching accounts
   */
  async runRulesForTerritory(
    tenantId: string,
    userId: string,
    territoryId: string
  ): Promise<TerritoryRuleRunResult> {
    const result: TerritoryRuleRunResult = {
      territoryId,
      assigned: 0,
      skipped: 0,
      errors: [],
    };

    // Get active rules for this territory
    const rules = await territoryRepository.getRules(tenantId, territoryId);
    const activeRules = rules.filter((r) => r.isActive).sort((a, b) => b.priority - a.priority);

    if (activeRules.length === 0) {
      return result;
    }

    // Get all accounts in the tenant
    const accountsSql = `
      SELECT id, tenant_id, owner_id, name, type, industry, website, phone,
             billing_address, shipping_address, annual_revenue, number_of_employees,
             status, description, parent_id,
             created_at, created_by, updated_at, updated_by, is_deleted, system_modstamp
      FROM accounts
      WHERE tenant_id = $1 AND is_deleted = false
    `;
    const accountsResult = await query(accountsSql, [tenantId]);
    const accounts = accountsResult.rows.map((row) => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      ownerId: row.owner_id as string,
      name: row.name as string,
      type: row.type as Account["type"],
      industry: row.industry as string | undefined,
      website: row.website as string | undefined,
      phone: row.phone as string | undefined,
      billingAddress: row.billing_address,
      shippingAddress: row.shipping_address,
      annualRevenue: row.annual_revenue ? parseFloat(row.annual_revenue) : undefined,
      numberOfEmployees: row.number_of_employees as number | undefined,
      status: row.status as "Active" | "Inactive",
      description: row.description as string | undefined,
      parentId: row.parent_id as string | undefined,
      createdAt: row.created_at as Date,
      createdBy: row.created_by as string,
      updatedAt: row.updated_at as Date,
      updatedBy: row.updated_by as string,
      isDeleted: row.is_deleted as boolean,
      systemModstamp: row.system_modstamp as string,
    }));

    // Get existing assignments for this territory
    const existingAssignments = await territoryRepository.getAccountAssignments(tenantId, territoryId);
    const existingAccountIds = new Set(existingAssignments.map((a) => a.accountId));

    // Evaluate each rule in priority order
    const assignedAccountIds = new Set<string>();

    for (const rule of activeRules) {
      try {
        const { matchedAccountIds } = this.evaluateRule(rule, accounts);

        for (const accountId of matchedAccountIds) {
          // Skip if already assigned to this territory
          if (existingAccountIds.has(accountId) || assignedAccountIds.has(accountId)) {
            result.skipped++;
            continue;
          }

          // Assign the account
          await territoryRepository.addAccountAssignment(tenantId, userId, territoryId, {
            accountId,
            assignmentType: "RuleBased",
            assignmentRuleId: rule.id,
          });

          assignedAccountIds.add(accountId);
          result.assigned++;
        }
      } catch (error) {
        result.errors.push(`Rule "${rule.name}": ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  }

  /**
   * Evaluate rules and return matching accounts without assigning
   */
  async previewRuleMatches(
    tenantId: string,
    territoryId: string
  ): Promise<{ ruleId: string; ruleName: string; matchedAccounts: string[] }[]> {
    const rules = await territoryRepository.getRules(tenantId, territoryId);
    const activeRules = rules.filter((r) => r.isActive);

    if (activeRules.length === 0) {
      return [];
    }

    // Get all accounts
    const accountsSql = `
      SELECT id, name, type, industry, annual_revenue, number_of_employees, status
      FROM accounts
      WHERE tenant_id = $1 AND is_deleted = false
    `;
    const accountsResult = await query(accountsSql, [tenantId]);
    const accounts = accountsResult.rows.map((row) => ({
      id: row.id as string,
      tenantId,
      ownerId: "",
      name: row.name as string,
      type: row.type as Account["type"],
      industry: row.industry as string | undefined,
      annualRevenue: row.annual_revenue ? parseFloat(row.annual_revenue) : undefined,
      numberOfEmployees: row.number_of_employees as number | undefined,
      status: row.status as "Active" | "Inactive",
      createdAt: new Date(),
      createdBy: "",
      updatedAt: new Date(),
      updatedBy: "",
      isDeleted: false,
      systemModstamp: "",
    })) as Account[];

    const results = [];

    for (const rule of activeRules) {
      const { matchedAccountIds } = this.evaluateRule(rule, accounts);
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matchedAccounts: matchedAccountIds,
      });
    }

    return results;
  }
}

export const territoryRuleEngine = new TerritoryRuleEngine();
