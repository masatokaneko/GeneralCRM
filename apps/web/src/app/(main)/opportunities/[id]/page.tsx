"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import {
  useOpportunity,
  useDeleteOpportunity,
  useChangeOpportunityStage,
  useCloseOpportunity,
} from "@/lib/api/opportunities";
import {
  useOpportunityLineItems,
  useCreateOpportunityLineItem,
  useDeleteOpportunityLineItem,
} from "@/lib/api/lineItems";
import { useQuotesByOpportunity } from "@/lib/api/quotes";
import { useOrdersByOpportunity } from "@/lib/api/orders";
import { useTasks } from "@/lib/api/tasks";
import { useEvents } from "@/lib/api/events";
import {
  useOpportunityContactRoles,
  useCreateOpportunityContactRole,
  useDeleteOpportunityContactRole,
} from "@/lib/api/opportunityContactRoles";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import { RelatedList } from "@/components/organisms/RelatedList";
import { LineItemsSection } from "@/components/organisms/LineItemsSection";
import { AddLineItemModal } from "@/components/organisms/AddLineItemModal";
import { Label } from "@/components/atoms/Label";
import * as React from "react";
import Link from "next/link";
import { CheckCircle, XCircle, ArrowRight, TrendingUp, UserCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { name: "Prospecting", probability: 10 },
  { name: "Qualification", probability: 20 },
  { name: "Needs Analysis", probability: 30 },
  { name: "Value Proposition", probability: 50 },
  { name: "Proposal/Price Quote", probability: 75 },
  { name: "Negotiation/Review", probability: 90 },
  { name: "Closed Won", probability: 100, isClosed: true, isWon: true },
  { name: "Closed Lost", probability: 0, isClosed: true, isWon: false },
];

const stageColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Prospecting: "outline",
  Qualification: "outline",
  "Needs Analysis": "secondary",
  "Value Proposition": "secondary",
  "Proposal/Price Quote": "default",
  "Negotiation/Review": "default",
  "Closed Won": "default",
  "Closed Lost": "destructive",
};

const forecastColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Pipeline: "outline",
  "Best Case": "secondary",
  Commit: "default",
  Closed: "default",
};

const sections: Section[] = [
  {
    title: "Opportunity Information",
    fields: [
      { key: "name", label: "Opportunity Name", type: "text" },
      { key: "accountName", label: "Account", type: "reference" },
      {
        key: "stageName",
        label: "Stage",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={stageColors[String(value)] || "outline"}>
              {String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "probability",
        label: "Probability",
        type: "custom",
        render: (value) => (value !== undefined ? `${value}%` : "-"),
      },
      {
        key: "amount",
        label: "Amount",
        type: "currency",
      },
      {
        key: "closeDate",
        label: "Close Date",
        type: "date",
      },
      {
        key: "forecastCategory",
        label: "Forecast Category",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={forecastColors[String(value)] || "outline"}>
              {String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      { key: "type", label: "Type", type: "text" },
      { key: "leadSource", label: "Lead Source", type: "text" },
      { key: "nextStep", label: "Next Step", type: "text" },
      { key: "ownerName", label: "Owner", type: "text" },
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

interface StagePathProps {
  currentStage: string;
  isClosed: boolean;
  isWon: boolean;
  onStageClick: (stageName: string) => void;
  disabled?: boolean;
}

function StagePath({ currentStage, isClosed, isWon, onStageClick, disabled }: StagePathProps) {
  const openStages = STAGES.filter((s) => !s.isClosed);
  const currentIndex = openStages.findIndex((s) => s.name === currentStage);

  if (isClosed) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border bg-card p-4">
        {isWon ? (
          <>
            <CheckCircle className="h-6 w-6 text-green-600" />
            <span className="text-lg font-semibold text-green-600">Closed Won</span>
          </>
        ) : (
          <>
            <XCircle className="h-6 w-6 text-destructive" />
            <span className="text-lg font-semibold text-destructive">Closed Lost</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        {openStages.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <React.Fragment key={stage.name}>
              <button
                type="button"
                disabled={disabled || isCurrent}
                onClick={() => onStageClick(stage.name)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md p-2 transition-colors",
                  "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
                  isCurrent && "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isCurrent && "border-primary bg-background text-primary",
                    !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span>{stage.probability}%</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    isCurrent && "font-semibold text-primary",
                    !isCurrent && "text-muted-foreground"
                  )}
                >
                  {stage.name}
                </span>
              </button>
              {index < openStages.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

interface CloseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: (isWon: boolean, lostReason?: string) => void;
  isClosing: boolean;
}

function CloseModal({ open, onOpenChange, onClose, isClosing }: CloseModalProps) {
  const [closeType, setCloseType] = React.useState<"won" | "lost">("won");
  const [lostReason, setLostReason] = React.useState("");

  const handleClose = () => {
    onClose(closeType === "won", closeType === "lost" ? lostReason : undefined);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Close Opportunity"
      description="Select the outcome of this opportunity."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isClosing}>
            Cancel
          </Button>
          <Button onClick={handleClose} disabled={isClosing}>
            {isClosing ? "Closing..." : "Close Opportunity"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-4">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
            <input
              type="radio"
              name="closeType"
              checked={closeType === "won"}
              onChange={() => setCloseType("won")}
              className="sr-only"
            />
            <div
              className={cn(
                "flex flex-col items-center gap-2",
                closeType === "won" && "text-green-600"
              )}
            >
              <CheckCircle className="h-8 w-8" />
              <span className="font-medium">Closed Won</span>
            </div>
          </label>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-4 transition-colors hover:bg-muted">
            <input
              type="radio"
              name="closeType"
              checked={closeType === "lost"}
              onChange={() => setCloseType("lost")}
              className="sr-only"
            />
            <div
              className={cn(
                "flex flex-col items-center gap-2",
                closeType === "lost" && "text-destructive"
              )}
            >
              <XCircle className="h-8 w-8" />
              <span className="font-medium">Closed Lost</span>
            </div>
          </label>
        </div>

        {closeType === "lost" && (
          <div className="space-y-2">
            <Label htmlFor="lostReason">Lost Reason</Label>
            <select
              id="lostReason"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a reason...</option>
              <option value="Price">Price</option>
              <option value="Competitor">Lost to Competitor</option>
              <option value="No Budget">No Budget</option>
              <option value="No Decision">No Decision / Non-Responsive</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showCloseModal, setShowCloseModal] = React.useState(false);
  const [showAddLineItemModal, setShowAddLineItemModal] = React.useState(false);

  const { data: opportunity, isLoading, error } = useOpportunity(id);
  const { data: lineItemsData, isLoading: lineItemsLoading } = useOpportunityLineItems(id);
  const { data: quotesData } = useQuotesByOpportunity(id);
  const { data: ordersData } = useOrdersByOpportunity(id);
  const { data: tasksData } = useTasks({ whatType: "Opportunity", whatId: id });
  const { data: eventsData } = useEvents({ whatType: "Opportunity", whatId: id });
  const { data: contactRolesData } = useOpportunityContactRoles(id);
  const deleteOpportunity = useDeleteOpportunity();
  const deleteContactRole = useDeleteOpportunityContactRole();
  const changeStage = useChangeOpportunityStage();
  const closeOpportunity = useCloseOpportunity();
  const createLineItem = useCreateOpportunityLineItem();
  const deleteLineItem = useDeleteOpportunityLineItem();

  const lineItems = lineItemsData?.records || [];

  const formatCurrency = (amount: number | undefined | null) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date: string | undefined | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ja-JP");
  };

  const formatDateTime = (dateTime: string | undefined | null) => {
    if (!dateTime) return "-";
    return new Date(dateTime).toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = async () => {
    try {
      await deleteOpportunity.mutateAsync(id);
      toast({
        title: "Opportunity Deleted",
        description: "The opportunity has been successfully deleted.",
        variant: "success",
      });
      router.push("/opportunities");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete opportunity.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  const handleStageChange = async (stageName: string) => {
    try {
      await changeStage.mutateAsync({
        id,
        stageName,
        etag: opportunity?.systemModstamp,
      });
      toast({
        title: "Stage Updated",
        description: `Stage changed to ${stageName}.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update stage.",
        variant: "error",
      });
    }
  };

  const handleClose = async (isWon: boolean, lostReason?: string) => {
    try {
      await closeOpportunity.mutateAsync({
        id,
        isWon,
        lostReason,
      });
      toast({
        title: isWon ? "Opportunity Won!" : "Opportunity Lost",
        description: `The opportunity has been marked as ${isWon ? "won" : "lost"}.`,
        variant: isWon ? "success" : "info",
      });
      setShowCloseModal(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to close opportunity.",
        variant: "error",
      });
    }
  };

  const handleAddLineItem = async (data: {
    pricebookEntryId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    description?: string;
    termMonths?: number;
    billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
    startDate?: string;
  }) => {
    try {
      await createLineItem.mutateAsync({
        opportunityId: id,
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
        opportunityId: id,
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

  const handleDeleteContactRole = async (role: { id: string }) => {
    try {
      await deleteContactRole.mutateAsync({
        id: role.id,
        opportunityId: id,
      });
      toast({
        title: "Contact Role Removed",
        description: "The contact has been removed from this opportunity.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to remove contact role.",
        variant: "error",
      });
    }
  };

  const roleLabels: Record<string, string> = {
    DecisionMaker: "Decision Maker",
    Influencer: "Influencer",
    Evaluator: "Evaluator",
    Executive: "Executive",
    User: "User",
    Other: "Other",
  };

  const stanceColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    Support: "default",
    Neutral: "outline",
    Oppose: "destructive",
  };

  return (
    <>
      <DetailPageTemplate
        title={opportunity?.name || "Opportunity"}
        subtitle={opportunity?.accountName}
        objectName="Opportunity"
        record={opportunity ? (opportunity as unknown as Record<string, unknown>) : null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/opportunities"
        editHref={opportunity?.isClosed ? undefined : `/opportunities/${id}/edit`}
        onDelete={() => setShowDeleteModal(true)}
        headerBadge={
          opportunity?.stageName ? (
            <Badge
              variant={stageColors[opportunity.stageName] || "outline"}
              className={cn(
                opportunity.isClosed &&
                  opportunity.isWon &&
                  "bg-green-600 hover:bg-green-600/80"
              )}
            >
              {opportunity.isClosed && opportunity.isWon && (
                <CheckCircle className="mr-1 h-3 w-3" />
              )}
              {opportunity.isClosed && !opportunity.isWon && (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              {opportunity.stageName}
            </Badge>
          ) : undefined
        }
        headerActions={
          opportunity && !opportunity.isClosed ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCloseModal(true)}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Close Opportunity
              </Button>
              {opportunity.accountId && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/accounts/${opportunity.accountId}`}>View Account</Link>
                </Button>
              )}
            </div>
          ) : opportunity?.accountId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/accounts/${opportunity.accountId}`}>View Account</Link>
            </Button>
          ) : undefined
        }
        systemInfo={{
          createdAt: opportunity?.createdAt,
          createdBy: opportunity?.createdByName,
          updatedAt: opportunity?.updatedAt,
          updatedBy: opportunity?.lastModifiedByName,
        }}
        additionalContent={
          opportunity ? (
            <>
              <div className="mb-6">
                <h3 className="mb-3 font-semibold">Sales Path</h3>
                <StagePath
                  currentStage={opportunity.stageName}
                  isClosed={opportunity.isClosed}
                  isWon={opportunity.isWon}
                  onStageClick={handleStageChange}
                  disabled={changeStage.isPending}
                />
              </div>
              <div className="mb-6">
                <LineItemsSection
                  title="Products"
                  items={lineItems.map((item) => ({
                    id: item.id,
                    productName: item.productName,
                    productCode: item.productCode,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                    totalPrice: item.totalPrice,
                    description: item.description,
                    termMonths: item.termMonths,
                    billingFrequency: item.billingFrequency,
                    startDate: item.startDate,
                    endDate: item.endDate,
                  }))}
                  isLoading={lineItemsLoading}
                  onAdd={!opportunity.isClosed ? () => setShowAddLineItemModal(true) : undefined}
                  onDelete={!opportunity.isClosed ? handleDeleteLineItem : undefined}
                  emptyMessage="No products added yet"
                  showSubscriptionFields
                />
              </div>
            </>
          ) : undefined
        }
        relatedLists={
          <>
            <RelatedList
              title="Contact Roles"
              objectName="Contact Roles"
              columns={[
                {
                  key: "contactName",
                  label: "Contact",
                  render: (value, record) => (
                    <div className="flex items-center gap-2">
                      {record.isPrimary && (
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      )}
                      <span className="font-medium text-primary">{String(value || "-")}</span>
                    </div>
                  ),
                },
                {
                  key: "role",
                  label: "Role",
                  render: (value) => (
                    <Badge variant="secondary">{roleLabels[String(value)] || String(value)}</Badge>
                  ),
                },
                {
                  key: "contactTitle",
                  label: "Title",
                },
                {
                  key: "stance",
                  label: "Stance",
                  render: (value) =>
                    value ? (
                      <Badge variant={stanceColors[String(value)] || "outline"}>
                        {String(value)}
                      </Badge>
                    ) : (
                      "-"
                    ),
                },
                {
                  key: "influenceLevel",
                  label: "Influence",
                  render: (value) =>
                    value ? `Level ${value}` : "-",
                },
              ]}
              records={contactRolesData?.records || []}
              totalCount={contactRolesData?.totalSize}
              onRowClick={(role) => {
                if (role.contactId) {
                  router.push(`/contacts/${role.contactId}`);
                }
              }}
              emptyMessage="No contacts associated with this opportunity"
            />

            <RelatedList
              title="Quotes"
              objectName="Quotes"
              columns={[
                {
                  key: "name",
                  label: "Quote Name",
                  render: (value) => (
                    <span className="font-medium text-primary">{String(value)}</span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (value) => <Badge variant="outline">{String(value)}</Badge>,
                },
                {
                  key: "grandTotal",
                  label: "Total",
                  render: (value) => formatCurrency(value as number),
                },
                {
                  key: "expirationDate",
                  label: "Expires",
                  render: (value) => formatDate(value as string),
                },
              ]}
              records={quotesData?.records || []}
              totalCount={quotesData?.totalSize}
              onRowClick={(quote) => router.push(`/quotes/${quote.id}`)}
              createHref={`/quotes/new?opportunityId=${id}`}
              viewAllHref={`/quotes?opportunityId=${id}`}
              emptyMessage="No quotes for this opportunity"
            />

            <RelatedList
              title="Orders"
              objectName="Orders"
              columns={[
                {
                  key: "orderNumber",
                  label: "Order Number",
                  render: (value) => (
                    <span className="font-medium text-primary">{String(value)}</span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (value) => <Badge variant="outline">{String(value)}</Badge>,
                },
                {
                  key: "totalAmount",
                  label: "Total",
                  render: (value) => formatCurrency(value as number),
                },
                {
                  key: "orderDate",
                  label: "Order Date",
                  render: (value) => formatDate(value as string),
                },
              ]}
              records={ordersData?.records || []}
              totalCount={ordersData?.totalSize}
              onRowClick={(order) => router.push(`/orders/${order.id}`)}
              createHref={`/orders/new?opportunityId=${id}`}
              viewAllHref={`/orders?opportunityId=${id}`}
              emptyMessage="No orders for this opportunity"
            />

            <RelatedList
              title="Tasks"
              objectName="Tasks"
              columns={[
                {
                  key: "subject",
                  label: "Subject",
                  render: (value) => (
                    <span className="font-medium">{String(value)}</span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (value) => <Badge variant="outline">{String(value)}</Badge>,
                },
                { key: "priority", label: "Priority" },
                {
                  key: "dueDate",
                  label: "Due Date",
                  render: (value) => formatDate(value as string),
                },
              ]}
              records={tasksData?.records || []}
              totalCount={tasksData?.totalSize}
              onRowClick={(task) => router.push(`/tasks/${task.id}`)}
              createHref={`/tasks/new?whatType=Opportunity&whatId=${id}`}
              viewAllHref={`/tasks?whatType=Opportunity&whatId=${id}`}
              emptyMessage="No tasks for this opportunity"
            />

            <RelatedList
              title="Events"
              objectName="Events"
              columns={[
                {
                  key: "subject",
                  label: "Subject",
                  render: (value) => (
                    <span className="font-medium">{String(value)}</span>
                  ),
                },
                {
                  key: "startDateTime",
                  label: "Start",
                  render: (value) => formatDateTime(value as string),
                },
                {
                  key: "endDateTime",
                  label: "End",
                  render: (value) => formatDateTime(value as string),
                },
                { key: "location", label: "Location" },
              ]}
              records={eventsData?.records || []}
              totalCount={eventsData?.totalSize}
              onRowClick={(event) => router.push(`/events/${event.id}`)}
              createHref={`/events/new?whatType=Opportunity&whatId=${id}`}
              viewAllHref={`/events?whatType=Opportunity&whatId=${id}`}
              emptyMessage="No events for this opportunity"
            />
          </>
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Opportunity"
        description="Are you sure you want to delete this opportunity? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteOpportunity.isPending}
            >
              {deleteOpportunity.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />

      {/* Close Opportunity Modal */}
      <CloseModal
        open={showCloseModal}
        onOpenChange={setShowCloseModal}
        onClose={handleClose}
        isClosing={closeOpportunity.isPending}
      />

      {/* Add Line Item Modal */}
      <AddLineItemModal
        open={showAddLineItemModal}
        onOpenChange={setShowAddLineItemModal}
        pricebookId={opportunity?.pricebookId}
        onSubmit={handleAddLineItem}
        isLoading={createLineItem.isPending}
        showSubscriptionFields
      />
    </>
  );
}
