"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  useOrgWideDefaults,
  useUpdateOrgWideDefault,
  type OWDAccessLevel,
} from "@/lib/api/orgWideDefaults";
import {
  useSharingRules,
  useCreateSharingRule,
  useUpdateSharingRule,
  useDeleteSharingRule,
  type SharingRule,
  type CreateSharingRuleInput,
} from "@/lib/api/sharingRules";
import { useRoles } from "@/lib/api/roles";
import { usePublicGroups } from "@/lib/api/sharingRules";

const OBJECT_OPTIONS = [
  { value: "Account", label: "Account" },
  { value: "Contact", label: "Contact" },
  { value: "Lead", label: "Lead" },
  { value: "Opportunity", label: "Opportunity" },
  { value: "Quote", label: "Quote" },
  { value: "Order", label: "Order" },
  { value: "Contract", label: "Contract" },
  { value: "Invoice", label: "Invoice" },
];

const ACCESS_LEVEL_OPTIONS: { value: OWDAccessLevel; label: string; description: string }[] = [
  {
    value: "Private",
    label: "Private",
    description: "Only owner and users above in role hierarchy can access",
  },
  {
    value: "PublicReadOnly",
    label: "Public Read Only",
    description: "All users can view, but only owner can edit",
  },
  {
    value: "PublicReadWrite",
    label: "Public Read/Write",
    description: "All users can view and edit all records",
  },
  {
    value: "ControlledByParent",
    label: "Controlled by Parent",
    description: "Sharing is inherited from the parent record",
  },
];

function getAccessLevelBadgeVariant(level: OWDAccessLevel) {
  switch (level) {
    case "Private":
      return "destructive";
    case "PublicReadOnly":
      return "secondary";
    case "PublicReadWrite":
      return "default";
    case "ControlledByParent":
      return "outline";
    default:
      return "secondary";
  }
}

export default function SharingSettingsPage() {
  const { data: owdData, isLoading: owdLoading } = useOrgWideDefaults();
  const { data: rulesData, isLoading: rulesLoading } = useSharingRules();
  const { data: rolesData } = useRoles();
  const { data: groupsData } = usePublicGroups();
  const updateOwd = useUpdateOrgWideDefault();
  const createRule = useCreateSharingRule();
  const updateRule = useUpdateSharingRule();
  const deleteRule = useDeleteSharingRule();

  const [selectedOwd, setSelectedOwd] = useState<{
    objectName: string;
    internalAccess: OWDAccessLevel;
    grantAccessUsingHierarchies: boolean;
  } | null>(null);
  const [isOwdDialogOpen, setIsOwdDialogOpen] = useState(false);

  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<SharingRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState<CreateSharingRuleInput>({
    name: "",
    objectName: "Account",
    ruleType: "OwnerBased",
    description: "",
    isActive: true,
    sourceType: "Role",
    sourceId: "",
    targetType: "Role",
    targetId: "",
    accessLevel: "Read",
  });

  const owdRecords = owdData?.records || [];
  const rules = rulesData?.records || [];
  const roles = rolesData?.records || [];
  const groups = groupsData?.records || [];

  const handleEditOwd = (owd: typeof owdRecords[0]) => {
    setSelectedOwd({
      objectName: owd.objectName,
      internalAccess: owd.internalAccess,
      grantAccessUsingHierarchies: owd.grantAccessUsingHierarchies,
    });
    setIsOwdDialogOpen(true);
  };

  const handleUpdateOwd = async () => {
    if (!selectedOwd) return;
    await updateOwd.mutateAsync({
      objectName: selectedOwd.objectName,
      data: {
        internalAccess: selectedOwd.internalAccess,
        grantAccessUsingHierarchies: selectedOwd.grantAccessUsingHierarchies,
      },
    });
    setIsOwdDialogOpen(false);
    setSelectedOwd(null);
  };

  const openCreateRuleDialog = () => {
    setSelectedRule(null);
    setRuleFormData({
      name: "",
      objectName: "Account",
      ruleType: "OwnerBased",
      description: "",
      isActive: true,
      sourceType: "Role",
      sourceId: "",
      targetType: "Role",
      targetId: "",
      accessLevel: "Read",
    });
    setIsRuleDialogOpen(true);
  };

  const openEditRuleDialog = (rule: SharingRule) => {
    setSelectedRule(rule);
    setRuleFormData({
      name: rule.name,
      objectName: rule.objectName,
      ruleType: rule.ruleType,
      description: rule.description || "",
      isActive: rule.isActive,
      sourceType: rule.sourceType,
      sourceId: rule.sourceId || "",
      targetType: rule.targetType,
      targetId: rule.targetId,
      accessLevel: rule.accessLevel,
    });
    setIsRuleDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (selectedRule) {
      await updateRule.mutateAsync({
        id: selectedRule.id,
        data: ruleFormData,
      });
    } else {
      await createRule.mutateAsync(ruleFormData);
    }
    setIsRuleDialogOpen(false);
  };

  const handleDeleteRule = async () => {
    if (!selectedRule) return;
    await deleteRule.mutateAsync(selectedRule.id);
    setIsDeleteDialogOpen(false);
    setSelectedRule(null);
  };

  const getSourceTargetOptions = (type: string) => {
    if (type === "Role" || type === "RoleAndSubordinates") {
      return roles.map((r) => ({ value: r.id, label: r.name }));
    }
    if (type === "PublicGroup") {
      return groups.map((g) => ({ value: g.id, label: g.name }));
    }
    return [];
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
          <h1 className="text-2xl font-bold">Sharing Settings</h1>
          <p className="text-muted-foreground">
            Configure organization-wide defaults and sharing rules
          </p>
        </div>
      </div>

      <Tabs defaultValue="owd" className="space-y-4">
        <TabsList>
          <TabsTrigger value="owd">Organization-Wide Defaults</TabsTrigger>
          <TabsTrigger value="rules">Sharing Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="owd" className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>About Organization-Wide Defaults</AlertTitle>
            <AlertDescription>
              OWD settings define the baseline level of access to records for users in your organization.
              Sharing rules can extend access but cannot restrict it below the OWD level.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Default Access Levels</CardTitle>
              <CardDescription>
                Set the default sharing access level for each object type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {owdLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Object</TableHead>
                      <TableHead>Default Access</TableHead>
                      <TableHead>Grant Access Using Hierarchies</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {owdRecords.map((owd) => (
                      <TableRow key={owd.objectName}>
                        <TableCell className="font-medium">
                          {owd.objectName}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getAccessLevelBadgeVariant(owd.internalAccess)}>
                            {owd.internalAccess}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {owd.grantAccessUsingHierarchies ? "Yes" : "No"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOwd(owd)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sharing Rules</CardTitle>
                <CardDescription>
                  Extend record access beyond organization-wide defaults
                </CardDescription>
              </div>
              <Button onClick={openCreateRuleDialog}>
                <Plus className="mr-2 h-4 w-4" />
                New Rule
              </Button>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground">No sharing rules defined yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={openCreateRuleDialog}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Rule
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Object</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Shared With</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">
                          {rule.name}
                        </TableCell>
                        <TableCell>{rule.objectName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.ruleType}</Badge>
                        </TableCell>
                        <TableCell>
                          {rule.targetName || rule.targetType}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.accessLevel === "ReadWrite" ? "default" : "secondary"}>
                            {rule.accessLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {rule.isActive ? (
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
                              <DropdownMenuItem onClick={() => openEditRuleDialog(rule)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRule(rule);
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* OWD Edit Dialog */}
      <Dialog open={isOwdDialogOpen} onOpenChange={setIsOwdDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {selectedOwd?.objectName} Sharing</DialogTitle>
            <DialogDescription>
              Configure the default sharing settings for this object
            </DialogDescription>
          </DialogHeader>
          {selectedOwd && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Default Internal Access</Label>
                <Select
                  value={selectedOwd.internalAccess}
                  onValueChange={(value) =>
                    setSelectedOwd({ ...selectedOwd, internalAccess: value as OWDAccessLevel })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Grant Access Using Hierarchies</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow managers to access their subordinates' records
                  </p>
                </div>
                <Switch
                  checked={selectedOwd.grantAccessUsingHierarchies}
                  onCheckedChange={(checked) =>
                    setSelectedOwd({
                      ...selectedOwd,
                      grantAccessUsingHierarchies: checked,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOwdDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateOwd}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sharing Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRule ? "Edit Sharing Rule" : "Create Sharing Rule"}
            </DialogTitle>
            <DialogDescription>
              {selectedRule
                ? "Update the sharing rule configuration"
                : "Create a new sharing rule to extend record access"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={ruleFormData.name}
                  onChange={(e) =>
                    setRuleFormData({ ...ruleFormData, name: e.target.value })
                  }
                  placeholder="e.g., Share Accounts with Sales Team"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-object">Object</Label>
                <Select
                  value={ruleFormData.objectName}
                  onValueChange={(value) =>
                    setRuleFormData({ ...ruleFormData, objectName: value })
                  }
                  disabled={!!selectedRule}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Select
                value={ruleFormData.ruleType}
                onValueChange={(value) =>
                  setRuleFormData({ ...ruleFormData, ruleType: value as "OwnerBased" | "CriteriaBased" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OwnerBased">
                    Owner Based - Share records owned by specific users/roles
                  </SelectItem>
                  <SelectItem value="CriteriaBased">
                    Criteria Based - Share records matching specific criteria
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ruleFormData.ruleType === "OwnerBased" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Records Owned By</Label>
                  <Select
                    value={ruleFormData.sourceType || "Role"}
                    onValueChange={(value) =>
                      setRuleFormData({
                        ...ruleFormData,
                        sourceType: value as "Role" | "RoleAndSubordinates" | "PublicGroup",
                        sourceId: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Role">Role</SelectItem>
                      <SelectItem value="RoleAndSubordinates">
                        Role and Subordinates
                      </SelectItem>
                      <SelectItem value="PublicGroup">Public Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Select</Label>
                  <Select
                    value={ruleFormData.sourceId}
                    onValueChange={(value) =>
                      setRuleFormData({ ...ruleFormData, sourceId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getSourceTargetOptions(ruleFormData.sourceType || "Role").map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Share With</Label>
                <Select
                  value={ruleFormData.targetType}
                  onValueChange={(value) =>
                    setRuleFormData({
                      ...ruleFormData,
                      targetType: value as "Role" | "RoleAndSubordinates" | "PublicGroup" | "User",
                      targetId: "",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Role">Role</SelectItem>
                    <SelectItem value="RoleAndSubordinates">
                      Role and Subordinates
                    </SelectItem>
                    <SelectItem value="PublicGroup">Public Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select</Label>
                <Select
                  value={ruleFormData.targetId}
                  onValueChange={(value) =>
                    setRuleFormData({ ...ruleFormData, targetId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getSourceTargetOptions(ruleFormData.targetType).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select
                  value={ruleFormData.accessLevel}
                  onValueChange={(value) =>
                    setRuleFormData({ ...ruleFormData, accessLevel: value as "Read" | "ReadWrite" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Read">Read Only</SelectItem>
                    <SelectItem value="ReadWrite">Read/Write</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="rule-active"
                  checked={ruleFormData.isActive}
                  onCheckedChange={(checked) =>
                    setRuleFormData({ ...ruleFormData, isActive: checked })
                  }
                />
                <Label htmlFor="rule-active">Active</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-description">Description</Label>
              <Textarea
                id="rule-description"
                value={ruleFormData.description}
                onChange={(e) =>
                  setRuleFormData({ ...ruleFormData, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={
                !ruleFormData.name.trim() ||
                !ruleFormData.targetId ||
                (ruleFormData.ruleType === "OwnerBased" && !ruleFormData.sourceId)
              }
            >
              {selectedRule ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sharing Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedRule?.name}&quot;?
              This will remove access for users who rely on this rule.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule}>
              Delete Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
