"use client";

import * as React from "react";
import { Button } from "@/components/atoms/Button";
import { Modal } from "@/components/organisms/Modal";
import { Plus, Trash2, Edit2 } from "lucide-react";

interface LineItem {
  id: string;
  productName?: string;
  productCode?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  description?: string;
  // Subscription fields
  termMonths?: number;
  billingFrequency?: string;
  startDate?: string;
  endDate?: string;
}

interface LineItemsSectionProps {
  title?: string;
  items: LineItem[];
  isLoading?: boolean;
  onAdd?: () => void;
  onEdit?: (item: LineItem) => void;
  onDelete?: (item: LineItem) => void;
  currency?: string;
  showTotal?: boolean;
  emptyMessage?: string;
  showSubscriptionFields?: boolean;
}

export function LineItemsSection({
  title = "Line Items",
  items,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
  currency = "JPY",
  showTotal = true,
  emptyMessage = "No line items",
  showSubscriptionFields = false,
}: LineItemsSectionProps) {
  const [deleteItem, setDeleteItem] = React.useState<LineItem | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const total = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);

  const handleDeleteConfirm = () => {
    if (deleteItem && onDelete) {
      onDelete(deleteItem);
    }
    setDeleteItem(null);
  };

  return (
    <>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-row items-center justify-between p-6 pb-4">
          <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
          {onAdd && (
            <Button size="sm" onClick={onAdd}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          )}
        </div>
        <div className="p-6 pt-0">
          {isLoading ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium text-muted-foreground">
                      Product
                    </th>
                    <th className="pb-3 text-right font-medium text-muted-foreground">
                      Quantity
                    </th>
                    <th className="pb-3 text-right font-medium text-muted-foreground">
                      Unit Price
                    </th>
                    <th className="pb-3 text-right font-medium text-muted-foreground">
                      Discount
                    </th>
                    {showSubscriptionFields && (
                      <>
                        <th className="pb-3 text-right font-medium text-muted-foreground">
                          Term
                        </th>
                        <th className="pb-3 text-left font-medium text-muted-foreground">
                          Period
                        </th>
                      </>
                    )}
                    <th className="pb-3 text-right font-medium text-muted-foreground">
                      Total
                    </th>
                    {(onEdit || onDelete) && (
                      <th className="pb-3 text-right font-medium text-muted-foreground">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <td className="py-3">
                        <div className="font-medium">
                          {item.productName || item.name || "-"}
                        </div>
                        {item.productCode && (
                          <div className="text-xs text-muted-foreground">
                            {item.productCode}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right">{item.quantity}</td>
                      <td className="py-3 text-right">
                        {formatCurrency(Number(item.unitPrice))}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(Number(item.discount))}
                      </td>
                      {showSubscriptionFields && (
                        <>
                          <td className="py-3 text-right">
                            {item.termMonths ? `${item.termMonths}mo` : "-"}
                            {item.billingFrequency && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({item.billingFrequency})
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-left text-xs text-muted-foreground">
                            {item.startDate || item.endDate ? (
                              <>
                                {formatDate(item.startDate)}
                                {item.endDate && ` - ${formatDate(item.endDate)}`}
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                        </>
                      )}
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(Number(item.totalPrice))}
                      </td>
                      {(onEdit || onDelete) && (
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onEdit(item)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteItem(item)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {showTotal && (
                  <tfoot>
                    <tr className="border-t-2">
                      <td
                        colSpan={showSubscriptionFields ? 6 : 4}
                        className="py-3 text-right font-semibold"
                      >
                        Total
                      </td>
                      <td className="py-3 text-right font-semibold">
                        {formatCurrency(total)}
                      </td>
                      {(onEdit || onDelete) && <td />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        title="Delete Line Item"
        description={`Are you sure you want to delete "${deleteItem?.productName || deleteItem?.name || "this item"}"?`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
