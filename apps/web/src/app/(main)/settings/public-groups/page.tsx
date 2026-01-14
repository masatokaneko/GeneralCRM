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
  UserPlus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  usePublicGroups,
  usePublicGroupMembers,
  useCreatePublicGroup,
  useUpdatePublicGroup,
  useDeletePublicGroup,
  useAddGroupMember,
  useRemoveGroupMember,
  type PublicGroup,
  type CreatePublicGroupInput,
  type GroupMemberType,
} from "@/lib/api/sharingRules";
import { useRoles } from "@/lib/api/roles";

const MEMBER_TYPE_OPTIONS: { value: GroupMemberType; label: string }[] = [
  { value: "User", label: "User" },
  { value: "Role", label: "Role" },
  { value: "RoleAndSubordinates", label: "Role and Subordinates" },
  { value: "Group", label: "Public Group" },
];

export default function PublicGroupsPage() {
  const { data: groupsData, isLoading } = usePublicGroups();
  const { data: rolesData } = useRoles();
  const createGroup = useCreatePublicGroup();
  const updateGroup = useUpdatePublicGroup();
  const deleteGroup = useDeletePublicGroup();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PublicGroup | null>(null);

  const [formData, setFormData] = useState<CreatePublicGroupInput>({
    name: "",
    description: "",
    isActive: true,
    doesIncludeBosses: false,
  });

  const [newMember, setNewMember] = useState<{
    memberType: GroupMemberType;
    memberId: string;
  }>({
    memberType: "User",
    memberId: "",
  });

  const groups = groupsData?.records || [];
  const roles = rolesData?.records || [];

  const { data: membersData } = usePublicGroupMembers(
    isMembersDialogOpen ? selectedGroupId || undefined : undefined
  );

  const members = membersData?.records || [];

  const handleCreate = async () => {
    await createGroup.mutateAsync(formData);
    setIsCreateDialogOpen(false);
    setFormData({ name: "", description: "", isActive: true, doesIncludeBosses: false });
  };

  const handleEdit = (group: PublicGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      isActive: group.isActive,
      doesIncludeBosses: group.doesIncludeBosses,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedGroup) return;
    await updateGroup.mutateAsync({
      id: selectedGroup.id,
      data: formData,
    });
    setIsEditDialogOpen(false);
    setSelectedGroup(null);
  };

  const handleDeleteClick = (group: PublicGroup) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;
    await deleteGroup.mutateAsync(selectedGroup.id);
    setIsDeleteDialogOpen(false);
    setSelectedGroup(null);
  };

  const handleOpenMembers = (group: PublicGroup) => {
    setSelectedGroup(group);
    setSelectedGroupId(group.id);
    setNewMember({ memberType: "User", memberId: "" });
    setIsMembersDialogOpen(true);
  };

  const handleAddMember = async () => {
    if (!selectedGroupId || !newMember.memberId.trim()) return;
    await addMember.mutateAsync({
      groupId: selectedGroupId,
      data: {
        memberType: newMember.memberType,
        memberId: newMember.memberId.trim(),
      },
    });
    setNewMember({ memberType: "User", memberId: "" });
  };

  const handleRemoveMember = async (memberType: string, memberId: string) => {
    if (!selectedGroupId) return;
    await removeMember.mutateAsync({
      groupId: selectedGroupId,
      memberType,
      memberId,
    });
  };

  const getMemberTypeLabel = (type: string) => {
    return MEMBER_TYPE_OPTIONS.find((opt) => opt.value === type)?.label || type;
  };

  const getMemberOptions = (type: GroupMemberType) => {
    switch (type) {
      case "Role":
      case "RoleAndSubordinates":
        return roles.map((r) => ({ value: r.id, label: r.name }));
      case "Group":
        return groups
          .filter((g) => g.id !== selectedGroupId)
          .map((g) => ({ value: g.id, label: g.name }));
      default:
        return [];
    }
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
          <h1 className="text-2xl font-bold">Public Groups</h1>
          <p className="text-muted-foreground">
            Manage groups for sharing and access control
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public Groups</CardTitle>
          <CardDescription>
            Groups can be used in sharing rules and manual sharing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No public groups defined yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Group
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Include Bosses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {group.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {group.memberCount || 0} members
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {group.doesIncludeBosses ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>
                      {group.isActive ? (
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
                          <DropdownMenuItem onClick={() => handleOpenMembers(group)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Members
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(group)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(group)}
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
            <DialogTitle>Create Public Group</DialogTitle>
            <DialogDescription>
              Create a new public group for sharing records
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Sales Team"
              />
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Bosses</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically include managers of group members
                </p>
              </div>
              <Switch
                checked={formData.doesIncludeBosses}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, doesIncludeBosses: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim()}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Public Group</DialogTitle>
            <DialogDescription>Update group details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Group Name</Label>
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
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Bosses</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically include managers of group members
                </p>
              </div>
              <Switch
                checked={formData.doesIncludeBosses}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, doesIncludeBosses: checked })
                }
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
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
            <DialogTitle>Delete Public Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedGroup?.name}&quot;?
              Sharing rules using this group will be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedGroup?.name} - Group Members</DialogTitle>
            <DialogDescription>
              Manage members of this public group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select
                value={newMember.memberType}
                onValueChange={(value) =>
                  setNewMember({ ...newMember, memberType: value as GroupMemberType, memberId: "" })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newMember.memberType === "User" ? (
                <Input
                  className="flex-1"
                  value={newMember.memberId}
                  onChange={(e) =>
                    setNewMember({ ...newMember, memberId: e.target.value })
                  }
                  placeholder="Enter User ID"
                />
              ) : (
                <Select
                  value={newMember.memberId}
                  onValueChange={(value) =>
                    setNewMember({ ...newMember, memberId: value })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getMemberOptions(newMember.memberType).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={handleAddMember} disabled={!newMember.memberId.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            {members.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No members in this group yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {getMemberTypeLabel(member.memberType)}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.memberName || member.memberId}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveMember(member.memberType, member.memberId)
                          }
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
            <Button variant="outline" onClick={() => setIsMembersDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
