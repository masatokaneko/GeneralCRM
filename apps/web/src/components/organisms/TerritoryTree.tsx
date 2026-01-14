"use client";

import * as React from "react";
import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Map,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  Users,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Territory } from "@/mocks/types";

export interface TerritoryTreeProps {
  territories: Territory[];
  onSelect?: (territory: Territory) => void;
  onEdit?: (territory: Territory) => void;
  onDelete?: (territory: Territory) => void;
  onAddChild?: (parentId: string) => void;
  selectedId?: string;
  className?: string;
}

function TerritoryNode({
  territory,
  level = 0,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  selectedId,
}: {
  territory: Territory;
  level?: number;
  onSelect?: (territory: Territory) => void;
  onEdit?: (territory: Territory) => void;
  onDelete?: (territory: Territory) => void;
  onAddChild?: (parentId: string) => void;
  selectedId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = territory.children && territory.children.length > 0;
  const isSelected = selectedId === territory.id;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-2 transition-colors",
          isSelected
            ? "bg-primary/10 border border-primary/20"
            : "hover:bg-muted/50",
          "cursor-pointer"
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelect?.(territory)}
      >
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            hasChildren ? "bg-primary/10" : "bg-muted"
          )}
        >
          <Map
            className={cn(
              "h-4 w-4",
              hasChildren ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{territory.name}</span>
            {!territory.isActive && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
          {territory.description && (
            <p className="text-xs text-muted-foreground truncate">
              {territory.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {territory.userCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{territory.userCount}</span>
            </div>
          )}
          {territory.accountCount !== undefined && (
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span>{territory.accountCount}</span>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(territory)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddChild?.(territory.id)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Sub-Territory
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.(territory)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {territory.children!.map((child) => (
            <TerritoryNode
              key={child.id}
              territory={child}
              level={level + 1}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TerritoryTree({
  territories,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  selectedId,
  className,
}: TerritoryTreeProps) {
  if (territories.length === 0) {
    return (
      <div className={cn("py-8 text-center", className)}>
        <Map className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No territories defined yet</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {territories.map((territory) => (
        <TerritoryNode
          key={territory.id}
          territory={territory}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}
