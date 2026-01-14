"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useContacts } from "@/lib/api/contacts";

interface Contact {
  id: string;
  firstName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  accountName?: string;
  isPrimary?: boolean;
  ownerName?: string;
}

const columns: Column<Contact>[] = [
  {
    key: "fullName",
    label: "Name",
    sortable: true,
    render: (_, row) => (
      <div>
        <span className="font-medium text-primary">
          {row.firstName} {row.lastName}
        </span>
        {row.isPrimary && (
          <Badge variant="outline" className="ml-2 text-xs">
            Primary
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: "title",
    label: "Title",
    sortable: true,
  },
  {
    key: "accountName",
    label: "Account",
    sortable: true,
    render: (value) => (
      <span className="text-primary">{String(value)}</span>
    ),
  },
  {
    key: "email",
    label: "Email",
    render: (value) =>
      value ? (
        <a
          href={`mailto:${value}`}
          className="text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {String(value)}
        </a>
      ) : (
        "-"
      ),
  },
  {
    key: "phone",
    label: "Phone",
  },
  {
    key: "ownerName",
    label: "Owner",
    sortable: true,
  },
];

export default function ContactsPage() {
  const router = useRouter();
  const { data, isLoading, error } = useContacts();

  const handleRowClick = (contact: Contact) => {
    router.push(`/contacts/${contact.id}`);
  };

  return (
    <ListPageTemplate
      title="Contacts"
      objectName="Contact"
      columns={columns}
      data={(data?.records as Contact[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      onRowClick={handleRowClick}
      createHref="/contacts/new"
      searchPlaceholder="Search contacts by name or email..."
    />
  );
}
