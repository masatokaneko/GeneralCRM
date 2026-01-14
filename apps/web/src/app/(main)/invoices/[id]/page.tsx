"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import {
  useInvoice,
  useDeleteInvoice,
  useSendInvoice,
  useRecordPayment,
  useMarkOverdue,
  useCancelInvoice,
  useVoidInvoice,
  useInvoiceLineItems,
  useDeleteInvoiceLineItem,
} from "@/lib/api/invoices";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import { LineItemsSection } from "@/components/organisms/LineItemsSection";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import * as React from "react";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Send,
  Clock,
  DollarSign,
  Ban,
  FileX,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Draft: "outline",
  Sent: "secondary",
  Paid: "default",
  PartialPaid: "secondary",
  Overdue: "destructive",
  Cancelled: "secondary",
  Void: "destructive",
};

const sections: Section[] = [
  {
    title: "Invoice Information",
    fields: [
      { key: "invoiceNumber", label: "Invoice Number", type: "text" },
      { key: "accountName", label: "Account", type: "reference" },
      { key: "contractName", label: "Contract", type: "reference" },
      {
        key: "status",
        label: "Status",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={statusColors[String(value)] || "outline"}>
              {String(value) === "PartialPaid" ? "Partial Paid" : String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      { key: "invoiceDate", label: "Invoice Date", type: "date" },
      { key: "dueDate", label: "Due Date", type: "date" },
      { key: "billingPeriodStart", label: "Billing Period Start", type: "date" },
      { key: "billingPeriodEnd", label: "Billing Period End", type: "date" },
    ],
  },
  {
    title: "Financial Summary",
    fields: [
      { key: "subtotal", label: "Subtotal", type: "currency" },
      { key: "taxAmount", label: "Tax Amount", type: "currency" },
      { key: "totalAmount", label: "Total Amount", type: "currency" },
      { key: "paidAmount", label: "Paid Amount", type: "currency" },
      { key: "balanceDue", label: "Balance Due", type: "currency" },
    ],
  },
  {
    title: "Notes",
    collapsible: true,
    fields: [{ key: "notes", label: "Notes", type: "text", colSpan: 2 }],
  },
];

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number) => void;
  isPending: boolean;
  balanceDue: number;
}

function RecordPaymentModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  balanceDue,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = React.useState("");

  const handleSubmit = () => {
    const numAmount = Number.parseFloat(amount);
    if (numAmount > 0) {
      onSubmit(numAmount);
    }
  };

  React.useEffect(() => {
    if (open) {
      setAmount(balanceDue.toString());
    }
  }, [open, balanceDue]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Record Payment"
      description="Enter the payment amount received"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !amount || Number(amount) <= 0}>
            {isPending ? "Recording..." : "Record Payment"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="paymentAmount">Payment Amount</Label>
          <Input
            id="paymentAmount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter payment amount"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Balance Due:{" "}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(balanceDue)}
        </div>
      </div>
    </Modal>
  );
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);

  const { data: invoice, isLoading, error } = useInvoice(id);
  const { data: lineItemsData, isLoading: lineItemsLoading } = useInvoiceLineItems(id);
  const deleteInvoice = useDeleteInvoice();
  const sendInvoice = useSendInvoice();
  const recordPayment = useRecordPayment();
  const markOverdue = useMarkOverdue();
  const cancelInvoice = useCancelInvoice();
  const voidInvoice = useVoidInvoice();
  const deleteLineItem = useDeleteInvoiceLineItem();

  const lineItems = lineItemsData?.records || [];
  const isDraft = invoice?.status === "Draft";
  const canRecordPayment =
    invoice?.status === "Sent" ||
    invoice?.status === "PartialPaid" ||
    invoice?.status === "Overdue";

  const handleDelete = async () => {
    try {
      await deleteInvoice.mutateAsync(id);
      toast({
        title: "Invoice Deleted",
        description: "The invoice has been successfully deleted.",
        variant: "success",
      });
      router.push("/invoices");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete invoice.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  const handleSend = async () => {
    try {
      await sendInvoice.mutateAsync(id);
      toast({
        title: "Invoice Sent",
        description: "The invoice has been marked as sent.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send invoice.",
        variant: "error",
      });
    }
  };

  const handleRecordPayment = async (amount: number) => {
    try {
      await recordPayment.mutateAsync({ id, amount });
      toast({
        title: "Payment Recorded",
        description: "The payment has been recorded successfully.",
        variant: "success",
      });
      setShowPaymentModal(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to record payment.",
        variant: "error",
      });
    }
  };

  const handleMarkOverdue = async () => {
    try {
      await markOverdue.mutateAsync(id);
      toast({
        title: "Marked as Overdue",
        description: "The invoice has been marked as overdue.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to mark as overdue.",
        variant: "error",
      });
    }
  };

  const handleCancel = async () => {
    try {
      await cancelInvoice.mutateAsync(id);
      toast({
        title: "Invoice Cancelled",
        description: "The invoice has been cancelled.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel invoice.",
        variant: "error",
      });
    }
  };

  const handleVoid = async () => {
    try {
      await voidInvoice.mutateAsync(id);
      toast({
        title: "Invoice Voided",
        description: "The invoice has been voided.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to void invoice.",
        variant: "error",
      });
    }
  };

  const handleDeleteLineItem = async (item: { id: string }) => {
    try {
      await deleteLineItem.mutateAsync({
        id: item.id,
        invoiceId: id,
      });
      toast({
        title: "Line Item Deleted",
        description: "The invoice line item has been deleted.",
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Draft":
        return <Clock className="h-4 w-4" />;
      case "Sent":
        return <Send className="h-4 w-4" />;
      case "Paid":
        return <CheckCircle className="h-4 w-4" />;
      case "PartialPaid":
        return <DollarSign className="h-4 w-4" />;
      case "Overdue":
        return <AlertTriangle className="h-4 w-4" />;
      case "Cancelled":
        return <Ban className="h-4 w-4" />;
      case "Void":
        return <FileX className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <>
      <DetailPageTemplate
        title={invoice?.invoiceNumber || "Invoice"}
        subtitle={invoice?.accountName}
        objectName="Invoice"
        record={invoice ? (invoice as unknown as Record<string, unknown>) : null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/invoices"
        editHref={isDraft ? `/invoices/${id}/edit` : undefined}
        onDelete={isDraft ? () => setShowDeleteModal(true) : undefined}
        headerBadge={
          invoice?.status ? (
            <Badge
              variant={statusColors[invoice.status] || "outline"}
              className={cn(
                invoice.status === "Paid" && "bg-green-600 hover:bg-green-600/80"
              )}
            >
              {getStatusIcon(invoice.status)}
              <span className="ml-1">
                {invoice.status === "PartialPaid" ? "Partial Paid" : invoice.status}
              </span>
            </Badge>
          ) : undefined
        }
        headerActions={
          invoice?.accountId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/accounts/${invoice.accountId}`}>View Account</Link>
            </Button>
          ) : undefined
        }
        systemInfo={{
          createdAt: invoice?.createdAt,
          createdBy: invoice?.createdByName,
          updatedAt: invoice?.updatedAt,
          updatedBy: invoice?.lastModifiedByName,
        }}
        additionalContent={
          invoice ? (
            <>
              {/* Action Buttons */}
              <div className="mb-6 rounded-lg border bg-card p-4">
                <h3 className="mb-3 font-semibold">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {isDraft && (
                    <>
                      <Button onClick={handleSend} disabled={sendInvoice.isPending}>
                        <Send className="mr-2 h-4 w-4" />
                        {sendInvoice.isPending ? "Sending..." : "Send Invoice"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={cancelInvoice.isPending}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        {cancelInvoice.isPending ? "Cancelling..." : "Cancel"}
                      </Button>
                    </>
                  )}
                  {invoice.status === "Sent" && (
                    <>
                      <Button onClick={() => setShowPaymentModal(true)}>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Record Payment
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleMarkOverdue}
                        disabled={markOverdue.isPending}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {markOverdue.isPending ? "Processing..." : "Mark Overdue"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={cancelInvoice.isPending}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        {cancelInvoice.isPending ? "Cancelling..." : "Cancel"}
                      </Button>
                    </>
                  )}
                  {canRecordPayment && invoice.status !== "Sent" && (
                    <Button onClick={() => setShowPaymentModal(true)}>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Record Payment
                    </Button>
                  )}
                  {invoice.status !== "Void" && invoice.status !== "Cancelled" && (
                    <Button
                      variant="destructive"
                      onClick={handleVoid}
                      disabled={voidInvoice.isPending}
                    >
                      <FileX className="mr-2 h-4 w-4" />
                      {voidInvoice.isPending ? "Voiding..." : "Void Invoice"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <LineItemsSection
                  title="Invoice Line Items"
                  items={lineItems.map((item) => ({
                    id: item.id,
                    productName: item.productName,
                    productCode: item.productCode,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: 0,
                    totalPrice: item.amount,
                    description: item.description,
                  }))}
                  isLoading={lineItemsLoading}
                  onAdd={isDraft ? () => router.push(`/invoices/${id}/line-items/new`) : undefined}
                  onDelete={isDraft ? handleDeleteLineItem : undefined}
                  emptyMessage="No invoice line items added yet"
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
        title="Delete Invoice"
        description="Are you sure you want to delete this invoice? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        onSubmit={handleRecordPayment}
        isPending={recordPayment.isPending}
        balanceDue={invoice?.balanceDue || 0}
      />
    </>
  );
}
