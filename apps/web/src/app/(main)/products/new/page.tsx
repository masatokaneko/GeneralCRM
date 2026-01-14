"use client";

import { useRouter } from "next/navigation";
import { RecordForm, type FormSection } from "@/components/organisms/RecordForm";
import { useCreateProduct } from "@/lib/api/products";
import { toast } from "@/components/organisms/Toast";
import { Button } from "@/components/atoms/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const formSections: FormSection[] = [
  {
    title: "Product Information",
    fields: [
      { name: "name", label: "Product Name", type: "text", required: true },
      { name: "productCode", label: "Product Code", type: "text" },
      { name: "family", label: "Product Family", type: "text" },
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

export default function ProductNewPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  const defaultValues: Record<string, unknown> = {
    isActive: "true",
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const data = {
        ...values,
        isActive: values.isActive === "true",
      };
      const result = await createProduct.mutateAsync(data);
      toast({
        title: "Product Created",
        description: "The product has been successfully created.",
        variant: "success",
      });
      router.push(`/products/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Product</h1>
          <p className="text-sm text-muted-foreground">
            Create a new product record
          </p>
        </div>
      </div>

      <RecordForm
        sections={formSections}
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/products")}
        isLoading={createProduct.isPending}
        submitLabel="Create Product"
        cancelLabel="Cancel"
      />
    </div>
  );
}
