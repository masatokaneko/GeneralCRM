"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms/Button";
import { Plus, ChevronRight, MoreHorizontal } from "lucide-react";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface RelatedListProps<T extends { id: string }> {
  title: string;
  objectName: string;
  columns: Column<T>[];
  records: T[];
  totalCount?: number;
  isLoading?: boolean;
  onRowClick?: (record: T) => void;
  createHref?: string;
  viewAllHref?: string;
  onCreateClick?: () => void;
  emptyMessage?: string;
  maxRows?: number;
}

export function RelatedList<T extends { id: string }>({
  title,
  objectName,
  columns,
  records,
  totalCount,
  isLoading,
  onRowClick,
  createHref,
  viewAllHref,
  onCreateClick,
  emptyMessage = "No records found",
  maxRows = 5,
}: RelatedListProps<T>) {
  const displayRecords = records.slice(0, maxRows);
  const hasMore = (totalCount ?? records.length) > maxRows;

  const getValue = (row: T, key: string): unknown => {
    const keys = key.split(".");
    let value: unknown = row;
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[k];
      } else {
        return undefined;
      }
    }
    return value;
  };

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          <span className="text-sm text-muted-foreground">
            ({totalCount ?? records.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(createHref || onCreateClick) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateClick}
              asChild={!!createHref}
            >
              {createHref ? (
                <Link href={createHref}>
                  <Plus className="mr-1 h-4 w-4" />
                  New
                </Link>
              ) : (
                <>
                  <Plus className="mr-1 h-4 w-4" />
                  New
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : displayRecords.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="w-10 px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {displayRecords.map((record) => (
                <tr
                  key={record.id}
                  className={cn(
                    "border-b last:border-0 hover:bg-muted/50",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(record)}
                >
                  {columns.map((column) => {
                    const value = getValue(record, String(column.key));
                    return (
                      <td
                        key={String(column.key)}
                        className="px-4 py-2 text-sm"
                      >
                        {column.render
                          ? column.render(value, record)
                          : String(value ?? "-")}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      className="rounded p-1 hover:bg-accent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {hasMore && viewAllHref && (
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" asChild className="w-full">
            <Link href={viewAllHref}>
              View All {objectName}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
