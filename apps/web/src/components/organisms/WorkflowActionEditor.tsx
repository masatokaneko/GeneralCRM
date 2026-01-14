"use client";

import * as React from "react";
import { Plus, X, GripVertical } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { WorkflowAction, WorkflowActionType, FieldDefinition } from "@/mocks/types";

export interface WorkflowActionEditorProps {
  actions: WorkflowAction[];
  onChange: (actions: WorkflowAction[]) => void;
  fields: FieldDefinition[];
  className?: string;
}

const actionTypeLabels: Record<WorkflowActionType, string> = {
  FieldUpdate: "Field Update",
  CreateTask: "Create Task",
  SendNotification: "Send Notification",
  SendEmail: "Send Email",
  OutboundMessage: "Outbound Message",
};

export function WorkflowActionEditor({
  actions,
  onChange,
  fields,
  className,
}: WorkflowActionEditorProps) {
  const generateId = () =>
    `action-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const addAction = () => {
    const newAction: WorkflowAction = {
      id: generateId(),
      type: "FieldUpdate",
      config: {
        field: fields[0]?.name || "",
        value: "",
      },
      orderIndex: actions.length,
    };
    onChange([...actions, newAction]);
  };

  const updateAction = (id: string, updates: Partial<WorkflowAction>) => {
    onChange(actions.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAction = (id: string) => {
    const updated = actions
      .filter((a) => a.id !== id)
      .map((a, index) => ({ ...a, orderIndex: index }));
    onChange(updated);
  };

  const handleTypeChange = (id: string, type: WorkflowActionType) => {
    let config: WorkflowAction["config"];

    switch (type) {
      case "FieldUpdate":
        config = { field: fields[0]?.name || "", value: "" };
        break;
      case "CreateTask":
        config = {
          subject: "",
          description: "",
          dueDate: { type: "relative", days: 7 },
          assignedTo: "RecordOwner",
          priority: "Normal",
        };
        break;
      case "SendNotification":
        config = { templateId: "", recipientType: "RecordOwner" };
        break;
      case "SendEmail":
        config = { templateId: "", recipientType: "RecordOwner" };
        break;
      case "OutboundMessage":
        config = { endpointUrl: "", includeFields: [] };
        break;
    }

    updateAction(id, { type, config });
  };

  const renderActionConfig = (action: WorkflowAction) => {
    switch (action.type) {
      case "FieldUpdate":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Field to Update</Label>
              <Select
                value={(action.config as { field?: string }).field || ""}
                onValueChange={(value) =>
                  updateAction(action.id, {
                    config: { ...action.config, field: value },
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select field..." />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">New Value</Label>
              <Input
                className="mt-1"
                value={(action.config as { value?: string | number | boolean | null }).value as string || ""}
                onChange={(e) =>
                  updateAction(action.id, {
                    config: { ...action.config, value: e.target.value },
                  })
                }
                placeholder="Enter value..."
              />
            </div>
          </div>
        );

      case "CreateTask":
        const taskConfig = action.config as {
          subject?: string;
          description?: string;
          dueDate?: { type: string; days: number } | string;
          assignedTo?: string;
          priority?: string;
        };
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Input
                className="mt-1"
                value={taskConfig.subject || ""}
                onChange={(e) =>
                  updateAction(action.id, {
                    config: { ...action.config, subject: e.target.value },
                  })
                }
                placeholder="Task subject..."
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Due Date (days)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={
                    typeof taskConfig.dueDate === "object"
                      ? taskConfig.dueDate.days
                      : 7
                  }
                  onChange={(e) =>
                    updateAction(action.id, {
                      config: {
                        ...action.config,
                        dueDate: {
                          type: "relative",
                          days: Number.parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Assigned To</Label>
                <Select
                  value={taskConfig.assignedTo || "RecordOwner"}
                  onValueChange={(value) =>
                    updateAction(action.id, {
                      config: { ...action.config, assignedTo: value as "RecordOwner" | "SpecificUser" },
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RecordOwner">Record Owner</SelectItem>
                    <SelectItem value="SpecificUser">Specific User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select
                  value={taskConfig.priority || "Normal"}
                  onValueChange={(value) =>
                    updateAction(action.id, {
                      config: { ...action.config, priority: value as "High" | "Normal" | "Low" },
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                className="mt-1"
                value={taskConfig.description || ""}
                onChange={(e) =>
                  updateAction(action.id, {
                    config: { ...action.config, description: e.target.value },
                  })
                }
                placeholder="Optional description..."
                rows={2}
              />
            </div>
          </div>
        );

      case "SendNotification":
      case "SendEmail":
        const emailConfig = action.config as {
          templateId?: string;
          recipientType?: string;
        };
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email Template</Label>
              <Input
                className="mt-1"
                value={emailConfig.templateId || ""}
                onChange={(e) =>
                  updateAction(action.id, {
                    config: { ...action.config, templateId: e.target.value },
                  })
                }
                placeholder="Template ID..."
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Recipient</Label>
              <Select
                value={emailConfig.recipientType || "RecordOwner"}
                onValueChange={(value) =>
                  updateAction(action.id, {
                    config: { ...action.config, recipientType: value as "RecordOwner" | "SpecificUser" | "Role" },
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RecordOwner">Record Owner</SelectItem>
                  <SelectItem value="CreatedBy">Created By</SelectItem>
                  <SelectItem value="LastModifiedBy">Last Modified By</SelectItem>
                  <SelectItem value="SpecificUser">Specific User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "OutboundMessage":
        const outboundConfig = action.config as {
          endpointUrl?: string;
        };
        return (
          <div>
            <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
            <Input
              className="mt-1"
              value={outboundConfig.endpointUrl || ""}
              onChange={(e) =>
                updateAction(action.id, {
                  config: { ...action.config, endpointUrl: e.target.value },
                })
              }
              placeholder="https://..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-3">
        {actions.map((action, index) => (
          <div
            key={action.id}
            className="rounded-lg border bg-muted/30 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <span className="text-sm font-medium text-muted-foreground">
                {index + 1}
              </span>
              <Select
                value={action.type}
                onValueChange={(value) =>
                  handleTypeChange(action.id, value as WorkflowActionType)
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(actionTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAction(action.id)}
                className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {renderActionConfig(action)}
          </div>
        ))}

        {actions.length === 0 && (
          <div className="p-4 text-center text-muted-foreground border border-dashed rounded-lg">
            No actions defined. Click &quot;Add Action&quot; to create one.
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addAction}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Action
      </Button>
    </div>
  );
}
