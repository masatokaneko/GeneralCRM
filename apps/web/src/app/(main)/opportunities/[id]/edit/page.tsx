"use client";

import { useParams, useRouter } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useOpportunity, useUpdateOpportunity } from "@/lib/api/opportunities";
import { useAccounts } from "@/lib/api/accounts";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

const STAGES = [
  { value: "Prospecting", label: "Prospecting" },
  { value: "Qualification", label: "Qualification" },
  { value: "Needs Analysis", label: "Needs Analysis" },
  { value: "Value Proposition", label: "Value Proposition" },
  { value: "Proposal/Price Quote", label: "Proposal/Price Quote" },
  { value: "Negotiation/Review", label: "Negotiation/Review" },
];

export default function OpportunityEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: opportunity, isLoading: isLoadingOpportunity, error } = useOpportunity(id);
  const { data: accountsData } = useAccounts({ limit: 100 });
  const updateOpportunity = useUpdateOpportunity();

  const formSections: FormSection[] = React.useMemo(
    () => [
      {
        title: "Opportunity Information",
        fields: [
          { name: "name", label: "Opportunity Name", type: "text", required: true },
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
            name: "stageName",
            label: "Stage",
            type: "select",
            required: true,
            options: STAGES,
          },
          { name: "amount", label: "Amount", type: "currency" },
          { name: "closeDate", label: "Close Date", type: "date", required: true },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: [
              { value: "New Business", label: "New Business" },
              { value: "Existing Business", label: "Existing Business" },
              { value: "Renewal", label: "Renewal" },
            ],
          },
          {
            name: "leadSource",
            label: "Lead Source",
            type: "select",
            options: [
              { value: "Web", label: "Web" },
              { value: "Phone", label: "Phone Inquiry" },
              { value: "Referral", label: "Referral" },
              { value: "Partner", label: "Partner" },
              { value: "Campaign", label: "Campaign" },
              { value: "Event", label: "Event" },
              { value: "Other", label: "Other" },
            ],
          },
          { name: "nextStep", label: "Next Step", type: "text" },
        ],
      },
      {
        title: "Description",
        fields: [
          { name: "description", label: "Description", type: "textarea", colSpan: 2 },
        ],
      },
    ],
    [accountsData]
  );

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      await updateOpportunity.mutateAsync({
        id,
        data: values,
        etag: opportunity?.systemModstamp,
      });
      toast({
        title: "Opportunity Updated",
        description: "The opportunity has been successfully updated.",
        variant: "success",
      });
      router.push(`/opportunities/${id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update opportunity. Please try again.",
        variant: "error",
      });
    }
  };

  if (isLoadingOpportunity) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Opportunity not found</p>
        <Button asChild variant="outline">
          <Link href="/opportunities">Back to Opportunities</Link>
        </Button>
      </div>
    );
  }

  if (opportunity.isClosed) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Closed opportunities cannot be edited</p>
        <Button asChild variant="outline">
          <Link href={`/opportunities/${id}`}>Back to Opportunity</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/opportunities/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Opportunity</h1>
          <p className="text-sm text-muted-foreground">{opportunity.name}</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={opportunity as unknown as Record<string, unknown>}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/opportunities/${id}`)}
        isLoading={updateOpportunity.isPending}
        submitLabel="Save"
        cancelLabel="Cancel"
      />
    </div>
  );
}
