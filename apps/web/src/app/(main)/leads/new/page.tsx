"use client";

import { useRouter } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useCreateLead } from "@/lib/api/leads";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSections: FormSection[] = [
  {
    title: "Lead Information",
    fields: [
      { name: "firstName", label: "First Name", type: "text" },
      { name: "lastName", label: "Last Name", type: "text", required: true },
      { name: "company", label: "Company", type: "text", required: true },
      { name: "title", label: "Title", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "phone" },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        defaultValue: "New",
        options: [
          { value: "New", label: "New" },
          { value: "Working", label: "Working" },
          { value: "Qualified", label: "Qualified" },
          { value: "Unqualified", label: "Unqualified" },
        ],
      },
      {
        name: "rating",
        label: "Rating",
        type: "select",
        options: [
          { value: "Hot", label: "Hot" },
          { value: "Warm", label: "Warm" },
          { value: "Cold", label: "Cold" },
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
      { name: "industry", label: "Industry", type: "text" },
    ],
  },
  {
    title: "Address",
    fields: [
      { name: "street", label: "Street", type: "textarea", colSpan: 2 },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State/Province", type: "text" },
      { name: "postalCode", label: "Postal Code", type: "text" },
      { name: "country", label: "Country", type: "text" },
    ],
  },
];

export default function LeadNewPage() {
  const router = useRouter();
  const createLead = useCreateLead();

  const defaultValues: Record<string, unknown> = {
    status: "New",
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    // Restructure address fields
    const { street, city, state, postalCode, country, ...rest } = values;
    const data = {
      ...rest,
      address: {
        street: street as string | undefined,
        city: city as string | undefined,
        state: state as string | undefined,
        postalCode: postalCode as string | undefined,
        country: country as string | undefined,
      },
    };

    try {
      const result = await createLead.mutateAsync(data as Parameters<typeof createLead.mutateAsync>[0]);
      toast({
        title: "Lead Created",
        description: "The lead has been successfully created.",
        variant: "success",
      });
      router.push(`/leads/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Lead</h1>
          <p className="text-sm text-muted-foreground">Create a new lead record</p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/leads")}
        isLoading={createLead.isPending}
        submitLabel="Create Lead"
        cancelLabel="Cancel"
      />
    </div>
  );
}
