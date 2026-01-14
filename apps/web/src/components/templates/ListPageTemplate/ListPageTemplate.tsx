"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/atoms/Button";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface ListPageTemplateProps<T extends { id: string }> {
  title: string;
  objectName: string;
  columns: Column<T>[];
  data: T[];
  totalCount: number;
  isLoading?: boolean;
  error?: Error | null;
  onRowClick?: (row: T) => void;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  onPageChange?: (page: number) => void;
  currentPage?: number;
  pageSize?: number;
  searchPlaceholder?: string;
  createHref?: string;
  actions?: React.ReactNode;
}

export function ListPageTemplate<T extends { id: string }>({
  title,
  objectName,
  columns,
  data,
  totalCount,
  isLoading,
  error,
  onRowClick,
  onSearch,
  onFilter,
  onSort,
  onPageChange,
  currentPage = 1,
  pageSize = 25,
  searchPlaceholder,
  createHref,
  actions,
}: ListPageTemplateProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const totalPages = Math.ceil(totalCount / pageSize);
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleSort = (key: string) => {
    const newDirection = sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

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
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? "record" : "records"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {createHref && (
            <Button asChild>
              <Link href={createHref}>
                <Plus className="mr-2 h-4 w-4" />
                New {objectName}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        <Button variant="outline" size="sm" onClick={onFilter}>
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                      column.sortable && "cursor-pointer hover:text-foreground",
                      column.width
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(String(column.key))}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && sortKey === column.key && (
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            sortDirection === "desc" && "rotate-180"
                          )}
                        />
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-destructive"
                  >
                    Error: {error.message}
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No records found
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b last:border-0 hover:bg-muted/50",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => {
                      const value = getValue(row, String(column.key));
                      return (
                        <td
                          key={String(column.key)}
                          className="px-4 py-3 text-sm"
                        >
                          {column.render
                            ? column.render(value, row)
                            : String(value ?? "-")}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded p-1 hover:bg-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {startRecord} to {endRecord} of {totalCount} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
