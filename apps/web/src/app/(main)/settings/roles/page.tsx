"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, ChevronRight, ChevronDown, Users, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRoles, useRoleHierarchy, useCreateRole, useUpdateRole, useDeleteRole } from "@/lib/api/roles";
import type { Role, RoleNode, CreateRoleInput, UpdateRoleInput } from "@/lib/api/roles";

function RoleTreeNode({
  node,
  level = 0,
  onEdit,
  onDelete,
}: {
  node: RoleNode;
  level?: number;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/50"
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        <button
          type="button"
          className="flex h-5 w-5 items-center justify-center"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-4 w-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{node.name}</span>
            {!node.isActive && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
          {node.description && (
            <p className="text-xs text-muted-foreground truncate">
              {node.description}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(node)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(node)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <RoleTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RolesSettingsPage() {
  const { data: rolesData, isLoading } = useRoles();
  const { data: hierarchy } = useRoleHierarchy();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const [formData, setFormData] = useState<CreateRoleInput>({
    name: "",
    parentRoleId: null,
    description: "",
    isActive: true,
  });

  const roles = rolesData?.records || [];

  const handleCreate = async () => {
    await createRole.mutateAsync(formData);
    setIsCreateDialogOpen(false);
    setFormData({ name: "", parentRoleId: null, description: "", isActive: true });
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      parentRoleId: role.parentRoleId,
      description: role.description || "",
      isActive: role.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedRole) return;
    await updateRole.mutateAsync({
      id: selectedRole.id,
      data: formData as UpdateRoleInput,
    });
    setIsEditDialogOpen(false);
    setSelectedRole(null);
  };

  const handleDeleteClick = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    await deleteRole.mutateAsync(selectedRole.id);
    setIsDeleteDialogOpen(false);
    setSelectedRole(null);
  };

  const openCreateDialog = (parentId?: string) => {
    setFormData({
      name: "",
      parentRoleId: parentId || null,
      description: "",
      isActive: true,
    });
    setIsCreateDialogOpen(true);
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
          <h1 className="text-2xl font-bold">Role Hierarchy</h1>
          <p className="text-muted-foreground">
            Define organizational role structure and reporting relationships
          </p>
        </div>
        <Button onClick={() => openCreateDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          New Role
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Roles</CardTitle>
          <CardDescription>
            Roles define access to records owned by users in subordinate roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading roles...</p>
            </div>
          ) : hierarchy && hierarchy.length > 0 ? (
            <div className="space-y-1">
              {hierarchy.map((node) => (
                <RoleTreeNode
                  key={node.id}
                  node={node}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No roles defined yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => openCreateDialog()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Role
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Add a new role to your organization hierarchy
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Sales Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Reports To</Label>
              <Select
                value={formData.parentRoleId || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parentRoleId: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (Top level)</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim()}>
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent">Reports To</Label>
              <Select
                value={formData.parentRoleId || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parentRoleId: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (Top level)</SelectItem>
                  {roles
                    .filter((role) => role.id !== selectedRole?.id)
                    .map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedRole?.name}&quot;?
              This action cannot be undone.
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
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
