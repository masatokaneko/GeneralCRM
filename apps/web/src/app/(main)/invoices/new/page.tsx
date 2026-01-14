"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useCreateInvoice } from "@/lib/api/invoices";
import { useAccounts } from "@/lib/api/accounts";
import { useContracts } from "@/lib/api/contracts";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export default function InvoiceNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createInvoice = useCreateInvoice();

  const { data: accountsData } = useAccounts({ limit: 100 });
  const { data: contractsData } = useContracts({ limit: 100 });

  const accountId = searchParams.get("accountId") || "";
  const contractId = searchParams.get("contractId") || "";

  const formSections: FormSection[] = React.useMemo(
    () => [
      {
        title: "Invoice Information",
        fields: [
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
            name: "contractId",
            label: "Contract",
            type: "select",
            options:
              contractsData?.records.map((contract) => ({
                value: contract.id,
                label: `${contract.contractNumber} - ${contract.name}`,
              })) || [],
          },
          { name: "invoiceDate", label: "Invoice Date", type: "date", required: true },
          { name: "dueDate", label: "Due Date", type: "date", required: true },
          { name: "billingPeriodStart", label: "Billing Period Start", type: "date" },
          { name: "billingPeriodEnd", label: "Billing Period End", type: "date" },
        ],
      },
      {
        title: "Notes",
        fields: [
          { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
        ],
      },
    ],
    [accountsData, contractsData]
  );

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const defaultValues: Record<string, unknown> = {
    accountId,
    contractId: contractId || undefined,
    invoiceDate: today,
    dueDate: thirtyDaysLater,
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const result = await createInvoice.mutateAsync(values);
      toast({
        title: "Invoice Created",
        description: "The invoice has been successfully created.",
        variant: "success",
      });
      router.push(`/invoices/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create invoice. Please try again.",
        variant: "error",
      });
    }
  };

  const backHref = accountId
    ? `/accounts/${accountId}`
    : contractId
      ? `/contracts/${contractId}`
      : "/invoices";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Invoice</h1>
          <p className="text-sm text-muted-foreground">Create a new invoice record</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(backHref)}
        isLoading={createInvoice.isPending}
        submitLabel="Create Invoice"
        cancelLabel="Cancel"
      />
    </div>
  );
}
