"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useCreateAccount } from "@/lib/api/accounts";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
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

export default function AccountNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createAccount = useCreateAccount();

  const defaultValues: Record<string, unknown> = {
    type: searchParams.get("type") || "Prospect",
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const result = await createAccount.mutateAsync(values);
      toast({
        title: "Account Created",
        description: "The account has been successfully created.",
        variant: "success",
      });
      router.push(`/accounts/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/accounts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Account</h1>
          <p className="text-sm text-muted-foreground">Create a new account record</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/accounts")}
        isLoading={createAccount.isPending}
        submitLabel="Create Account"
        cancelLabel="Cancel"
      />
    </div>
  );
}
