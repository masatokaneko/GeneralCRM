"use client";

import { useParams, useRouter } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useQuote, useUpdateQuote } from "@/lib/api/quotes";
import { useOpportunities } from "@/lib/api/opportunities";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export default function QuoteEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: quote, isLoading: isLoadingQuote, error } = useQuote(id);
  const { data: opportunitiesData } = useOpportunities({ limit: 100 });
  const updateQuote = useUpdateQuote();

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
      await updateQuote.mutateAsync({
        id,
        data: data as Parameters<typeof updateQuote.mutateAsync>[0]["data"],
        etag: quote?.systemModstamp,
      });
      toast({
        title: "Quote Updated",
        description: "The quote has been successfully updated.",
        variant: "success",
      });
      router.push(`/quotes/${id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update quote. Please try again.",
        variant: "error",
      });
    }
  };

  if (isLoadingQuote) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Quote not found</p>
        <Button asChild variant="outline">
          <Link href="/quotes">Back to Quotes</Link>
        </Button>
      </div>
    );
  }

  if (quote.status !== "Draft") {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Only draft quotes can be edited</p>
        <Button asChild variant="outline">
          <Link href={`/quotes/${id}`}>Back to Quote</Link>
        </Button>
      </div>
    );
  }

  // Flatten addresses for form
  const initialValues = {
    ...quote,
    billingStreet: quote.billingAddress?.street,
    billingCity: quote.billingAddress?.city,
    billingState: quote.billingAddress?.state,
    billingPostalCode: quote.billingAddress?.postalCode,
    billingCountry: quote.billingAddress?.country,
    shippingStreet: quote.shippingAddress?.street,
    shippingCity: quote.shippingAddress?.city,
    shippingState: quote.shippingAddress?.state,
    shippingPostalCode: quote.shippingAddress?.postalCode,
    shippingCountry: quote.shippingAddress?.country,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/quotes/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Quote</h1>
          <p className="text-sm text-muted-foreground">{quote.name}</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/quotes/${id}`)}
        isLoading={updateQuote.isPending}
        submitLabel="Save"
        cancelLabel="Cancel"
      />
    </div>
  );
}
