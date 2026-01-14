"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useContracts } from "@/lib/api/contracts";

interface Contract {
  id: string;
  name: string;
  contractNumber: string;
  accountName: string;
  contractType: string;
  status: string;
  totalContractValue: number;
  remainingValue: number;
  startDate?: string;
  endDate?: string;
  termMonths: number;
  ownerName?: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Draft: "outline",
  InApproval: "secondary",
  Activated: "default",
  Expired: "destructive",
  Terminated: "destructive",
};

const contractTypeColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  License: "default",
  PoF: "secondary",
  Service: "outline",
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

const columns: Column<Contract>[] = [
  {
    key: "contractNumber",
    label: "Contract Number",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-primary">{String(value)}</span>
    ),
  },
  {
    key: "name",
    label: "Contract Name",
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
    key: "contractType",
    label: "Type",
    sortable: true,
    render: (value) => (
      <Badge variant={contractTypeColors[String(value)] || "outline"}>
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
    key: "totalContractValue",
    label: "Total Value",
    sortable: true,
    render: (value) => formatCurrency(Number(value) || 0),
  },
  {
    key: "endDate",
    label: "End Date",
    sortable: true,
    render: (value) => formatDate(value as string | undefined),
  },
];

export default function ContractsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useContracts();

  const handleRowClick = (contract: Contract) => {
    router.push(`/contracts/${contract.id}`);
  };

  return (
    <ListPageTemplate
      title="Contracts"
      objectName="Contract"
      columns={columns}
      data={(data?.records as Contract[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      onRowClick={handleRowClick}
      createHref="/contracts/new"
      searchPlaceholder="Search contracts..."
    />
  );
}
