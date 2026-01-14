"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { RelatedList } from "@/components/organisms/RelatedList";
import { Badge } from "@/components/atoms/Badge";
import { useAccount, useDeleteAccount } from "@/lib/api/accounts";
import { useContactsByAccount } from "@/lib/api/contacts";
import { useOpportunitiesByAccount } from "@/lib/api/opportunities";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import { Button } from "@/components/atoms/Button";
import * as React from "react";

const typeColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Customer: "default",
  Prospect: "secondary",
  Partner: "outline",
  Competitor: "destructive",
  Other: "outline",
};

const sections: Section[] = [
  {
    title: "Account Information",
    fields: [
      { key: "name", label: "Account Name", type: "text" },
      {
        key: "type",
        label: "Type",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={typeColors[String(value)] || "outline"}>
              {String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      { key: "industry", label: "Industry", type: "text" },
      { key: "website", label: "Website", type: "url" },
      { key: "phone", label: "Phone", type: "phone" },
      {
        key: "annualRevenue",
        label: "Annual Revenue",
        type: "currency",
      },
      { key: "numberOfEmployees", label: "Employees", type: "text" },
      { key: "ownerName", label: "Owner", type: "text" },
    ],
  },
  {
    title: "Address Information",
    collapsible: true,
    fields: [
      { key: "billingStreet", label: "Billing Street", type: "text", colSpan: 2 },
      { key: "billingCity", label: "Billing City", type: "text" },
      { key: "billingState", label: "Billing State", type: "text" },
      { key: "billingPostalCode", label: "Billing Postal Code", type: "text" },
      { key: "billingCountry", label: "Billing Country", type: "text" },
      { key: "shippingStreet", label: "Shipping Street", type: "text", colSpan: 2 },
      { key: "shippingCity", label: "Shipping City", type: "text" },
      { key: "shippingState", label: "Shipping State", type: "text" },
      { key: "shippingPostalCode", label: "Shipping Postal Code", type: "text" },
      { key: "shippingCountry", label: "Shipping Country", type: "text" },
    ],
  },
  {
    title: "Description",
    collapsible: true,
    fields: [
      { key: "description", label: "Description", type: "text", colSpan: 2 },
    ],
  },
];

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const { data: account, isLoading, error } = useAccount(id);
  const { data: contactsData } = useContactsByAccount(id);
  const { data: opportunitiesData } = useOpportunitiesByAccount(id);
  const deleteAccount = useDeleteAccount();

  const handleDelete = async () => {
    try {
      await deleteAccount.mutateAsync(id);
      toast({
        title: "Account Deleted",
        description: "The account has been successfully deleted.",
        variant: "success",
      });
      router.push("/accounts");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete account.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  return (
    <>
      <DetailPageTemplate
        title={account?.name || "Account"}
        subtitle={account?.industry}
        objectName="Account"
        record={account ? (account as unknown as Record<string, unknown>) : null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/accounts"
        editHref={`/accounts/${id}/edit`}
        onDelete={() => setShowDeleteModal(true)}
        headerBadge={
          account?.type ? (
            <Badge variant={typeColors[account.type] || "outline"}>
              {account.type}
            </Badge>
          ) : undefined
        }
        systemInfo={{
          createdAt: account?.createdAt,
          createdBy: account?.createdByName,
          updatedAt: account?.updatedAt,
          updatedBy: account?.lastModifiedByName,
        }}
        relatedLists={
          <>
            <RelatedList
              title="Contacts"
              objectName="Contacts"
              columns={[
                {
                  key: "fullName",
                  label: "Name",
                  render: (_, row) => (
                    <span className="font-medium text-primary">
                      {(row as { firstName?: string; lastName: string }).firstName}{" "}
                      {(row as { lastName: string }).lastName}
                    </span>
                  ),
                },
                { key: "title", label: "Title" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Phone" },
              ]}
              records={contactsData?.records || []}
              totalCount={contactsData?.totalSize}
              onRowClick={(contact) => router.push(`/contacts/${contact.id}`)}
              createHref={`/contacts/new?accountId=${id}`}
              viewAllHref={`/contacts?accountId=${id}`}
              emptyMessage="No contacts associated with this account"
            />

            <RelatedList
              title="Opportunities"
              objectName="Opportunities"
              columns={[
                {
                  key: "name",
                  label: "Opportunity Name",
                  render: (value) => (
                    <span className="font-medium text-primary">{String(value)}</span>
                  ),
                },
                { key: "stageName", label: "Stage" },
                {
                  key: "amount",
                  label: "Amount",
                  render: (value) =>
                    value
                      ? new Intl.NumberFormat("ja-JP", {
                          style: "currency",
                          currency: "JPY",
                          maximumFractionDigits: 0,
                        }).format(Number(value))
                      : "-",
                },
                {
                  key: "closeDate",
                  label: "Close Date",
                  render: (value) =>
                    value
                      ? new Date(String(value)).toLocaleDateString("ja-JP")
                      : "-",
                },
              ]}
              records={opportunitiesData?.records || []}
              totalCount={opportunitiesData?.totalSize}
              onRowClick={(opp) => router.push(`/opportunities/${opp.id}`)}
              createHref={`/opportunities/new?accountId=${id}`}
              viewAllHref={`/opportunities?accountId=${id}`}
              emptyMessage="No opportunities associated with this account"
            />
          </>
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Account"
        description="Are you sure you want to delete this account? This action cannot be undone."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAccount.isPending}
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />
    </>
  );
}
