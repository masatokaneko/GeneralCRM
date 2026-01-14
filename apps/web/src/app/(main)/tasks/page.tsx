"use client";

import { useRouter } from "next/navigation";
import { ListPageTemplate, type Column } from "@/components/templates";
import { Badge } from "@/components/atoms/Badge";
import { useTasks, type Task } from "@/lib/api/tasks";

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

const columns: Column<Task>[] = [
  {
    key: "subject",
    label: "Subject",
    sortable: true,
    render: (_value, task) => (
      <div className="font-medium">{task.subject}</div>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (_value, task) => (
      <Badge variant={statusColors[task.status] || "outline"}>
        {task.status.replace(/([A-Z])/g, " $1").trim()}
      </Badge>
    ),
  },
  {
    key: "priority",
    label: "Priority",
    sortable: true,
    render: (_value, task) => (
      <Badge variant={priorityColors[task.priority] || "outline"}>
        {task.priority}
      </Badge>
    ),
  },
  {
    key: "dueDate",
    label: "Due Date",
    sortable: true,
    render: (_value, task) =>
      task.dueDate
        ? new Date(task.dueDate).toLocaleDateString("ja-JP")
        : "-",
  },
  {
    key: "whatName",
    label: "Related To",
    render: (_value, task) => task.whatName || "-",
  },
  {
    key: "ownerName",
    label: "Owner",
    render: (_value, task) => task.ownerName || "-",
  },
];

export default function TasksPage() {
  const router = useRouter();
  const { data, isLoading } = useTasks();

  return (
    <ListPageTemplate
      title="Tasks"
      objectName="Task"
      columns={columns}
      data={(data?.records as Task[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      onRowClick={(task) => router.push(`/tasks/${task.id}`)}
      createHref="/tasks/new"
      searchPlaceholder="Search tasks..."
    />
  );
}
