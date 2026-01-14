// CRM Object Types for MSW Mocks

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface BaseRecord {
  id: string;
  tenantId: string;
  ownerId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  ownerName?: string;
  createdByName?: string;
  lastModifiedByName?: string;
}

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

export interface Lead extends BaseRecord {
  firstName?: string;
  lastName: string;
  company: string;
  email?: string;
  phone?: string;
  title?: string;
  industry?: string;
  leadSource?:
    | "Web"
    | "Phone"
    | "Referral"
    | "Partner"
    | "Campaign"
    | "Event"
    | "Other";
  status: "New" | "Working" | "Qualified" | "Unqualified";
  rating?: "Hot" | "Warm" | "Cold";
  address?: Address;
  isConverted: boolean;
  convertedAccountId?: string;
  convertedContactId?: string;
  convertedOpportunityId?: string;
  convertedAt?: string;
}

export interface Opportunity extends BaseRecord {
  name: string;
  accountId: string;
  stageName: string;
  probability: number;
  amount?: number;
  closeDate: string;
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
  // Joined fields
  accountName?: string;
}

export interface Quote extends BaseRecord {
  name: string;
  opportunityId: string;
  status: "Draft" | "NeedsReview" | "InReview" | "Approved" | "Rejected" | "Presented" | "Accepted" | "Denied";
  isPrimary: boolean;
  expirationDate?: string;
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
  startDate?: string;
  endDate?: string;
  totalPrice: number;
  description?: string;
  sortOrder: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  productName?: string;
  productCode?: string;
}

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
  startDate?: string;
  endDate?: string;
  totalPrice: number;
  sortOrder: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  productName?: string;
  productCode?: string;
}

export interface User {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  displayName: string;
  roleId: string;
  roleName: string;
  profileId: string;
  profileName: string;
  isActive: boolean;
}

// Stage definition for Opportunity
export interface StageDefinition {
  stageName: string;
  probability: number;
  forecastCategory: "Pipeline" | "Best Case" | "Commit" | "Closed";
  isClosed: boolean;
  isWon: boolean;
  sortOrder: number;
}

export interface Order extends BaseRecord {
  accountId: string;
  opportunityId?: string;
  quoteId?: string;
  contractId?: string;
  orderNumber: string;
  name: string;
  orderType: "New" | "Renewal" | "Upsell" | "Amendment";
  status: "Draft" | "Activated" | "Fulfilled" | "Cancelled";
  orderDate?: string;
  effectiveDate?: string;
  totalAmount: number;
  billingAddress?: Address;
  shippingAddress?: Address;
  description?: string;
  // Joined fields
  accountName?: string;
  opportunityName?: string;
}

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
  startDate?: string;
  endDate?: string;
  totalPrice: number;
  description?: string;
  sortOrder: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  productName?: string;
  productCode?: string;
}

export interface Contract extends BaseRecord {
  accountId: string;
  contractNumber: string;
  name: string;
  contractType: "License" | "PoF" | "Service";
  status: "Draft" | "InApproval" | "Activated" | "Expired" | "Terminated";
  startDate?: string;
  endDate?: string;
  termMonths: number;
  billingFrequency?: "Monthly" | "Yearly" | "ThreeYear";
  totalContractValue: number;
  remainingValue: number;
  autoRenewal: boolean;
  renewalTermMonths?: number;
  renewalNoticeDate?: string;
  activatedAt?: string;
  activatedBy?: string;
  terminatedAt?: string;
  terminationReason?: string;
  primaryOrderId?: string;
  sourceContractId?: string;
  description?: string;
  // Joined fields
  accountName?: string;
}

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
  startDate: string;
  endDate: string;
  totalPrice: number;
  consumedAmount: number;
  remainingAmount: number;
  status: "Active" | "Expired" | "Cancelled";
  description?: string;
  sortOrder: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  productName?: string;
  productCode?: string;
}

export interface PoolConsumption {
  id: string;
  tenantId: string;
  contractLineItemId: string;
  consumptionDate: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  description?: string;
  requestedBy: string;
  requestedAt: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled" | "Invoiced";
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  invoiceLineItemId?: string;
  externalReference?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  requesterName?: string;
  approverName?: string;
  productName?: string;
  contractName?: string;
}

export interface Invoice extends BaseRecord {
  accountId: string;
  contractId?: string;
  orderId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: "Draft" | "Sent" | "Paid" | "PartialPaid" | "Overdue" | "Cancelled" | "Void";
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  sentAt?: string;
  paidAt?: string;
  billingAddress?: Address;
  notes?: string;
  // Joined fields
  accountName?: string;
  contractName?: string;
  orderName?: string;
}

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
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  sortOrder: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  productName?: string;
  productCode?: string;
}

// Campaign
export interface Campaign extends BaseRecord {
  name: string;
  type: "Conference" | "Webinar" | "Trade Show" | "Email" | "Advertising" | "Direct Mail" | "Partner" | "Other";
  status: "Planned" | "InProgress" | "Completed" | "Aborted";
  startDate?: string;
  endDate?: string;
  expectedRevenue?: number;
  budgetedCost?: number;
  actualCost?: number;
  expectedResponse?: number;
  numberSent?: number;
  parentId?: string;
  isActive: boolean;
  description?: string;
  // Metrics (derived)
  numberOfLeads?: number;
  numberOfContacts?: number;
  numberOfOpportunities?: number;
  numberOfWonOpportunities?: number;
  amountAllOpportunities?: number;
  amountWonOpportunities?: number;
}

export interface CampaignMember {
  id: string;
  tenantId: string;
  campaignId: string;
  leadId?: string;
  contactId?: string;
  status: "Sent" | "Responded" | "Converted";
  firstRespondedDate?: string;
  hasResponded: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  systemModstamp: string;
  // Joined fields
  memberName?: string;
  memberEmail?: string;
  memberCompany?: string;
}

// Workflow Rules
// Field definition for condition builders
export interface FieldDefinition {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "picklist" | "date";
  options?: { value: string; label: string }[];
}

export type WorkflowTriggerType = "BeforeSave" | "AfterSave" | "Async" | "Scheduled";
export type WorkflowEvaluationCriteria = "Created" | "CreatedOrEdited" | "CreatedAndMeetsCriteria";
export type WorkflowOperator = "equals" | "notEquals" | "contains" | "startsWith" | "greaterThan" | "lessThan" | "isNull" | "isNotNull" | "changed" | "changedTo";
export type WorkflowActionType = "FieldUpdate" | "CreateTask" | "SendNotification" | "SendEmail" | "OutboundMessage";

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: WorkflowOperator;
  value?: string | number | boolean;
  orderIndex: number;
}

export interface FieldUpdateConfig {
  field: string;
  value: string | number | boolean | null;
  useFormula?: boolean;
  formula?: string;
}

export interface CreateTaskConfig {
  subject: string;
  description?: string;
  dueDate: string | { type: "relative"; days: number };
  assignedTo: "RecordOwner" | "SpecificUser";
  assignedToUserId?: string;
  priority?: "High" | "Normal" | "Low";
}

export interface SendNotificationConfig {
  recipientType: "RecordOwner" | "SpecificUser" | "Role";
  recipientId?: string;
  template?: string;
}

export interface SendEmailConfig {
  templateId: string;
  recipientType: "RecordOwner" | "SpecificUser" | "ContactField";
  recipientField?: string;
  recipientId?: string;
}

export interface OutboundMessageConfig {
  endpointUrl: string;
  includeFields?: string[];
}

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  config: FieldUpdateConfig | CreateTaskConfig | SendNotificationConfig | SendEmailConfig | OutboundMessageConfig;
  orderIndex: number;
}

export interface WorkflowRule {
  id: string;
  tenantId: string;
  name: string;
  objectName: string;
  triggerType: WorkflowTriggerType;
  evaluationCriteria: WorkflowEvaluationCriteria;
  isActive: boolean;
  description?: string;
  conditions: WorkflowCondition[];
  filterLogic?: string;
  actions: WorkflowAction[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
}

// Approval Process
export type ApproverType = "Manager" | "ManagersManager" | "SpecificUser" | "Queue" | "Role";
export type RejectBehavior = "FinalRejection" | "BackToSubmitter" | "BackToPreviousStep";
export type RecordEditability = "Locked" | "AdminOnly";
export type ApprovalActionType = "FieldUpdate" | "SendEmail" | "OutboundMessage";

export interface ApprovalCondition {
  id: string;
  field: string;
  operator: WorkflowOperator;
  value?: string | number | boolean;
  orderIndex: number;
}

export interface ApprovalStep {
  id: string;
  name: string;
  orderIndex: number;
  approverType: ApproverType;
  approverId?: string;
  approverName?: string;
  stepCriteria?: ApprovalCondition[];
  filterLogic?: string;
  rejectBehavior: RejectBehavior;
}

export interface ApprovalAction {
  id: string;
  type: ApprovalActionType;
  config: FieldUpdateConfig | SendEmailConfig | OutboundMessageConfig;
}

export interface ApprovalProcess {
  id: string;
  tenantId: string;
  name: string;
  objectName: string;
  isActive: boolean;
  description?: string;
  entryCriteria: ApprovalCondition[];
  filterLogic?: string;
  recordEditability: RecordEditability;
  steps: ApprovalStep[];
  actions: {
    onSubmit: ApprovalAction[];
    onApprove: ApprovalAction[];
    onReject: ApprovalAction[];
  };
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
}

// Territory Management
export type TerritoryAccessLevel = "Read" | "ReadWrite";
export type TerritoryAssignmentType = "Manual" | "RuleBased";

export interface Territory {
  id: string;
  tenantId: string;
  name: string;
  parentTerritoryId?: string;
  parentTerritoryName?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  userCount?: number;
  accountCount?: number;
  pipelineAmount?: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
  children?: Territory[];
}

export interface TerritoryUserAssignment {
  id: string;
  tenantId: string;
  territoryId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  accessLevel: TerritoryAccessLevel;
  createdAt: string;
  createdBy: string;
  isDeleted: boolean;
}

export interface TerritoryAccountAssignment {
  id: string;
  tenantId: string;
  territoryId: string;
  accountId: string;
  accountName?: string;
  accountIndustry?: string;
  assignmentType: TerritoryAssignmentType;
  assignmentRuleId?: string;
  createdAt: string;
  createdBy: string;
  isDeleted: boolean;
}

export interface TerritoryCondition {
  id: string;
  field: string;
  operator: "equals" | "notEquals" | "contains" | "startsWith" | "greaterThan" | "lessThan";
  value: string | number;
  orderIndex: number;
}

export interface TerritoryAssignmentRule {
  id: string;
  tenantId: string;
  territoryId: string;
  name: string;
  isActive: boolean;
  conditions: TerritoryCondition[];
  filterLogic?: string;
  priority: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  isDeleted: boolean;
}

// API Response types
export interface QueryResponse<T> {
  records: T[];
  totalSize: number;
  nextCursor?: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      message: string;
      rule?: string;
    }>;
    correlationId?: string;
  };
}
