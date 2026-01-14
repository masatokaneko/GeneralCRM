"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useCreateQuote } from "@/lib/api/quotes";
import { useOpportunities } from "@/lib/api/opportunities";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export default function QuoteNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createQuote = useCreateQuote();

  const { data: opportunitiesData } = useOpportunities({ limit: 100 });

  const opportunityId = searchParams.get("opportunityId") || "";

  const formSections: FormSection[] = React.useMemo(
    () => [
      {
        title: "Quote Information",
        fields: [
          { name: "name", label: "Quote Name", type: "text", required: true },
          {
            name: "opportunityId",
            label: "Opportunity",
            type: "select",
            required: true,
            options:
              opportunitiesData?.records.map((opp) => ({
                value: opp.id,
                label: opp.name,
              })) || [],
          },
          {
            name: "expirationDate",
            label: "Expiration Date",
            type: "date",
          },
        ],
      },
      {
        title: "Pricing",
        fields: [
          { name: "subtotal", label: "Subtotal", type: "currency", required: true },
          { name: "discount", label: "Discount", type: "currency" },
          { name: "taxAmount", label: "Tax Amount", type: "currency" },
        ],
      },
      {
        title: "Billing Address",
        fields: [
          { name: "billingStreet", label: "Street", type: "textarea", colSpan: 2 },
          { name: "billingCity", label: "City", type: "text" },
          { name: "billingState", label: "State/Province", type: "text" },
          { name: "billingPostalCode", label: "Postal Code", type: "text" },
          { name: "billingCountry", label: "Country", type: "text" },
        ],
      },
      {
        title: "Shipping Address",
        fields: [
          { name: "shippingStreet", label: "Street", type: "textarea", colSpan: 2 },
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
    [opportunitiesData]
  );

  // Default expiration date to 30 days from now
  const defaultExpirationDate = new Date();
  defaultExpirationDate.setDate(defaultExpirationDate.getDate() + 30);

  const defaultValues: Record<string, unknown> = {
    opportunityId,
    status: "Draft",
    subtotal: 0,
    discount: 0,
    taxAmount: 0,
    expirationDate: defaultExpirationDate.toISOString().split("T")[0],
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const {
      billingStreet,
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      shippingStreet,
      shippingCity,
      shippingState,
      shippingPostalCode,
      shippingCountry,
      ...rest
    } = values;

    // Calculate totals
    const subtotal = Number(rest.subtotal) || 0;
    const discount = Number(rest.discount) || 0;
    const taxAmount = Number(rest.taxAmount) || 0;
    const totalPrice = subtotal - discount;
    const grandTotal = totalPrice + taxAmount;

    const data = {
      ...rest,
      status: "Draft" as const,
      isPrimary: false,
      subtotal,
      discount,
      taxAmount,
      totalPrice,
      grandTotal,
      billingAddress: {
        street: billingStreet as string | undefined,
        city: billingCity as string | undefined,
        state: billingState as string | undefined,
        postalCode: billingPostalCode as string | undefined,
        country: billingCountry as string | undefined,
      },
      shippingAddress: {
        street: shippingStreet as string | undefined,
        city: shippingCity as string | undefined,
        state: shippingState as string | undefined,
        postalCode: shippingPostalCode as string | undefined,
        country: shippingCountry as string | undefined,
      },
    };

    try {
      const result = await createQuote.mutateAsync(data as Parameters<typeof createQuote.mutateAsync>[0]);
      toast({
        title: "Quote Created",
        description: "The quote has been successfully created.",
        variant: "success",
      });
      router.push(`/quotes/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create quote. Please try again.",
        variant: "error",
      });
    }
  };

  const backHref = opportunityId ? `/opportunities/${opportunityId}` : "/quotes";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Quote</h1>
          <p className="text-sm text-muted-foreground">Create a new quote record</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(backHref)}
        isLoading={createQuote.isPending}
        submitLabel="Create Quote"
        cancelLabel="Cancel"
      />
    </div>
  );
}
