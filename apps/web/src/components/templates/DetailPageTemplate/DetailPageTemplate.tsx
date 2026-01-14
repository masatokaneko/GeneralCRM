"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import {
  ChevronLeft,
  Edit,
  Trash2,
  MoreHorizontal,
  Clock,
  User,
} from "lucide-react";

export interface FieldDefinition {
  key: string;
  label: string;
  type?: "text" | "email" | "phone" | "url" | "currency" | "date" | "datetime" | "boolean" | "badge" | "reference" | "custom";
  render?: (value: unknown, record?: Record<string, unknown>) => React.ReactNode;
  colSpan?: 1 | 2;
}

export interface Section {
  title: string;
  fields: FieldDefinition[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export interface DetailPageTemplateProps {
  title: string;
  subtitle?: string;
  objectName: string;
  record: Record<string, unknown> | null;
  sections: Section[];
  isLoading?: boolean;
  error?: Error | null;
  backHref: string;
  editHref?: string;
  onDelete?: () => void;
  onEdit?: () => void;
  actions?: React.ReactNode;
  headerActions?: React.ReactNode;
  relatedLists?: React.ReactNode;
  headerBadge?: React.ReactNode;
  additionalContent?: React.ReactNode;
  systemInfo?: {
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
    updatedBy?: string;
  };
}

function formatValue(value: unknown, type: FieldDefinition["type"]): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  switch (type) {
    case "email":
      return (
        <a href={`mailto:${value}`} className="text-primary hover:underline">
          {String(value)}
        </a>
      );
    case "phone":
      return (
        <a href={`tel:${value}`} className="text-primary hover:underline">
          {String(value)}
        </a>
      );
    case "url":
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {String(value)}
        </a>
      );
    case "currency":
      return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
      }).format(Number(value));
    case "date":
      return new Date(String(value)).toLocaleDateString("ja-JP");
    case "datetime":
      return new Date(String(value)).toLocaleString("ja-JP");
    case "boolean":
      return value ? (
        <Badge variant="default">Yes</Badge>
      ) : (
        <Badge variant="outline">No</Badge>
      );
    default:
      return String(value);
  }
}

function FieldValue<T extends Record<string, unknown>>({
  field,
  record,
}: {
  field: FieldDefinition;
  record: T;
}) {
  const value = field.key.split(".").reduce<unknown>((obj, key) => {
    if (obj && typeof obj === "object") {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, record);

  if (field.render) {
    return <>{field.render(value, record)}</>;
  }

  return <>{formatValue(value, field.type)}</>;
}

function SectionComponent<T extends Record<string, unknown>>({
  section,
  record,
}: {
  section: Section;
  record: T;
}) {
  const [isOpen, setIsOpen] = React.useState(section.defaultOpen ?? true);

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between p-4 text-left font-semibold",
          section.collapsible && "cursor-pointer hover:bg-muted/50"
        )}
        onClick={() => section.collapsible && setIsOpen(!isOpen)}
        disabled={!section.collapsible}
      >
        {section.title}
        {section.collapsible && (
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "-rotate-90"
            )}
          />
        )}
      </button>
      {isOpen && (
        <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
          {section.fields.map((field) => (
            <div
              key={field.key}
              className={cn(field.colSpan === 2 && "sm:col-span-2")}
            >
              <dt className="text-sm font-medium text-muted-foreground">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm">
                <FieldValue field={field} record={record} />
              </dd>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DetailPageTemplate({
  title,
  subtitle,
  objectName,
  record,
  sections,
  isLoading,
  error,
  backHref,
  editHref,
  onDelete,
  onEdit,
  actions,
  headerActions,
  relatedLists,
  headerBadge,
  additionalContent,
  systemInfo,
}: DetailPageTemplateProps) {
  const router = useRouter();
  const [showActions, setShowActions] = React.useState(false);
  const actionsRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <p className="text-destructive">Error: {error.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <p className="text-muted-foreground">{objectName} not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href={backHref}>Go Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{title}</h1>
              {headerBadge}
            </div>
            {subtitle && (
              <p className="mt-1 text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {headerActions}
          {actions}
          {(editHref || onEdit) && (
            <Button
              variant="outline"
              onClick={onEdit}
              asChild={!!editHref}
            >
              {editHref ? (
                <Link href={editHref}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              ) : (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          )}
          <div ref={actionsRef} className="relative">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {showActions && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border bg-card py-1 shadow-lg">
                {onDelete && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-accent"
                    onClick={() => {
                      setShowActions(false);
                      onDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Content (e.g., Sales Path) */}
      {additionalContent}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Details */}
        <div className="space-y-6 lg:col-span-2">
          {sections.map((section, index) => (
            <SectionComponent key={index} section={section} record={record} />
          ))}
        </div>

        {/* Right Column - System Info & Quick Actions */}
        <div className="space-y-6">
          {/* System Information */}
          {systemInfo && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold">System Information</h3>
              <dl className="mt-3 space-y-3 text-sm">
                {systemInfo.createdAt && (
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-muted-foreground">Created</dt>
                      <dd>
                        {new Date(systemInfo.createdAt).toLocaleString("ja-JP")}
                        {systemInfo.createdBy && (
                          <span className="text-muted-foreground">
                            {" "}by {systemInfo.createdBy}
                          </span>
                        )}
                      </dd>
                    </div>
                  </div>
                )}
                {systemInfo.updatedAt && (
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <dt className="text-muted-foreground">Last Modified</dt>
                      <dd>
                        {new Date(systemInfo.updatedAt).toLocaleString("ja-JP")}
                        {systemInfo.updatedBy && (
                          <span className="text-muted-foreground">
                            {" "}by {systemInfo.updatedBy}
                          </span>
                        )}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Related Lists */}
      {relatedLists && <div className="space-y-6">{relatedLists}</div>}
    </div>
  );
}
