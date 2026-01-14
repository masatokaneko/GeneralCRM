"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useInvoices } from "@/lib/api/invoices";
import type { Invoice } from "@/mocks/types";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Draft: "outline",
  Sent: "secondary",
  Paid: "default",
  PartialPaid: "secondary",
  Overdue: "destructive",
  Cancelled: "secondary",
  Void: "destructive",
};

const columns: Column<Invoice>[] = [
  {
    key: "invoiceNumber",
    label: "Invoice Number",
    sortable: true,
    render: (value) => (
      <span className="font-medium">{String(value)}</span>
    ),
  },
  {
    key: "accountName",
    label: "Account",
    render: (value) => (value ? String(value) : "-"),
  },
  {
    key: "invoiceDate",
    label: "Invoice Date",
    render: (value) => {
      return value ? new Date(String(value)).toLocaleDateString() : "-";
    },
  },
  {
    key: "dueDate",
    label: "Due Date",
    render: (value) => {
      return value ? new Date(String(value)).toLocaleDateString() : "-";
    },
  },
  {
    key: "totalAmount",
    label: "Total Amount",
    render: (value) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(Number(value) || 0);
    },
  },
  {
    key: "balanceDue",
    label: "Balance Due",
    render: (value) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(Number(value) || 0);
    },
  },
  {
    key: "status",
    label: "Status",
    render: (value) => {
      const status = String(value);
      return (
        <Badge variant={statusColors[status] || "outline"}>
          {status === "PartialPaid" ? "Partial Paid" : status}
        </Badge>
      );
    },
  },
];

export default function InvoicesPage() {
  const router = useRouter();
  const { data, isLoading, error } = useInvoices();

  return (
    <ListPageTemplate
      title="Invoices"
      objectName="Invoice"
      columns={columns}
      data={(data?.records as Invoice[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      createHref="/invoices/new"
      onRowClick={(row) => router.push(`/invoices/${row.id}`)}
      searchPlaceholder="Search invoices..."
    />
  );
}
