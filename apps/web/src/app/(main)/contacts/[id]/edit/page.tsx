"use client";

import { useParams, useRouter } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useContact, useUpdateContact } from "@/lib/api/contacts";
import { useAccounts } from "@/lib/api/accounts";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export default function ContactEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: contact, isLoading: isLoadingContact, error } = useContact(id);
  const { data: accountsData } = useAccounts({ limit: 100 });
  const updateContact = useUpdateContact();

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
      await updateContact.mutateAsync({
        id,
        data,
        etag: contact?.systemModstamp,
      });
      toast({
        title: "Contact Updated",
        description: "The contact has been successfully updated.",
        variant: "success",
      });
      router.push(`/contacts/${id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update contact. Please try again.",
        variant: "error",
      });
    }
  };

  if (isLoadingContact) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Contact not found</p>
        <Button asChild variant="outline">
          <Link href="/contacts">Back to Contacts</Link>
        </Button>
      </div>
    );
  }

  // Flatten mailing address for form
  const initialValues = {
    ...contact,
    mailingStreet: contact.mailingAddress?.street,
    mailingCity: contact.mailingAddress?.city,
    mailingState: contact.mailingAddress?.state,
    mailingPostalCode: contact.mailingAddress?.postalCode,
    mailingCountry: contact.mailingAddress?.country,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/contacts/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Contact</h1>
          <p className="text-sm text-muted-foreground">
            {contact.firstName} {contact.lastName}
          </p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/contacts/${id}`)}
        isLoading={updateContact.isPending}
        submitLabel="Save"
        cancelLabel="Cancel"
      />
    </div>
  );
}
