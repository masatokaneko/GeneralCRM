"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { ApprovalAction, ApprovalActionType, FieldDefinition } from "@/mocks/types";

export interface ApprovalActionEditorProps {
  actions: ApprovalAction[];
  onChange: (actions: ApprovalAction[]) => void;
  fields: FieldDefinition[];
  title: string;
  description?: string;
  className?: string;
}

const actionTypeLabels: Record<ApprovalActionType, string> = {
  FieldUpdate: "Field Update",
  SendEmail: "Send Email",
  OutboundMessage: "Outbound Message",
};

export function ApprovalActionEditor({
  actions,
  onChange,
  fields,
  title,
  description,
  className,
}: ApprovalActionEditorProps) {
  const generateId = () =>
    `action-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const addAction = () => {
    const newAction: ApprovalAction = {
      id: generateId(),
      type: "FieldUpdate",
      config: {
        field: fields[0]?.name || "",
        value: "",
      },
    };
    onChange([...actions, newAction]);
  };

  const updateAction = (id: string, updates: Partial<ApprovalAction>) => {
    onChange(actions.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const removeAction = (id: string) => {
    onChange(actions.filter((a) => a.id !== id));
  };

  const handleTypeChange = (id: string, type: ApprovalActionType) => {
    let config: ApprovalAction["config"];

    switch (type) {
      case "FieldUpdate":
        config = { field: fields[0]?.name || "", value: "" };
        break;
      case "SendEmail":
        config = { templateId: "", recipientType: "RecordOwner" };
        break;
      case "OutboundMessage":
        config = { endpointUrl: "" };
        break;
    }

    updateAction(id, { type, config });
  };

  const renderActionConfig = (action: ApprovalAction) => {
    switch (action.type) {
      case "FieldUpdate":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                Field to Update
              </Label>
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
                value={
                  (
                    action.config as {
                      value?: string | number | boolean | null;
                    }
                  ).value as string || ""
                }
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

      case "SendEmail":
        const emailConfig = action.config as {
          templateId?: string;
          recipientType?: string;
        };
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">
                Email Template
              </Label>
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
                    config: { ...action.config, recipientType: value as "RecordOwner" | "SpecificUser" | "ContactField" },
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RecordOwner">Record Owner</SelectItem>
                  <SelectItem value="SpecificUser">Specific User</SelectItem>
                  <SelectItem value="ContactField">Contact Field</SelectItem>
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
    <div className={cn("space-y-3", className)}>
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="space-y-2">
        {actions.map((action, index) => (
          <div
            key={action.id}
            className="rounded-lg border bg-background p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {index + 1}
              </span>
              <Select
                value={action.type}
                onValueChange={(value) =>
                  handleTypeChange(action.id, value as ApprovalActionType)
                }
              >
                <SelectTrigger className="w-[180px]">
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
                className="ml-auto h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            {renderActionConfig(action)}
          </div>
        ))}

        {actions.length === 0 && (
          <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
            No actions defined
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addAction}
        className="gap-1 text-xs"
      >
        <Plus className="h-3 w-3" />
        Add Action
      </Button>
    </div>
  );
}
