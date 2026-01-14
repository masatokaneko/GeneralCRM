"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { TerritoryTree } from "@/components/organisms/TerritoryTree";
import {
  useTerritoryTree,
  useTerritories,
  useCreateTerritory,
  useUpdateTerritory,
  useDeleteTerritory,
} from "@/lib/api/territories";
import type { Territory } from "@/mocks/types";

export default function TerritoriesSettingsPage() {
  const router = useRouter();
  const { data: treeData, isLoading } = useTerritoryTree();
  const { data: territoriesData } = useTerritories({ view: "list" });
  const createTerritory = useCreateTerritory();
  const updateTerritory = useUpdateTerritory();
  const deleteTerritory = useDeleteTerritory();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(
    null
  );
  const [parentId, setParentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parentTerritoryId: "",
    isActive: true,
  });

  const tree = treeData?.tree || [];
  const allTerritories = (territoriesData as { records?: Territory[] })?.records || [];

  const handleCreate = async () => {
    await createTerritory.mutateAsync({
      name: formData.name,
      description: formData.description || undefined,
      parentTerritoryId: formData.parentTerritoryId || undefined,
      isActive: formData.isActive,
    });
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!selectedTerritory) return;
    await updateTerritory.mutateAsync({
      id: selectedTerritory.id,
      data: {
        name: formData.name,
        description: formData.description || undefined,
        parentTerritoryId: formData.parentTerritoryId || undefined,
        isActive: formData.isActive,
      },
    });
    setIsEditDialogOpen(false);
    setSelectedTerritory(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedTerritory) return;
    await deleteTerritory.mutateAsync(selectedTerritory.id);
    setIsDeleteDialogOpen(false);
    setSelectedTerritory(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      parentTerritoryId: "",
      isActive: true,
    });
    setParentId(null);
  };

  const openCreateDialog = (initialParentId?: string) => {
    setParentId(initialParentId || null);
    setFormData({
      name: "",
      description: "",
      parentTerritoryId: initialParentId || "",
      isActive: true,
    });
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (territory: Territory) => {
    setSelectedTerritory(territory);
    setFormData({
      name: territory.name,
      description: territory.description || "",
      parentTerritoryId: territory.parentTerritoryId || "",
      isActive: territory.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (territory: Territory) => {
    setSelectedTerritory(territory);
    setIsDeleteDialogOpen(true);
  };

  const handleSelect = (territory: Territory) => {
    router.push(`/settings/territories/${territory.id}`);
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
          <h1 className="text-2xl font-bold">Territory Management</h1>
          <p className="text-muted-foreground">
            Organize sales territories and manage user assignments
          </p>
        </div>
        <Button onClick={() => openCreateDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          New Territory
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Territory Hierarchy</CardTitle>
          <CardDescription>
            Click on a territory to view details or use the menu to edit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading territories...</p>
            </div>
          ) : tree.length > 0 ? (
            <TerritoryTree
              territories={tree}
              onSelect={handleSelect}
              onEdit={openEditDialog}
              onDelete={openDeleteDialog}
              onAddChild={openCreateDialog}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Map className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No territories defined yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => openCreateDialog()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Territory
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Territory</DialogTitle>
            <DialogDescription>
              Add a new territory to your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Territory Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., North America"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">Parent Territory</Label>
              <Select
                value={formData.parentTerritoryId || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parentTerritoryId: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent territory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (Top level)</SelectItem>
                  {allTerritories.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
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
                rows={3}
              />
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
                Active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name.trim() || createTerritory.isPending}
            >
              {createTerritory.isPending ? "Creating..." : "Create Territory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Territory</DialogTitle>
            <DialogDescription>Update territory details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Territory Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent">Parent Territory</Label>
              <Select
                value={formData.parentTerritoryId || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parentTerritoryId: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent territory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (Top level)</SelectItem>
                  {allTerritories
                    .filter((t) => t.id !== selectedTerritory?.id)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
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
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked as boolean })
                }
              />
              <Label htmlFor="edit-active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name.trim() || updateTerritory.isPending}
            >
              {updateTerritory.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Territory</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedTerritory?.name}
              &quot;? This will also remove all user and account assignments.
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
              Delete Territory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
