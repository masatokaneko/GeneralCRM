"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { RelatedList } from "@/components/organisms/RelatedList";
import { Badge } from "@/components/atoms/Badge";
import { useContact, useDeleteContact } from "@/lib/api/contacts";
import { useOpportunitiesByAccount } from "@/lib/api/opportunities";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import { Button } from "@/components/atoms/Button";
import * as React from "react";
import Link from "next/link";

const sections: Section[] = [
  {
    title: "Contact Information",
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
      { key: "accountName", label: "Account", type: "reference" },
      { key: "title", label: "Title", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone", type: "phone" },
      { key: "mobilePhone", label: "Mobile", type: "phone" },
      {
        key: "isPrimary",
        label: "Primary Contact",
        type: "badge",
        render: (value) =>
          value ? <Badge variant="default">Primary</Badge> : "-",
      },
      { key: "ownerName", label: "Owner", type: "text" },
    ],
  },
  {
    title: "Mailing Address",
    collapsible: true,
    fields: [
      { key: "mailingStreet", label: "Street", type: "text", colSpan: 2 },
      { key: "mailingCity", label: "City", type: "text" },
      { key: "mailingState", label: "State/Province", type: "text" },
      { key: "mailingPostalCode", label: "Postal Code", type: "text" },
      { key: "mailingCountry", label: "Country", type: "text" },
    ],
  },
];

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const { data: contact, isLoading, error } = useContact(id);
  const { data: opportunitiesData } = useOpportunitiesByAccount(contact?.accountId);
  const deleteContact = useDeleteContact();

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync(id);
      toast({
        title: "Contact Deleted",
        description: "The contact has been successfully deleted.",
        variant: "success",
      });
      router.push("/contacts");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete contact.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  // Flatten mailing address for display
  const recordWithAddress = contact
    ? {
        ...contact,
        mailingStreet: contact.mailingAddress?.street,
        mailingCity: contact.mailingAddress?.city,
        mailingState: contact.mailingAddress?.state,
        mailingPostalCode: contact.mailingAddress?.postalCode,
        mailingCountry: contact.mailingAddress?.country,
      }
    : null;

  return (
    <>
      <DetailPageTemplate
        title={contact ? `${contact.firstName || ""} ${contact.lastName}`.trim() : "Contact"}
        subtitle={contact?.title}
        objectName="Contact"
        record={recordWithAddress as Record<string, unknown> | null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/contacts"
        editHref={`/contacts/${id}/edit`}
        onDelete={() => setShowDeleteModal(true)}
        headerBadge={
          contact?.isPrimary ? (
            <Badge variant="default">Primary Contact</Badge>
          ) : undefined
        }
        headerActions={
          contact?.accountId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/accounts/${contact.accountId}`}>View Account</Link>
            </Button>
          ) : undefined
        }
        systemInfo={{
          createdAt: contact?.createdAt,
          createdBy: contact?.createdByName,
          updatedAt: contact?.updatedAt,
          updatedBy: contact?.lastModifiedByName,
        }}
        relatedLists={
          contact?.accountId ? (
            <RelatedList
              title="Related Opportunities"
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
              createHref={`/opportunities/new?accountId=${contact.accountId}`}
              viewAllHref={`/opportunities?accountId=${contact.accountId}`}
              emptyMessage="No opportunities for this account"
            />
          ) : undefined
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Contact"
        description="Are you sure you want to delete this contact? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteContact.isPending}
            >
              {deleteContact.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />
    </>
  );
}
