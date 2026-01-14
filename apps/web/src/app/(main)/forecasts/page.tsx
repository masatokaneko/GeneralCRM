"use client";

import * as React from "react";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/atoms/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select";
import { useOpportunities } from "@/lib/api/opportunities";
import { cn } from "@/lib/utils";

// Forecast categories based on opportunity stage
const FORECAST_CATEGORIES = [
  { name: "Closed", stages: ["Closed Won"], color: "bg-green-500", textColor: "text-green-600" },
  { name: "Commit", stages: ["Negotiation/Review"], color: "bg-blue-500", textColor: "text-blue-600" },
  { name: "Best Case", stages: ["Proposal/Price Quote"], color: "bg-cyan-500", textColor: "text-cyan-600" },
  { name: "Pipeline", stages: ["Prospecting", "Qualification", "Needs Analysis", "Value Proposition"], color: "bg-slate-400", textColor: "text-slate-600" },
  { name: "Omitted", stages: ["Closed Lost"], color: "bg-red-400", textColor: "text-red-600" },
];

// Mock role hierarchy for forecasting
const ROLE_HIERARCHY = [
  {
    id: "1",
    name: "VP of Sales",
    userName: "Taro Yamada",
    children: [
      {
        id: "2",
        name: "Sales Manager - East",
        userName: "Hanako Tanaka",
        children: [
          { id: "4", name: "Account Executive", userName: "Ichiro Suzuki", children: [] },
          { id: "5", name: "Account Executive", userName: "Yuki Sato", children: [] },
        ],
      },
      {
        id: "3",
        name: "Sales Manager - West",
        userName: "Jiro Watanabe",
        children: [
          { id: "6", name: "Account Executive", userName: "Kenji Ito", children: [] },
          { id: "7", name: "Account Executive", userName: "Mika Yamamoto", children: [] },
        ],
      },
    ],
  },
];

interface ForecastData {
  closed: number;
  commit: number;
  bestCase: number;
  pipeline: number;
  quota: number;
}

interface RoleNode {
  id: string;
  name: string;
  userName: string;
  children: RoleNode[];
}

// Generate mock forecast data
function generateForecastData(roleId: string): ForecastData {
  const seed = roleId.charCodeAt(0);
  return {
    closed: (seed * 12345) % 5000000 + 1000000,
    commit: (seed * 54321) % 3000000 + 500000,
    bestCase: (seed * 98765) % 4000000 + 800000,
    pipeline: (seed * 11111) % 6000000 + 1000000,
    quota: 10000000,
  };
}

interface ForecastRowProps {
  role: RoleNode;
  level: number;
  expandedRoles: Set<string>;
  onToggle: (roleId: string) => void;
  selectedMonth: string;
}

function ForecastRow({ role, level, expandedRoles, onToggle, selectedMonth }: ForecastRowProps) {
  const isExpanded = expandedRoles.has(role.id);
  const hasChildren = role.children.length > 0;
  const forecast = generateForecastData(role.id);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `¥${(amount / 1000000).toFixed(1)}M`;
    }
    return `¥${Math.round(amount / 1000)}K`;
  };

  const total = forecast.closed + forecast.commit + forecast.bestCase;
  const attainment = (forecast.closed / forecast.quota) * 100;
  const gap = forecast.quota - total;

  return (
    <>
      <tr className={cn("border-b hover:bg-muted/50", level === 0 && "bg-muted/30 font-medium")}>
        {/* Role Name */}
        <td className="p-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onToggle(role.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6" />
            )}
            <div>
              <p className="text-sm">{role.userName}</p>
              <p className="text-xs text-muted-foreground">{role.name}</p>
            </div>
          </div>
        </td>

        {/* Quota */}
        <td className="p-3 text-right">
          <span className="text-sm">{formatCurrency(forecast.quota)}</span>
        </td>

        {/* Closed */}
        <td className="p-3 text-right">
          <span className="text-sm font-medium text-green-600">{formatCurrency(forecast.closed)}</span>
        </td>

        {/* Commit */}
        <td className="p-3 text-right">
          <span className="text-sm text-blue-600">{formatCurrency(forecast.commit)}</span>
        </td>

        {/* Best Case */}
        <td className="p-3 text-right">
          <span className="text-sm text-cyan-600">{formatCurrency(forecast.bestCase)}</span>
        </td>

        {/* Pipeline */}
        <td className="p-3 text-right">
          <span className="text-sm text-muted-foreground">{formatCurrency(forecast.pipeline)}</span>
        </td>

        {/* Attainment */}
        <td className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  attainment >= 100 ? "bg-green-500" : attainment >= 75 ? "bg-yellow-500" : "bg-red-500"
                )}
                style={{ width: `${Math.min(attainment, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">{attainment.toFixed(0)}%</span>
          </div>
        </td>

        {/* Gap */}
        <td className="p-3 text-right">
          <span className={cn("text-sm font-medium", gap > 0 ? "text-red-600" : "text-green-600")}>
            {gap > 0 ? "-" : "+"}
            {formatCurrency(Math.abs(gap))}
          </span>
        </td>
      </tr>

      {/* Children */}
      {isExpanded &&
        role.children.map((child) => (
          <ForecastRow
            key={child.id}
            role={child}
            level={level + 1}
            expandedRoles={expandedRoles}
            onToggle={onToggle}
            selectedMonth={selectedMonth}
          />
        ))}
    </>
  );
}

export default function ForecastsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedQuarter, setSelectedQuarter] = useState("month");
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(["1"]));

  const { data: opportunitiesData, isLoading } = useOpportunities({ limit: 200 });

  const opportunities = opportunitiesData?.records || [];

  // Calculate summary metrics
  const closedWon = opportunities.filter((o) => o.isClosed && o.isWon);
  const openOpps = opportunities.filter((o) => !o.isClosed);

  const closedAmount = closedWon.reduce((sum, o) => sum + (o.amount || 0), 0);
  const pipelineAmount = openOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
  const commitAmount = openOpps
    .filter((o) => o.stageName === "Negotiation/Review")
    .reduce((sum, o) => sum + (o.amount || 0), 0);
  const bestCaseAmount = openOpps
    .filter((o) => o.stageName === "Proposal/Price Quote")
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  const toggleRole = (roleId: string) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) {
      return `¥${(amount / 1000000).toFixed(1)}M`;
    }
    return `¥${Math.round(amount / 1000)}K`;
  };

  // Generate month options
  const monthOptions = [];
  const now = new Date();
  for (let i = -3; i <= 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
    monthOptions.push({ value, label });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Forecast</h1>
          <p className="text-muted-foreground">
            Track and manage revenue forecasts by role hierarchy
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>

          {/* Month Selector */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {FORECAST_CATEGORIES.slice(0, -1).map((category) => {
          const amount =
            category.name === "Closed"
              ? closedAmount
              : category.name === "Commit"
                ? commitAmount
                : category.name === "Best Case"
                  ? bestCaseAmount
                  : pipelineAmount;

          return (
            <div key={category.name} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className={cn("h-3 w-3 rounded-full", category.color)} />
                <span className="text-sm font-medium text-muted-foreground">{category.name}</span>
              </div>
              <p className={cn("mt-2 text-2xl font-bold", category.textColor)}>
                {formatCurrencyShort(amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {category.name === "Closed"
                  ? `${closedWon.length} deals`
                  : `${openOpps.filter((o) => category.stages.includes(o.stageName)).length} opportunities`}
              </p>
            </div>
          );
        })}

        {/* Total Card */}
        <div className="rounded-lg border bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Forecast Total</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-primary">
            {formatCurrencyShort(closedAmount + commitAmount + bestCaseAmount)}
          </p>
          <p className="text-xs text-muted-foreground">Closed + Commit + Best Case</p>
        </div>
      </div>

      {/* Forecast Category Bar */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 font-semibold">Forecast Breakdown</h3>
        <div className="flex h-8 overflow-hidden rounded-full">
          {FORECAST_CATEGORIES.slice(0, -1).map((category) => {
            const amount =
              category.name === "Closed"
                ? closedAmount
                : category.name === "Commit"
                  ? commitAmount
                  : category.name === "Best Case"
                    ? bestCaseAmount
                    : pipelineAmount;
            const total = closedAmount + commitAmount + bestCaseAmount + pipelineAmount;
            const percentage = total > 0 ? (amount / total) * 100 : 0;

            return (
              <div
                key={category.name}
                className={cn("flex items-center justify-center text-white text-xs font-medium", category.color)}
                style={{ width: `${percentage}%` }}
                title={`${category.name}: ${formatCurrency(amount)}`}
              >
                {percentage > 10 && `${percentage.toFixed(0)}%`}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-4">
          {FORECAST_CATEGORIES.slice(0, -1).map((category) => (
            <div key={category.name} className="flex items-center gap-1.5 text-xs">
              <div className={cn("h-2 w-2 rounded-full", category.color)} />
              <span className="text-muted-foreground">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast Table */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Forecast by Role Hierarchy</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedRoles(new Set(["1", "2", "3"]))}
            >
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExpandedRoles(new Set(["1"]))}>
              Collapse All
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-sm">
                  <th className="p-3 font-medium">User / Role</th>
                  <th className="p-3 text-right font-medium">Quota</th>
                  <th className="p-3 text-right font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Closed
                    </div>
                  </th>
                  <th className="p-3 text-right font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      Commit
                    </div>
                  </th>
                  <th className="p-3 text-right font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <div className="h-2 w-2 rounded-full bg-cyan-500" />
                      Best Case
                    </div>
                  </th>
                  <th className="p-3 text-right font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <div className="h-2 w-2 rounded-full bg-slate-400" />
                      Pipeline
                    </div>
                  </th>
                  <th className="p-3 font-medium">Attainment</th>
                  <th className="p-3 text-right font-medium">Gap</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_HIERARCHY.map((role) => (
                  <ForecastRow
                    key={role.id}
                    role={role}
                    level={0}
                    expandedRoles={expandedRoles}
                    onToggle={toggleRole}
                    selectedMonth={selectedMonth}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
