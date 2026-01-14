"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  Building2,
  Settings,
  Play,
  MoreHorizontal,
  Map,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ConditionBuilder,
  type Condition,
  type FieldDefinition,
} from "@/components/organisms/ConditionBuilder";
import {
  useTerritory,
  useTerritoryUsers,
  useAddTerritoryUser,
  useRemoveTerritoryUser,
  useTerritoryAccounts,
  useAddTerritoryAccount,
  useRemoveTerritoryAccount,
  useTerritoryRules,
  useCreateTerritoryRule,
  useDeleteTerritoryRule,
  useRunTerritoryRules,
  useAvailableUsers,
} from "@/lib/api/territories";
import { useAccounts } from "@/lib/api/accounts";
import type {
  TerritoryUserAssignment,
  TerritoryAccountAssignment,
  TerritoryAssignmentRule,
} from "@/mocks/types";

// Account fields for condition builder
const accountFields: FieldDefinition[] = [
  { name: "name", label: "Account Name", type: "string" },
  { name: "industry", label: "Industry", type: "picklist", options: [
    { value: "Technology", label: "Technology" },
    { value: "Healthcare", label: "Healthcare" },
    { value: "Finance", label: "Finance" },
    { value: "Retail", label: "Retail" },
    { value: "Manufacturing", label: "Manufacturing" },
  ]},
  { name: "type", label: "Type", type: "picklist", options: [
    { value: "Prospect", label: "Prospect" },
    { value: "Customer", label: "Customer" },
    { value: "Partner", label: "Partner" },
  ]},
  { name: "annualRevenue", label: "Annual Revenue", type: "number" },
  { name: "numberOfEmployees", label: "Number of Employees", type: "number" },
  { name: "billingCountry", label: "Billing Country", type: "string" },
  { name: "billingState", label: "Billing State", type: "string" },
  { name: "billingCity", label: "Billing City", type: "string" },
];

export default function TerritoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const territoryId = params.id as string;

  const { data: territory, isLoading } = useTerritory(territoryId);
  const { data: usersData } = useTerritoryUsers(territoryId);
  const { data: accountsData } = useTerritoryAccounts(territoryId);
  const { data: rulesData } = useTerritoryRules(territoryId);
  const { data: availableUsersData } = useAvailableUsers();
  const { data: allAccountsData } = useAccounts({ limit: 100 });

  const addUser = useAddTerritoryUser();
  const removeUser = useRemoveTerritoryUser();
  const addAccount = useAddTerritoryAccount();
  const removeAccount = useRemoveTerritoryAccount();
  const createRule = useCreateTerritoryRule();
  const deleteRule = useDeleteTerritoryRule();
  const runRules = useRunTerritoryRules();

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const [isAddRuleDialogOpen, setIsAddRuleDialogOpen] = useState(false);
  const [isDeleteRuleDialogOpen, setIsDeleteRuleDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<TerritoryAssignmentRule | null>(null);

  const [newUserId, setNewUserId] = useState("");
  const [newUserAccessLevel, setNewUserAccessLevel] = useState<"Read" | "ReadWrite">("ReadWrite");
  const [newAccountId, setNewAccountId] = useState("");
  const [newRuleName, setNewRuleName] = useState("");
  const [ruleConditions, setRuleConditions] = useState<Condition[]>([]);
  const [ruleFilterLogic, setRuleFilterLogic] = useState("");

  const users = usersData?.records || [];
  const accounts = accountsData?.records || [];
  const rules = rulesData?.records || [];
  const availableUsers = availableUsersData?.users || [];
  const allAccounts = allAccountsData?.records || [];

  const handleAddUser = async () => {
    await addUser.mutateAsync({
      territoryId,
      userId: newUserId,
      accessLevel: newUserAccessLevel,
    });
    setIsAddUserDialogOpen(false);
    setNewUserId("");
    setNewUserAccessLevel("ReadWrite");
  };

  const handleRemoveUser = async (assignment: TerritoryUserAssignment) => {
    await removeUser.mutateAsync({
      territoryId,
      assignmentId: assignment.id,
    });
  };

  const handleAddAccount = async () => {
    await addAccount.mutateAsync({
      territoryId,
      accountId: newAccountId,
    });
    setIsAddAccountDialogOpen(false);
    setNewAccountId("");
  };

  const handleRemoveAccount = async (assignment: TerritoryAccountAssignment) => {
    await removeAccount.mutateAsync({
      territoryId,
      assignmentId: assignment.id,
    });
  };

  const handleAddRule = async () => {
    await createRule.mutateAsync({
      territoryId,
      data: {
        name: newRuleName,
        isActive: true,
        conditions: ruleConditions.map((c) => ({
          id: c.id,
          field: c.field,
          operator: c.operator as "equals" | "notEquals" | "contains" | "startsWith" | "greaterThan" | "lessThan",
          value: c.value as string | number,
          orderIndex: c.orderIndex,
        })),
        filterLogic: ruleFilterLogic || undefined,
        priority: rules.length,
      },
    });
    setIsAddRuleDialogOpen(false);
    setNewRuleName("");
    setRuleConditions([]);
    setRuleFilterLogic("");
  };

  const handleDeleteRule = async () => {
    if (!selectedRule) return;
    await deleteRule.mutateAsync({
      territoryId,
      ruleId: selectedRule.id,
    });
    setIsDeleteRuleDialogOpen(false);
    setSelectedRule(null);
  };

  const handleRunRules = async () => {
    await runRules.mutateAsync(territoryId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading territory...</p>
      </div>
    );
  }

  if (!territory) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Territory not found</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/settings/territories">Back to Territories</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings/territories">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{territory.name}</h1>
            {!territory.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {territory.description || "Manage users, accounts, and assignment rules"}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Assigned Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Building2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accounts.length}</p>
              <p className="text-sm text-muted-foreground">Assigned Accounts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rules.length}</p>
              <p className="text-sm text-muted-foreground">Assignment Rules</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Building2 className="h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Settings className="h-4 w-4" />
            Assignment Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assigned Users</CardTitle>
                <CardDescription>
                  Users who have access to accounts in this territory
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddUserDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Assign User
              </Button>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead>Assigned On</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.userName || user.userId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.accessLevel === "ReadWrite"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {user.accessLevel === "ReadWrite" ? "Read/Write" : "Read Only"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveUser(user)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No users assigned to this territory
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assigned Accounts</CardTitle>
                <CardDescription>
                  Accounts managed by this territory
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRunRules} disabled={runRules.isPending}>
                  <Play className="mr-2 h-4 w-4" />
                  {runRules.isPending ? "Running..." : "Run Rules"}
                </Button>
                <Button onClick={() => setIsAddAccountDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {accounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Assignment Type</TableHead>
                      <TableHead>Assigned On</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          {account.accountName || account.accountId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              account.assignmentType === "Manual"
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {account.assignmentType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(account.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAccount(account)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No accounts assigned to this territory
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Assignment Rules</CardTitle>
                <CardDescription>
                  Automatically assign accounts based on criteria
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddRuleDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              {rules.length > 0 ? (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rule.name}</span>
                          <Badge
                            variant={rule.isActive ? "default" : "secondary"}
                          >
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {rule.conditions.length} condition
                          {rule.conditions.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRule(rule);
                              setIsDeleteRuleDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No assignment rules defined
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User</DialogTitle>
            <DialogDescription>
              Add a user to this territory with specified access level
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={newUserId} onValueChange={setNewUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Access Level</Label>
              <Select value={newUserAccessLevel} onValueChange={(v) => setNewUserAccessLevel(v as "Read" | "ReadWrite")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ReadWrite">Read/Write</SelectItem>
                  <SelectItem value="Read">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={!newUserId || addUser.isPending}>
              {addUser.isPending ? "Assigning..." : "Assign User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={isAddAccountDialogOpen} onOpenChange={setIsAddAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>
              Manually assign an account to this territory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={newAccountId} onValueChange={setNewAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAccountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAccount} disabled={!newAccountId || addAccount.isPending}>
              {addAccount.isPending ? "Adding..." : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rule Dialog */}
      <Dialog open={isAddRuleDialogOpen} onOpenChange={setIsAddRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Assignment Rule</DialogTitle>
            <DialogDescription>
              Define criteria for automatically assigning accounts to this territory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="e.g., Japan Accounts"
              />
            </div>
            <div className="space-y-2">
              <Label>Criteria</Label>
              <ConditionBuilder
                conditions={ruleConditions}
                onChange={setRuleConditions}
                fields={accountFields}
                filterLogic={ruleFilterLogic}
                onFilterLogicChange={setRuleFilterLogic}
                showFilterLogic
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddRule}
              disabled={!newRuleName.trim() || ruleConditions.length === 0 || createRule.isPending}
            >
              {createRule.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation */}
      <Dialog open={isDeleteRuleDialogOpen} onOpenChange={setIsDeleteRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedRule?.name}&quot;?
              This will not remove already assigned accounts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteRuleDialogOpen(false)}>
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
