"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useEvents, type Event } from "@/lib/api/events";

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const columns: Column<Event>[] = [
  {
    key: "subject",
    label: "Subject",
    sortable: true,
    render: (_value, row) => (
      <div className="font-medium">{row.subject}</div>
    ),
  },
  {
    key: "startDateTime",
    label: "Start",
    sortable: true,
    render: (value) => formatDateTime(String(value)),
  },
  {
    key: "endDateTime",
    label: "End",
    sortable: true,
    render: (value) => formatDateTime(String(value)),
  },
  {
    key: "location",
    label: "Location",
    render: (value) => (value ? String(value) : "-"),
  },
  {
    key: "isAllDayEvent",
    label: "All Day",
    render: (value) =>
      value ? (
        <Badge variant="secondary">All Day</Badge>
      ) : (
        "-"
      ),
  },
  {
    key: "whatName",
    label: "Related To",
    render: (value) => (value ? String(value) : "-"),
  },
  {
    key: "ownerName",
    label: "Owner",
    render: (value) => (value ? String(value) : "-"),
  },
];

export default function EventsPage() {
  const router = useRouter();
  const { data, isLoading } = useEvents();

  return (
    <ListPageTemplate
      title="Events"
      objectName="Event"
      columns={columns}
      data={(data?.records as Event[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      onRowClick={(event) => router.push(`/events/${event.id}`)}
      createHref="/events/new"
      searchPlaceholder="Search events..."
    />
  );
}
