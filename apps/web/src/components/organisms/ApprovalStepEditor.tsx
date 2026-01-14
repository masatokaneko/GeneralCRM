"use client";

import * as React from "react";
import { Plus, X, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
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
import type { ApprovalStep, ApproverType, RejectBehavior } from "@/mocks/types";
import type { ApproverOption } from "@/lib/api/approvalProcesses";

export interface ApprovalStepEditorProps {
  steps: ApprovalStep[];
  onChange: (steps: ApprovalStep[]) => void;
  approvers?: {
    users?: ApproverOption[];
    queues?: ApproverOption[];
    roles?: ApproverOption[];
  };
  className?: string;
}

const approverTypeLabels: Record<ApproverType, string> = {
  Manager: "Submitter's Manager",
  ManagersManager: "Manager's Manager",
  SpecificUser: "Specific User",
  Queue: "Queue",
  Role: "Role",
};

const rejectBehaviorLabels: Record<RejectBehavior, string> = {
  FinalRejection: "Final Rejection",
  BackToSubmitter: "Return to Submitter",
  BackToPreviousStep: "Return to Previous Step",
};

export function ApprovalStepEditor({
  steps,
  onChange,
  approvers,
  className,
}: ApprovalStepEditorProps) {
  const generateId = () =>
    `step-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const addStep = () => {
    const newStep: ApprovalStep = {
      id: generateId(),
      name: `Step ${steps.length + 1}`,
      orderIndex: steps.length,
      approverType: "Manager",
      rejectBehavior: "FinalRejection",
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (id: string, updates: Partial<ApprovalStep>) => {
    onChange(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeStep = (id: string) => {
    const updated = steps
      .filter((s) => s.id !== id)
      .map((s, index) => ({ ...s, orderIndex: index }));
    onChange(updated);
  };

  const moveStep = (id: string, direction: "up" | "down") => {
    const index = steps.findIndex((s) => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [
      newSteps[targetIndex],
      newSteps[index],
    ];

    onChange(newSteps.map((s, i) => ({ ...s, orderIndex: i })));
  };

  const renderApproverSelect = (step: ApprovalStep) => {
    if (step.approverType === "Manager" || step.approverType === "ManagersManager") {
      return null;
    }

    let options: ApproverOption[] = [];
    let placeholder = "";

    switch (step.approverType) {
      case "SpecificUser":
        options = approvers?.users || [];
        placeholder = "Select user...";
        break;
      case "Queue":
        options = approvers?.queues || [];
        placeholder = "Select queue...";
        break;
      case "Role":
        options = approvers?.roles || [];
        placeholder = "Select role...";
        break;
    }

    return (
      <div className="mt-2">
        <Label className="text-xs text-muted-foreground">
          {step.approverType === "SpecificUser" ? "User" : step.approverType}
        </Label>
        <Select
          value={step.approverId || ""}
          onValueChange={(value) => updateStep(step.id, { approverId: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center gap-1 pt-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveStep(step.id, "up")}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => moveStep(step.id, "down")}
                  disabled={index === steps.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {index + 1}
                  </span>
                  <Input
                    value={step.name}
                    onChange={(e) =>
                      updateStep(step.id, { name: e.target.value })
                    }
                    className="max-w-xs"
                    placeholder="Step name..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Approver Type
                    </Label>
                    <Select
                      value={step.approverType}
                      onValueChange={(value) =>
                        updateStep(step.id, {
                          approverType: value as ApproverType,
                          approverId: undefined,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(approverTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {renderApproverSelect(step)}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      If Rejected
                    </Label>
                    <Select
                      value={step.rejectBehavior}
                      onValueChange={(value) =>
                        updateStep(step.id, {
                          rejectBehavior: value as RejectBehavior,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(rejectBehaviorLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeStep(step.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {steps.length === 0 && (
          <div className="p-4 text-center text-muted-foreground border border-dashed rounded-lg">
            No approval steps defined. Click &quot;Add Step&quot; to create one.
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addStep}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Step
      </Button>
    </div>
  );
}
