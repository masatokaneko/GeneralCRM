"use client";

import * as React from "react";
import { Button } from "@/components/atoms/Button";
import { Badge } from "@/components/atoms/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/atoms/Table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/organisms/Modal";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Textarea } from "@/components/atoms/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/Select";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { toast } from "@/components/organisms/Toast";
import {
  usePoolConsumptionsByContract,
  useCreatePoolConsumption,
  useApprovePoolConsumption,
  useRejectPoolConsumption,
  useCancelPoolConsumption,
  useDeletePoolConsumption,
} from "@/lib/api/poolConsumptions";
import type { ContractLineItem, PoolConsumption } from "@/mocks/types";

interface PoolConsumptionsSectionProps {
  contractId: string;
  lineItems: ContractLineItem[];
  isPoF: boolean;
  isActive: boolean;
}

const statusColors: Record<string, "default" | "secondary" | "success" | "destructive" | "warning"> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "destructive",
  Cancelled: "secondary",
  Invoiced: "default",
};

export function PoolConsumptionsSection({
  contractId,
  lineItems,
  isPoF,
  isActive,
}: PoolConsumptionsSectionProps) {
  const { data: consumptionsData, isLoading } = usePoolConsumptionsByContract(contractId);
  const createConsumption = useCreatePoolConsumption();
  const approveConsumption = useApprovePoolConsumption();
  const rejectConsumption = useRejectPoolConsumption();
  const cancelConsumption = useCancelPoolConsumption();
  const deleteConsumption = useDeletePoolConsumption();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isRejectOpen, setIsRejectOpen] = React.useState(false);
  const [selectedConsumption, setSelectedConsumption] = React.useState<PoolConsumption | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [formData, setFormData] = React.useState({
    contractLineItemId: "",
    consumptionDate: new Date().toISOString().split("T")[0],
    quantity: "1",
    unitPrice: "",
    amount: "",
    description: "",
    externalReference: "",
  });

  if (!isPoF) {
    return null;
  }

  const consumptions = consumptionsData?.records || [];

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedLineItem = lineItems.find((li) => li.id === formData.contractLineItemId);
      await createConsumption.mutateAsync({
        contractLineItemId: formData.contractLineItemId,
        consumptionDate: formData.consumptionDate,
        quantity: Number(formData.quantity) || 1,
        unitPrice: formData.unitPrice ? Number(formData.unitPrice) : selectedLineItem?.unitPrice,
        amount: formData.amount ? Number(formData.amount) : undefined,
        description: formData.description || undefined,
        externalReference: formData.externalReference || undefined,
      });
      toast({
        title: "Consumption Created",
        description: "Pool consumption request has been submitted.",
        variant: "success",
      });
      setIsCreateOpen(false);
      setFormData({
        contractLineItemId: "",
        consumptionDate: new Date().toISOString().split("T")[0],
        quantity: "1",
        unitPrice: "",
        amount: "",
        description: "",
        externalReference: "",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create consumption request.",
        variant: "error",
      });
    }
  };

  const handleApprove = async (consumption: PoolConsumption) => {
    try {
      await approveConsumption.mutateAsync(consumption.id);
      toast({
        title: "Consumption Approved",
        description: "The consumption has been approved and deducted from the pool balance.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to approve consumption. Please check the pool balance.",
        variant: "error",
      });
    }
  };

  const handleRejectClick = (consumption: PoolConsumption) => {
    setSelectedConsumption(consumption);
    setRejectReason("");
    setIsRejectOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedConsumption || !rejectReason.trim()) return;
    try {
      await rejectConsumption.mutateAsync({
        id: selectedConsumption.id,
        reason: rejectReason,
      });
      toast({
        title: "Consumption Rejected",
        description: "The consumption has been rejected.",
        variant: "success",
      });
      setIsRejectOpen(false);
      setSelectedConsumption(null);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to reject consumption.",
        variant: "error",
      });
    }
  };

  const handleCancel = async (consumption: PoolConsumption) => {
    try {
      await cancelConsumption.mutateAsync(consumption.id);
      toast({
        title: "Consumption Cancelled",
        description:
          consumption.status === "Approved"
            ? "The consumption has been cancelled and the balance has been restored."
            : "The consumption has been cancelled.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel consumption.",
        variant: "error",
      });
    }
  };

  const handleDelete = async (consumption: PoolConsumption) => {
    try {
      await deleteConsumption.mutateAsync(consumption.id);
      toast({
        title: "Consumption Deleted",
        description: "The consumption request has been deleted.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete consumption.",
        variant: "error",
      });
    }
  };

  const handleLineItemChange = (lineItemId: string) => {
    const selectedLineItem = lineItems.find((li) => li.id === lineItemId);
    setFormData({
      ...formData,
      contractLineItemId: lineItemId,
      unitPrice: selectedLineItem?.unitPrice?.toString() || "",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Pool Consumptions</CardTitle>
          <CardDescription>
            Track and manage consumption against Pool of Funds contract
          </CardDescription>
        </div>
        {isActive && (
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Consumption
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading consumptions...</div>
          </div>
        ) : consumptions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">No consumptions recorded</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumptions.map((consumption) => (
                <TableRow key={consumption.id}>
                  <TableCell>{formatDate(consumption.consumptionDate)}</TableCell>
                  <TableCell className="font-medium">{consumption.productName || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {consumption.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">{consumption.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(consumption.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(consumption.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[consumption.status] || "default"}>
                      {consumption.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{consumption.requesterName || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {consumption.status === "Pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApprove(consumption)}
                            title="Approve"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRejectClick(consumption)}
                            title="Reject"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(consumption)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                      {(consumption.status === "Pending" || consumption.status === "Approved") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancel(consumption)}
                          title="Cancel"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Consumption Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Pool Consumption</DialogTitle>
            <DialogDescription>
              Record a new consumption against the Pool of Funds contract
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="lineItem">Contract Line Item *</Label>
                <Select
                  value={formData.contractLineItemId}
                  onValueChange={handleLineItemChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a line item" />
                  </SelectTrigger>
                  <SelectContent>
                    {lineItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.productName} (Remaining: {formatCurrency(item.remainingAmount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="consumptionDate">Consumption Date *</Label>
                <Input
                  id="consumptionDate"
                  type="date"
                  value={formData.consumptionDate}
                  onChange={(e) => setFormData({ ...formData, consumptionDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unitPrice">Unit Price</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (auto-calculated if blank)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Quantity x Unit Price"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the consumption..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="externalReference">External Reference</Label>
                <Input
                  id="externalReference"
                  value={formData.externalReference}
                  onChange={(e) => setFormData({ ...formData, externalReference: e.target.value })}
                  placeholder="e.g., Ticket #, Project ID"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!formData.contractLineItemId || createConsumption.isPending}
              >
                {createConsumption.isPending ? "Creating..." : "Create Consumption"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reject Consumption</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this consumption request
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejectReason">Rejection Reason *</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRejectSubmit}
              disabled={!rejectReason.trim() || rejectConsumption.isPending}
              variant="destructive"
            >
              {rejectConsumption.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
