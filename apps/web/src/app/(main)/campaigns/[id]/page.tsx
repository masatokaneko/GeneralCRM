"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { useCampaign, useDeleteCampaign, useCampaignMembers } from "@/lib/api/campaigns";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Target, Trophy, DollarSign, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
  if (!value && value !== 0) return "-";
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
    month: "long",
    day: "numeric",
  });
}

const sections: Section[] = [
  {
    title: "Campaign Information",
    fields: [
      { key: "name", label: "Campaign Name", type: "text" },
      {
        key: "type",
        label: "Type",
        type: "custom",
        render: (value) =>
          value ? (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[String(value)] || typeColors.Other}`}
            >
              {String(value)}
            </span>
          ) : (
            "-"
          ),
      },
      {
        key: "status",
        label: "Status",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={statusColors[String(value)] || "outline"}>
              {String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "isActive",
        label: "Active",
        type: "custom",
        render: (value) => (
          <Badge variant={value ? "default" : "outline"}>
            {value ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "startDate",
        label: "Start Date",
        type: "custom",
        render: (value) => formatDate(value as string | undefined),
      },
      {
        key: "endDate",
        label: "End Date",
        type: "custom",
        render: (value) => formatDate(value as string | undefined),
      },
      { key: "ownerName", label: "Campaign Owner", type: "text" },
      { key: "description", label: "Description", type: "text", colSpan: 2 },
    ],
  },
  {
    title: "Budget & Cost",
    fields: [
      {
        key: "expectedRevenue",
        label: "Expected Revenue",
        type: "custom",
        render: (value) => (
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {formatCurrency(value as number | undefined)}
          </span>
        ),
      },
      {
        key: "budgetedCost",
        label: "Budgeted Cost",
        type: "custom",
        render: (value) => formatCurrency(value as number | undefined),
      },
      {
        key: "actualCost",
        label: "Actual Cost",
        type: "custom",
        render: (value, record) => {
          const actual = value as number | undefined;
          const budgeted = record?.budgetedCost as number | undefined;
          const isOverBudget = actual && budgeted && actual > budgeted;
          return (
            <span className={isOverBudget ? "text-red-600 dark:text-red-400" : ""}>
              {formatCurrency(actual)}
              {isOverBudget && " (Over Budget)"}
            </span>
          );
        },
      },
      {
        key: "roi",
        label: "ROI",
        type: "custom",
        render: (_value, record) => {
          const revenue = (record?.amountWonOpportunities as number) || 0;
          const cost = (record?.actualCost as number) || 0;
          if (cost === 0) return "-";
          const roi = ((revenue - cost) / cost) * 100;
          return (
            <span className={roi > 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
              {roi.toFixed(1)}%
            </span>
          );
        },
      },
      { key: "numberSent", label: "Number Sent", type: "text" },
      { key: "expectedResponse", label: "Expected Response", type: "text" },
    ],
  },
];

interface CampaignMetricsProps {
  campaign: {
    numberOfLeads?: number;
    numberOfContacts?: number;
    numberOfOpportunities?: number;
    numberOfWonOpportunities?: number;
    amountAllOpportunities?: number;
    amountWonOpportunities?: number;
    actualCost?: number;
    budgetedCost?: number;
  };
}

function CampaignMetrics({ campaign }: CampaignMetricsProps) {
  const {
    numberOfLeads = 0,
    numberOfContacts = 0,
    numberOfOpportunities = 0,
    numberOfWonOpportunities = 0,
    amountAllOpportunities = 0,
    amountWonOpportunities = 0,
    actualCost = 0,
    budgetedCost = 0,
  } = campaign;

  const winRate = numberOfOpportunities > 0
    ? (numberOfWonOpportunities / numberOfOpportunities) * 100
    : 0;

  const budgetUsage = budgetedCost > 0
    ? (actualCost / budgetedCost) * 100
    : 0;

  const roi = actualCost > 0
    ? ((amountWonOpportunities - actualCost) / actualCost) * 100
    : 0;

  const metrics = [
    {
      label: "Leads Generated",
      value: numberOfLeads,
      icon: UserPlus,
      color: "text-blue-500",
    },
    {
      label: "Contacts Reached",
      value: numberOfContacts,
      icon: Users,
      color: "text-indigo-500",
    },
    {
      label: "Opportunities Created",
      value: numberOfOpportunities,
      icon: Target,
      color: "text-purple-500",
    },
    {
      label: "Opportunities Won",
      value: numberOfWonOpportunities,
      icon: Trophy,
      color: "text-yellow-500",
    },
    {
      label: "Pipeline Value",
      value: formatCurrency(amountAllOpportunities),
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      label: "Revenue Won",
      value: formatCurrency(amountWonOpportunities),
      icon: TrendingUp,
      color: "text-green-500",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="text-center">
                  <Icon className={`h-8 w-8 mx-auto mb-2 ${metric.color}`} />
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Win Rate</span>
                <span className="font-medium">{winRate.toFixed(1)}%</span>
              </div>
              <Progress value={winRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {numberOfWonOpportunities} of {numberOfOpportunities} opportunities won
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Budget Usage</span>
                <span className={`font-medium ${budgetUsage > 100 ? "text-red-500" : ""}`}>
                  {budgetUsage.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.min(budgetUsage, 100)}
                className={`h-2 ${budgetUsage > 100 ? "[&>div]:bg-red-500" : ""}`}
              />
              <p className="text-xs text-muted-foreground">
                {formatCurrency(actualCost)} of {formatCurrency(budgetedCost)} spent
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>ROI</span>
                <span className={`font-medium ${roi > 0 ? "text-green-500" : "text-red-500"}`}>
                  {roi.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.max(0, Math.min(roi, 100))}
                className={`h-2 ${roi > 0 ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500"}`}
              />
              <p className="text-xs text-muted-foreground">
                Return on investment
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CampaignMembersListProps {
  campaignId: string;
}

function CampaignMembersList({ campaignId }: CampaignMembersListProps) {
  const { data, isLoading } = useCampaignMembers(campaignId);

  const memberStatusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Sent: "outline",
    Responded: "default",
    Converted: "secondary",
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={`skeleton-${i}`} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const members = data?.records || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Campaign Members ({members.length})</CardTitle>
        <Button size="sm" variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Members
        </Button>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No members added to this campaign yet.
          </p>
        ) : (
          <div className="divide-y">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="font-medium">
                    {member.memberName || (member.leadId ? "Lead" : "Contact")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {member.memberEmail || "-"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={memberStatusColors[member.status] || "outline"}>
                    {member.status}
                  </Badge>
                  {member.hasResponded && (
                    <Badge variant="default" className="bg-green-600">
                      Responded
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const { data: campaign, isLoading, error } = useCampaign(id);
  const deleteCampaign = useDeleteCampaign();

  const handleDelete = async () => {
    try {
      await deleteCampaign.mutateAsync(id);
      toast({
        title: "Campaign Deleted",
        description: "The campaign has been successfully deleted.",
        variant: "success",
      });
      router.push("/campaigns");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete campaign.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  return (
    <>
      <DetailPageTemplate
        title={campaign?.name || "Campaign"}
        subtitle={campaign?.type}
        objectName="Campaign"
        record={(campaign as unknown as Record<string, unknown>) || null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/campaigns"
        editHref={`/campaigns/${id}/edit`}
        onDelete={() => setShowDeleteModal(true)}
        headerBadge={
          campaign?.status ? (
            <Badge variant={statusColors[campaign.status] || "outline"}>
              {campaign.status}
            </Badge>
          ) : undefined
        }
        systemInfo={{
          createdAt: campaign?.createdAt,
          createdBy: campaign?.createdByName || campaign?.ownerName,
          updatedAt: campaign?.updatedAt,
          updatedBy: campaign?.lastModifiedByName || campaign?.ownerName,
        }}
        additionalContent={
          campaign && (
            <div className="space-y-6 mt-6">
              <CampaignMetrics campaign={campaign} />
              <CampaignMembersList campaignId={id} />
            </div>
          )
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCampaign.isPending}
            >
              {deleteCampaign.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />
    </>
  );
}
