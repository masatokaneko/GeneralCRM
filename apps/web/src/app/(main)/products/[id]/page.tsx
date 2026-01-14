"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { RelatedList } from "@/components/organisms/RelatedList";
import { Badge } from "@/components/atoms/Badge";
import { useProduct, useDeleteProduct } from "@/lib/api/products";
import { usePricebookEntries } from "@/lib/api/pricebooks";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import { Button } from "@/components/atoms/Button";
import * as React from "react";

const sections: Section[] = [
  {
    title: "Product Information",
    fields: [
      { key: "name", label: "Product Name", type: "text" },
      { key: "productCode", label: "Product Code", type: "text" },
      { key: "family", label: "Product Family", type: "text" },
      {
        key: "isActive",
        label: "Active",
        type: "badge",
        render: (value) => (
          <Badge variant={value ? "default" : "secondary"}>
            {value ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
  },
  {
    title: "Description",
    collapsible: true,
    fields: [
      { key: "description", label: "Description", type: "text", colSpan: 2 },
    ],
  },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const { data: product, isLoading, error } = useProduct(id);
  const { data: entriesData } = usePricebookEntries({ productId: id });
  const deleteProduct = useDeleteProduct();

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(id);
      toast({
        title: "Product Deleted",
        description: "The product has been successfully deleted.",
        variant: "success",
      });
      router.push("/products");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      <DetailPageTemplate
        title={product?.name || "Product"}
        subtitle={product?.productCode}
        objectName="Product"
        record={product ? (product as unknown as Record<string, unknown>) : null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/products"
        editHref={`/products/${id}/edit`}
        onDelete={() => setShowDeleteModal(true)}
        headerBadge={
          product ? (
            <Badge variant={product.isActive ? "default" : "secondary"}>
              {product.isActive ? "Active" : "Inactive"}
            </Badge>
          ) : undefined
        }
        systemInfo={{
          createdAt: product?.createdAt,
          updatedAt: product?.updatedAt,
        }}
        relatedLists={
          <RelatedList
            title="Pricebook Entries"
            objectName="Pricebook Entries"
            columns={[
              {
                key: "pricebookName",
                label: "Pricebook",
                render: (value) => (
                  <span className="font-medium text-primary">
                    {String(value) || "-"}
                  </span>
                ),
              },
              {
                key: "unitPrice",
                label: "List Price",
                render: (value) => formatCurrency(Number(value) || 0),
              },
              {
                key: "isActive",
                label: "Active",
                render: (value) => (
                  <Badge variant={value ? "default" : "secondary"}>
                    {value ? "Yes" : "No"}
                  </Badge>
                ),
              },
            ]}
            records={entriesData?.records || []}
            totalCount={entriesData?.totalSize}
            emptyMessage="No pricebook entries for this product"
          />
        }
      />

      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />
    </>
  );
}
