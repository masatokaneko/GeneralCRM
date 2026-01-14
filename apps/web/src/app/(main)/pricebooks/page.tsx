"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { usePricebooks, type Pricebook } from "@/lib/api/pricebooks";

const columns: Column<Pricebook>[] = [
  {
    key: "name",
    label: "Pricebook Name",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-primary">{String(value)}</span>
    ),
  },
  {
    key: "isStandard",
    label: "Standard",
    sortable: true,
    render: (value) => (
      <Badge variant={value ? "default" : "outline"}>
        {value ? "Standard" : "Custom"}
      </Badge>
    ),
  },
  {
    key: "isActive",
    label: "Status",
    sortable: true,
    render: (value) => (
      <Badge variant={value ? "default" : "secondary"}>
        {value ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    key: "description",
    label: "Description",
    render: (value) =>
      value ? (
        <span className="line-clamp-1 max-w-[200px]">{String(value)}</span>
      ) : (
        "-"
      ),
  },
];

export default function PricebooksPage() {
  const router = useRouter();
  const { data, isLoading, error } = usePricebooks();

  const handleRowClick = (pricebook: Pricebook) => {
    router.push(`/pricebooks/${pricebook.id}`);
  };

  return (
    <ListPageTemplate
      title="Price Books"
      objectName="Price Book"
      columns={columns}
      data={(data?.records as Pricebook[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      onRowClick={handleRowClick}
      createHref="/pricebooks/new"
      searchPlaceholder="Search price books..."
    />
  );
}
