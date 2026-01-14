"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Label } from "@/components/atoms/Label";
import { useCreateEvent } from "@/lib/api/events";
import { toast } from "@/components/organisms/Toast";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewEventPage() {
  const router = useRouter();
  const createEvent = useCreateEvent();

  const [formData, setFormData] = React.useState({
    subject: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
    isAllDayEvent: false,
    location: "",
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

    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Start and end dates are required.",
        variant: "error",
      });
      return;
    }

    const startDateTime = formData.isAllDayEvent
      ? `${formData.startDate}T00:00:00Z`
      : `${formData.startDate}T${formData.startTime}:00Z`;

    const endDateTime = formData.isAllDayEvent
      ? `${formData.endDate}T23:59:59Z`
      : `${formData.endDate}T${formData.endTime}:00Z`;

    if (new Date(endDateTime) < new Date(startDateTime)) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date.",
        variant: "error",
      });
      return;
    }

    try {
      const result = await createEvent.mutateAsync({
        subject: formData.subject,
        startDateTime,
        endDateTime,
        isAllDayEvent: formData.isAllDayEvent,
        location: formData.location || undefined,
        description: formData.description || undefined,
      });
      toast({
        title: "Event Created",
        description: "The event has been successfully created.",
        variant: "success",
      });
      router.push(`/events/${result.id}`);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create event.",
        variant: "error",
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div className="container mx-auto max-w-2xl py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h1 className="mb-6 text-2xl font-bold">New Event</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Enter event subject"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAllDayEvent"
              name="isAllDayEvent"
              checked={formData.isAllDayEvent}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isAllDayEvent">All Day Event</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>
            {!formData.isAllDayEvent && (
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>
            {!formData.isAllDayEvent && (
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter event location"
            />
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
              placeholder="Enter event description..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/events">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
