"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  ShieldCheck,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  usePermissionSets,
  usePermissionSetUsers,
  usePermissionSetObjectPermissions,
  useCreatePermissionSet,
  useUpdatePermissionSet,
  useDeletePermissionSet,
  useAssignPermissionSet,
  useUnassignPermissionSet,
  useBulkSetPermissionSetObjectPermissions,
  type PermissionSet,
  type CreatePermissionSetInput,
  type SetObjectPermissionInput,
} from "@/lib/api/permissionSets";

const OBJECTS = [
  "Account",
  "Contact",
  "Lead",
  "Opportunity",
  "Quote",
  "Order",
  "Contract",
  "Invoice",
  "Product",
  "Pricebook",
  "Task",
  "Event",
];

export default function PermissionSetsPage() {
  const { data: permissionSetsData, isLoading } = usePermissionSets();
  const createPermissionSet = useCreatePermissionSet();
  const updatePermissionSet = useUpdatePermissionSet();
  const deletePermissionSet = useDeletePermissionSet();
  const assignPermissionSet = useAssignPermissionSet();
  const unassignPermissionSet = useUnassignPermissionSet();
  const bulkSetObjectPermissions = useBulkSetPermissionSetObjectPermissions();

  const [selectedPermissionSetId, setSelectedPermissionSetId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedPermissionSet, setSelectedPermissionSet] = useState<PermissionSet | null>(null);

  const [formData, setFormData] = useState<CreatePermissionSetInput>({
    name: "",
    description: "",
    isActive: true,
  });

  const [newUserId, setNewUserId] = useState("");

  const permissionSets = permissionSetsData?.records || [];

  const { data: usersData } = usePermissionSetUsers(
    isUsersDialogOpen ? selectedPermissionSetId || undefined : undefined
  );

  const { data: objectPermissionsData } = usePermissionSetObjectPermissions(
    isPermissionsDialogOpen ? selectedPermissionSetId || undefined : undefined
  );

  const [editingPermissions, setEditingPermissions] = useState<
    Map<string, SetObjectPermissionInput>
  >(new Map());

  const users = usersData?.records || [];

  const handleCreate = async () => {
    await createPermissionSet.mutateAsync(formData);
    setIsCreateDialogOpen(false);
    setFormData({ name: "", description: "", isActive: true });
  };

  const handleEdit = (permissionSet: PermissionSet) => {
    setSelectedPermissionSet(permissionSet);
    setFormData({
      name: permissionSet.name,
      description: permissionSet.description || "",
      isActive: permissionSet.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedPermissionSet) return;
    await updatePermissionSet.mutateAsync({
      id: selectedPermissionSet.id,
      data: formData,
    });
    setIsEditDialogOpen(false);
    setSelectedPermissionSet(null);
  };

  const handleDeleteClick = (permissionSet: PermissionSet) => {
    setSelectedPermissionSet(permissionSet);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedPermissionSet) return;
    await deletePermissionSet.mutateAsync(selectedPermissionSet.id);
    setIsDeleteDialogOpen(false);
    setSelectedPermissionSet(null);
  };

  const handleOpenUsers = (permissionSet: PermissionSet) => {
    setSelectedPermissionSet(permissionSet);
    setSelectedPermissionSetId(permissionSet.id);
    setNewUserId("");
    setIsUsersDialogOpen(true);
  };

  const handleAssignUser = async () => {
    if (!selectedPermissionSetId || !newUserId.trim()) return;
    await assignPermissionSet.mutateAsync({
      permissionSetId: selectedPermissionSetId,
      userId: newUserId.trim(),
    });
    setNewUserId("");
  };

  const handleUnassignUser = async (userId: string) => {
    if (!selectedPermissionSetId) return;
    await unassignPermissionSet.mutateAsync({
      permissionSetId: selectedPermissionSetId,
      userId,
    });
  };

  const handleOpenPermissions = (permissionSet: PermissionSet) => {
    setSelectedPermissionSet(permissionSet);
    setSelectedPermissionSetId(permissionSet.id);
    setEditingPermissions(new Map());
    setIsPermissionsDialogOpen(true);
  };

  const getPermissionForObject = (objectName: string): SetObjectPermissionInput => {
    if (editingPermissions.has(objectName)) {
      return editingPermissions.get(objectName)!;
    }
    const existing = objectPermissionsData?.records?.find(
      (p) => p.objectName === objectName
    );
    return {
      objectName,
      canCreate: existing?.canCreate || false,
      canRead: existing?.canRead || false,
      canUpdate: existing?.canUpdate || false,
      canDelete: existing?.canDelete || false,
      viewAll: existing?.viewAll || false,
      modifyAll: existing?.modifyAll || false,
    };
  };

  const updatePermission = (
    objectName: string,
    field: keyof SetObjectPermissionInput,
    value: boolean
  ) => {
    const current = getPermissionForObject(objectName);
    const updated = { ...current, [field]: value };
    setEditingPermissions(new Map(editingPermissions.set(objectName, updated)));
  };

  const handleSavePermissions = async () => {
    if (!selectedPermissionSetId) return;
    const permissions = OBJECTS.map((obj) => getPermissionForObject(obj));
    await bulkSetObjectPermissions.mutateAsync({
      permissionSetId: selectedPermissionSetId,
      permissions,
    });
    setIsPermissionsDialogOpen(false);
    setSelectedPermissionSet(null);
    setSelectedPermissionSetId(null);
    setEditingPermissions(new Map());
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
          <h1 className="text-2xl font-bold">Permission Sets</h1>
          <p className="text-muted-foreground">
            Create additional permission grants for specific users
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Permission Set
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Sets</CardTitle>
          <CardDescription>
            Permission sets extend user permissions beyond their profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : permissionSets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldCheck className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No permission sets defined yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Permission Set
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Assigned Users</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionSets.map((ps) => (
                  <TableRow key={ps.id}>
                    <TableCell className="font-medium">{ps.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ps.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ps.userCount || 0} users</Badge>
                    </TableCell>
                    <TableCell>
                      {ps.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenPermissions(ps)}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenUsers(ps)}>
                            <Users className="mr-2 h-4 w-4" />
                            Assigned Users
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(ps)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(ps)}
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
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Permission Set</DialogTitle>
            <DialogDescription>
              Create a new permission set to grant additional permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., API Access"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permission Set</DialogTitle>
            <DialogDescription>Update permission set details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-is-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
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
            <DialogTitle>Delete Permission Set</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedPermissionSet?.name}&quot;?
              Assigned users will lose these additional permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Users Dialog */}
      <Dialog open={isUsersDialogOpen} onOpenChange={setIsUsersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPermissionSet?.name} - Assigned Users</DialogTitle>
            <DialogDescription>
              Manage users assigned to this permission set
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="Enter User ID to assign"
              />
              <Button onClick={handleAssignUser} disabled={!newUserId.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Assign
              </Button>
            </div>
            {users.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No users assigned yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.userName || user.userId}</TableCell>
                      <TableCell>{user.userEmail || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnassignUser(user.userId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUsersDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPermissionSet?.name} - Object Permissions</DialogTitle>
            <DialogDescription>
              Configure additional object-level permissions for this permission set
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Object</TableHead>
                <TableHead className="text-center">Create</TableHead>
                <TableHead className="text-center">Read</TableHead>
                <TableHead className="text-center">Update</TableHead>
                <TableHead className="text-center">Delete</TableHead>
                <TableHead className="text-center">View All</TableHead>
                <TableHead className="text-center">Modify All</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {OBJECTS.map((objectName) => {
                const perms = getPermissionForObject(objectName);
                return (
                  <TableRow key={objectName}>
                    <TableCell className="font-medium">{objectName}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={perms.canCreate}
                        onCheckedChange={(checked) =>
                          updatePermission(objectName, "canCreate", !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={perms.canRead}
                        onCheckedChange={(checked) =>
                          updatePermission(objectName, "canRead", !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={perms.canUpdate}
                        onCheckedChange={(checked) =>
                          updatePermission(objectName, "canUpdate", !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={perms.canDelete}
                        onCheckedChange={(checked) =>
                          updatePermission(objectName, "canDelete", !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={perms.viewAll}
                        onCheckedChange={(checked) =>
                          updatePermission(objectName, "viewAll", !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={perms.modifyAll}
                        onCheckedChange={(checked) =>
                          updatePermission(objectName, "modifyAll", !!checked)
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions}>Save Permissions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
