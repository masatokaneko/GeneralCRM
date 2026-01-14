"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  UserPlus,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  FileText,
  ArrowRight,
  Loader2,
  Megaphone,
  Trophy,
  Percent,
  ArrowUpRight,
} from "lucide-react";
import { useAccounts } from "@/lib/api/accounts";
import { useContacts } from "@/lib/api/contacts";
import { useLeads } from "@/lib/api/leads";
import { useOpportunities } from "@/lib/api/opportunities";
import { useCampaignStats } from "@/lib/api/campaigns";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  href?: string;
  isLoading?: boolean;
}

function StatCard({ title, value, change, icon, href, isLoading }: StatCardProps) {
  const content = (
    <div className={cn("rounded-lg border bg-card p-6", href && "transition-colors hover:bg-muted/50")}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <Loader2 className="mt-2 h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold">{value}</p>
              {change !== undefined && (
                <p
                  className={`mt-1 flex items-center gap-1 text-sm ${
                    change >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {change >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{Math.abs(change)}% from last month</span>
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

const STAGES = [
  { name: "Prospecting", color: "bg-slate-400" },
  { name: "Qualification", color: "bg-blue-400" },
  { name: "Needs Analysis", color: "bg-cyan-400" },
  { name: "Value Proposition", color: "bg-teal-400" },
  { name: "Proposal/Price Quote", color: "bg-green-400" },
  { name: "Negotiation/Review", color: "bg-yellow-400" },
];

function PipelineChart({ opportunities }: { opportunities: Array<{ stageName: string; amount?: number }> }) {
  const stageData = STAGES.map((stage) => {
    const stageOpps = opportunities.filter((opp) => opp.stageName === stage.name);
    const totalAmount = stageOpps.reduce((sum, opp) => sum + (Number(opp.amount) || 0), 0);
    return {
      ...stage,
      count: stageOpps.length,
      amount: totalAmount,
    };
  });

  const maxAmount = Math.max(...stageData.map((s) => s.amount), 1);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `¥${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `¥${(amount / 1000).toFixed(0)}K`;
    }
    return `¥${amount}`;
  };

  return (
    <div className="space-y-3">
      {stageData.map((stage) => (
        <div key={stage.name} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{stage.name}</span>
            <span className="text-muted-foreground">
              {stage.count} deals &bull; {formatCurrency(stage.amount)}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", stage.color)}
              style={{ width: `${(stage.amount / maxAmount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface WinRateGaugeProps {
  won: number;
  lost: number;
  isLoading?: boolean;
}

function WinRateGauge({ won, lost, isLoading }: WinRateGaugeProps) {
  const total = won + lost;
  const winRate = total > 0 ? (won / total) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-32 w-32">
        <svg className="h-32 w-32 -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-muted"
          />
          <path
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${winRate}, 100`}
            className={winRate >= 50 ? "text-green-500" : winRate >= 25 ? "text-yellow-500" : "text-red-500"}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{winRate.toFixed(0)}%</span>
          <span className="text-xs text-muted-foreground">Win Rate</span>
        </div>
      </div>
      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>Won: {won}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span>Lost: {lost}</span>
        </div>
      </div>
    </div>
  );
}

interface TopDeal {
  id: string;
  name: string;
  accountName?: string;
  amount?: number;
  closeDate: string;
  stageName: string;
  probability: number;
}

function TopDealsTable({ deals, isLoading }: { deals: TopDeal[]; isLoading?: boolean }) {
  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "¥0";
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No opportunities closing this month
      </p>
    );
  }

  return (
    <div className="divide-y">
      {deals.slice(0, 5).map((deal) => (
        <Link
          key={deal.id}
          href={`/opportunities/${deal.id}`}
          className="flex items-center justify-between py-3 hover:bg-muted/50 px-2 -mx-2 rounded"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{deal.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {deal.accountName} &bull; {deal.stageName}
            </p>
          </div>
          <div className="text-right ml-4">
            <p className="font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(deal.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(deal.closeDate)} &bull; {deal.probability}%
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CampaignROISummary() {
  const { data: stats, isLoading } = useCampaignStats();

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `¥${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `¥${Math.round(amount / 1000)}K`;
    }
    return `¥${amount}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-purple-500" />
          <span className="font-medium">Active Campaigns</span>
        </div>
        <span className="text-2xl font-bold">{stats.activeCampaigns}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Revenue</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {formatCurrency(stats.totalRevenue)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Cost</span>
          <span>{formatCurrency(stats.totalActualCost)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Overall ROI</span>
          <span className={stats.roi > 0 ? "font-bold text-green-600" : "font-bold text-red-600"}>
            {stats.roi.toFixed(1)}%
          </span>
        </div>
      </div>
      <Link
        href="/campaigns"
        className="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
      >
        View all campaigns <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function LeadConversionFunnel({ leads, isLoading }: { leads: Array<{ status: string }>; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusCounts = {
    New: leads.filter((l) => l.status === "New").length,
    Working: leads.filter((l) => l.status === "Working").length,
    Qualified: leads.filter((l) => l.status === "Qualified").length,
  };

  const total = leads.length || 1;
  const maxCount = Math.max(...Object.values(statusCounts), 1);

  const stages = [
    { name: "New", count: statusCounts.New, color: "bg-blue-500" },
    { name: "Working", count: statusCounts.Working, color: "bg-yellow-500" },
    { name: "Qualified", count: statusCounts.Qualified, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const width = (stage.count / maxCount) * 100;
        const percentage = ((stage.count / total) * 100).toFixed(0);
        return (
          <div key={stage.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stage.name}</span>
              <span className="text-muted-foreground">
                {stage.count} ({percentage}%)
              </span>
            </div>
            <div className="relative">
              <div
                className={cn("h-8 rounded transition-all", stage.color)}
                style={{
                  width: `${Math.max(width, 5)}%`,
                  clipPath: index < stages.length - 1
                    ? "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)"
                    : undefined,
                }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-sm pt-2 border-t">
        <span className="text-muted-foreground">Conversion Rate</span>
        <span className="font-bold">
          {statusCounts.New > 0 ? ((statusCounts.Qualified / statusCounts.New) * 100).toFixed(1) : 0}%
        </span>
      </div>
    </div>
  );
}

interface ActivityItem {
  id: string;
  type: "created" | "updated" | "closed";
  objectType: string;
  objectName: string;
  user: string;
  timestamp: string;
}

const recentActivity: ActivityItem[] = [
  {
    id: "1",
    type: "created",
    objectType: "Opportunity",
    objectName: "Acme Corp - Enterprise License",
    user: "Taro Yamada",
    timestamp: "10 minutes ago",
  },
  {
    id: "2",
    type: "updated",
    objectType: "Lead",
    objectName: "John Smith",
    user: "Hanako Tanaka",
    timestamp: "25 minutes ago",
  },
  {
    id: "3",
    type: "closed",
    objectType: "Opportunity",
    objectName: "Beta Inc - Pro Plan",
    user: "Taro Yamada",
    timestamp: "1 hour ago",
  },
  {
    id: "4",
    type: "created",
    objectType: "Account",
    objectName: "Global Tech Solutions",
    user: "Hanako Tanaka",
    timestamp: "2 hours ago",
  },
  {
    id: "5",
    type: "updated",
    objectType: "Contact",
    objectName: "Sarah Johnson",
    user: "Taro Yamada",
    timestamp: "3 hours ago",
  },
];

interface Task {
  id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  relatedTo: string;
}

const upcomingTasks: Task[] = [
  {
    id: "1",
    title: "Follow up call with Acme Corp",
    dueDate: "Today",
    priority: "high",
    relatedTo: "Acme Corp",
  },
  {
    id: "2",
    title: "Send proposal to Beta Inc",
    dueDate: "Tomorrow",
    priority: "high",
    relatedTo: "Beta Inc",
  },
  {
    id: "3",
    title: "Schedule demo for Global Tech",
    dueDate: "Jan 15",
    priority: "medium",
    relatedTo: "Global Tech Solutions",
  },
  {
    id: "4",
    title: "Review contract terms",
    dueDate: "Jan 16",
    priority: "medium",
    relatedTo: "Delta Systems",
  },
];

export default function DashboardPage() {
  const { data: accountsData, isLoading: isLoadingAccounts } = useAccounts({ limit: 1 });
  const { data: contactsData, isLoading: isLoadingContacts } = useContacts({ limit: 1 });
  const { data: leadsData, isLoading: isLoadingLeads } = useLeads({ limit: 100 });
  const { data: opportunitiesData, isLoading: isLoadingOpportunities } = useOpportunities({ limit: 100 });

  const opportunities = opportunitiesData?.records || [];
  const leads = leadsData?.records || [];
  const openOpportunities = opportunities.filter((opp) => !opp.isClosed);
  const wonOpportunities = opportunities.filter((opp) => opp.isClosed && opp.isWon);
  const lostOpportunities = opportunities.filter((opp) => opp.isClosed && !opp.isWon);

  const pipelineValue = openOpportunities.reduce((sum, opp) => sum + (Number(opp.amount) || 0), 0);
  const wonValue = wonOpportunities.reduce((sum, opp) => sum + (Number(opp.amount) || 0), 0);

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const closingThisMonth = openOpportunities.filter((opp) => {
    const closeDate = new Date(opp.closeDate);
    return closeDate <= endOfMonth;
  });
  const closingThisMonthValue = closingThisMonth.reduce((sum, opp) => sum + (Number(opp.amount) || 0), 0);

  const topDeals = [...closingThisMonth]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 5);

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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s what&apos;s happening with your sales pipeline.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Accounts"
          value={accountsData?.totalSize || 0}
          change={12}
          icon={<Building2 className="h-6 w-6" />}
          href="/accounts"
          isLoading={isLoadingAccounts}
        />
        <StatCard
          title="Active Contacts"
          value={contactsData?.totalSize || 0}
          change={8}
          icon={<Users className="h-6 w-6" />}
          href="/contacts"
          isLoading={isLoadingContacts}
        />
        <StatCard
          title="Open Leads"
          value={leadsData?.totalSize || 0}
          change={-3}
          icon={<UserPlus className="h-6 w-6" />}
          href="/leads"
          isLoading={isLoadingLeads}
        />
        <StatCard
          title="Open Opportunities"
          value={openOpportunities.length}
          change={15}
          icon={<Target className="h-6 w-6" />}
          href="/opportunities"
          isLoading={isLoadingOpportunities}
        />
      </div>

      {/* Revenue Summary */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pipeline Summary</h2>
          <Link
            href="/opportunities"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <DollarSign className="h-5 w-5" />
              <span className="font-medium">Pipeline Value</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(pipelineValue)}</p>
            <p className="text-sm text-muted-foreground">{openOpportunities.length} opportunities</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">Won This Month</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(wonValue)}</p>
            <p className="text-sm text-muted-foreground">{wonOpportunities.length} deals closed</p>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-950">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Closing This Month</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(closingThisMonthValue)}</p>
            <p className="text-sm text-muted-foreground">{closingThisMonth.length} opportunities</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Win Rate Gauge */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Win Rate
            </h2>
          </div>
          <WinRateGauge
            won={wonOpportunities.length}
            lost={lostOpportunities.length}
            isLoading={isLoadingOpportunities}
          />
        </div>

        {/* Lead Conversion Funnel */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Percent className="h-5 w-5 text-blue-500" />
              Lead Conversion
            </h2>
            <Link
              href="/leads"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <LeadConversionFunnel leads={leads} isLoading={isLoadingLeads} />
        </div>

        {/* Campaign ROI */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-purple-500" />
              Campaign Performance
            </h2>
          </div>
          <CampaignROISummary />
        </div>
      </div>

      {/* Pipeline by Stage & Top Deals */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline by Stage */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pipeline by Stage</h2>
            <Link
              href="/opportunities/pipeline"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              Pipeline View
            </Link>
          </div>
          <div className="mt-4">
            {isLoadingOpportunities ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <PipelineChart opportunities={openOpportunities} />
            )}
          </div>
        </div>

        {/* Top Deals Closing This Month */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top Deals Closing This Month</h2>
            <Link
              href="/forecasts"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <TrendingUp className="h-4 w-4" />
              Forecasts
            </Link>
          </div>
          <div className="mt-4">
            <TopDealsTable deals={topDeals} isLoading={isLoadingOpportunities} />
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Recent Activity</h2>
          </div>
          <div className="divide-y">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-4">
                <div
                  className={`mt-0.5 h-2 w-2 rounded-full ${
                    activity.type === "created"
                      ? "bg-green-500"
                      : activity.type === "closed"
                        ? "bg-blue-500"
                        : "bg-yellow-500"
                  }`}
                />
                <div className="flex-1 space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user}</span>{" "}
                    <span className="text-muted-foreground">{activity.type}</span>{" "}
                    <span className="font-medium">{activity.objectType}</span>:{" "}
                    {activity.objectName}
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="rounded-lg border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Upcoming Tasks</h2>
          </div>
          <div className="divide-y">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-4">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.relatedTo} &bull; Due {task.dueDate}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    task.priority === "high"
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                      : task.priority === "medium"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
