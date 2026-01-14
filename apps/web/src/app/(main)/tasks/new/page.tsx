"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { useCreateTask } from "@/lib/api/tasks";
import { toast } from "@/components/organisms/Toast";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewTaskPage() {
  const router = useRouter();
  const createTask = useCreateTask();

  const [formData, setFormData] = React.useState({
    subject: "",
    status: "NotStarted",
    priority: "Normal",
    dueDate: "",
    activityDate: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject is required.",
        variant: "error",
      });
      return;
    }

    try {
      const result = await createTask.mutateAsync({
        subject: formData.subject,
        status: formData.status as "NotStarted" | "InProgress" | "Completed" | "WaitingOnSomeoneElse" | "Deferred",
        priority: formData.priority as "High" | "Normal" | "Low",
        dueDate: formData.dueDate || undefined,
        activityDate: formData.activityDate || undefined,
        description: formData.description || undefined,
      });
      toast({
        title: "Task Created",
        description: "The task has been successfully created.",
        variant: "success",
      });
      router.push(`/tasks/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create task.",
        variant: "error",
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto max-w-2xl py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tasks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h1 className="mb-6 text-2xl font-bold">New Task</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Enter task subject"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="NotStarted">Not Started</option>
                <option value="InProgress">In Progress</option>
                <option value="WaitingOnSomeoneElse">Waiting on Someone Else</option>
                <option value="Deferred">Deferred</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activityDate">Activity Date</Label>
              <Input
                id="activityDate"
                name="activityDate"
                type="date"
                value={formData.activityDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Enter task description..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/tasks">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
