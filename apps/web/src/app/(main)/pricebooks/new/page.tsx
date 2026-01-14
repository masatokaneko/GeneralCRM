"use client";

import { useRouter } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useCreatePricebook } from "@/lib/api/pricebooks";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSections: FormSection[] = [
  {
    title: "Pricebook Information",
    fields: [
      { name: "name", label: "Pricebook Name", type: "text", required: true },
      {
        name: "isActive",
        label: "Active",
        type: "select",
        options: [
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
        ],
      },
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

export default function PricebookNewPage() {
  const router = useRouter();
  const createPricebook = useCreatePricebook();

  const defaultValues: Record<string, unknown> = {
    isActive: "true",
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data = {
        ...values,
        isActive: values.isActive === "true",
      };
      const result = await createPricebook.mutateAsync(data);
      toast({
        title: "Pricebook Created",
        description: "The pricebook has been successfully created.",
        variant: "success",
      });
      router.push(`/pricebooks/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create pricebook. Please try again.",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/pricebooks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Price Book</h1>
          <p className="text-sm text-muted-foreground">
            Create a new price book record
          </p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/pricebooks")}
        isLoading={createPricebook.isPending}
        submitLabel="Create Pricebook"
        cancelLabel="Cancel"
      />
    </div>
  );
}
