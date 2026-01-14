"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import {
  useContract,
  useDeleteContract,
  useSubmitContractForApproval,
  useActivateContract,
  useTerminateContract,
  useRenewContract,
  useContractLineItems,
  useDeleteContractLineItem,
} from "@/lib/api/contracts";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import { LineItemsSection } from "@/components/organisms/LineItemsSection";
import { PoolConsumptionsSection } from "@/components/organisms/PoolConsumptionsSection";
import { Label } from "@/components/atoms/Label";
import * as React from "react";
import Link from "next/link";
import { CheckCircle, XCircle, PlayCircle, FileText, Ban, RefreshCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";

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

const sections: Section[] = [
  {
    title: "Contract Information",
    fields: [
      { key: "contractNumber", label: "Contract Number", type: "text" },
      { key: "name", label: "Contract Name", type: "text" },
      { key: "accountName", label: "Account", type: "reference" },
      {
        key: "contractType",
        label: "Contract Type",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={contractTypeColors[String(value)] || "outline"}>
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
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
      { key: "termMonths", label: "Term (Months)", type: "text" },
      { key: "billingFrequency", label: "Billing Frequency", type: "text" },
      { key: "totalContractValue", label: "Total Contract Value", type: "currency" },
      { key: "remainingValue", label: "Remaining Value", type: "currency" },
      { key: "ownerName", label: "Owner", type: "text" },
    ],
  },
  {
    title: "Renewal Settings",
    collapsible: true,
    fields: [
      {
        key: "autoRenewal",
        label: "Auto Renewal",
        type: "custom",
        render: (value) => (value ? "Yes" : "No"),
      },
      { key: "renewalTermMonths", label: "Renewal Term (Months)", type: "text" },
      { key: "renewalNoticeDate", label: "Renewal Notice Date", type: "date" },
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
  onSubmitForApproval: () => void;
  onActivate: () => void;
  onTerminate: () => void;
  onRenew: () => void;
  isSubmitting: boolean;
  isActivating: boolean;
  isTerminating: boolean;
  isRenewing: boolean;
}

function StatusPath({
  currentStatus,
  onSubmitForApproval,
  onActivate,
  onTerminate,
  onRenew,
  isSubmitting,
  isActivating,
  isTerminating,
  isRenewing,
}: StatusPathProps) {
  const statuses = ["Draft", "InApproval", "Activated"];
  const currentIndex = statuses.indexOf(currentStatus);

  if (currentStatus === "Terminated") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border bg-card p-4">
        <XCircle className="h-6 w-6 text-destructive" />
        <span className="text-lg font-semibold text-destructive">Terminated</span>
      </div>
    );
  }

  if (currentStatus === "Expired") {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <XCircle className="h-6 w-6 text-destructive" />
          <span className="text-lg font-semibold text-destructive">Expired</span>
        </div>
        <div className="flex justify-center">
          <Button onClick={onRenew} disabled={isRenewing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRenewing ? "Renewing..." : "Renew Contract"}
          </Button>
        </div>
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
                    <FileText className="h-5 w-5" />
                  ) : status === "InApproval" ? (
                    <Send className="h-5 w-5" />
                  ) : (
                    <PlayCircle className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm",
                    isCurrent && "font-semibold text-primary",
                    !isCurrent && "text-muted-foreground"
                  )}
                >
                  {status === "InApproval" ? "In Approval" : status}
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
            <Button onClick={onSubmitForApproval} disabled={isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </Button>
            <Button variant="outline" onClick={onActivate} disabled={isActivating}>
              <PlayCircle className="mr-2 h-4 w-4" />
              {isActivating ? "Activating..." : "Activate Directly"}
            </Button>
          </>
        )}
        {currentStatus === "InApproval" && (
          <Button onClick={onActivate} disabled={isActivating}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {isActivating ? "Activating..." : "Approve & Activate"}
          </Button>
        )}
        {currentStatus === "Activated" && (
          <>
            <Button onClick={onRenew} disabled={isRenewing}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {isRenewing ? "Renewing..." : "Renew Contract"}
            </Button>
            <Button variant="destructive" onClick={onTerminate} disabled={isTerminating}>
              <Ban className="mr-2 h-4 w-4" />
              {isTerminating ? "Terminating..." : "Terminate"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface TerminateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTerminate: (reason: string) => void;
  isTerminating: boolean;
}

function TerminateModal({ open, onOpenChange, onTerminate, isTerminating }: TerminateModalProps) {
  const [reason, setReason] = React.useState("");

  const handleTerminate = () => {
    onTerminate(reason);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Terminate Contract"
      description="Please provide a reason for terminating this contract."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isTerminating}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleTerminate} disabled={isTerminating}>
            {isTerminating ? "Terminating..." : "Terminate Contract"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="terminationReason">Termination Reason</Label>
          <textarea
            id="terminationReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for termination..."
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>
    </Modal>
  );
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showTerminateModal, setShowTerminateModal] = React.useState(false);

  const { data: contract, isLoading, error } = useContract(id);
  const { data: lineItemsData, isLoading: lineItemsLoading } = useContractLineItems(id);
  const deleteContract = useDeleteContract();
  const submitForApproval = useSubmitContractForApproval();
  const activateContract = useActivateContract();
  const terminateContract = useTerminateContract();
  const renewContract = useRenewContract();
  const deleteLineItem = useDeleteContractLineItem();

  const lineItems = lineItemsData?.records || [];
  const isDraft = contract?.status === "Draft";
  const isClosed = contract?.status === "Terminated" || contract?.status === "Expired";

  const handleDelete = async () => {
    try {
      await deleteContract.mutateAsync(id);
      toast({
        title: "Contract Deleted",
        description: "The contract has been successfully deleted.",
        variant: "success",
      });
      router.push("/contracts");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete contract.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  const handleSubmitForApproval = async () => {
    try {
      await submitForApproval.mutateAsync(id);
      toast({
        title: "Submitted for Approval",
        description: "The contract has been submitted for approval.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to submit contract for approval.",
        variant: "error",
      });
    }
  };

  const handleActivate = async () => {
    try {
      await activateContract.mutateAsync(id);
      toast({
        title: "Contract Activated",
        description: "The contract has been activated.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to activate contract.",
        variant: "error",
      });
    }
  };

  const handleTerminate = async (reason: string) => {
    try {
      await terminateContract.mutateAsync({ id, reason });
      toast({
        title: "Contract Terminated",
        description: "The contract has been terminated.",
        variant: "success",
      });
      setShowTerminateModal(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to terminate contract.",
        variant: "error",
      });
    }
  };

  const handleRenew = async () => {
    try {
      const newContract = await renewContract.mutateAsync({ id });
      toast({
        title: "Contract Renewed",
        description: "A new renewal contract has been created.",
        variant: "success",
      });
      router.push(`/contracts/${newContract.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to renew contract.",
        variant: "error",
      });
    }
  };

  const handleDeleteLineItem = async (item: { id: string }) => {
    try {
      await deleteLineItem.mutateAsync({
        id: item.id,
        contractId: id,
      });
      toast({
        title: "Line Item Deleted",
        description: "The contract line item has been deleted.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete contract line item.",
        variant: "error",
      });
    }
  };

  return (
    <>
      <DetailPageTemplate
        title={contract?.name || "Contract"}
        subtitle={contract?.contractNumber}
        objectName="Contract"
        record={contract ? (contract as unknown as Record<string, unknown>) : null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/contracts"
        editHref={isDraft ? `/contracts/${id}/edit` : undefined}
        onDelete={isDraft ? () => setShowDeleteModal(true) : undefined}
        headerBadge={
          contract?.status ? (
            <Badge
              variant={statusColors[contract.status] || "outline"}
              className={cn(
                contract.status === "Activated" && "bg-green-600 hover:bg-green-600/80"
              )}
            >
              {contract.status === "Activated" && <CheckCircle className="mr-1 h-3 w-3" />}
              {(contract.status === "Terminated" || contract.status === "Expired") && (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              {contract.status === "InApproval" ? "In Approval" : contract.status}
            </Badge>
          ) : undefined
        }
        headerActions={
          contract?.accountId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/accounts/${contract.accountId}`}>View Account</Link>
            </Button>
          ) : undefined
        }
        systemInfo={{
          createdAt: contract?.createdAt,
          createdBy: contract?.createdByName,
          updatedAt: contract?.updatedAt,
          updatedBy: contract?.lastModifiedByName,
        }}
        additionalContent={
          contract ? (
            <>
              <div className="mb-6">
                <h3 className="mb-3 font-semibold">Contract Status</h3>
                <StatusPath
                  currentStatus={contract.status}
                  onSubmitForApproval={handleSubmitForApproval}
                  onActivate={handleActivate}
                  onTerminate={() => setShowTerminateModal(true)}
                  onRenew={handleRenew}
                  isSubmitting={submitForApproval.isPending}
                  isActivating={activateContract.isPending}
                  isTerminating={terminateContract.isPending}
                  isRenewing={renewContract.isPending}
                />
              </div>
              <div className="mb-6">
                <LineItemsSection
                  title="Contract Line Items"
                  items={lineItems.map((item) => ({
                    id: item.id,
                    productName: item.productName,
                    productCode: item.productCode,
                    quantity: item.quantity,
                    unitPrice: item.customerUnitPrice || item.unitPrice,
                    discount: 0,
                    totalPrice: item.totalPrice,
                    description: item.description,
                    termMonths: item.termMonths,
                    billingFrequency: item.billingFrequency,
                    startDate: item.startDate,
                    endDate: item.endDate,
                  }))}
                  isLoading={lineItemsLoading}
                  onAdd={isDraft ? () => router.push(`/contracts/${id}/line-items/new`) : undefined}
                  onDelete={isDraft ? handleDeleteLineItem : undefined}
                  emptyMessage="No contract line items added yet"
                  showSubscriptionFields
                />
              </div>
              {contract.contractType === "PoF" && (
                <>
                  <div className="mb-6 rounded-lg border bg-card p-4">
                    <h3 className="mb-3 font-semibold">Pool of Funds Summary</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Value</div>
                        <div className="text-lg font-semibold">
                          {new Intl.NumberFormat("ja-JP", {
                            style: "currency",
                            currency: "JPY",
                            maximumFractionDigits: 0,
                          }).format(contract.totalContractValue || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Consumed</div>
                        <div className="text-lg font-semibold text-orange-600">
                          {new Intl.NumberFormat("ja-JP", {
                            style: "currency",
                            currency: "JPY",
                            maximumFractionDigits: 0,
                          }).format((contract.totalContractValue || 0) - (contract.remainingValue || 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Remaining</div>
                        <div className="text-lg font-semibold text-green-600">
                          {new Intl.NumberFormat("ja-JP", {
                            style: "currency",
                            currency: "JPY",
                            maximumFractionDigits: 0,
                          }).format(contract.remainingValue || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-6">
                    <PoolConsumptionsSection
                      contractId={id}
                      lineItems={lineItems}
                      isPoF={contract.contractType === "PoF"}
                      isActive={contract.status === "Activated"}
                    />
                  </div>
                </>
              )}
            </>
          ) : undefined
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Contract"
        description="Are you sure you want to delete this contract? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteContract.isPending}
            >
              {deleteContract.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />

      {/* Terminate Modal */}
      <TerminateModal
        open={showTerminateModal}
        onOpenChange={setShowTerminateModal}
        onTerminate={handleTerminate}
        isTerminating={terminateContract.isPending}
      />
    </>
  );
}
