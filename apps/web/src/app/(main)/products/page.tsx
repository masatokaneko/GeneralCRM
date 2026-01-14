"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useProducts, type Product } from "@/lib/api/products";

const columns: Column<Product>[] = [
  {
    key: "name",
    label: "Product Name",
    sortable: true,
    render: (value) => (
      <span className="font-medium text-primary">{String(value)}</span>
    ),
  },
  {
    key: "productCode",
    label: "Product Code",
    sortable: true,
    render: (value) => (value ? String(value) : "-"),
  },
  {
    key: "family",
    label: "Family",
    sortable: true,
    render: (value) => (value ? String(value) : "-"),
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

export default function ProductsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useProducts();

  const handleRowClick = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  return (
    <ListPageTemplate
      title="Products"
      objectName="Product"
      columns={columns}
      data={(data?.records as Product[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      onRowClick={handleRowClick}
      createHref="/products/new"
      searchPlaceholder="Search products..."
    />
  );
}
