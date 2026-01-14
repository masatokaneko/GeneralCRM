// Base types for all records
export interface BaseRecord {
  id: string;
  tenantId: string;
  ownerId: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// Account
export interface Account extends BaseRecord {
  name: string;
  type?: "Prospect" | "Customer" | "Partner" | "Competitor" | "Other";
  parentId?: string;
  industry?: string;
  website?: string;
  phone?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  annualRevenue?: number;
  numberOfEmployees?: number;
  status: "Active" | "Inactive";
  description?: string;
}

// Contact
export interface Contact extends BaseRecord {
  accountId: string;
  firstName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  department?: string;
  mailingAddress?: Address;
  isPrimary: boolean;
}

// Lead
export interface Lead extends BaseRecord {
  firstName?: string;
  lastName: string;
  company: string;
  email?: string;
  phone?: string;
  title?: string;
  industry?: string;
  leadSource?: "Web" | "Phone" | "Referral" | "Partner" | "Campaign" | "Event" | "Other";
  status: "New" | "Working" | "Qualified" | "Unqualified";
  rating?: "Hot" | "Warm" | "Cold";
  address?: Address;
  isConverted: boolean;
  convertedAccountId?: string;
  convertedContactId?: string;
  convertedOpportunityId?: string;
  convertedAt?: Date;
}

// Opportunity
export interface Opportunity extends BaseRecord {
  name: string;
  accountId: string;
  stageName: string;
  probability: number;
  amount?: number;
  closeDate: Date;
  isClosed: boolean;
  isWon: boolean;
  lostReason?: string;
  forecastCategory: "Pipeline" | "Best Case" | "Commit" | "Closed";
  type?: "New Business" | "Existing Business" | "Renewal";
  leadSource?: string;
  nextStep?: string;
  description?: string;
  pricebookId?: string;
  primaryQuoteId?: string;
}

// Quote
export interface Quote extends BaseRecord {
  name: string;
  opportunityId: string;
  status: "Draft" | "Presented" | "Accepted" | "Rejected";
  isPrimary: boolean;
  expirationDate?: Date;
  subtotal: number;
  discount: number;
  totalPrice: number;
  taxAmount: number;
  grandTotal: number;
  billingAddress?: Address;
  shippingAddress?: Address;
  pricebookId?: string;
  description?: string;
}

// Product
export interface Product extends BaseRecord {
  name: string;
  productCode?: string;
  description?: string;
  family?: string;
  isActive: boolean;
}

// Pricebook
export interface Pricebook extends BaseRecord {
  name: string;
  description?: string;
  isActive: boolean;
  isStandard: boolean;
}

// PricebookEntry
export interface PricebookEntry extends BaseRecord {
  pricebookId: string;
  productId: string;
  unitPrice: number;
  isActive: boolean;
  useStandardPrice: boolean;
  productName?: string;
  pricebookName?: string;
}

// OpportunityLineItem
export interface OpportunityLineItem {
  id: string;
  tenantId: string;
  opportunityId: string;
  pricebookEntryId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  customerUnitPrice?: number;
  discount: number;
  termMonths?: number;
  billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
  startDate?: Date;
  endDate?: Date;
  totalPrice: number;
  description?: string;
  sortOrder: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  productName?: string;
  productCode?: string;
}

// QuoteLineItem
export interface QuoteLineItem {
  id: string;
  tenantId: string;
  quoteId: string;
  productId?: string;
  pricebookEntryId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  customerUnitPrice?: number;
  discount: number;
  termMonths?: number;
  billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
  startDate?: Date;
  endDate?: Date;
  totalPrice: number;
  sortOrder: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  productName?: string;
  productCode?: string;
}

// Task
export interface Task {
  id: string;
  tenantId: string;
  ownerId?: string;
  subject: string;
  status: "NotStarted" | "InProgress" | "Completed" | "WaitingOnSomeoneElse" | "Deferred";
  priority: "High" | "Normal" | "Low";
  activityDate?: Date;
  dueDate?: Date;
  completedAt?: Date;
  whoType?: "Lead" | "Contact";
  whoId?: string;
  whatType?: "Account" | "Opportunity" | "Quote";
  whatId?: string;
  description?: string;
  isClosed: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  ownerName?: string;
  whoName?: string;
  whatName?: string;
}

// Event
export interface Event {
  id: string;
  tenantId: string;
  ownerId?: string;
  subject: string;
  startDateTime: Date;
  endDateTime: Date;
  isAllDayEvent: boolean;
  location?: string;
  whoType?: "Lead" | "Contact";
  whoId?: string;
  whatType?: "Account" | "Opportunity" | "Quote";
  whatId?: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  ownerName?: string;
  whoName?: string;
  whatName?: string;
}

// User
export interface User {
  id: string;
  tenantId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName: string;
  displayName: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  department?: string;
  managerId?: string;
  roleId?: string;
  profileId?: string;
  timezone: string;
  locale: string;
  photoUrl?: string;
  aboutMe?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  managerName?: string;
  roleName?: string;
  profileName?: string;
}

export interface CreateUserInput {
  email: string;
  username?: string;
  firstName?: string;
  lastName: string;
  displayName?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  department?: string;
  managerId?: string;
  roleId?: string;
  profileId?: string;
  timezone?: string;
  locale?: string;
  photoUrl?: string;
  aboutMe?: string;
  isActive?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  mobilePhone?: string;
  title?: string;
  department?: string;
  managerId?: string;
  roleId?: string;
  profileId?: string;
  timezone?: string;
  locale?: string;
  photoUrl?: string;
  aboutMe?: string;
  isActive?: boolean;
}

// API Response types
export interface PaginatedResponse<T> {
  records: T[];
  totalSize: number;
  nextCursor?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{
    field?: string;
    message: string;
    rule?: string;
  }>;
  correlationId?: string;
}

// Order
export interface Order extends BaseRecord {
  accountId: string;
  opportunityId?: string;
  quoteId?: string;
  contractId?: string;
  orderNumber: string;
  name: string;
  orderType: "New" | "Renewal" | "Upsell" | "Amendment";
  status: "Draft" | "Activated" | "Fulfilled" | "Cancelled";
  orderDate?: Date;
  effectiveDate?: Date;
  totalAmount: number;
  billingAddress?: Address;
  shippingAddress?: Address;
  description?: string;
  // Joined fields
  accountName?: string;
  opportunityName?: string;
}

// OrderItem
export interface OrderItem {
  id: string;
  tenantId: string;
  orderId: string;
  productId: string;
  pricebookEntryId?: string;
  quoteLineItemId?: string;
  quantity: number;
  unitPrice: number;
  customerUnitPrice?: number;
  discount: number;
  termMonths?: number;
  billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
  startDate?: Date;
  endDate?: Date;
  totalPrice: number;
  description?: string;
  sortOrder: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  productName?: string;
  productCode?: string;
}

// Contract
export interface Contract extends BaseRecord {
  accountId: string;
  contractNumber: string;
  name: string;
  contractType: "License" | "PoF" | "Service";
  status: "Draft" | "InApproval" | "Activated" | "Expired" | "Terminated";
  startDate?: Date;
  endDate?: Date;
  termMonths: number;
  billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
  totalContractValue: number;
  remainingValue: number;
  autoRenewal: boolean;
  renewalTermMonths?: number;
  renewalNoticeDate?: Date;
  activatedAt?: Date;
  activatedBy?: string;
  terminatedAt?: Date;
  terminationReason?: string;
  primaryOrderId?: string;
  sourceContractId?: string;
  description?: string;
  // Joined fields
  accountName?: string;
}

// ContractLineItem
export interface ContractLineItem {
  id: string;
  tenantId: string;
  contractId: string;
  productId: string;
  pricebookEntryId?: string;
  sourceOrderItemId?: string;
  quantity: number;
  unitPrice: number;
  customerUnitPrice?: number;
  termMonths?: number;
  billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  consumedAmount: number;
  remainingAmount: number;
  status: "Active" | "Expired" | "Cancelled";
  description?: string;
  sortOrder: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  productName?: string;
  productCode?: string;
}

// PoolConsumption
export interface PoolConsumption {
  id: string;
  tenantId: string;
  contractLineItemId: string;
  consumptionDate: Date;
  quantity: number;
  unitPrice: number;
  amount: number;
  description?: string;
  requestedBy: string;
  requestedAt: Date;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled" | "Invoiced";
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  invoiceLineItemId?: string;
  externalReference?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  requesterName?: string;
  approverName?: string;
  productName?: string;
  contractName?: string;
}

// Invoice
export interface Invoice extends BaseRecord {
  accountId: string;
  contractId?: string;
  orderId?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: "Draft" | "Sent" | "Paid" | "PartialPaid" | "Overdue" | "Cancelled" | "Void";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
  sentAt?: Date;
  paidAt?: Date;
  billingAddress?: Address;
  notes?: string;
  // Joined fields
  accountName?: string;
  contractName?: string;
  orderName?: string;
}

// InvoiceLineItem
export interface InvoiceLineItem {
  id: string;
  tenantId: string;
  invoiceId: string;
  contractLineItemId?: string;
  orderItemId?: string;
  poolConsumptionId?: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount: number;
  billingPeriodStart?: Date;
  billingPeriodEnd?: Date;
  sortOrder: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  productName?: string;
  productCode?: string;
}

// List options for queries
export interface ListOptions {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
  filters?: Record<string, unknown>;
}

// OpportunityContactRole
export interface OpportunityContactRole {
  id: string;
  tenantId: string;
  opportunityId: string;
  contactId: string;
  role: "DecisionMaker" | "Influencer" | "Evaluator" | "Executive" | "User" | "Other";
  isPrimary: boolean;
  influenceLevel?: number;
  stance?: "Support" | "Neutral" | "Oppose";
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  contactName?: string;
  contactEmail?: string;
  contactTitle?: string;
}

// Role
export interface Role {
  id: string;
  tenantId: string;
  name: string;
  parentRoleId?: string | null;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

export interface CreateRoleInput {
  name: string;
  parentRoleId?: string | null;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateRoleInput {
  name?: string;
  parentRoleId?: string | null;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// Permission Profile
export interface PermissionProfile {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

export interface CreatePermissionProfileInput {
  name: string;
  description?: string;
  isSystem?: boolean;
  isActive?: boolean;
}

export interface UpdatePermissionProfileInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// Profile Object Permission
export interface ProfileObjectPermission {
  id: string;
  tenantId: string;
  profileId: string;
  objectName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  viewAll: boolean;
  modifyAll: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Profile Field Permission
export interface ProfileFieldPermission {
  id: string;
  tenantId: string;
  profileId: string;
  objectName: string;
  fieldName: string;
  isReadable: boolean;
  isEditable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Permission Set
export interface PermissionSet {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

export interface CreatePermissionSetInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePermissionSetInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// User Permission Set Assignment
export interface UserPermissionSet {
  id: string;
  tenantId: string;
  userId: string;
  permissionSetId: string;
  createdAt: Date;
  createdBy: string;
}

// Permission Set Object Permission
export interface PermissionSetObjectPermission {
  id: string;
  tenantId: string;
  permissionSetId: string;
  objectName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  viewAll: boolean;
  modifyAll: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Permission Set Field Permission
export interface PermissionSetFieldPermission {
  id: string;
  tenantId: string;
  permissionSetId: string;
  objectName: string;
  fieldName: string;
  isReadable: boolean;
  isEditable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Organization-Wide Default
export type OWDAccessLevel = "Private" | "PublicReadOnly" | "PublicReadWrite" | "ControlledByParent";

export interface OrgWideDefault {
  id: string;
  tenantId: string;
  objectName: string;
  internalAccess: OWDAccessLevel;
  externalAccess: "Private" | "PublicReadOnly" | "PublicReadWrite";
  grantAccessUsingHierarchies: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface UpdateOrgWideDefaultInput {
  internalAccess?: OWDAccessLevel;
  externalAccess?: "Private" | "PublicReadOnly" | "PublicReadWrite";
  grantAccessUsingHierarchies?: boolean;
}

// Sharing Rule
export type SharingRuleType = "OwnerBased" | "CriteriaBased";
export type SharingSourceType = "Role" | "RoleAndSubordinates" | "PublicGroup";
export type SharingTargetType = "Role" | "RoleAndSubordinates" | "PublicGroup" | "User";
export type SharingAccessLevel = "Read" | "ReadWrite";

export interface SharingRule {
  id: string;
  tenantId: string;
  name: string;
  objectName: string;
  ruleType: SharingRuleType;
  description?: string;
  isActive: boolean;
  sourceType?: SharingSourceType;
  sourceId?: string;
  targetType: SharingTargetType;
  targetId: string;
  accessLevel: SharingAccessLevel;
  filterCriteria?: Record<string, unknown>;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

export interface CreateSharingRuleInput {
  name: string;
  objectName: string;
  ruleType: SharingRuleType;
  description?: string;
  isActive?: boolean;
  sourceType?: SharingSourceType;
  sourceId?: string;
  targetType: SharingTargetType;
  targetId: string;
  accessLevel?: SharingAccessLevel;
  filterCriteria?: Record<string, unknown>;
}

export interface UpdateSharingRuleInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  sourceType?: SharingSourceType;
  sourceId?: string;
  targetType?: SharingTargetType;
  targetId?: string;
  accessLevel?: SharingAccessLevel;
  filterCriteria?: Record<string, unknown>;
}

// Public Group
export interface PublicGroup {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  doesIncludeBosses: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

export interface CreatePublicGroupInput {
  name: string;
  description?: string;
  isActive?: boolean;
  doesIncludeBosses?: boolean;
}

export interface UpdatePublicGroupInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  doesIncludeBosses?: boolean;
}

// Public Group Member
export type GroupMemberType = "User" | "Role" | "RoleAndSubordinates" | "Group";

export interface PublicGroupMember {
  id: string;
  tenantId: string;
  groupId: string;
  memberType: GroupMemberType;
  memberId: string;
  createdAt: Date;
  createdBy: string;
  memberName?: string; // Joined field
}

// Object Share
export type ShareSubjectType = "User" | "Role" | "Group";
export type ShareAccessLevel = "Read" | "ReadWrite";
export type ShareRowCause = "Owner" | "RoleHierarchy" | "Rule" | "Manual" | "Team" | "Territory" | "Implicit";

export interface ObjectShare {
  id: string;
  tenantId: string;
  objectName: string;
  recordId: string;
  subjectType: ShareSubjectType;
  subjectId: string;
  accessLevel: ShareAccessLevel;
  rowCause: ShareRowCause;
  sharingRuleId?: string;
  createdAt: Date;
  createdBy: string;
  isDeleted: boolean;
  subjectName?: string; // Joined field
}

export interface CreateObjectShareInput {
  recordId: string;
  subjectType: ShareSubjectType;
  subjectId: string;
  accessLevel: ShareAccessLevel;
  rowCause: ShareRowCause;
  sharingRuleId?: string;
}

// Campaign
export type CampaignType =
  | "Email"
  | "Webinar"
  | "TradeShow"
  | "Conference"
  | "DirectMail"
  | "Telemarketing"
  | "Advertisement"
  | "Banner"
  | "Partners"
  | "Referral"
  | "Public Relations"
  | "Social"
  | "Other";

export type CampaignStatus = "Planned" | "Active" | "Completed" | "Aborted";

export interface Campaign extends BaseRecord {
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  budgetedCost: number;
  actualCost: number;
  expectedRevenue: number;
  expectedResponse: number;
  numberSent: number;
  numberOfLeads: number;
  numberOfConvertedLeads: number;
  numberOfContacts: number;
  numberOfResponses: number;
  numberOfOpportunities: number;
  amountAllOpportunities: number;
  amountWonOpportunities: number;
  parentCampaignId?: string;
  isActive: boolean;
  // Joined fields
  parentCampaignName?: string;
  ownerName?: string;
}

export interface CreateCampaignInput {
  name: string;
  type?: CampaignType;
  status?: CampaignStatus;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  budgetedCost?: number;
  actualCost?: number;
  expectedRevenue?: number;
  expectedResponse?: number;
  parentCampaignId?: string;
  isActive?: boolean;
}

export interface UpdateCampaignInput {
  name?: string;
  type?: CampaignType;
  status?: CampaignStatus;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  budgetedCost?: number;
  actualCost?: number;
  expectedRevenue?: number;
  expectedResponse?: number;
  parentCampaignId?: string;
  isActive?: boolean;
}

// CampaignMember
export type CampaignMemberType = "Lead" | "Contact";
export type CampaignMemberStatus = "Sent" | "Responded" | "Opened" | "Clicked" | "Converted" | "Unsubscribed" | "Bounced";

export interface CampaignMember {
  id: string;
  tenantId: string;
  campaignId: string;
  memberType: CampaignMemberType;
  memberId: string;
  status: CampaignMemberStatus;
  firstRespondedDate?: Date;
  hasResponded: boolean;
  description?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  campaignName?: string;
  memberName?: string;
  memberEmail?: string;
}

export interface CreateCampaignMemberInput {
  campaignId: string;
  memberType: CampaignMemberType;
  memberId: string;
  status?: CampaignMemberStatus;
  description?: string;
}

export interface UpdateCampaignMemberInput {
  status?: CampaignMemberStatus;
  description?: string;
}

// ==================== Validation Rules ====================

// Condition expression types for DSL/AST
export type ConditionOperator =
  | "and" | "or" | "not"
  | "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "between"
  | "contains" | "startsWith" | "endsWith" | "matches" | "length"
  | "isNull" | "isBlank" | "isChanged" | "isNew" | "wasNull"
  | "today" | "addDays" | "dateDiffDays" | "coalesce"
  | "literal" | "ref" | "list";

export interface ConditionExpression {
  schemaVersion: number;
  expr: ConditionNode;
}

export interface ConditionNode {
  op: ConditionOperator;
  args?: ConditionNode[];
  arg?: ConditionNode;
  left?: ConditionNode;
  right?: ConditionNode;
  value?: ConditionNode;
  text?: ConditionNode;
  substr?: ConditionNode;
  min?: ConditionNode;
  max?: ConditionNode;
  date?: ConditionNode;
  days?: ConditionNode;
  items?: ConditionNode[];
  path?: string;
  field?: string;
  pattern?: string;
  type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  literalValue?: any;
}

export type ValidationObjectName =
  | "Account" | "Contact" | "Lead" | "Opportunity" | "Quote" | "Order"
  | "Contract" | "Invoice" | "Product" | "Pricebook" | "PricebookEntry"
  | "Task" | "Event" | "Campaign" | "CampaignMember";

export interface ValidationRule {
  id: string;
  tenantId: string;
  objectName: ValidationObjectName;
  ruleName: string;
  description?: string;
  isActive: boolean;
  conditionExpression: ConditionExpression;
  errorMessage: string;
  errorField?: string;
  executionOrder: number;
  applyOnCreate: boolean;
  applyOnUpdate: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

export interface CreateValidationRuleInput {
  objectName: ValidationObjectName;
  ruleName: string;
  description?: string;
  isActive?: boolean;
  conditionExpression: ConditionExpression;
  errorMessage: string;
  errorField?: string;
  executionOrder?: number;
  applyOnCreate?: boolean;
  applyOnUpdate?: boolean;
}

export interface UpdateValidationRuleInput {
  ruleName?: string;
  description?: string;
  isActive?: boolean;
  conditionExpression?: ConditionExpression;
  errorMessage?: string;
  errorField?: string;
  executionOrder?: number;
  applyOnCreate?: boolean;
  applyOnUpdate?: boolean;
}

export interface ValidationError {
  ruleId: string;
  ruleName: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ==================== Field History ====================

export type TrackableObjectName =
  | "Account" | "Contact" | "Lead" | "Opportunity" | "Quote" | "Order"
  | "Contract" | "Invoice" | "Product" | "Pricebook" | "PricebookEntry"
  | "Task" | "Event" | "Campaign" | "CampaignMember";

export interface FieldTrackingSetting {
  id: string;
  tenantId: string;
  objectName: TrackableObjectName;
  fieldName: string;
  isTracked: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface CreateFieldTrackingInput {
  objectName: TrackableObjectName;
  fieldName: string;
  isTracked?: boolean;
}

export interface UpdateFieldTrackingInput {
  isTracked: boolean;
}

export interface FieldHistory {
  id: string;
  tenantId: string;
  objectName: TrackableObjectName;
  recordId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: Date;
  changedBy: string;
  // Joined fields
  changedByName?: string;
}

export interface FieldChange {
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
}

// Request context
export interface RequestContext {
  tenantId: string;
  userId: string;
  userEmail: string;
  roles: string[];
}

// =============================================
// Approval Instance / Work Item / History Types
// =============================================

export type ApprovalInstanceStatus = "Pending" | "Approved" | "Rejected" | "Recalled";
export type ApprovalWorkItemStatus = "Pending" | "Approved" | "Rejected" | "Reassigned";
export type ApprovalHistoryAction = "Submit" | "Approve" | "Reject" | "Recall" | "Reassign" | "Comment";

export interface ApprovalInstance {
  id: string;
  tenantId: string;
  processDefinitionId: string;
  targetObjectName: string;
  targetRecordId: string;
  status: ApprovalInstanceStatus;
  submittedBy: string;
  submittedAt: Date;
  completedAt?: Date;
  completedBy?: string;
  currentStep: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  processName?: string;
  submitterName?: string;
}

export interface ApprovalWorkItem {
  id: string;
  tenantId: string;
  approvalInstanceId: string;
  stepNumber: number;
  approverId: string;
  status: ApprovalWorkItemStatus;
  assignedAt: Date;
  completedAt?: Date;
  comments?: string;
  originalApproverId?: string;
  reassignedBy?: string;
  reassignedAt?: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  approverName?: string;
  targetObjectName?: string;
  targetRecordId?: string;
  processName?: string;
}

export interface ApprovalHistory {
  id: string;
  tenantId: string;
  approvalInstanceId: string;
  actorId: string;
  action: ApprovalHistoryAction;
  stepNumber?: number;
  comments?: string;
  createdAt: Date;
  createdBy: string;
  isDeleted: boolean;
  // Joined fields
  actorName?: string;
}

export interface CreateApprovalInstanceInput {
  processDefinitionId: string;
  targetObjectName: string;
  targetRecordId: string;
  comments?: string;
}

export interface ApprovalDecisionInput {
  action: "Approve" | "Reject";
  comments?: string;
}

export interface ApprovalReassignInput {
  newApproverId: string;
  comments?: string;
}

// =============================================
// Forecast & Quota Management Types
// =============================================

// Forecast Category (probability-based)
export type ForecastCategory = "Pipeline" | "BestCase" | "Commit" | "Closed";

// Period Type
export type PeriodType = "Monthly" | "Quarterly" | "Yearly";

// ForecastPeriod
export interface ForecastPeriod {
  id: string;
  tenantId: string;
  name: string;
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  fiscalYear: number;
  fiscalQuarter?: number;
  fiscalMonth?: number;
  isClosed: boolean;
  closedAt?: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

export interface CreateForecastPeriodInput {
  name: string;
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  fiscalYear: number;
  fiscalQuarter?: number;
  fiscalMonth?: number;
  isClosed?: boolean;
}

export interface UpdateForecastPeriodInput {
  name?: string;
  periodType?: PeriodType;
  startDate?: Date;
  endDate?: Date;
  fiscalYear?: number;
  fiscalQuarter?: number;
  fiscalMonth?: number;
  isClosed?: boolean;
}

// Forecast
export interface Forecast {
  id: string;
  tenantId: string;
  ownerId: string;
  periodId: string;
  forecastCategory: ForecastCategory;
  amount: number;
  quantity?: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  ownerName?: string;
  periodName?: string;
}

export interface CreateForecastInput {
  ownerId: string;
  periodId: string;
  forecastCategory: ForecastCategory;
  amount: number;
  quantity?: number;
}

export interface UpdateForecastInput {
  amount?: number;
  quantity?: number;
}

// ForecastItem (Opportunity Snapshot)
export interface ForecastItem {
  id: string;
  tenantId: string;
  forecastId: string;
  opportunityId: string;
  amount: number;
  probability: number;
  closeDate: Date;
  stageName: string;
  forecastCategory: ForecastCategory;
  snapshotDate: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  opportunityName?: string;
}

export interface CreateForecastItemInput {
  forecastId: string;
  opportunityId: string;
  amount: number;
  probability: number;
  closeDate: Date;
  stageName: string;
  forecastCategory: ForecastCategory;
}

export interface UpdateForecastItemInput {
  amount?: number;
  probability?: number;
  closeDate?: Date;
  stageName?: string;
  forecastCategory?: ForecastCategory;
}

// ForecastAdjustment
export type AdjustmentType = "OwnerAdjustment" | "ManagerAdjustment";

export interface ForecastAdjustment {
  id: string;
  tenantId: string;
  forecastId: string;
  adjustedBy: string;
  adjustmentType: AdjustmentType;
  originalAmount: number;
  adjustedAmount: number;
  adjustmentReason?: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  adjustedByName?: string;
}

export interface CreateForecastAdjustmentInput {
  forecastId: string;
  adjustmentType: AdjustmentType;
  originalAmount: number;
  adjustedAmount: number;
  adjustmentReason?: string;
}

// Quota
export interface Quota {
  id: string;
  tenantId: string;
  ownerId: string;
  periodId: string;
  quotaAmount: number;
  currencyIsoCode: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  ownerName?: string;
  periodName?: string;
}

export interface CreateQuotaInput {
  ownerId: string;
  periodId: string;
  quotaAmount: number;
  currencyIsoCode?: string;
}

export interface UpdateQuotaInput {
  quotaAmount?: number;
  currencyIsoCode?: string;
}

// Quota with calculated fields
export interface QuotaWithAttainment extends Quota {
  actualRevenue: number;
  forecastRevenue: number;
  attainmentPercentage: number;
}

// Forecast Summary by Period
export interface ForecastSummary {
  periodId: string;
  periodName: string;
  totalPipeline: number;
  totalBestCase: number;
  totalCommit: number;
  totalClosed: number;
  grandTotal: number;
}

// Quota Summary by Period
export interface QuotaSummary {
  periodId: string;
  periodName: string;
  totalQuota: number;
  totalActual: number;
  totalForecast: number;
  attainmentPercentage: number;
}

// =============================================
// Territory Management (Advanced Features)
// =============================================

// TerritoryModel State
export type TerritoryModelState = "Planning" | "Active" | "Archived";

// TerritoryModel
export interface TerritoryModel {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  state: TerritoryModelState;
  activatedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Calculated fields
  territoryCount?: number;
}

export interface CreateTerritoryModelInput {
  name: string;
  description?: string;
}

export interface UpdateTerritoryModelInput {
  name?: string;
  description?: string;
}

// TerritoryType
export interface TerritoryType {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  priority: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
}

export interface CreateTerritoryTypeInput {
  name: string;
  description?: string;
  priority?: number;
}

export interface UpdateTerritoryTypeInput {
  name?: string;
  description?: string;
  priority?: number;
}

// TerritoryClosure (Closure Table entry)
export interface TerritoryClosure {
  tenantId: string;
  ancestorId: string;
  descendantId: string;
  depth: number;
}

// Extended Territory (with model/type references)
export interface TerritoryExtended {
  id: string;
  tenantId: string;
  name: string;
  parentTerritoryId?: string;
  modelId?: string;
  territoryTypeId?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  parentTerritoryName?: string;
  modelName?: string;
  territoryTypeName?: string;
  userCount?: number;
  accountCount?: number;
  depth?: number;
}

// Territory with hierarchy depth (for ancestor/descendant queries)
export interface TerritoryWithDepth extends TerritoryExtended {
  depth: number;
}

// Rule Evaluation Result
export interface TerritoryRuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  matchedAccountIds: string[];
}

// Filter Condition for Territory Rules (DSL/AST)
export type TerritoryRuleOperator =
  | "equals" | "notEquals"
  | "contains" | "notContains" | "startsWith" | "endsWith"
  | "greaterThan" | "lessThan" | "greaterOrEqual" | "lessOrEqual"
  | "in" | "notIn"
  | "isNull" | "isNotNull";

export interface TerritoryFilterCondition {
  field?: string;
  operator?: TerritoryRuleOperator;
  value?: unknown;
  AND?: TerritoryFilterCondition[];
  OR?: TerritoryFilterCondition[];
}

// Rule Run Result
export interface TerritoryRuleRunResult {
  territoryId: string;
  assigned: number;
  skipped: number;
  errors: string[];
}
