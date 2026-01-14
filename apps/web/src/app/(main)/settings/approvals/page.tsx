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
  CheckCircle,
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
import { Label } from "@/components/ui/label";
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
  useApprovalProcesses,
  useDeleteApprovalProcess,
  useToggleApprovalProcess,
  useCloneApprovalProcess,
  useApprovalObjects,
} from "@/lib/api/approvalProcesses";
import type { ApprovalProcess } from "@/mocks/types";

export default function ApprovalsSettingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [objectFilter, setObjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [selectedProcess, setSelectedProcess] = useState<ApprovalProcess | null>(null);

  const { data: objectsData } = useApprovalObjects();
  const { data: processesData, isLoading } = useApprovalProcesses({
    objectName: objectFilter !== "all" ? objectFilter : undefined,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
    search: search || undefined,
  });
  const deleteProcess = useDeleteApprovalProcess();
  const toggleProcess = useToggleApprovalProcess();
  const cloneProcess = useCloneApprovalProcess();

  const processes = processesData?.records || [];
  const objects = objectsData?.objects || [];

  const handleDelete = async () => {
    if (!selectedProcess) return;
    await deleteProcess.mutateAsync(selectedProcess.id);
    setIsDeleteDialogOpen(false);
    setSelectedProcess(null);
  };

  const handleToggle = async (process: ApprovalProcess) => {
    await toggleProcess.mutateAsync(process.id);
  };

  const handleClone = async () => {
    if (!selectedProcess) return;
    await cloneProcess.mutateAsync({
      id: selectedProcess.id,
      name: cloneName || undefined,
    });
    setIsCloneDialogOpen(false);
    setSelectedProcess(null);
    setCloneName("");
  };

  const openCloneDialog = (process: ApprovalProcess) => {
    setSelectedProcess(process);
    setCloneName(`${process.name} (Copy)`);
    setIsCloneDialogOpen(true);
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
          <h1 className="text-2xl font-bold">Approval Processes</h1>
          <p className="text-muted-foreground">
            Configure approval workflows for records requiring review
          </p>
        </div>
        <Button onClick={() => router.push("/settings/approvals/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Approval Process
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Approval Processes</CardTitle>
          <CardDescription>
            Define multi-step approval workflows for records like quotes and
            opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search approval processes..."
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
              <p className="text-muted-foreground">
                Loading approval processes...
              </p>
            </div>
          ) : processes.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Object</TableHead>
                    <TableHead>Steps</TableHead>
                    <TableHead>Record Lock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processes.map((process) => (
                    <TableRow key={process.id}>
                      <TableCell>
                        <div>
                          <Link
                            href={`/settings/approvals/${process.id}`}
                            className="font-medium hover:underline"
                          >
                            {process.name}
                          </Link>
                          {process.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {process.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{process.objectName}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {process.steps.length} step
                          {process.steps.length !== 1 ? "s" : ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {process.recordEditability === "Locked"
                            ? "Locked"
                            : "Admin Only"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={process.isActive ? "default" : "secondary"}
                        >
                          {process.isActive ? "Active" : "Inactive"}
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
                                router.push(`/settings/approvals/${process.id}`)
                              }
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openCloneDialog(process)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Clone
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggle(process)}
                            >
                              {process.isActive ? (
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
                                setSelectedProcess(process);
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
              <CheckCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No approval processes found
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/settings/approvals/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Approval Process
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Approval Process</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedProcess?.name}
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
              Delete Approval Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Approval Process</DialogTitle>
            <DialogDescription>
              Create a copy of &quot;{selectedProcess?.name}&quot; with a new
              name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">New Process Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for the cloned process..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCloneDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={!cloneName.trim()}>
              Clone Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
