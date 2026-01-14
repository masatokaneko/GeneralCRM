"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Condition types
export interface Condition {
  id: string;
  field: string;
  operator: string;
  value?: string | number | boolean;
  orderIndex: number;
}

// Field definition
export interface FieldDefinition {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "picklist" | "date";
  options?: { value: string; label: string }[];
}

// Operator options based on field type
const operatorsByType: Record<string, { value: string; label: string }[]> = {
  string: [
    { value: "equals", label: "equals" },
    { value: "notEquals", label: "not equal to" },
    { value: "contains", label: "contains" },
    { value: "startsWith", label: "starts with" },
    { value: "isNull", label: "is empty" },
    { value: "isNotNull", label: "is not empty" },
    { value: "changed", label: "changed" },
    { value: "changedTo", label: "changed to" },
  ],
  number: [
    { value: "equals", label: "equals" },
    { value: "notEquals", label: "not equal to" },
    { value: "greaterThan", label: "greater than" },
    { value: "lessThan", label: "less than" },
    { value: "isNull", label: "is empty" },
    { value: "isNotNull", label: "is not empty" },
    { value: "changed", label: "changed" },
  ],
  boolean: [
    { value: "equals", label: "equals" },
    { value: "changed", label: "changed" },
  ],
  picklist: [
    { value: "equals", label: "equals" },
    { value: "notEquals", label: "not equal to" },
    { value: "isNull", label: "is empty" },
    { value: "isNotNull", label: "is not empty" },
    { value: "changed", label: "changed" },
    { value: "changedTo", label: "changed to" },
  ],
  date: [
    { value: "equals", label: "equals" },
    { value: "notEquals", label: "not equal to" },
    { value: "greaterThan", label: "after" },
    { value: "lessThan", label: "before" },
    { value: "isNull", label: "is empty" },
    { value: "isNotNull", label: "is not empty" },
    { value: "changed", label: "changed" },
  ],
};

// Operators that don't need a value
const noValueOperators = ["isNull", "isNotNull", "changed"];

export interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  fields: FieldDefinition[];
  filterLogic?: string;
  onFilterLogicChange?: (logic: string) => void;
  showFilterLogic?: boolean;
  className?: string;
}

export function ConditionBuilder({
  conditions,
  onChange,
  fields,
  filterLogic,
  onFilterLogicChange,
  showFilterLogic = false,
  className,
}: ConditionBuilderProps) {
  const generateId = () => `cond-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const addCondition = () => {
    const newCondition: Condition = {
      id: generateId(),
      field: fields[0]?.name || "",
      operator: "equals",
      value: "",
      orderIndex: conditions.length,
    };
    onChange([...conditions, newCondition]);
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    onChange(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const removeCondition = (id: string) => {
    const updated = conditions
      .filter((c) => c.id !== id)
      .map((c, index) => ({ ...c, orderIndex: index }));
    onChange(updated);
  };

  const getFieldType = (fieldName: string): string => {
    const field = fields.find((f) => f.name === fieldName);
    return field?.type || "string";
  };

  const getFieldOptions = (fieldName: string): { value: string; label: string }[] | undefined => {
    const field = fields.find((f) => f.name === fieldName);
    return field?.options;
  };

  const getOperators = (fieldName: string) => {
    const type = getFieldType(fieldName);
    return operatorsByType[type] || operatorsByType.string;
  };

  const renderValueInput = (condition: Condition) => {
    if (noValueOperators.includes(condition.operator)) {
      return null;
    }

    const fieldType = getFieldType(condition.field);
    const options = getFieldOptions(condition.field);

    if (fieldType === "boolean") {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(value) =>
            updateCondition(condition.id, { value: value === "true" })
          }
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (fieldType === "picklist" && options) {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(value) => updateCondition(condition.id, { value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (fieldType === "number") {
      return (
        <Input
          type="number"
          value={condition.value as number}
          onChange={(e) =>
            updateCondition(condition.id, {
              value: e.target.value ? Number(e.target.value) : "",
            })
          }
          className="w-[150px]"
          placeholder="Enter value..."
        />
      );
    }

    if (fieldType === "date") {
      return (
        <Input
          type="date"
          value={condition.value as string}
          onChange={(e) =>
            updateCondition(condition.id, { value: e.target.value })
          }
          className="w-[180px]"
        />
      );
    }

    return (
      <Input
        type="text"
        value={condition.value as string}
        onChange={(e) =>
          updateCondition(condition.id, { value: e.target.value })
        }
        className="w-[180px]"
        placeholder="Enter value..."
      />
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        {conditions.map((condition, index) => (
          <div
            key={condition.id}
            className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"
          >
            <span className="text-sm font-medium text-muted-foreground w-6">
              {index + 1}
            </span>

            <Select
              value={condition.field}
              onValueChange={(value) => {
                const newType = getFieldType(value);
                const currentType = getFieldType(condition.field);
                const updates: Partial<Condition> = { field: value };

                if (newType !== currentType) {
                  updates.operator = "equals";
                  updates.value = "";
                }

                updateCondition(condition.id, updates);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select field..." />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={condition.operator}
              onValueChange={(value) =>
                updateCondition(condition.id, { operator: value })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select operator..." />
              </SelectTrigger>
              <SelectContent>
                {getOperators(condition.field).map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {renderValueInput(condition)}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeCondition(condition.id)}
              className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {conditions.length === 0 && (
          <div className="p-4 text-center text-muted-foreground border border-dashed rounded-lg">
            No conditions defined. Click "Add Condition" to create one.
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCondition}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Condition
      </Button>

      {showFilterLogic && conditions.length > 1 && (
        <div className="pt-4 border-t">
          <Label htmlFor="filterLogic" className="text-sm font-medium">
            Filter Logic (optional)
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Combine conditions using AND, OR. Example: "1 AND (2 OR 3)"
          </p>
          <Input
            id="filterLogic"
            value={filterLogic || ""}
            onChange={(e) => onFilterLogicChange?.(e.target.value)}
            placeholder={`Default: ${conditions.map((_, i) => i + 1).join(" AND ")}`}
            className="max-w-md"
          />
        </div>
      )}
    </div>
  );
}

// Helper function to validate filter logic
export function validateFilterLogic(
  logic: string,
  conditionCount: number
): { valid: boolean; error?: string } {
  if (!logic.trim()) {
    return { valid: true };
  }

  const numbers = logic.match(/\d+/g);
  if (!numbers) {
    return { valid: false, error: "Filter logic must contain condition numbers" };
  }

  const usedNumbers = new Set(numbers.map(Number));
  for (let i = 1; i <= conditionCount; i++) {
    if (!usedNumbers.has(i)) {
      return {
        valid: false,
        error: `Condition ${i} is not used in filter logic`,
      };
    }
  }

  for (const num of usedNumbers) {
    if (num < 1 || num > conditionCount) {
      return {
        valid: false,
        error: `Condition ${num} does not exist`,
      };
    }
  }

  const cleanLogic = logic.replace(/\d+/g, "1").replace(/\s+/g, " ").trim();
  const validPattern = /^1(\s+(AND|OR)\s+1)*$/i;
  const parenPattern = /^\(1(\s+(AND|OR)\s+1)*\)$/i;

  const validateParens = (str: string): boolean => {
    let depth = 0;
    for (const char of str) {
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (depth < 0) return false;
    }
    return depth === 0;
  };

  if (!validateParens(logic)) {
    return { valid: false, error: "Unbalanced parentheses" };
  }

  return { valid: true };
}

// Helper to generate default filter logic
export function generateDefaultFilterLogic(conditionCount: number): string {
  return Array.from({ length: conditionCount }, (_, i) => i + 1).join(" AND ");
}
