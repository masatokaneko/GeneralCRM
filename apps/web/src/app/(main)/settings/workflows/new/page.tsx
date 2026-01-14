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
import { WorkflowActionEditor } from "@/components/organisms/WorkflowActionEditor";
import {
  useCreateWorkflow,
  useWorkflowObjects,
  useWorkflowObjectFields,
} from "@/lib/api/workflows";
import type { WorkflowAction, WorkflowTriggerType, WorkflowEvaluationCriteria } from "@/mocks/types";

const triggerTypes: { value: WorkflowTriggerType; label: string; description: string }[] = [
  {
    value: "BeforeSave",
    label: "Before Save",
    description: "Execute before the record is saved",
  },
  {
    value: "AfterSave",
    label: "After Save",
    description: "Execute after the record is saved",
  },
  {
    value: "Async",
    label: "Async",
    description: "Execute asynchronously after save",
  },
  {
    value: "Scheduled",
    label: "Scheduled",
    description: "Execute on a schedule",
  },
];

const evaluationTypes: { value: WorkflowEvaluationCriteria; label: string; description: string }[] = [
  {
    value: "Created",
    label: "Only when created",
    description: "Run only when the record is created",
  },
  {
    value: "CreatedOrEdited",
    label: "Created or edited",
    description: "Run when created or edited to meet criteria",
  },
  {
    value: "CreatedAndMeetsCriteria",
    label: "Every time criteria met",
    description: "Run every time the criteria is met",
  },
];

export default function NewWorkflowPage() {
  const router = useRouter();
  const createWorkflow = useCreateWorkflow();
  const { data: objectsData } = useWorkflowObjects();
  const objects = objectsData?.objects || [];

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    objectName: "",
    triggerType: "AfterSave" as WorkflowTriggerType,
    evaluationCriteria: "CreatedOrEdited" as WorkflowEvaluationCriteria,
    isActive: true,
  });

  const [conditions, setConditions] = useState<Condition[]>([]);
  const [filterLogic, setFilterLogic] = useState("");
  const [actions, setActions] = useState<WorkflowAction[]>([]);

  const { data: fieldsData } = useWorkflowObjectFields(formData.objectName);
  const objectFields: FieldDefinition[] = (fieldsData?.fields || []).map((f) => ({
    name: f.name,
    label: f.label,
    type: f.type as FieldDefinition["type"],
  }));

  const handleSave = async () => {
    await createWorkflow.mutateAsync({
      name: formData.name,
      description: formData.description || undefined,
      objectName: formData.objectName,
      triggerType: formData.triggerType,
      evaluationCriteria: formData.evaluationCriteria,
      isActive: formData.isActive,
      conditions: conditions.map((c) => ({
        id: c.id,
        field: c.field,
        operator: c.operator as "equals" | "notEquals" | "contains" | "startsWith" | "greaterThan" | "lessThan" | "isNull" | "isNotNull" | "changed" | "changedTo",
        value: c.value,
        orderIndex: c.orderIndex,
      })),
      filterLogic: filterLogic || undefined,
      actions,
    });
    router.push("/settings/workflows");
  };

  const isValid =
    formData.name.trim() &&
    formData.objectName &&
    actions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings/workflows">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">New Workflow Rule</h1>
          <p className="text-muted-foreground">
            Create a new workflow rule to automate field updates and actions
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!isValid || createWorkflow.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {createWorkflow.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="criteria">Rule Criteria</TabsTrigger>
          <TabsTrigger value="actions">Workflow Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Define the workflow rule name and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Rule Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Auto-close Won Opportunities"
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
                  placeholder="Describe what this workflow rule does..."
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <div className="grid gap-2">
                    {triggerTypes.map((trigger) => (
                      <div
                        key={trigger.value}
                        className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                          formData.triggerType === trigger.value
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, triggerType: trigger.value })
                        }
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-4 w-4 rounded-full border-2 ${
                              formData.triggerType === trigger.value
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {formData.triggerType === trigger.value && (
                              <div className="h-full w-full scale-50 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="font-medium">{trigger.label}</span>
                        </div>
                        <p className="mt-1 pl-6 text-sm text-muted-foreground">
                          {trigger.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Evaluation Criteria</Label>
                  <div className="grid gap-2">
                    {evaluationTypes.map((eval_type) => (
                      <div
                        key={eval_type.value}
                        className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                          formData.evaluationCriteria === eval_type.value
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            evaluationCriteria: eval_type.value,
                          })
                        }
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-4 w-4 rounded-full border-2 ${
                              formData.evaluationCriteria === eval_type.value
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {formData.evaluationCriteria === eval_type.value && (
                              <div className="h-full w-full scale-50 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="font-medium">{eval_type.label}</span>
                        </div>
                        <p className="mt-1 pl-6 text-sm text-muted-foreground">
                          {eval_type.description}
                        </p>
                      </div>
                    ))}
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
                  Active (rule will execute when triggered)
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criteria">
          <Card>
            <CardHeader>
              <CardTitle>Rule Criteria</CardTitle>
              <CardDescription>
                Define conditions that must be met for this rule to execute
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
                  conditions={conditions}
                  onChange={setConditions}
                  fields={objectFields}
                  filterLogic={filterLogic}
                  onFilterLogicChange={setFilterLogic}
                  showFilterLogic
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Actions</CardTitle>
              <CardDescription>
                Define actions to execute when the rule criteria is met
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
                <WorkflowActionEditor
                  actions={actions}
                  onChange={setActions}
                  fields={objectFields}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
