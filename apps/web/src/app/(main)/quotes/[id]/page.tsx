"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import {
  useQuote,
  useDeleteQuote,
  useSetPrimaryQuote,
  useChangeQuoteStatus,
} from "@/lib/api/quotes";
import {
  useQuoteLineItems,
  useCreateQuoteLineItem,
  useDeleteQuoteLineItem,
} from "@/lib/api/lineItems";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import { LineItemsSection } from "@/components/organisms/LineItemsSection";
import { AddQuoteLineItemModal } from "@/components/organisms/AddQuoteLineItemModal";
import * as React from "react";
import Link from "next/link";
import { Star, FileText, CheckCircle, XCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

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

const sections: Section[] = [
  {
    title: "Quote Information",
    fields: [
      { key: "name", label: "Quote Name", type: "text" },
      { key: "opportunityName", label: "Opportunity", type: "reference" },
      {
        key: "status",
        label: "Status",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={statusColors[String(value)] || "outline"}>
              {statusIcons[String(value)]}
              {String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "isPrimary",
        label: "Primary Quote",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant="default" className="bg-yellow-600">
              <Star className="mr-1 h-3 w-3" />
              Primary
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "expirationDate",
        label: "Expiration Date",
        type: "date",
      },
      { key: "ownerName", label: "Owner", type: "text" },
    ],
  },
  {
    title: "Pricing",
    fields: [
      { key: "subtotal", label: "Subtotal", type: "currency" },
      {
        key: "discount",
        label: "Discount",
        type: "custom",
        render: (value) =>
          value ? (
            <span className="text-destructive">
              -{new Intl.NumberFormat("ja-JP", {
                style: "currency",
                currency: "JPY",
                maximumFractionDigits: 0,
              }).format(Number(value))}
            </span>
          ) : (
            "-"
          ),
      },
      { key: "totalPrice", label: "Total Price", type: "currency" },
      { key: "taxAmount", label: "Tax Amount", type: "currency" },
      {
        key: "grandTotal",
        label: "Grand Total",
        type: "custom",
        render: (value) =>
          value ? (
            <span className="text-lg font-bold">
              {new Intl.NumberFormat("ja-JP", {
                style: "currency",
                currency: "JPY",
                maximumFractionDigits: 0,
              }).format(Number(value))}
            </span>
          ) : (
            "-"
          ),
      },
    ],
  },
  {
    title: "Billing Address",
    collapsible: true,
    fields: [
      { key: "billingStreet", label: "Street", type: "text", colSpan: 2 },
      { key: "billingCity", label: "City", type: "text" },
      { key: "billingState", label: "State/Province", type: "text" },
      { key: "billingPostalCode", label: "Postal Code", type: "text" },
      { key: "billingCountry", label: "Country", type: "text" },
    ],
  },
  {
    title: "Shipping Address",
    collapsible: true,
    fields: [
      { key: "shippingStreet", label: "Street", type: "text", colSpan: 2 },
      { key: "shippingCity", label: "City", type: "text" },
      { key: "shippingState", label: "State/Province", type: "text" },
      { key: "shippingPostalCode", label: "Postal Code", type: "text" },
      { key: "shippingCountry", label: "Country", type: "text" },
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

interface StatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  onStatusChange: (status: "Draft" | "Presented" | "Accepted" | "Rejected") => void;
  isChanging: boolean;
}

function StatusModal({
  open,
  onOpenChange,
  currentStatus,
  onStatusChange,
  isChanging,
}: StatusModalProps) {
  const statuses: Array<{ value: "Draft" | "Presented" | "Accepted" | "Rejected"; label: string }> = [
    { value: "Draft", label: "Draft" },
    { value: "Presented", label: "Presented" },
    { value: "Accepted", label: "Accepted" },
    { value: "Rejected", label: "Rejected" },
  ];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Change Quote Status"
      description="Select a new status for this quote."
    >
      <div className="grid grid-cols-2 gap-3">
        {statuses.map((status) => (
          <button
            key={status.value}
            type="button"
            disabled={isChanging || status.value === currentStatus}
            onClick={() => onStatusChange(status.value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border p-4 transition-colors",
              "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
              status.value === currentStatus && "border-primary bg-primary/5"
            )}
          >
            <Badge variant={statusColors[status.value]}>
              {statusIcons[status.value]}
              {status.label}
            </Badge>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showStatusModal, setShowStatusModal] = React.useState(false);
  const [showAddLineItemModal, setShowAddLineItemModal] = React.useState(false);

  const { data: quote, isLoading, error } = useQuote(id);
  const { data: lineItemsData, isLoading: lineItemsLoading } = useQuoteLineItems(id);
  const deleteQuote = useDeleteQuote();
  const setPrimaryQuote = useSetPrimaryQuote();
  const changeStatus = useChangeQuoteStatus();
  const createLineItem = useCreateQuoteLineItem();
  const deleteLineItem = useDeleteQuoteLineItem();

  const lineItems = lineItemsData?.records || [];

  const handleDelete = async () => {
    try {
      await deleteQuote.mutateAsync(id);
      toast({
        title: "Quote Deleted",
        description: "The quote has been successfully deleted.",
        variant: "success",
      });
      router.push("/quotes");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete quote.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  const handleSetPrimary = async () => {
    if (!quote?.opportunityId) return;
    try {
      await setPrimaryQuote.mutateAsync({
        id,
        opportunityId: quote.opportunityId,
      });
      toast({
        title: "Primary Quote Set",
        description: "This quote is now the primary quote for the opportunity.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to set as primary quote.",
        variant: "error",
      });
    }
  };

  const handleStatusChange = async (status: "Draft" | "Presented" | "Accepted" | "Rejected") => {
    try {
      await changeStatus.mutateAsync({ id, status });
      toast({
        title: "Status Updated",
        description: `Quote status changed to ${status}.`,
        variant: "success",
      });
      setShowStatusModal(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "error",
      });
    }
  };

  const handleAddLineItem = async (data: {
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    description?: string;
  }) => {
    try {
      await createLineItem.mutateAsync({
        quoteId: id,
        data,
      });
      toast({
        title: "Line Item Added",
        description: "The line item has been added successfully.",
        variant: "success",
      });
      setShowAddLineItemModal(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to add line item.",
        variant: "error",
      });
    }
  };

  const handleDeleteLineItem = async (item: { id: string }) => {
    try {
      await deleteLineItem.mutateAsync({
        id: item.id,
        quoteId: id,
      });
      toast({
        title: "Line Item Deleted",
        description: "The line item has been deleted.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete line item.",
        variant: "error",
      });
    }
  };

  // Flatten address fields for display
  const recordWithAddresses = quote
    ? {
        ...quote,
        billingStreet: quote.billingAddress?.street,
        billingCity: quote.billingAddress?.city,
        billingState: quote.billingAddress?.state,
        billingPostalCode: quote.billingAddress?.postalCode,
        billingCountry: quote.billingAddress?.country,
        shippingStreet: quote.shippingAddress?.street,
        shippingCity: quote.shippingAddress?.city,
        shippingState: quote.shippingAddress?.state,
        shippingPostalCode: quote.shippingAddress?.postalCode,
        shippingCountry: quote.shippingAddress?.country,
      }
    : null;

  return (
    <>
      <DetailPageTemplate
        title={quote?.name || "Quote"}
        subtitle={quote?.opportunityId ? `Opportunity: ${quote.opportunityId}` : undefined}
        objectName="Quote"
        record={recordWithAddresses as Record<string, unknown> | null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/quotes"
        editHref={quote?.status === "Draft" ? `/quotes/${id}/edit` : undefined}
        onDelete={() => setShowDeleteModal(true)}
        headerBadge={
          quote?.status ? (
            <Badge
              variant={statusColors[quote.status] || "outline"}
              className={cn(quote.status === "Accepted" && "bg-green-600")}
            >
              {statusIcons[quote.status]}
              {quote.status}
            </Badge>
          ) : undefined
        }
        headerActions={
          quote ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowStatusModal(true)}>
                Change Status
              </Button>
              {!quote.isPrimary && (
                <Button
                  variant="outline"
                  onClick={handleSetPrimary}
                  disabled={setPrimaryQuote.isPending}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Set as Primary
                </Button>
              )}
              {quote.opportunityId && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/opportunities/${quote.opportunityId}`}>View Opportunity</Link>
                </Button>
              )}
            </div>
          ) : undefined
        }
        systemInfo={{
          createdAt: quote?.createdAt,
          createdBy: quote?.createdByName,
          updatedAt: quote?.updatedAt,
          updatedBy: quote?.lastModifiedByName,
        }}
        additionalContent={
          quote ? (
            <div className="mb-6">
              <LineItemsSection
                title="Line Items"
                items={lineItems.map((item) => ({
                  id: item.id,
                  name: item.name,
                  productName: item.productName,
                  productCode: item.productCode,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  discount: item.discount,
                  totalPrice: item.totalPrice,
                  description: item.description,
                }))}
                isLoading={lineItemsLoading}
                onAdd={quote.status === "Draft" ? () => setShowAddLineItemModal(true) : undefined}
                onDelete={quote.status === "Draft" ? handleDeleteLineItem : undefined}
                emptyMessage="No line items added yet"
              />
            </div>
          ) : undefined
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Quote"
        description="Are you sure you want to delete this quote? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteQuote.isPending}
            >
              {deleteQuote.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />

      {/* Status Change Modal */}
      <StatusModal
        open={showStatusModal}
        onOpenChange={setShowStatusModal}
        currentStatus={quote?.status || "Draft"}
        onStatusChange={handleStatusChange}
        isChanging={changeStatus.isPending}
      />

      {/* Add Line Item Modal */}
      <AddQuoteLineItemModal
        open={showAddLineItemModal}
        onOpenChange={setShowAddLineItemModal}
        onSubmit={handleAddLineItem}
        isLoading={createLineItem.isPending}
      />
    </>
  );
}
