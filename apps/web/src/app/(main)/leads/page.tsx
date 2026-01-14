"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useLeads } from "@/lib/api/leads";

interface Lead {
  id: string;
  firstName?: string;
  lastName: string;
  company: string;
  email?: string;
  phone?: string;
  status: string;
  rating?: string;
  ownerName?: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  New: "secondary",
  Working: "default",
  Qualified: "default",
  Unqualified: "destructive",
};

const ratingColors: Record<string, string> = {
  Hot: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  Warm: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  Cold: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
};

const columns: Column<Lead>[] = [
  {
    key: "fullName",
    label: "Name",
    sortable: true,
    render: (_, row) => (
      <span className="font-medium text-primary">
        {row.firstName} {row.lastName}
      </span>
    ),
  },
  {
    key: "company",
    label: "Company",
    sortable: true,
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
    key: "rating",
    label: "Rating",
    sortable: true,
    render: (value) =>
      value ? (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ratingColors[String(value)] || ""}`}
        >
          {String(value)}
        </span>
      ) : (
        "-"
      ),
  },
  {
    key: "email",
    label: "Email",
    render: (value) =>
      value ? (
        <a
          href={`mailto:${value}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      ) : (
        "-"
      ),
  },
  {
    key: "ownerName",
    label: "Owner",
    sortable: true,
  },
];

export default function LeadsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useLeads();

  const handleRowClick = (lead: Lead) => {
    router.push(`/leads/${lead.id}`);
  };

  return (
    <ListPageTemplate
      title="Leads"
      objectName="Lead"
      columns={columns}
      data={(data?.records as Lead[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      onRowClick={handleRowClick}
      createHref="/leads/new"
      searchPlaceholder="Search leads by name or company..."
    />
  );
}
