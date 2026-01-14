"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useCreateOpportunity } from "@/lib/api/opportunities";
import { useAccounts } from "@/lib/api/accounts";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
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

export default function OpportunityNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createOpportunity = useCreateOpportunity();

  const { data: accountsData } = useAccounts({ limit: 100 });

  const accountId = searchParams.get("accountId") || "";
  const opportunityName = searchParams.get("name") || "";

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

  // Default close date to 30 days from now
  const defaultCloseDate = new Date();
  defaultCloseDate.setDate(defaultCloseDate.getDate() + 30);

  const defaultValues: Record<string, unknown> = {
    accountId,
    name: opportunityName,
    stageName: "Prospecting",
    closeDate: defaultCloseDate.toISOString().split("T")[0],
    type: "New Business",
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const result = await createOpportunity.mutateAsync(values);
      toast({
        title: "Opportunity Created",
        description: "The opportunity has been successfully created.",
        variant: "success",
      });
      router.push(`/opportunities/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create opportunity. Please try again.",
        variant: "error",
      });
    }
  };

  const backHref = accountId ? `/accounts/${accountId}` : "/opportunities";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Opportunity</h1>
          <p className="text-sm text-muted-foreground">Create a new opportunity record</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(backHref)}
        isLoading={createOpportunity.isPending}
        submitLabel="Create Opportunity"
        cancelLabel="Cancel"
      />
    </div>
  );
}
