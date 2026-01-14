"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import {
  useOrder,
  useDeleteOrder,
  useActivateOrder,
  useFulfillOrder,
  useCancelOrder,
  useOrderItems,
  useCreateOrderItem,
  useDeleteOrderItem,
} from "@/lib/api/orders";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import { LineItemsSection } from "@/components/organisms/LineItemsSection";
import * as React from "react";
import Link from "next/link";
import { CheckCircle, XCircle, PlayCircle, Package, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

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

const sections: Section[] = [
  {
    title: "Order Information",
    fields: [
      { key: "orderNumber", label: "Order Number", type: "text" },
      { key: "name", label: "Order Name", type: "text" },
      { key: "accountName", label: "Account", type: "reference" },
      { key: "opportunityName", label: "Opportunity", type: "reference" },
      {
        key: "orderType",
        label: "Order Type",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={orderTypeColors[String(value)] || "outline"}>
              {String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "status",
        label: "Status",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={statusColors[String(value)] || "outline"}>
              {String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      { key: "totalAmount", label: "Total Amount", type: "currency" },
      { key: "orderDate", label: "Order Date", type: "date" },
      { key: "effectiveDate", label: "Effective Date", type: "date" },
      { key: "ownerName", label: "Owner", type: "text" },
    ],
  },
  {
    title: "Billing Address",
    collapsible: true,
    fields: [
      { key: "billingAddress.street", label: "Street", type: "text" },
      { key: "billingAddress.city", label: "City", type: "text" },
      { key: "billingAddress.state", label: "State", type: "text" },
      { key: "billingAddress.postalCode", label: "Postal Code", type: "text" },
      { key: "billingAddress.country", label: "Country", type: "text" },
    ],
  },
  {
    title: "Shipping Address",
    collapsible: true,
    fields: [
      { key: "shippingAddress.street", label: "Street", type: "text" },
      { key: "shippingAddress.city", label: "City", type: "text" },
      { key: "shippingAddress.state", label: "State", type: "text" },
      { key: "shippingAddress.postalCode", label: "Postal Code", type: "text" },
      { key: "shippingAddress.country", label: "Country", type: "text" },
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

interface StatusPathProps {
  currentStatus: string;
  onActivate: () => void;
  onFulfill: () => void;
  onCancel: () => void;
  isActivating: boolean;
  isFulfilling: boolean;
  isCancelling: boolean;
}

function StatusPath({
  currentStatus,
  onActivate,
  onFulfill,
  onCancel,
  isActivating,
  isFulfilling,
  isCancelling,
}: StatusPathProps) {
  const statuses = ["Draft", "Activated", "Fulfilled"];
  const currentIndex = statuses.indexOf(currentStatus);

  if (currentStatus === "Cancelled") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border bg-card p-4">
        <XCircle className="h-6 w-6 text-destructive" />
        <span className="text-lg font-semibold text-destructive">Cancelled</span>
      </div>
    );
  }

  if (currentStatus === "Fulfilled") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border bg-card p-4">
        <CheckCircle className="h-6 w-6 text-green-600" />
        <span className="text-lg font-semibold text-green-600">Fulfilled</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        {statuses.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <React.Fragment key={status}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : status === "Draft" ? (
                    <span className="text-sm">1</span>
                  ) : status === "Activated" ? (
                    <PlayCircle className="h-5 w-5" />
                  ) : (
                    <Package className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm",
                    isCurrent && "font-semibold text-primary",
                    !isCurrent && "text-muted-foreground"
                  )}
                >
                  {status}
                </span>
              </div>
              {index < statuses.length - 1 && (
                <div
                  className={cn(
                    "flex-1 border-t-2",
                    index < currentIndex ? "border-primary" : "border-muted-foreground/30"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex justify-center gap-2">
        {currentStatus === "Draft" && (
          <>
            <Button onClick={onActivate} disabled={isActivating}>
              <PlayCircle className="mr-2 h-4 w-4" />
              {isActivating ? "Activating..." : "Activate Order"}
            </Button>
            <Button variant="destructive" onClick={onCancel} disabled={isCancelling}>
              <Ban className="mr-2 h-4 w-4" />
              {isCancelling ? "Cancelling..." : "Cancel Order"}
            </Button>
          </>
        )}
        {currentStatus === "Activated" && (
          <>
            <Button onClick={onFulfill} disabled={isFulfilling}>
              <Package className="mr-2 h-4 w-4" />
              {isFulfilling ? "Fulfilling..." : "Fulfill Order"}
            </Button>
            <Button variant="destructive" onClick={onCancel} disabled={isCancelling}>
              <Ban className="mr-2 h-4 w-4" />
              {isCancelling ? "Cancelling..." : "Cancel Order"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const { data: order, isLoading, error } = useOrder(id);
  const { data: orderItemsData, isLoading: orderItemsLoading } = useOrderItems(id);
  const deleteOrder = useDeleteOrder();
  const activateOrder = useActivateOrder();
  const fulfillOrder = useFulfillOrder();
  const cancelOrder = useCancelOrder();
  const createOrderItem = useCreateOrderItem();
  const deleteOrderItem = useDeleteOrderItem();

  const orderItems = orderItemsData?.records || [];
  const isDraft = order?.status === "Draft";
  const isClosed = order?.status === "Fulfilled" || order?.status === "Cancelled";

  const handleDelete = async () => {
    try {
      await deleteOrder.mutateAsync(id);
      toast({
        title: "Order Deleted",
        description: "The order has been successfully deleted.",
        variant: "success",
      });
      router.push("/orders");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete order.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  const handleActivate = async () => {
    try {
      await activateOrder.mutateAsync(id);
      toast({
        title: "Order Activated",
        description: "The order has been activated.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to activate order.",
        variant: "error",
      });
    }
  };

  const handleFulfill = async () => {
    try {
      await fulfillOrder.mutateAsync(id);
      toast({
        title: "Order Fulfilled",
        description: "The order has been fulfilled.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fulfill order.",
        variant: "error",
      });
    }
  };

  const handleCancel = async () => {
    try {
      await cancelOrder.mutateAsync(id);
      toast({
        title: "Order Cancelled",
        description: "The order has been cancelled.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel order.",
        variant: "error",
      });
    }
  };

  const handleDeleteOrderItem = async (item: { id: string }) => {
    try {
      await deleteOrderItem.mutateAsync({
        id: item.id,
        orderId: id,
      });
      toast({
        title: "Order Item Deleted",
        description: "The order item has been deleted.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete order item.",
        variant: "error",
      });
    }
  };

  return (
    <>
      <DetailPageTemplate
        title={order?.name || "Order"}
        subtitle={order?.orderNumber}
        objectName="Order"
        record={order ? (order as unknown as Record<string, unknown>) : null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/orders"
        editHref={isDraft ? `/orders/${id}/edit` : undefined}
        onDelete={isDraft ? () => setShowDeleteModal(true) : undefined}
        headerBadge={
          order?.status ? (
            <Badge
              variant={statusColors[order.status] || "outline"}
              className={cn(
                order.status === "Fulfilled" && "bg-green-600 hover:bg-green-600/80"
              )}
            >
              {order.status === "Fulfilled" && <CheckCircle className="mr-1 h-3 w-3" />}
              {order.status === "Cancelled" && <XCircle className="mr-1 h-3 w-3" />}
              {order.status}
            </Badge>
          ) : undefined
        }
        headerActions={
          order?.accountId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/accounts/${order.accountId}`}>View Account</Link>
            </Button>
          ) : undefined
        }
        systemInfo={{
          createdAt: order?.createdAt,
          createdBy: order?.createdByName,
          updatedAt: order?.updatedAt,
          updatedBy: order?.lastModifiedByName,
        }}
        additionalContent={
          order ? (
            <>
              <div className="mb-6">
                <h3 className="mb-3 font-semibold">Order Status</h3>
                <StatusPath
                  currentStatus={order.status}
                  onActivate={handleActivate}
                  onFulfill={handleFulfill}
                  onCancel={handleCancel}
                  isActivating={activateOrder.isPending}
                  isFulfilling={fulfillOrder.isPending}
                  isCancelling={cancelOrder.isPending}
                />
              </div>
              <div className="mb-6">
                <LineItemsSection
                  title="Order Items"
                  items={orderItems.map((item) => ({
                    id: item.id,
                    productName: item.productName,
                    productCode: item.productCode,
                    quantity: item.quantity,
                    unitPrice: item.customerUnitPrice || item.unitPrice,
                    discount: item.discount,
                    totalPrice: item.totalPrice,
                    description: item.description,
                    termMonths: item.termMonths,
                    billingFrequency: item.billingFrequency,
                    startDate: item.startDate,
                    endDate: item.endDate,
                  }))}
                  isLoading={orderItemsLoading}
                  onAdd={isDraft ? () => router.push(`/orders/${id}/items/new`) : undefined}
                  onDelete={isDraft ? handleDeleteOrderItem : undefined}
                  emptyMessage="No order items added yet"
                  showSubscriptionFields
                />
              </div>
            </>
          ) : undefined
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Order"
        description="Are you sure you want to delete this order? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteOrder.isPending}
            >
              {deleteOrder.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />
    </>
  );
}
