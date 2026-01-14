"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useCampaigns, useCampaignStats } from "@/lib/api/campaigns";
import type { Campaign } from "@/mocks/types";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Megaphone, DollarSign, Target } from "lucide-react";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Planned: "outline",
  InProgress: "default",
  Completed: "secondary",
  Aborted: "destructive",
};

const typeColors: Record<string, string> = {
  Conference: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  Webinar: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  "Trade Show": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  Email: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  Advertising: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  "Direct Mail": "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
  Partner: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  Other: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400",
};

function formatCurrency(value: number | undefined): string {
  if (!value) return "¥0";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const columns: Column<Campaign>[] = [
  {
    key: "name",
    label: "Campaign Name",
    sortable: true,
    render: (value, row) => (
      <div>
        <span className="font-medium text-primary">{String(value)}</span>
        {row.isActive && (
          <Badge variant="default" className="ml-2 text-xs">
            Active
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (value) => (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[String(value)] || typeColors.Other}`}
      >
        {String(value)}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => (
      <Badge variant={statusColors[String(value)] || "outline"}>
        {String(value)}
      </Badge>
    ),
  },
  {
    key: "startDate",
    label: "Start Date",
    sortable: true,
    render: (value) => formatDate(value as string | undefined),
  },
  {
    key: "endDate",
    label: "End Date",
    sortable: true,
    render: (value) => formatDate(value as string | undefined),
  },
  {
    key: "budgetedCost",
    label: "Budget",
    sortable: true,
    render: (value) => formatCurrency(value as number | undefined),
  },
  {
    key: "actualCost",
    label: "Actual Cost",
    sortable: true,
    render: (value) => formatCurrency(value as number | undefined),
  },
  {
    key: "amountWonOpportunities",
    label: "Revenue Won",
    sortable: true,
    render: (value) => (
      <span className="text-green-600 dark:text-green-400 font-medium">
        {formatCurrency(value as number | undefined)}
      </span>
    ),
  },
  {
    key: "ownerName",
    label: "Owner",
    sortable: true,
  },
];

function CampaignStatsCards() {
  const { data: stats, isLoading } = useCampaignStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={`skeleton-${i}`}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statsData = [
    {
      label: "Total Campaigns",
      value: stats.totalCampaigns,
      icon: Megaphone,
      color: "text-blue-500",
    },
    {
      label: "Active Campaigns",
      value: stats.activeCampaigns,
      icon: Target,
      color: "text-green-500",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      label: "ROI",
      value: `${stats.roi.toFixed(1)}%`,
      icon: TrendingUp,
      color: stats.roi > 0 ? "text-green-500" : "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function CampaignsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useCampaigns();

  const handleRowClick = (campaign: Campaign) => {
    router.push(`/campaigns/${campaign.id}`);
  };

  return (
    <div className="space-y-6">
      <CampaignStatsCards />
      <ListPageTemplate
        title="Campaigns"
        objectName="Campaign"
        columns={columns}
        data={(data?.records as Campaign[]) || []}
        totalCount={data?.totalSize || 0}
        isLoading={isLoading}
        error={error}
        onRowClick={handleRowClick}
        createHref="/campaigns/new"
        searchPlaceholder="Search campaigns..."
      />
    </div>
  );
}
