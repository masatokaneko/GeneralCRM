"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useCreateContact } from "@/lib/api/contacts";
import { useAccounts } from "@/lib/api/accounts";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export default function ContactNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createContact = useCreateContact();

  const { data: accountsData } = useAccounts({ limit: 100 });

  const accountId = searchParams.get("accountId") || "";

  const formSections: FormSection[] = React.useMemo(
    () => [
      {
        title: "Contact Information",
        fields: [
          { name: "firstName", label: "First Name", type: "text" },
          { name: "lastName", label: "Last Name", type: "text", required: true },
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
          { name: "title", label: "Title", type: "text" },
          { name: "department", label: "Department", type: "text" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone", type: "phone" },
          { name: "mobilePhone", label: "Mobile Phone", type: "phone" },
          { name: "isPrimary", label: "Primary Contact", type: "checkbox" },
        ],
      },
      {
        title: "Mailing Address",
        fields: [
          { name: "mailingStreet", label: "Street", type: "textarea", colSpan: 2 },
          { name: "mailingCity", label: "City", type: "text" },
          { name: "mailingState", label: "State/Province", type: "text" },
          { name: "mailingPostalCode", label: "Postal Code", type: "text" },
          { name: "mailingCountry", label: "Country", type: "text" },
        ],
      },
    ],
    [accountsData]
  );

  const defaultValues: Record<string, unknown> = {
    accountId,
    isPrimary: false,
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    const { mailingStreet, mailingCity, mailingState, mailingPostalCode, mailingCountry, ...rest } =
      values;
    const data = {
      ...rest,
      mailingAddress: {
        street: mailingStreet as string | undefined,
        city: mailingCity as string | undefined,
        state: mailingState as string | undefined,
        postalCode: mailingPostalCode as string | undefined,
        country: mailingCountry as string | undefined,
      },
    };

    try {
      const result = await createContact.mutateAsync(data as Parameters<typeof createContact.mutateAsync>[0]);
      toast({
        title: "Contact Created",
        description: "The contact has been successfully created.",
        variant: "success",
      });
      router.push(`/contacts/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create contact. Please try again.",
        variant: "error",
      });
    }
  };

  const backHref = accountId ? `/accounts/${accountId}` : "/contacts";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Contact</h1>
          <p className="text-sm text-muted-foreground">Create a new contact record</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(backHref)}
        isLoading={createContact.isPending}
        submitLabel="Create Contact"
        cancelLabel="Cancel"
      />
    </div>
  );
}
