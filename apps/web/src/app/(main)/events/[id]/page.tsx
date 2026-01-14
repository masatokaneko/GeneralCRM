"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { useEvent, useDeleteEvent } from "@/lib/api/events";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import * as React from "react";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sections: Section[] = [
  {
    title: "Event Information",
    fields: [
      { key: "subject", label: "Subject", type: "text" },
      {
        key: "startDateTime",
        label: "Start",
        type: "custom",
        render: (value) => formatDateTime(value as string),
      },
      {
        key: "endDateTime",
        label: "End",
        type: "custom",
        render: (value) => formatDateTime(value as string),
      },
      {
        key: "isAllDayEvent",
        label: "All Day Event",
        type: "badge",
        render: (value) =>
          value ? <Badge variant="secondary">Yes</Badge> : <span>No</span>,
      },
      { key: "location", label: "Location", type: "text" },
      { key: "ownerName", label: "Owner", type: "text" },
    ],
  },
  {
    title: "Related To",
    fields: [
      { key: "whoName", label: "Name (Who)", type: "text" },
      { key: "whatName", label: "Related To (What)", type: "text" },
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

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const { data: event, isLoading, error } = useEvent(id);
  const deleteEvent = useDeleteEvent();

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync(id);
      toast({
        title: "Event Deleted",
        description: "The event has been successfully deleted.",
        variant: "success",
      });
      router.push("/events");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  return (
    <>
      <DetailPageTemplate
        title={event?.subject || "Event"}
        subtitle={event?.location ? `${event.location}` : undefined}
        objectName="Event"
        record={event ? (event as unknown as Record<string, unknown>) : null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/events"
        editHref={`/events/${id}/edit`}
        onDelete={() => setShowDeleteModal(true)}
        headerBadge={
          event?.isAllDayEvent ? (
            <Badge variant="secondary">All Day</Badge>
          ) : undefined
        }
        systemInfo={{
          createdAt: event?.createdAt,
          updatedAt: event?.updatedAt,
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
            >
              {deleteEvent.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />
    </>
  );
}
