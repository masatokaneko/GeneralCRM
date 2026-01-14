"use client";

import * as React from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Modal } from "@/components/organisms/Modal";
import { usePricebookEntries } from "@/lib/api/pricebooks";

interface AddLineItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricebookId?: string;
  onSubmit: (data: {
    pricebookEntryId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    description?: string;
    termMonths?: number;
    billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
    startDate?: string;
  }) => void;
  isLoading?: boolean;
  showSubscriptionFields?: boolean;
}

export function AddLineItemModal({
  open,
  onOpenChange,
  pricebookId,
  onSubmit,
  isLoading,
  showSubscriptionFields = false,
}: AddLineItemModalProps) {
  const [selectedEntry, setSelectedEntry] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [discount, setDiscount] = React.useState("0");
  const [description, setDescription] = React.useState("");
  const [termMonths, setTermMonths] = React.useState("12");
  const [billingFrequency, setBillingFrequency] = React.useState<"Monthly" | "Yearly" | "ThreeYear">("Yearly");
  const [startDate, setStartDate] = React.useState("");

  const { data: entriesData } = usePricebookEntries(
    pricebookId ? { pricebookId } : undefined
  );

  const entries = entriesData?.records || [];

  const handleEntryChange = (entryId: string) => {
    setSelectedEntry(entryId);
    const entry = entries.find((e) => e.id === entryId);
    if (entry) {
      setUnitPrice(String(entry.unitPrice));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    onSubmit({
      pricebookEntryId: selectedEntry,
      quantity: Number(quantity) || 1,
      unitPrice: Number(unitPrice) || 0,
      discount: Number(discount) || 0,
      description: description || undefined,
      termMonths: showSubscriptionFields ? Number(termMonths) || undefined : undefined,
      billingFrequency: showSubscriptionFields ? billingFrequency : undefined,
      startDate: showSubscriptionFields && startDate ? startDate : undefined,
    });

    // Reset form
    setSelectedEntry("");
    setQuantity("1");
    setUnitPrice("");
    setDiscount("0");
    setDescription("");
    setTermMonths("12");
    setBillingFrequency("Yearly");
    setStartDate("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Line Item"
      description="Select a product from the price book to add to this record."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product">Product</Label>
          <select
            id="product"
            value={selectedEntry}
            onChange={(e) => handleEntryChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">Select a product...</option>
            {entries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.productName} - {formatCurrency(Number(entry.unitPrice))}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitPrice">Unit Price</Label>
            <Input
              id="unitPrice"
              type="number"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount">Discount</Label>
          <Input
            id="discount"
            type="number"
            min="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>

        {showSubscriptionFields && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="termMonths">Term (Months)</Label>
                <Input
                  id="termMonths"
                  type="number"
                  min="1"
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingFrequency">Billing Frequency</Label>
                <select
                  id="billingFrequency"
                  value={billingFrequency}
                  onChange={(e) => setBillingFrequency(e.target.value as "Monthly" | "Yearly" | "ThreeYear")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="ThreeYear">3 Year</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!selectedEntry || isLoading}>
            {isLoading ? "Adding..." : "Add Line Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
