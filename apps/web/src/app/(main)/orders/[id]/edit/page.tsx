"use client";

import { useParams, useRouter } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useOrder, useUpdateOrder } from "@/lib/api/orders";
import { useAccounts } from "@/lib/api/accounts";
import { useOpportunities } from "@/lib/api/opportunities";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Skeleton } from "@/components/atoms/Skeleton";

const ORDER_TYPES = [
  { value: "New", label: "New" },
  { value: "Renewal", label: "Renewal" },
  { value: "Upsell", label: "Upsell" },
  { value: "Amendment", label: "Amendment" },
];

export default function OrderEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: order, isLoading: orderLoading } = useOrder(id);
  const updateOrder = useUpdateOrder();

  const { data: accountsData } = useAccounts({ limit: 100 });
  const { data: opportunitiesData } = useOpportunities({ limit: 100 });

  const formSections: FormSection[] = React.useMemo(
    () => [
      {
        title: "Order Information",
        fields: [
          { name: "name", label: "Order Name", type: "text", required: true },
          {
            name: "accountId",
            label: "Account",
            type: "select",
            required: true,
            options:
              accountsData?.records.map((acc) => ({
                value: acc.id,
                label: acc.name,
              })) || [],
          },
          {
            name: "opportunityId",
            label: "Opportunity",
            type: "select",
            options:
              opportunitiesData?.records.map((opp) => ({
                value: opp.id,
                label: opp.name,
              })) || [],
          },
          {
            name: "orderType",
            label: "Order Type",
            type: "select",
            required: true,
            options: ORDER_TYPES,
          },
          { name: "orderDate", label: "Order Date", type: "date" },
          { name: "effectiveDate", label: "Effective Date", type: "date" },
        ],
      },
      {
        title: "Billing Address",
        fields: [
          { name: "billingStreet", label: "Street", type: "text" },
          { name: "billingCity", label: "City", type: "text" },
          { name: "billingState", label: "State/Province", type: "text" },
          { name: "billingPostalCode", label: "Postal Code", type: "text" },
          { name: "billingCountry", label: "Country", type: "text" },
        ],
      },
      {
        title: "Shipping Address",
        fields: [
          { name: "shippingStreet", label: "Street", type: "text" },
          { name: "shippingCity", label: "City", type: "text" },
          { name: "shippingState", label: "State/Province", type: "text" },
          { name: "shippingPostalCode", label: "Postal Code", type: "text" },
          { name: "shippingCountry", label: "Country", type: "text" },
        ],
      },
      {
        title: "Description",
        fields: [
          { name: "description", label: "Description", type: "textarea", colSpan: 2 },
        ],
      },
    ],
    [accountsData, opportunitiesData]
  );

  const defaultValues: Record<string, unknown> = React.useMemo(() => {
    if (!order) return {};
    return {
      name: order.name,
      accountId: order.accountId,
      opportunityId: order.opportunityId,
      orderType: order.orderType,
      orderDate: order.orderDate ? String(order.orderDate).split("T")[0] : "",
      effectiveDate: order.effectiveDate ? String(order.effectiveDate).split("T")[0] : "",
      billingStreet: order.billingAddress?.street,
      billingCity: order.billingAddress?.city,
      billingState: order.billingAddress?.state,
      billingPostalCode: order.billingAddress?.postalCode,
      billingCountry: order.billingAddress?.country,
      shippingStreet: order.shippingAddress?.street,
      shippingCity: order.shippingAddress?.city,
      shippingState: order.shippingAddress?.state,
      shippingPostalCode: order.shippingAddress?.postalCode,
      shippingCountry: order.shippingAddress?.country,
      description: order.description,
    };
  }, [order]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      // Transform flat address fields to nested structure
      const orderData: Record<string, unknown> = {
        ...values,
        billingAddress: {
          street: values.billingStreet as string | undefined,
          city: values.billingCity as string | undefined,
          state: values.billingState as string | undefined,
          postalCode: values.billingPostalCode as string | undefined,
          country: values.billingCountry as string | undefined,
        },
        shippingAddress: {
          street: values.shippingStreet as string | undefined,
          city: values.shippingCity as string | undefined,
          state: values.shippingState as string | undefined,
          postalCode: values.shippingPostalCode as string | undefined,
          country: values.shippingCountry as string | undefined,
        },
      };
      // Remove flat address fields
      for (const key of Object.keys(orderData)) {
        if (key.startsWith("billing") && key !== "billingAddress") {
          delete orderData[key];
        }
        if (key.startsWith("shipping") && key !== "shippingAddress") {
          delete orderData[key];
        }
      }

      await updateOrder.mutateAsync({
        id,
        data: orderData as Parameters<typeof updateOrder.mutateAsync>[0]["data"],
        etag: order?.systemModstamp,
      });
      toast({
        title: "Order Updated",
        description: "The order has been successfully updated.",
        variant: "success",
      });
      router.push(`/orders/${id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update order. Please try again.",
        variant: "error",
      });
    }
  };

  if (orderLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/orders/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Order</h1>
          <p className="text-sm text-muted-foreground">{order?.orderNumber}</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/orders/${id}`)}
        isLoading={updateOrder.isPending}
        submitLabel="Save Changes"
        cancelLabel="Cancel"
      />
    </div>
  );
}
