"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "textarea"
  | "select"
  | "checkbox"
  | "reference";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: SelectOption[];
  referenceTo?: string;
  defaultValue?: unknown;
  colSpan?: 1 | 2;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface FormSection {
  title?: string;
  fields: FormField[];
}

export interface RecordFormProps {
  sections: FormSection[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  errors?: Record<string, string>;
}

function FormFieldComponent({
  field,
  value,
  onChange,
  error,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}) {
  const id = `field-${field.name}`;

  const renderInput = () => {
    switch (field.type) {
      case "textarea":
        return (
          <textarea
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            required={field.required}
            className={cn(
              "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive"
            )}
          />
        );

      case "select":
        return (
          <select
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            disabled={field.disabled}
            required={field.required}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive"
            )}
          >
            <option value="">Select...</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={id}
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={field.disabled}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            {field.helpText && (
              <span className="text-sm text-muted-foreground">{field.helpText}</span>
            )}
          </div>
        );

      case "number":
      case "currency":
        return (
          <Input
            type="number"
            id={id}
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            required={field.required}
            min={field.min}
            max={field.max}
            step={field.step ?? (field.type === "currency" ? 1 : undefined)}
            className={cn(error && "border-destructive")}
          />
        );

      case "date":
        return (
          <Input
            type="date"
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            disabled={field.disabled}
            required={field.required}
            className={cn(error && "border-destructive")}
          />
        );

      case "datetime":
        return (
          <Input
            type="datetime-local"
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            disabled={field.disabled}
            required={field.required}
            className={cn(error && "border-destructive")}
          />
        );

      case "email":
        return (
          <Input
            type="email"
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            required={field.required}
            className={cn(error && "border-destructive")}
          />
        );

      case "phone":
        return (
          <Input
            type="tel"
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            required={field.required}
            className={cn(error && "border-destructive")}
          />
        );

      case "url":
        return (
          <Input
            type="url"
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "https://"}
            disabled={field.disabled}
            required={field.required}
            className={cn(error && "border-destructive")}
          />
        );

      default:
        return (
          <Input
            type="text"
            id={id}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={field.disabled}
            required={field.required}
            className={cn(error && "border-destructive")}
          />
        );
    }
  };

  return (
    <div className={cn(field.colSpan === 2 && "sm:col-span-2")}>
      {field.type !== "checkbox" && (
        <Label htmlFor={id} className="mb-2 block">
          {field.label}
          {field.required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}
      {renderInput()}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      {field.helpText && field.type !== "checkbox" && (
        <p className="mt-1 text-sm text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  );
}

export function RecordForm({
  sections,
  initialValues = {},
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  errors = {},
}: RecordFormProps) {
  const [values, setValues] = React.useState<Record<string, unknown>>(initialValues);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="rounded-lg border bg-card p-6">
          {section.title && (
            <h3 className="mb-4 font-semibold">{section.title}</h3>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => (
              <FormFieldComponent
                key={field.name}
                field={field}
                value={values[field.name] ?? field.defaultValue}
                onChange={(value) => handleFieldChange(field.name, value)}
                error={errors[field.name]}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
