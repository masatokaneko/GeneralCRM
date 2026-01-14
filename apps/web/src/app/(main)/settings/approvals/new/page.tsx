"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ConditionBuilder,
  type Condition,
  type FieldDefinition,
} from "@/components/organisms/ConditionBuilder";
import { ApprovalStepEditor } from "@/components/organisms/ApprovalStepEditor";
import { ApprovalActionEditor } from "@/components/organisms/ApprovalActionEditor";
import {
  useCreateApprovalProcess,
  useApprovalObjects,
  useApprovers,
} from "@/lib/api/approvalProcesses";
import { useWorkflowObjectFields } from "@/lib/api/workflows";
import type {
  ApprovalStep,
  ApprovalAction,
  RecordEditability,
} from "@/mocks/types";

export default function NewApprovalProcessPage() {
  const router = useRouter();
  const createProcess = useCreateApprovalProcess();
  const { data: objectsData } = useApprovalObjects();
  const { data: approversData } = useApprovers();
  const objects = objectsData?.objects || [];

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    objectName: "",
    recordEditability: "Locked" as RecordEditability,
    isActive: false,
  });

  const [entryCriteria, setEntryCriteria] = useState<Condition[]>([]);
  const [filterLogic, setFilterLogic] = useState("");
  const [steps, setSteps] = useState<ApprovalStep[]>([]);
  const [submitActions, setSubmitActions] = useState<ApprovalAction[]>([]);
  const [approveActions, setApproveActions] = useState<ApprovalAction[]>([]);
  const [rejectActions, setRejectActions] = useState<ApprovalAction[]>([]);

  const { data: fieldsData } = useWorkflowObjectFields(formData.objectName);
  const objectFields: FieldDefinition[] = (fieldsData?.fields || []).map((f) => ({
    name: f.name,
    label: f.label,
    type: f.type as FieldDefinition["type"],
  }));

  const handleSave = async () => {
    await createProcess.mutateAsync({
      name: formData.name,
      description: formData.description || undefined,
      objectName: formData.objectName,
      recordEditability: formData.recordEditability,
      isActive: formData.isActive,
      entryCriteria: entryCriteria.map((c) => ({
        id: c.id,
        field: c.field,
        operator: c.operator as "equals" | "notEquals" | "greaterThan" | "lessThan" | "isNull" | "isNotNull",
        value: c.value,
        orderIndex: c.orderIndex,
      })),
      filterLogic: filterLogic || undefined,
      steps,
      actions: {
        onSubmit: submitActions,
        onApprove: approveActions,
        onReject: rejectActions,
      },
    });
    router.push("/settings/approvals");
  };

  const isValid =
    formData.name.trim() && formData.objectName && steps.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings/approvals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">New Approval Process</h1>
          <p className="text-muted-foreground">
            Create a new approval process for record review workflows
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!isValid || createProcess.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {createProcess.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="criteria">Entry Criteria</TabsTrigger>
          <TabsTrigger value="steps">Approval Steps</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Define the approval process name and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Process Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Quote Discount Approval"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="object">Object *</Label>
                  <Select
                    value={formData.objectName}
                    onValueChange={(value) =>
                      setFormData({ ...formData, objectName: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select object..." />
                    </SelectTrigger>
                    <SelectContent>
                      {objects.map((obj) => (
                        <SelectItem key={obj} value={obj}>
                          {obj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe when this approval process applies..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Record Editability During Approval</Label>
                <div className="grid gap-2">
                  <div
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      formData.recordEditability === "Locked"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, recordEditability: "Locked" })
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          formData.recordEditability === "Locked"
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {formData.recordEditability === "Locked" && (
                          <div className="h-full w-full scale-50 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="font-medium">
                        Locked (Recommended)
                      </span>
                    </div>
                    <p className="mt-1 pl-6 text-sm text-muted-foreground">
                      Record cannot be edited while pending approval
                    </p>
                  </div>
                  <div
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      formData.recordEditability === "AdminOnly"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, recordEditability: "AdminOnly" })
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          formData.recordEditability === "AdminOnly"
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {formData.recordEditability === "AdminOnly" && (
                          <div className="h-full w-full scale-50 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="font-medium">Admin Only</span>
                    </div>
                    <p className="mt-1 pl-6 text-sm text-muted-foreground">
                      Only administrators can edit during approval
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked as boolean })
                  }
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Active (process will trigger when criteria is met)
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criteria">
          <Card>
            <CardHeader>
              <CardTitle>Entry Criteria</CardTitle>
              <CardDescription>
                Define conditions that determine when this approval process
                applies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!formData.objectName ? (
                <div className="py-8 text-center text-muted-foreground">
                  Please select an object first in the Basic Information tab
                </div>
              ) : objectFields.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading fields...
                </div>
              ) : (
                <ConditionBuilder
                  conditions={entryCriteria}
                  onChange={setEntryCriteria}
                  fields={objectFields}
                  filterLogic={filterLogic}
                  onFilterLogicChange={setFilterLogic}
                  showFilterLogic
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps">
          <Card>
            <CardHeader>
              <CardTitle>Approval Steps</CardTitle>
              <CardDescription>
                Define the approval steps and who needs to approve
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApprovalStepEditor
                steps={steps}
                onChange={setSteps}
                approvers={approversData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>
                Define actions to execute at different stages of the approval
                process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!formData.objectName ? (
                <div className="py-8 text-center text-muted-foreground">
                  Please select an object first in the Basic Information tab
                </div>
              ) : objectFields.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading fields...
                </div>
              ) : (
                <>
                  <ApprovalActionEditor
                    title="On Submit"
                    description="Actions to execute when record is submitted for approval"
                    actions={submitActions}
                    onChange={setSubmitActions}
                    fields={objectFields}
                  />
                  <div className="border-t pt-6">
                    <ApprovalActionEditor
                      title="On Final Approval"
                      description="Actions to execute when record is fully approved"
                      actions={approveActions}
                      onChange={setApproveActions}
                      fields={objectFields}
                    />
                  </div>
                  <div className="border-t pt-6">
                    <ApprovalActionEditor
                      title="On Final Rejection"
                      description="Actions to execute when record is rejected"
                      actions={rejectActions}
                      onChange={setRejectActions}
                      fields={objectFields}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
