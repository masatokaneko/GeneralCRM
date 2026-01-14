"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useOrders } from "@/lib/api/orders";

interface Order {
  id: string;
  name: string;
  orderNumber: string;
  accountName: string;
  orderType: string;
  status: string;
  totalAmount: number;
  orderDate?: string;
  effectiveDate?: string;
  ownerName?: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Draft: "outline",
  Activated: "secondary",
  Fulfilled: "default",
  Cancelled: "destructive",
};

const orderTypeColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  New: "default",
  Renewal: "secondary",
  Upsell: "secondary",
  Amendment: "outline",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const columns: Column<Order>[] = [
  {
    key: "orderNumber",
    label: "Order Number",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-primary">{String(value)}</span>
    ),
  },
  {
    key: "name",
    label: "Order Name",
    sortable: true,
  },
  {
    key: "accountName",
    label: "Account",
    sortable: true,
    render: (value) => (
      <span className="text-primary">{String(value || "-")}</span>
    ),
  },
  {
    key: "orderType",
    label: "Type",
    sortable: true,
    render: (value) => (
      <Badge variant={orderTypeColors[String(value)] || "outline"}>
        {String(value)}
      </Badge>
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
    key: "totalAmount",
    label: "Total Amount",
    sortable: true,
    render: (value) => formatCurrency(Number(value) || 0),
  },
  {
    key: "effectiveDate",
    label: "Effective Date",
    sortable: true,
    render: (value) => formatDate(value as string | undefined),
  },
];

export default function OrdersPage() {
  const router = useRouter();
  const { data, isLoading, error } = useOrders();

  const handleRowClick = (order: Order) => {
    router.push(`/orders/${order.id}`);
  };

  return (
    <ListPageTemplate
      title="Orders"
      objectName="Order"
      columns={columns}
      data={(data?.records as Order[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      onRowClick={handleRowClick}
      createHref="/orders/new"
      searchPlaceholder="Search orders..."
    />
  );
}
