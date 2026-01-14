"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useQuotes } from "@/lib/api/quotes";
import { Star, FileText, Send, CheckCircle, XCircle } from "lucide-react";

interface Quote {
  id: string;
  name: string;
  opportunityName?: string;
  status: string;
  isPrimary: boolean;
  grandTotal: number;
  expirationDate?: string;
  ownerName?: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Draft: "outline",
  Presented: "secondary",
  Accepted: "default",
  Rejected: "destructive",
};

const statusIcons: Record<string, React.ReactNode> = {
  Draft: <FileText className="mr-1 h-3 w-3" />,
  Presented: <Send className="mr-1 h-3 w-3" />,
  Accepted: <CheckCircle className="mr-1 h-3 w-3" />,
  Rejected: <XCircle className="mr-1 h-3 w-3" />,
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

const columns: Column<Quote>[] = [
  {
    key: "name",
    label: "Quote Name",
    sortable: true,
    render: (value, row) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-primary">{String(value)}</span>
        {row.isPrimary && (
          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
            <Star className="mr-1 h-3 w-3" />
            Primary
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: "opportunityName",
    label: "Opportunity",
    sortable: true,
    render: (value) => (
      <span className="text-primary">{value ? String(value) : "-"}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => (
      <Badge variant={statusColors[String(value)] || "outline"}>
        {statusIcons[String(value)]}
        {String(value)}
      </Badge>
    ),
  },
  {
    key: "grandTotal",
    label: "Total",
    sortable: true,
    render: (value) => (
      <span className="font-medium">{formatCurrency(Number(value))}</span>
    ),
  },
  {
    key: "expirationDate",
    label: "Expiration Date",
    sortable: true,
    render: (value) => (value ? formatDate(String(value)) : "-"),
  },
  {
    key: "ownerName",
    label: "Owner",
    sortable: true,
  },
];

export default function QuotesPage() {
  const router = useRouter();
  const { data, isLoading, error } = useQuotes();

  const handleRowClick = (quote: Quote) => {
    router.push(`/quotes/${quote.id}`);
  };

  return (
    <ListPageTemplate
      title="Quotes"
      objectName="Quote"
      columns={columns}
      data={(data?.records as Quote[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      onRowClick={handleRowClick}
      createHref="/quotes/new"
      searchPlaceholder="Search quotes..."
    />
  );
}
