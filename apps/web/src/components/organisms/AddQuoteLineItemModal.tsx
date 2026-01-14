"use client";

import * as React from "react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { Modal } from "@/components/organisms/Modal";

interface AddQuoteLineItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    description?: string;
  }) => void;
  isLoading?: boolean;
}

export function AddQuoteLineItemModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: AddQuoteLineItemModalProps) {
  const [name, setName] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [discount, setDiscount] = React.useState("0");
  const [description, setDescription] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      quantity: Number(quantity) || 1,
      unitPrice: Number(unitPrice) || 0,
      discount: Number(discount) || 0,
      description: description || undefined,
    });

    // Reset form
    setName("");
    setQuantity("1");
    setUnitPrice("");
    setDiscount("0");
    setDescription("");
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Line Item"
      description="Add a new line item to this quote."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Product/Service Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter product or service name..."
            required
          />
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
              placeholder="0"
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
          <Button type="submit" disabled={!name.trim() || isLoading}>
            {isLoading ? "Adding..." : "Add Line Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
