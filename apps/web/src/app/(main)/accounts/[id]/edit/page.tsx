"use client";

import { useParams, useRouter } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useAccount, useUpdateAccount } from "@/lib/api/accounts";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const formSections: FormSection[] = [
  {
    title: "Account Information",
    fields: [
      { name: "name", label: "Account Name", type: "text", required: true },
      {
        name: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "Customer", label: "Customer" },
          { value: "Prospect", label: "Prospect" },
          { value: "Partner", label: "Partner" },
          { value: "Competitor", label: "Competitor" },
          { value: "Other", label: "Other" },
        ],
      },
      { name: "industry", label: "Industry", type: "text" },
      { name: "website", label: "Website", type: "url" },
      { name: "phone", label: "Phone", type: "phone" },
      { name: "annualRevenue", label: "Annual Revenue", type: "currency" },
      { name: "numberOfEmployees", label: "Number of Employees", type: "number" },
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
    title: "Additional Information",
    fields: [
      {
        name: "description",
        label: "Description",
        type: "textarea",
        colSpan: 2,
      },
    ],
  },
];

export default function AccountEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: account, isLoading: isLoadingAccount, error } = useAccount(id);
  const updateAccount = useUpdateAccount();

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      await updateAccount.mutateAsync({
        id,
        data: values,
        etag: account?.systemModstamp,
      });
      toast({
        title: "Account Updated",
        description: "The account has been successfully updated.",
        variant: "success",
      });
      router.push(`/accounts/${id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update account. Please try again.",
        variant: "error",
      });
    }
  };

  if (isLoadingAccount) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Account not found</p>
        <Button asChild variant="outline">
          <Link href="/accounts">Back to Accounts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/accounts/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Account</h1>
          <p className="text-sm text-muted-foreground">{account.name}</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={account as unknown as Record<string, unknown>}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/accounts/${id}`)}
        isLoading={updateAccount.isPending}
        submitLabel="Save"
        cancelLabel="Cancel"
      />
    </div>
  );
}
