"use client";

import { useParams, useRouter } from "next/navigation";
import { DetailPageTemplate, type Section } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { useTask, useDeleteTask, useCompleteTask } from "@/lib/api/tasks";
import { toast } from "@/components/organisms/Toast";
import { Modal } from "@/components/organisms/Modal";
import * as React from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NotStarted: "outline",
  InProgress: "secondary",
  Completed: "default",
  WaitingOnSomeoneElse: "outline",
  Deferred: "destructive",
};

const priorityColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  High: "destructive",
  Normal: "secondary",
  Low: "outline",
};

const sections: Section[] = [
  {
    title: "Task Information",
    fields: [
      { key: "subject", label: "Subject", type: "text" },
      {
        key: "status",
        label: "Status",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={statusColors[String(value)] || "outline"}>
              {String(value).replace(/([A-Z])/g, " $1").trim()}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "priority",
        label: "Priority",
        type: "badge",
        render: (value) =>
          value ? (
            <Badge variant={priorityColors[String(value)] || "outline"}>
              {String(value)}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "dueDate",
        label: "Due Date",
        type: "date",
      },
      {
        key: "activityDate",
        label: "Activity Date",
        type: "date",
      },
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

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const { data: task, isLoading, error } = useTask(id);
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(id);
      toast({
        title: "Task Deleted",
        description: "The task has been successfully deleted.",
        variant: "success",
      });
      router.push("/tasks");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "error",
      });
    }
    setShowDeleteModal(false);
  };

  const handleComplete = async () => {
    try {
      await completeTask.mutateAsync(id);
      toast({
        title: "Task Completed",
        description: "The task has been marked as completed.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to complete task.",
        variant: "error",
      });
    }
  };

  return (
    <>
      <DetailPageTemplate
        title={task?.subject || "Task"}
        objectName="Task"
        record={(task as unknown as Record<string, unknown>) || null}
        sections={sections}
        isLoading={isLoading}
        error={error}
        backHref="/tasks"
        editHref={task?.isClosed ? undefined : `/tasks/${id}/edit`}
        onDelete={() => setShowDeleteModal(true)}
        headerBadge={
          task?.status ? (
            <Badge variant={statusColors[task.status] || "outline"}>
              {task.status.replace(/([A-Z])/g, " $1").trim()}
            </Badge>
          ) : undefined
        }
        headerActions={
          task && !task.isClosed ? (
            <Button onClick={handleComplete} disabled={completeTask.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              {completeTask.isPending ? "Completing..." : "Mark Complete"}
            </Button>
          ) : undefined
        }
        systemInfo={{
          createdAt: task?.createdAt,
          updatedAt: task?.updatedAt,
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      />
    </>
  );
}
