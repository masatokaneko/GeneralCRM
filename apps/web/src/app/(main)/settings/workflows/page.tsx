"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Power,
  PowerOff,
  Workflow,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  useWorkflows,
  useDeleteWorkflow,
  useToggleWorkflow,
  useWorkflowObjects,
} from "@/lib/api/workflows";
import type { WorkflowRule } from "@/mocks/types";

export default function WorkflowsSettingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [objectFilter, setObjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRule | null>(
    null
  );

  const { data: objectsData } = useWorkflowObjects();
  const { data: workflowsData, isLoading } = useWorkflows({
    objectName: objectFilter !== "all" ? objectFilter : undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
    search: search || undefined,
  });
  const deleteWorkflow = useDeleteWorkflow();
  const toggleWorkflow = useToggleWorkflow();

  const workflows = workflowsData?.records || [];
  const objects = objectsData?.objects || [];

  const handleDelete = async () => {
    if (!selectedWorkflow) return;
    await deleteWorkflow.mutateAsync(selectedWorkflow.id);
    setIsDeleteDialogOpen(false);
    setSelectedWorkflow(null);
  };

  const handleToggle = async (workflow: WorkflowRule) => {
    await toggleWorkflow.mutateAsync(workflow.id);
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      BeforeSave: "Before Save",
      AfterSave: "After Save",
      Async: "Async",
      Scheduled: "Scheduled",
    };
    return labels[trigger] || trigger;
  };

  const getEvaluationLabel = (evaluation: string) => {
    const labels: Record<string, string> = {
      Created: "Created",
      CreatedOrEdited: "Created/Edited",
      CreatedAndMeetsCriteria: "Criteria Met",
    };
    return labels[evaluation] || evaluation;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Workflow Rules</h1>
          <p className="text-muted-foreground">
            Automate field updates and actions based on record changes
          </p>
        </div>
        <Button onClick={() => router.push("/settings/workflows/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Workflow Rules</CardTitle>
          <CardDescription>
            Define rules that automatically execute actions when records are
            created or updated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search workflow rules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={objectFilter} onValueChange={setObjectFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by object" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Objects</SelectItem>
                {objects.map((obj) => (
                  <SelectItem key={obj} value={obj}>
                    {obj}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading workflow rules...</p>
            </div>
          ) : workflows.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Object</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Evaluation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map((workflow) => (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div>
                          <Link
                            href={`/settings/workflows/${workflow.id}`}
                            className="font-medium hover:underline"
                          >
                            {workflow.name}
                          </Link>
                          {workflow.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {workflow.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{workflow.objectName}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {getTriggerLabel(workflow.triggerType)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getEvaluationLabel(workflow.evaluationCriteria)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            workflow.isActive ? "default" : "secondary"
                          }
                        >
                          {workflow.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/settings/workflows/${workflow.id}`)
                              }
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggle(workflow)}
                            >
                              {workflow.isActive ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedWorkflow(workflow);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Workflow className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No workflow rules found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/settings/workflows/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Workflow Rule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedWorkflow?.name}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Workflow Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
