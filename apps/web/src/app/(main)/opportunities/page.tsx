"use client";

import { useRouter } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { useOpportunities } from "@/lib/api/opportunities";

interface Opportunity {
  id: string;
  name: string;
  accountName: string;
  stageName: string;
  amount?: number;
  probability?: number;
  closeDate: string;
  ownerName?: string;
}

const stageColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Qualification: "outline",
  "Needs Analysis": "outline",
  "Value Proposition": "secondary",
  "Proposal/Price Quote": "secondary",
  "Negotiation/Review": "default",
  "Closed Won": "default",
  "Closed Lost": "destructive",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const columns: Column<Opportunity>[] = [
  {
    key: "name",
    label: "Opportunity Name",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-primary">{String(value)}</span>
    ),
  },
  {
    key: "accountName",
    label: "Account",
    sortable: true,
    render: (value) => (
      <span className="text-primary">{String(value)}</span>
    ),
  },
  {
    key: "stageName",
    label: "Stage",
    sortable: true,
    render: (value) => (
      <Badge variant={stageColors[String(value)] || "outline"}>
        {String(value)}
      </Badge>
    ),
  },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    render: (value) => (value ? formatCurrency(Number(value)) : "-"),
  },
  {
    key: "probability",
    label: "Probability",
    sortable: true,
    render: (value) => (value !== undefined ? `${value}%` : "-"),
  },
  {
    key: "closeDate",
    label: "Close Date",
    sortable: true,
    render: (value) => formatDate(String(value)),
  },
  {
    key: "ownerName",
    label: "Owner",
    sortable: true,
  },
];

export default function OpportunitiesPage() {
  const router = useRouter();
  const { data, isLoading, error } = useOpportunities();

  const handleRowClick = (opportunity: Opportunity) => {
    router.push(`/opportunities/${opportunity.id}`);
  };

  const viewToggle = (
    <div className="flex items-center rounded-lg border bg-muted p-1">
      <Button variant="secondary" size="sm" className="h-7 px-2">
        <List className="mr-1 h-4 w-4" />
        List
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={() => router.push("/opportunities/pipeline")}
      >
        <LayoutGrid className="mr-1 h-4 w-4" />
        Pipeline
      </Button>
    </div>
  );

  return (
    <ListPageTemplate
      title="Opportunities"
      objectName="Opportunity"
      columns={columns}
      data={(data?.records as Opportunity[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      onRowClick={handleRowClick}
      createHref="/opportunities/new"
      searchPlaceholder="Search opportunities..."
      actions={viewToggle}
    />
  );
}
