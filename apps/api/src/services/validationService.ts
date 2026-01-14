import { validationRuleRepository } from "../repositories/validationRuleRepository.js";
import type {
  ValidationRule,
  ValidationObjectName,
  ValidationError,
  ValidationResult,
  ConditionNode,
} from "../types/index.js";

interface EvaluationContext {
  record: Record<string, unknown>;
  prior: Record<string, unknown> | null;
  isCreate: boolean;
  userId: string;
}

/**
 * ValidationService evaluates validation rules against records during save pipeline.
 *
 * Rules are evaluated in order (executionOrder, then ruleName).
 * All rules are evaluated (not fail-fast) to collect all errors.
 * A rule's condition being TRUE means the validation fails (error condition).
 */
export class ValidationService {
  /**
   * Evaluate all applicable validation rules for a record
   */
  async evaluate(
    tenantId: string,
    objectName: ValidationObjectName,
    record: Record<string, unknown>,
    prior: Record<string, unknown> | null,
    userId: string
  ): Promise<ValidationResult> {
    const isCreate = prior === null;

    // Get all active rules for this object
    const rules = await validationRuleRepository.findActiveByObjectName(tenantId, objectName);

    // Filter rules based on create/update
    const applicableRules = rules.filter((rule) => {
      if (isCreate && !rule.applyOnCreate) return false;
      if (!isCreate && !rule.applyOnUpdate) return false;
      return true;
    });

    const context: EvaluationContext = {
      record,
      prior,
      isCreate,
      userId,
    };

    const errors: ValidationError[] = [];

    // Evaluate all rules (not fail-fast)
    for (const rule of applicableRules) {
      try {
        const conditionResult = this.evaluateCondition(rule.conditionExpression.expr, context);

        // condition=true means ERROR (violation)
        if (conditionResult === true) {
          errors.push({
            ruleId: rule.id,
            ruleName: rule.ruleName,
            message: rule.errorMessage,
            field: rule.errorField,
          });
        }
      } catch (error) {
        // Rule evaluation error - treat as validation error
        console.error(`Error evaluating rule ${rule.ruleName}:`, error);
        errors.push({
          ruleId: rule.id,
          ruleName: rule.ruleName,
          message: `Rule evaluation error: ${error instanceof Error ? error.message : "Unknown error"}`,
          field: rule.errorField,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Evaluate a condition node
   */
  private evaluateCondition(node: ConditionNode, context: EvaluationContext): unknown {
    switch (node.op) {
      // Logical operators
      case "and":
        return (node.args || []).every((arg) => this.evaluateCondition(arg, context) === true);

      case "or":
        return (node.args || []).some((arg) => this.evaluateCondition(arg, context) === true);

      case "not":
        return this.evaluateCondition(node.arg!, context) !== true;

      // Comparison operators
      case "eq":
        return this.evaluateCondition(node.left!, context) === this.evaluateCondition(node.right!, context);

      case "ne":
        return this.evaluateCondition(node.left!, context) !== this.evaluateCondition(node.right!, context);

      case "gt": {
        const leftVal = this.evaluateCondition(node.left!, context);
        const rightVal = this.evaluateCondition(node.right!, context);
        if (leftVal == null || rightVal == null) return false;
        return (leftVal as number) > (rightVal as number);
      }

      case "gte": {
        const leftVal = this.evaluateCondition(node.left!, context);
        const rightVal = this.evaluateCondition(node.right!, context);
        if (leftVal == null || rightVal == null) return false;
        return (leftVal as number) >= (rightVal as number);
      }

      case "lt": {
        const leftVal = this.evaluateCondition(node.left!, context);
        const rightVal = this.evaluateCondition(node.right!, context);
        if (leftVal == null || rightVal == null) return false;
        return (leftVal as number) < (rightVal as number);
      }

      case "lte": {
        const leftVal = this.evaluateCondition(node.left!, context);
        const rightVal = this.evaluateCondition(node.right!, context);
        if (leftVal == null || rightVal == null) return false;
        return (leftVal as number) <= (rightVal as number);
      }

      case "in": {
        const leftVal = this.evaluateCondition(node.left!, context);
        const rightVal = this.evaluateCondition(node.right!, context) as unknown[];
        return rightVal.includes(leftVal);
      }

      case "between": {
        const val = this.evaluateCondition(node.value!, context) as number;
        const minVal = this.evaluateCondition(node.min!, context) as number;
        const maxVal = this.evaluateCondition(node.max!, context) as number;
        if (val == null || minVal == null || maxVal == null) return false;
        return val >= minVal && val <= maxVal;
      }

      // String operators
      case "contains": {
        const text = String(this.evaluateCondition(node.text!, context) || "");
        const substr = String(this.evaluateCondition(node.substr!, context) || "");
        return text.includes(substr);
      }

      case "startsWith": {
        const text = String(this.evaluateCondition(node.text!, context) || "");
        const substr = String(this.evaluateCondition(node.substr!, context) || "");
        return text.startsWith(substr);
      }

      case "endsWith": {
        const text = String(this.evaluateCondition(node.text!, context) || "");
        const substr = String(this.evaluateCondition(node.substr!, context) || "");
        return text.endsWith(substr);
      }

      case "matches": {
        const text = String(this.evaluateCondition(node.text!, context) || "");
        const pattern = node.pattern || "";
        try {
          const regex = new RegExp(pattern);
          return regex.test(text);
        } catch {
          return false;
        }
      }

      case "length": {
        const text = String(this.evaluateCondition(node.text!, context) || "");
        return text.length;
      }

      // Null/empty checks
      case "isNull": {
        // Support both field reference and nested value node
        const val = node.field
          ? this.getFieldValue(context.record, node.field)
          : this.evaluateCondition(node.value!, context);
        return val === null || val === undefined;
      }

      case "isBlank": {
        // Support both field reference and nested value node
        const val = node.field
          ? this.getFieldValue(context.record, node.field)
          : this.evaluateCondition(node.value!, context);
        if (val === null || val === undefined) return true;
        if (typeof val === "string") return val.trim() === "";
        return false;
      }

      case "isChanged": {
        if (context.isCreate) return false;
        const fieldName = node.field!;
        const currentVal = this.getFieldValue(context.record, fieldName);
        const priorVal = context.prior ? this.getFieldValue(context.prior, fieldName) : null;
        return currentVal !== priorVal;
      }

      case "isNew":
        return context.isCreate;

      case "wasNull": {
        if (context.isCreate) return true;
        const fieldName = node.field!;
        const priorVal = context.prior ? this.getFieldValue(context.prior, fieldName) : null;
        return priorVal === null || priorVal === undefined;
      }

      // Date functions
      case "today":
        return this.formatDate(new Date());

      case "addDays": {
        const dateVal = this.evaluateCondition(node.date!, context);
        const daysVal = this.evaluateCondition(node.days!, context) as number;
        if (!dateVal) return null;
        const date = new Date(dateVal as string);
        date.setDate(date.getDate() + daysVal);
        return this.formatDate(date);
      }

      case "dateDiffDays": {
        const leftDate = this.evaluateCondition(node.left!, context);
        const rightDate = this.evaluateCondition(node.right!, context);
        if (!leftDate || !rightDate) return null;
        const d1 = new Date(leftDate as string);
        const d2 = new Date(rightDate as string);
        const diffTime = d1.getTime() - d2.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      case "coalesce": {
        for (const arg of node.args || []) {
          const val = this.evaluateCondition(arg, context);
          if (val !== null && val !== undefined) return val;
        }
        return null;
      }

      // Value expressions
      case "literal":
        return node.literalValue !== undefined ? node.literalValue : node.value;

      case "ref": {
        const path = node.path!;
        if (path.startsWith("record.")) {
          return this.getFieldValue(context.record, path.substring(7));
        } else if (path.startsWith("prior.")) {
          return context.prior ? this.getFieldValue(context.prior, path.substring(6)) : null;
        } else if (path.startsWith("user.")) {
          // Simple user context
          if (path === "user.id") return context.userId;
          return null;
        }
        return this.getFieldValue(context.record, path);
      }

      case "list":
        return (node.items || []).map((item) => this.evaluateCondition(item, context));

      default:
        console.warn(`Unknown operator: ${node.op}`);
        return null;
    }
  }

  /**
   * Get field value from record, supporting camelCase field names
   */
  private getFieldValue(record: Record<string, unknown>, fieldName: string): unknown {
    // Direct match
    if (fieldName in record) {
      return record[fieldName];
    }

    // Try snake_case conversion
    const snakeCase = fieldName.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (snakeCase in record) {
      return record[snakeCase];
    }

    return undefined;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }
}

export const validationService = new ValidationService();
