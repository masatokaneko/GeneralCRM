"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { RelatedList } from "@/components/organisms/RelatedList";
import { Badge } from "@/components/atoms/Badge";
import {
  usePricebook,
  useDeletePricebook,
  usePricebookEntries,
} from "@/lib/api/pricebooks";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import { Button } from "@/components/atoms/Button";
import * as React from "react";

const sections: Section[] = [
  {
    title: "Pricebook Information",
    fields: [
      { key: "name", label: "Pricebook Name", type: "text" },
      {
        key: "isStandard",
        label: "Standard Pricebook",
        type: "badge",
        render: (value) => (
          <Badge variant={value ? "default" : "outline"}>
            {value ? "Yes" : "No"}
          </Badge>
        ),
      },
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

export default function PricebookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const { data: pricebook, isLoading, error } = usePricebook(id);
  const { data: entriesData } = usePricebookEntries({ pricebookId: id });
  const deletePricebook = useDeletePricebook();

  const handleDelete = async () => {
    try {
      await deletePricebook.mutateAsync(id);
      toast({
        title: "Pricebook Deleted",
        description: "The pricebook has been successfully deleted.",
        variant: "success",
      });
      router.push("/pricebooks");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete pricebook.",
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
        title={pricebook?.name || "Price Book"}
        objectName="Price Book"
        record={pricebook ? (pricebook as unknown as Record<string, unknown>) : null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/pricebooks"
        editHref={`/pricebooks/${id}/edit`}
        onDelete={pricebook?.isStandard ? undefined : () => setShowDeleteModal(true)}
        headerBadge={
          pricebook ? (
            <Badge variant={pricebook.isActive ? "default" : "secondary"}>
              {pricebook.isActive ? "Active" : "Inactive"}
            </Badge>
          ) : undefined
        }
        systemInfo={{
          createdAt: pricebook?.createdAt,
          updatedAt: pricebook?.updatedAt,
        }}
        relatedLists={
          <RelatedList
            title="Pricebook Entries"
            objectName="Pricebook Entries"
            columns={[
              {
                key: "productName",
                label: "Product",
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
            emptyMessage="No products in this pricebook"
          />
        }
      />

      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Pricebook"
        description="Are you sure you want to delete this pricebook? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePricebook.isPending}
            >
              {deletePricebook.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />
    </>
  );
}
