"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  GripVertical,
  MoreHorizontal,
  Plus,
  User,
  Loader2,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/atoms/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/DropdownMenu";
import { useOpportunities, useChangeOpportunityStage } from "@/lib/api/opportunities";
import { cn } from "@/lib/utils";
import type { Opportunity } from "@/mocks/types";

// Stage configuration
const STAGES = [
  { name: "Prospecting", probability: 10, color: "bg-slate-500" },
  { name: "Qualification", probability: 20, color: "bg-blue-500" },
  { name: "Needs Analysis", probability: 40, color: "bg-cyan-500" },
  { name: "Value Proposition", probability: 60, color: "bg-teal-500" },
  { name: "Proposal/Price Quote", probability: 75, color: "bg-green-500" },
  { name: "Negotiation/Review", probability: 90, color: "bg-yellow-500" },
];

interface OpportunityCardProps {
  opportunity: Opportunity;
  isDragging?: boolean;
  onDragStart: (e: React.DragEvent, opportunity: Opportunity) => void;
}

function OpportunityCard({ opportunity, isDragging, onDragStart }: OpportunityCardProps) {
  const router = useRouter();

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "¥0";
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = new Date(opportunity.closeDate) < new Date() && !opportunity.isClosed;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, opportunity)}
      className={cn(
        "group cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          <Link
            href={`/opportunities/${opportunity.id}`}
            className="font-medium text-sm hover:text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {opportunity.name}
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/opportunities/${opportunity.id}`)}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/opportunities/${opportunity.id}/edit`)}>
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 space-y-1.5">
        {opportunity.accountName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{opportunity.accountName}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          <span className="font-medium text-foreground">{formatCurrency(opportunity.amount)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span className={cn(isOverdue && "text-destructive font-medium")}>
            {formatDate(opportunity.closeDate)}
            {isOverdue && " (Overdue)"}
          </span>
        </div>
        {opportunity.ownerName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{opportunity.ownerName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface StageColumnProps {
  stage: (typeof STAGES)[0];
  opportunities: Opportunity[];
  onDragStart: (e: React.DragEvent, opportunity: Opportunity) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageName: string) => void;
  draggedOpportunity: Opportunity | null;
}

function StageColumn({
  stage,
  opportunities,
  onDragStart,
  onDragOver,
  onDrop,
  draggedOpportunity,
}: StageColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const router = useRouter();

  const totalAmount = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `¥${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `¥${Math.round(amount / 1000)}K`;
    }
    return `¥${amount}`;
  };

  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col rounded-lg bg-muted/30">
      {/* Stage Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-3 w-3 rounded-full", stage.color)} />
          <div>
            <h3 className="font-semibold text-sm">{stage.name}</h3>
            <p className="text-xs text-muted-foreground">
              {opportunities.length} deals &bull; {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
            {stage.probability}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => router.push(`/opportunities/new?stage=${encodeURIComponent(stage.name)}`)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cards Container */}
      <div
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition-colors",
          isDragOver && "bg-primary/5 ring-2 ring-primary ring-inset"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
          onDragOver(e);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          setIsDragOver(false);
          onDrop(e, stage.name);
        }}
      >
        {opportunities.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            isDragging={draggedOpportunity?.id === opportunity.id}
            onDragStart={onDragStart}
          />
        ))}

        {opportunities.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-xs text-muted-foreground">
            Drop opportunity here
          </div>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useOpportunities({ limit: 200 });
  const changeStage = useChangeOpportunityStage();

  const [draggedOpportunity, setDraggedOpportunity] = useState<Opportunity | null>(null);

  // Filter only open opportunities
  const opportunities = (data?.records || []).filter((opp) => !opp.isClosed);

  const handleDragStart = useCallback((e: React.DragEvent, opportunity: Opportunity) => {
    setDraggedOpportunity(opportunity);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, stageName: string) => {
      e.preventDefault();

      if (!draggedOpportunity || draggedOpportunity.stageName === stageName) {
        setDraggedOpportunity(null);
        return;
      }

      try {
        await changeStage.mutateAsync({
          id: draggedOpportunity.id,
          stageName,
          etag: draggedOpportunity.systemModstamp,
        });
        refetch();
      } catch (err) {
        console.error("Failed to change stage:", err);
      } finally {
        setDraggedOpportunity(null);
      }
    },
    [draggedOpportunity, changeStage, refetch]
  );

  // Group opportunities by stage
  const opportunitiesByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage.name] = opportunities.filter((opp) => opp.stageName === stage.name);
      return acc;
    },
    {} as Record<string, Opportunity[]>
  );

  // Calculate totals
  const totalDeals = opportunities.length;
  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
  const weightedValue = opportunities.reduce((sum, opp) => {
    const stage = STAGES.find((s) => s.name === opp.stageName);
    return sum + (opp.amount || 0) * ((stage?.probability || 0) / 100);
  }, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-destructive">Failed to load opportunities</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/opportunities")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Pipeline View</h1>
            <p className="text-sm text-muted-foreground">
              Drag and drop opportunities between stages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => router.push("/opportunities")}
            >
              <List className="mr-1 h-4 w-4" />
              List
            </Button>
            <Button variant="secondary" size="sm" className="h-7 px-2">
              <LayoutGrid className="mr-1 h-4 w-4" />
              Pipeline
            </Button>
          </div>

          <Button onClick={() => router.push("/opportunities/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Opportunity
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex items-center gap-6 border-b bg-muted/30 px-6 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Total Deals</p>
          <p className="text-lg font-semibold">{totalDeals}</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-xs text-muted-foreground">Total Value</p>
          <p className="text-lg font-semibold">{formatCurrency(totalValue)}</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-xs text-muted-foreground">Weighted Value</p>
          <p className="text-lg font-semibold text-primary">{formatCurrency(weightedValue)}</p>
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-x-auto p-4">
          {STAGES.map((stage) => (
            <StageColumn
              key={stage.name}
              stage={stage}
              opportunities={opportunitiesByStage[stage.name] || []}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              draggedOpportunity={draggedOpportunity}
            />
          ))}
        </div>
      )}
    </div>
  );
}
