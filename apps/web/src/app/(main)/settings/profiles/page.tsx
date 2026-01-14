"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, MoreHorizontal, Pencil, Trash2, Copy, ShieldCheck } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  usePermissionProfiles,
  usePermissionProfile,
  useProfileObjectPermissions,
  useCreatePermissionProfile,
  useUpdatePermissionProfile,
  useDeletePermissionProfile,
  useBulkSetProfileObjectPermissions,
  useClonePermissionProfile,
  type PermissionProfile,
  type ProfileObjectPermission,
  type CreateProfileInput,
  type SetObjectPermissionInput,
} from "@/lib/api/permissionProfiles";

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

export default function ProfilesSettingsPage() {
  const { data: profilesData, isLoading } = usePermissionProfiles();
  const createProfile = useCreatePermissionProfile();
  const updateProfile = useUpdatePermissionProfile();
  const deleteProfile = useDeletePermissionProfile();
  const cloneProfile = useClonePermissionProfile();
  const bulkSetObjectPermissions = useBulkSetProfileObjectPermissions();

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PermissionProfile | null>(null);
  const [cloneName, setCloneName] = useState("");

  const [formData, setFormData] = useState<CreateProfileInput>({
    name: "",
    description: "",
    isActive: true,
  });

  const profiles = profilesData?.records || [];

  const { data: objectPermissionsData } = useProfileObjectPermissions(
    isPermissionsDialogOpen ? selectedProfileId || undefined : undefined
  );

  const [editingPermissions, setEditingPermissions] = useState<
    Map<string, SetObjectPermissionInput>
  >(new Map());

  const handleCreate = async () => {
    await createProfile.mutateAsync(formData);
    setIsCreateDialogOpen(false);
    setFormData({ name: "", description: "", isActive: true });
  };

  const handleEdit = (profile: PermissionProfile) => {
    setSelectedProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || "",
      isActive: profile.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedProfile) return;
    await updateProfile.mutateAsync({
      id: selectedProfile.id,
      data: formData,
    });
    setIsEditDialogOpen(false);
    setSelectedProfile(null);
  };

  const handleDeleteClick = (profile: PermissionProfile) => {
    setSelectedProfile(profile);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedProfile) return;
    await deleteProfile.mutateAsync(selectedProfile.id);
    setIsDeleteDialogOpen(false);
    setSelectedProfile(null);
  };

  const handleCloneClick = (profile: PermissionProfile) => {
    setSelectedProfile(profile);
    setCloneName(`${profile.name} (Copy)`);
    setIsCloneDialogOpen(true);
  };

  const handleClone = async () => {
    if (!selectedProfile || !cloneName.trim()) return;
    await cloneProfile.mutateAsync({
      sourceId: selectedProfile.id,
      newName: cloneName.trim(),
    });
    setIsCloneDialogOpen(false);
    setSelectedProfile(null);
    setCloneName("");
  };

  const handleOpenPermissions = (profile: PermissionProfile) => {
    setSelectedProfile(profile);
    setSelectedProfileId(profile.id);
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
    if (!selectedProfileId) return;
    const permissions = OBJECTS.map((obj) => getPermissionForObject(obj));
    await bulkSetObjectPermissions.mutateAsync({
      profileId: selectedProfileId,
      permissions,
    });
    setIsPermissionsDialogOpen(false);
    setSelectedProfile(null);
    setSelectedProfileId(null);
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
          <h1 className="text-2xl font-bold">Permission Profiles</h1>
          <p className="text-muted-foreground">
            Manage base permission sets for different user types
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profiles</CardTitle>
          <CardDescription>
            Profiles define the baseline permissions for users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldCheck className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No profiles defined yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Profile
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profile Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {profile.description || "-"}
                    </TableCell>
                    <TableCell>
                      {profile.isSystem ? (
                        <Badge variant="secondary">System</Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.isActive ? (
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
                          <DropdownMenuItem onClick={() => handleOpenPermissions(profile)}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(profile)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCloneClick(profile)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Clone
                          </DropdownMenuItem>
                          {!profile.isSystem && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(profile)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
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
            <DialogTitle>Create Permission Profile</DialogTitle>
            <DialogDescription>
              Create a new permission profile for users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Profile Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sales User"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim()}>
              Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permission Profile</DialogTitle>
            <DialogDescription>Update profile details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Profile Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={selectedProfile?.isSystem}
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

      {/* Clone Dialog */}
      <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Permission Profile</DialogTitle>
            <DialogDescription>
              Create a copy of &quot;{selectedProfile?.name}&quot; with a new name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">New Profile Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for the new profile"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={!cloneName.trim()}>
              Clone Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Permission Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedProfile?.name}&quot;?
              Users assigned to this profile will lose their permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProfile?.name} - Object Permissions</DialogTitle>
            <DialogDescription>
              Configure object-level permissions for this profile
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
