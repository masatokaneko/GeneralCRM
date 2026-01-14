"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useAccounts } from "@/lib/api/accounts";

interface Account {
  id: string;
  name: string;
  type?: string;
  industry?: string;
  phone?: string;
  website?: string;
  ownerName?: string;
}

const typeColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Customer: "default",
  Prospect: "secondary",
  Partner: "outline",
  Competitor: "destructive",
  Other: "outline",
};

const columns: Column<Account>[] = [
  {
    key: "name",
    label: "Account Name",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-primary">{String(value)}</span>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (value) =>
      value ? (
        <Badge variant={typeColors[String(value)] || "outline"}>
          {String(value)}
        </Badge>
      ) : (
        "-"
      ),
  },
  {
    key: "industry",
    label: "Industry",
    sortable: true,
  },
  {
    key: "phone",
    label: "Phone",
  },
  {
    key: "ownerName",
    label: "Owner",
    sortable: true,
  },
];

export default function AccountsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useAccounts();

  const handleRowClick = (account: Account) => {
    router.push(`/accounts/${account.id}`);
  };

  return (
    <ListPageTemplate
      title="Accounts"
      objectName="Account"
      columns={columns}
      data={(data?.records as Account[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      onRowClick={handleRowClick}
      createHref="/accounts/new"
      searchPlaceholder="Search accounts by name..."
    />
  );
}
