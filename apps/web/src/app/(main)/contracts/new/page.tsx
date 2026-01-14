"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useCreateContract } from "@/lib/api/contracts";
import { useAccounts } from "@/lib/api/accounts";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import * as React from "react";

const CONTRACT_TYPES = [
  { value: "License", label: "License (Subscription)" },
  { value: "PoF", label: "Pool of Funds" },
  { value: "Service", label: "Service" },
];

const BILLING_FREQUENCIES = [
  { value: "Monthly", label: "Monthly" },
  { value: "Yearly", label: "Yearly" },
  { value: "ThreeYear", label: "Three Year" },
];

export default function ContractNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createContract = useCreateContract();

  const { data: accountsData } = useAccounts({ limit: 100 });

  const accountId = searchParams.get("accountId") || "";
  const orderId = searchParams.get("orderId") || "";

  const formSections: FormSection[] = React.useMemo(
    () => [
      {
        title: "Contract Information",
        fields: [
          { name: "name", label: "Contract Name", type: "text", required: true },
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
            name: "contractType",
            label: "Contract Type",
            type: "select",
            required: true,
            options: CONTRACT_TYPES,
          },
          { name: "termMonths", label: "Term (Months)", type: "number", required: true },
          {
            name: "billingFrequency",
            label: "Billing Frequency",
            type: "select",
            options: BILLING_FREQUENCIES,
          },
          { name: "startDate", label: "Start Date", type: "date" },
          { name: "totalContractValue", label: "Total Contract Value", type: "currency" },
        ],
      },
      {
        title: "Renewal Settings",
        fields: [
          {
            name: "autoRenewal",
            label: "Auto Renewal",
            type: "select",
            options: [
              { value: "true", label: "Yes" },
              { value: "false", label: "No" },
            ],
          },
          { name: "renewalTermMonths", label: "Renewal Term (Months)", type: "number" },
          { name: "renewalNoticeDate", label: "Renewal Notice Date", type: "date" },
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

  const today = new Date().toISOString().split("T")[0];

  const defaultValues: Record<string, unknown> = {
    accountId,
    primaryOrderId: orderId || undefined,
    contractType: "License",
    termMonths: 12,
    billingFrequency: "Yearly",
    startDate: today,
    autoRenewal: "false",
    totalContractValue: 0,
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      // Convert autoRenewal string to boolean
      const contractData = {
        ...values,
        autoRenewal: values.autoRenewal === "true",
        termMonths: Number(values.termMonths),
        renewalTermMonths: values.renewalTermMonths ? Number(values.renewalTermMonths) : undefined,
        totalContractValue: Number(values.totalContractValue) || 0,
        remainingValue: Number(values.totalContractValue) || 0,
      };

      const result = await createContract.mutateAsync(contractData);
      toast({
        title: "Contract Created",
        description: "The contract has been successfully created.",
        variant: "success",
      });
      router.push(`/contracts/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create contract. Please try again.",
        variant: "error",
      });
    }
  };

  const backHref = accountId ? `/accounts/${accountId}` : "/contracts";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Contract</h1>
          <p className="text-sm text-muted-foreground">Create a new contract record</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(backHref)}
        isLoading={createContract.isPending}
        submitLabel="Create Contract"
        cancelLabel="Cancel"
      />
    </div>
  );
}
