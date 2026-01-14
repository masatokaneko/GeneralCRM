"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { useLead, useDeleteLead, useConvertLead } from "@/lib/api/leads";
import { useAccounts } from "@/lib/api/accounts";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import { Label } from "@/components/atoms/Label";
import { Input } from "@/components/atoms/Input";
import * as React from "react";
import { ArrowRightCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  New: "secondary",
  Working: "default",
  Qualified: "default",
  Unqualified: "destructive",
};

const ratingColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Hot: "destructive",
  Warm: "default",
  Cold: "secondary",
};

const sections: Section[] = [
  {
    title: "Lead Information",
    fields: [
      {
        key: "fullName",
        label: "Name",
        type: "custom",
        render: (_value: unknown, record?: Record<string, unknown>) => {
          if (!record) return "-";
          return `${(record.firstName as string) || ""} ${record.lastName as string}`.trim();
        },
      },
      { key: "company", label: "Company", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "phone" },
      {
        key: "status",
        label: "Status",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={statusColors[String(value)] || "outline"}>
              {String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "rating",
        label: "Rating",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={ratingColors[String(value)] || "outline"}>
              {String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      { key: "leadSource", label: "Lead Source", type: "text" },
      { key: "industry", label: "Industry", type: "text" },
      { key: "ownerName", label: "Owner", type: "text" },
    ],
  },
  {
    title: "Address Information",
    collapsible: true,
    fields: [
      { key: "street", label: "Street", type: "text", colSpan: 2 },
      { key: "city", label: "City", type: "text" },
      { key: "state", label: "State/Province", type: "text" },
      { key: "postalCode", label: "Postal Code", type: "text" },
      { key: "country", label: "Country", type: "text" },
    ],
  },
];

interface ConvertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    firstName?: string;
    lastName: string;
    company: string;
  } | null;
  onConvert: (params: {
    createAccount: boolean;
    existingAccountId?: string;
    createOpportunity: boolean;
    opportunityName?: string;
  }) => void;
  isConverting: boolean;
}

function ConvertModal({ open, onOpenChange, lead, onConvert, isConverting }: ConvertModalProps) {
  const [createAccount, setCreateAccount] = React.useState(true);
  const [existingAccountId, setExistingAccountId] = React.useState("");
  const [createOpportunity, setCreateOpportunity] = React.useState(true);
  const [opportunityName, setOpportunityName] = React.useState("");

  const { data: accountsData } = useAccounts({ limit: 100 });

  React.useEffect(() => {
    if (lead) {
      setOpportunityName(`${lead.company} - New Opportunity`);
    }
  }, [lead]);

  const handleConvert = () => {
    onConvert({
      createAccount,
      existingAccountId: createAccount ? undefined : existingAccountId,
      createOpportunity,
      opportunityName: createOpportunity ? opportunityName : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Convert Lead"
      description={`Convert ${lead?.firstName || ""} ${lead?.lastName} to Account, Contact, and optionally Opportunity.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConverting}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={isConverting}>
            {isConverting ? "Converting..." : "Convert Lead"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Account Section */}
        <div className="space-y-4">
          <h4 className="font-medium">Account</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={createAccount}
                onChange={() => setCreateAccount(true)}
                className="h-4 w-4"
              />
              <span className="text-sm">Create new account: {lead?.company}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!createAccount}
                onChange={() => setCreateAccount(false)}
                className="h-4 w-4"
              />
              <span className="text-sm">Attach to existing account</span>
            </label>
            {!createAccount && (
              <select
                value={existingAccountId}
                onChange={(e) => setExistingAccountId(e.target.value)}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select an account...</option>
                {accountsData?.records.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Contact Section */}
        <div className="space-y-2">
          <h4 className="font-medium">Contact</h4>
          <p className="text-sm text-muted-foreground">
            A new contact will be created: {lead?.firstName} {lead?.lastName}
          </p>
        </div>

        {/* Opportunity Section */}
        <div className="space-y-4">
          <h4 className="font-medium">Opportunity</h4>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={createOpportunity}
              onChange={(e) => setCreateOpportunity(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">Create a new opportunity</span>
          </label>
          {createOpportunity && (
            <div className="space-y-2">
              <Label htmlFor="opportunityName">Opportunity Name</Label>
              <Input
                id="opportunityName"
                value={opportunityName}
                onChange={(e) => setOpportunityName(e.target.value)}
                placeholder="Opportunity name"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showConvertModal, setShowConvertModal] = React.useState(false);

  const { data: lead, isLoading, error } = useLead(id);
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLead();

  const handleDelete = async () => {
    try {
      await deleteLead.mutateAsync(id);
      toast({
        title: "Lead Deleted",
        description: "The lead has been successfully deleted.",
        variant: "success",
      });
      router.push("/leads");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete lead.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  const handleConvert = async (params: {
    createAccount: boolean;
    existingAccountId?: string;
    createOpportunity: boolean;
    opportunityName?: string;
  }) => {
    try {
      const result = await convertLead.mutateAsync({
        id,
        params: {
          createAccount: params.createAccount,
          existingAccountId: params.existingAccountId,
          createOpportunity: params.createOpportunity,
          opportunityName: params.opportunityName,
        },
      });
      toast({
        title: "Lead Converted",
        description: "The lead has been successfully converted.",
        variant: "success",
      });
      setShowConvertModal(false);
      router.push(`/contacts/${result.contactId}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to convert lead.",
        variant: "error",
      });
    }
  };

  // Flatten address fields for display
  const recordWithAddress = lead
    ? {
        ...lead,
        street: lead.address?.street,
        city: lead.address?.city,
        state: lead.address?.state,
        postalCode: lead.address?.postalCode,
        country: lead.address?.country,
      }
    : null;

  return (
    <>
      <DetailPageTemplate
        title={lead ? `${lead.firstName || ""} ${lead.lastName}`.trim() : "Lead"}
        subtitle={lead?.company}
        objectName="Lead"
        record={recordWithAddress as Record<string, unknown> | null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/leads"
        editHref={lead?.isConverted ? undefined : `/leads/${id}/edit`}
        onDelete={lead?.isConverted ? undefined : () => setShowDeleteModal(true)}
        headerBadge={
          lead?.isConverted ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="mr-1 h-3 w-3" />
              Converted
            </Badge>
          ) : lead?.status ? (
            <Badge variant={statusColors[lead.status] || "outline"}>
              {lead.status}
            </Badge>
          ) : undefined
        }
        headerActions={
          !lead?.isConverted && lead ? (
            <Button onClick={() => setShowConvertModal(true)}>
              <ArrowRightCircle className="mr-2 h-4 w-4" />
              Convert Lead
            </Button>
          ) : lead?.isConverted ? (
            <div className="flex gap-2">
              {lead.convertedAccountId && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/accounts/${lead.convertedAccountId}`}>View Account</Link>
                </Button>
              )}
              {lead.convertedContactId && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/contacts/${lead.convertedContactId}`}>View Contact</Link>
                </Button>
              )}
              {lead.convertedOpportunityId && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/opportunities/${lead.convertedOpportunityId}`}>
                    View Opportunity
                  </Link>
                </Button>
              )}
            </div>
          ) : undefined
        }
        systemInfo={{
          createdAt: lead?.createdAt,
          createdBy: lead?.createdByName,
          updatedAt: lead?.updatedAt,
          updatedBy: lead?.lastModifiedByName,
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLead.isPending}
            >
              {deleteLead.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />

      {/* Convert Lead Modal */}
      <ConvertModal
        open={showConvertModal}
        onOpenChange={setShowConvertModal}
        lead={lead || null}
        onConvert={handleConvert}
        isConverting={convertLead.isPending}
      />
    </>
  );
}
