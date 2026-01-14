"use client";

import { useParams, useRouter } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useLead, useUpdateLead } from "@/lib/api/leads";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft, Loader2 } from "lucide-react";
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

export default function LeadEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: lead, isLoading: isLoadingLead, error } = useLead(id);
  const updateLead = useUpdateLead();

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
      await updateLead.mutateAsync({
        id,
        data: data as Parameters<typeof updateLead.mutateAsync>[0]["data"],
        etag: lead?.systemModstamp,
      });
      toast({
        title: "Lead Updated",
        description: "The lead has been successfully updated.",
        variant: "success",
      });
      router.push(`/leads/${id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "error",
      });
    }
  };

  if (isLoadingLead) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Lead not found</p>
        <Button asChild variant="outline">
          <Link href="/leads">Back to Leads</Link>
        </Button>
      </div>
    );
  }

  if (lead.isConverted) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Converted leads cannot be edited</p>
        <Button asChild variant="outline">
          <Link href={`/leads/${id}`}>Back to Lead</Link>
        </Button>
      </div>
    );
  }

  // Flatten address for form
  const initialValues = {
    ...lead,
    street: lead.address?.street,
    city: lead.address?.city,
    state: lead.address?.state,
    postalCode: lead.address?.postalCode,
    country: lead.address?.country,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/leads/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Edit Lead</h1>
          <p className="text-sm text-muted-foreground">
            {lead.firstName} {lead.lastName}
          </p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/leads/${id}`)}
        isLoading={updateLead.isPending}
        submitLabel="Save"
        cancelLabel="Cancel"
      />
    </div>
  );
}
