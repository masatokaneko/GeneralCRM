"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useCreateOrder } from "@/lib/api/orders";
import { useAccounts } from "@/lib/api/accounts";
import { useOpportunities } from "@/lib/api/opportunities";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import * as React from "react";

const ORDER_TYPES = [
  { value: "New", label: "New" },
  { value: "Renewal", label: "Renewal" },
  { value: "Upsell", label: "Upsell" },
  { value: "Amendment", label: "Amendment" },
];

export default function OrderNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createOrder = useCreateOrder();

  const { data: accountsData } = useAccounts({ limit: 100 });
  const { data: opportunitiesData } = useOpportunities({ limit: 100 });

  const accountId = searchParams.get("accountId") || "";
  const opportunityId = searchParams.get("opportunityId") || "";
  const quoteId = searchParams.get("quoteId") || "";

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

  const today = new Date().toISOString().split("T")[0];

  const defaultValues: Record<string, unknown> = {
    accountId,
    opportunityId,
    quoteId: quoteId || undefined,
    orderType: "New",
    orderDate: today,
    effectiveDate: today,
  };

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

      const result = await createOrder.mutateAsync(orderData as Parameters<typeof createOrder.mutateAsync>[0]);
      toast({
        title: "Order Created",
        description: "The order has been successfully created.",
        variant: "success",
      });
      router.push(`/orders/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "error",
      });
    }
  };

  const backHref = accountId
    ? `/accounts/${accountId}`
    : opportunityId
      ? `/opportunities/${opportunityId}`
      : "/orders";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Order</h1>
          <p className="text-sm text-muted-foreground">Create a new order record</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(backHref)}
        isLoading={createOrder.isPending}
        submitLabel="Create Order"
        cancelLabel="Cancel"
      />
    </div>
  );
}
