// In-memory database for MSW mocks

import type {
  Account,
  Contact,
  Lead,
  Opportunity,
  Quote,
  User,
  StageDefinition,
} from "./types";

// Default tenant and user for development
export const DEFAULT_TENANT_ID = "550e8400-e29b-41d4-a716-446655440000";
export const DEFAULT_USER_ID = "550e8400-e29b-41d4-a716-446655440001";

// Stage definitions
export const STAGE_DEFINITIONS: StageDefinition[] = [
  {
    stageName: "Qualification",
    probability: 10,
    forecastCategory: "Pipeline",
    isClosed: false,
    isWon: false,
    sortOrder: 1,
  },
  {
    stageName: "Needs Analysis",
    probability: 20,
    forecastCategory: "Pipeline",
    isClosed: false,
    isWon: false,
    sortOrder: 2,
  },
  {
    stageName: "Proposal",
    probability: 50,
    forecastCategory: "Pipeline",
    isClosed: false,
    isWon: false,
    sortOrder: 3,
  },
  {
    stageName: "Negotiation",
    probability: 75,
    forecastCategory: "Best Case",
    isClosed: false,
    isWon: false,
    sortOrder: 4,
  },
  {
    stageName: "Closed Won",
    probability: 100,
    forecastCategory: "Closed",
    isClosed: true,
    isWon: true,
    sortOrder: 5,
  },
  {
    stageName: "Closed Lost",
    probability: 0,
    forecastCategory: "Closed",
    isClosed: true,
    isWon: false,
    sortOrder: 6,
  },
];

// In-memory storage
class MockDatabase {
  private accounts: Map<string, Account> = new Map();
  private contacts: Map<string, Contact> = new Map();
  private leads: Map<string, Lead> = new Map();
  private opportunities: Map<string, Opportunity> = new Map();
  private quotes: Map<string, Quote> = new Map();
  private users: Map<string, User> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed default user
    const user: User = {
      id: DEFAULT_USER_ID,
      tenantId: DEFAULT_TENANT_ID,
      username: "demo.user",
      email: "demo@antigravity.crm",
      displayName: "Demo User",
      roleId: "role-001",
      roleName: "Sales Manager",
      profileId: "profile-001",
      profileName: "Standard User",
      isActive: true,
    };
    this.users.set(user.id, user);

    // Seed sample accounts
    const sampleAccounts: Partial<Account>[] = [
      {
        name: "Acme Corporation",
        type: "Customer",
        industry: "Technology",
        phone: "03-1234-5678",
        annualRevenue: 50000000,
        numberOfEmployees: 500,
      },
      {
        name: "Global Tech Inc.",
        type: "Prospect",
        industry: "Manufacturing",
        phone: "03-2345-6789",
        annualRevenue: 120000000,
        numberOfEmployees: 1200,
      },
      {
        name: "Summit Partners",
        type: "Partner",
        industry: "Consulting",
        phone: "03-3456-7890",
        annualRevenue: 30000000,
        numberOfEmployees: 150,
      },
    ];

    sampleAccounts.forEach((acc) => {
      const account = this.createAccount(acc);
      this.accounts.set(account.id, account);
    });

    // Seed sample contacts for each account
    const accountIds = Array.from(this.accounts.keys());
    accountIds.forEach((accountId, idx) => {
      const contact = this.createContact({
        accountId,
        firstName: ["Taro", "Hanako", "Jiro"][idx],
        lastName: ["Yamada", "Tanaka", "Suzuki"][idx],
        email: `${["taro", "hanako", "jiro"][idx]}@example.com`,
        title: ["CEO", "CTO", "CFO"][idx],
        isPrimary: true,
      });
      this.contacts.set(contact.id, contact);
    });

    // Seed sample leads
    const sampleLeads: Partial<Lead>[] = [
      {
        firstName: "Kenji",
        lastName: "Sato",
        company: "Future Systems",
        email: "kenji.sato@futuresys.example",
        status: "New",
        rating: "Hot",
        leadSource: "Web",
      },
      {
        firstName: "Yuki",
        lastName: "Watanabe",
        company: "Digital Solutions",
        email: "y.watanabe@digitalsol.example",
        status: "Working",
        rating: "Warm",
        leadSource: "Referral",
      },
    ];

    sampleLeads.forEach((lead) => {
      const newLead = this.createLead(lead);
      this.leads.set(newLead.id, newLead);
    });

    // Seed sample opportunities
    const sampleOpportunities: Partial<Opportunity>[] = [
      {
        name: "Acme - Enterprise License",
        accountId: accountIds[0],
        stageName: "Negotiation",
        amount: 5000000,
        closeDate: "2026-03-31",
      },
      {
        name: "Global Tech - Cloud Migration",
        accountId: accountIds[1],
        stageName: "Proposal",
        amount: 12000000,
        closeDate: "2026-04-30",
      },
      {
        name: "Summit - Consulting Project",
        accountId: accountIds[2],
        stageName: "Qualification",
        amount: 3000000,
        closeDate: "2026-05-31",
      },
    ];

    sampleOpportunities.forEach((opp) => {
      const opportunity = this.createOpportunity(opp);
      this.opportunities.set(opportunity.id, opportunity);
    });

    // Seed sample quotes for each opportunity
    const opportunityIds = Array.from(this.opportunities.keys());
    const sampleQuotes: Partial<Quote>[] = [
      {
        name: "Acme - Enterprise License Q1",
        opportunityId: opportunityIds[0],
        status: "Draft",
        expirationDate: "2026-02-28",
        subtotal: 5000000,
        discount: 500000,
        totalPrice: 4500000,
        isPrimary: true,
      },
      {
        name: "Global Tech - Cloud Migration Quote",
        opportunityId: opportunityIds[1],
        status: "Approved",
        expirationDate: "2026-03-31",
        subtotal: 12000000,
        discount: 1200000,
        totalPrice: 10800000,
        isPrimary: true,
      },
      {
        name: "Summit - Consulting Project Quote",
        opportunityId: opportunityIds[2],
        status: "NeedsReview",
        expirationDate: "2026-04-30",
        subtotal: 3000000,
        discount: 0,
        totalPrice: 3000000,
        isPrimary: true,
      },
    ];

    sampleQuotes.forEach((quote) => {
      const newQuote = this.createQuote(quote);
      this.quotes.set(newQuote.id, newQuote);
    });
  }

  // Utility functions
  private generateId(): string {
    return crypto.randomUUID();
  }

  private now(): string {
    return new Date().toISOString();
  }

  private createBaseRecord(): Omit<
    Account,
    "name" | "status" | "type" | "industry"
  > {
    const timestamp = this.now();
    return {
      id: this.generateId(),
      tenantId: DEFAULT_TENANT_ID,
      ownerId: DEFAULT_USER_ID,
      createdAt: timestamp,
      createdBy: DEFAULT_USER_ID,
      updatedAt: timestamp,
      updatedBy: DEFAULT_USER_ID,
      isDeleted: false,
      systemModstamp: timestamp,
    };
  }

  // Account operations
  createAccount(data: Partial<Account>): Account {
    const base = this.createBaseRecord();
    const account: Account = {
      ...base,
      name: data.name || "New Account",
      type: data.type,
      parentId: data.parentId,
      industry: data.industry,
      website: data.website,
      phone: data.phone,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      annualRevenue: data.annualRevenue,
      numberOfEmployees: data.numberOfEmployees,
      status: data.status || "Active",
      description: data.description,
    };
    this.accounts.set(account.id, account);
    return account;
  }

  getAccount(id: string, tenantId: string): Account | undefined {
    const account = this.accounts.get(id);
    if (account && account.tenantId === tenantId && !account.isDeleted) {
      return account;
    }
    return undefined;
  }

  getAllAccounts(tenantId: string): Account[] {
    return Array.from(this.accounts.values()).filter(
      (a) => a.tenantId === tenantId && !a.isDeleted
    );
  }

  updateAccount(
    id: string,
    tenantId: string,
    data: Partial<Account>
  ): Account | undefined {
    const account = this.getAccount(id, tenantId);
    if (!account) return undefined;

    const updated: Account = {
      ...account,
      ...data,
      id: account.id,
      tenantId: account.tenantId,
      updatedAt: this.now(),
      updatedBy: DEFAULT_USER_ID,
      systemModstamp: this.now(),
    };
    this.accounts.set(id, updated);
    return updated;
  }

  deleteAccount(id: string, tenantId: string): boolean {
    const account = this.getAccount(id, tenantId);
    if (!account) return false;
    account.isDeleted = true;
    account.updatedAt = this.now();
    account.systemModstamp = this.now();
    return true;
  }

  // Contact operations
  createContact(data: Partial<Contact>): Contact {
    const base = this.createBaseRecord();
    const contact: Contact = {
      ...base,
      accountId: data.accountId || "",
      firstName: data.firstName,
      lastName: data.lastName || "Unknown",
      email: data.email,
      phone: data.phone,
      mobilePhone: data.mobilePhone,
      title: data.title,
      department: data.department,
      mailingAddress: data.mailingAddress,
      isPrimary: data.isPrimary || false,
    };
    this.contacts.set(contact.id, contact);
    return contact;
  }

  getContact(id: string, tenantId: string): Contact | undefined {
    const contact = this.contacts.get(id);
    if (contact && contact.tenantId === tenantId && !contact.isDeleted) {
      return contact;
    }
    return undefined;
  }

  getAllContacts(tenantId: string): Contact[] {
    return Array.from(this.contacts.values()).filter(
      (c) => c.tenantId === tenantId && !c.isDeleted
    );
  }

  getContactsByAccount(accountId: string, tenantId: string): Contact[] {
    return this.getAllContacts(tenantId).filter(
      (c) => c.accountId === accountId
    );
  }

  updateContact(
    id: string,
    tenantId: string,
    data: Partial<Contact>
  ): Contact | undefined {
    const contact = this.getContact(id, tenantId);
    if (!contact) return undefined;

    const updated: Contact = {
      ...contact,
      ...data,
      id: contact.id,
      tenantId: contact.tenantId,
      updatedAt: this.now(),
      updatedBy: DEFAULT_USER_ID,
      systemModstamp: this.now(),
    };
    this.contacts.set(id, updated);
    return updated;
  }

  deleteContact(id: string, tenantId: string): boolean {
    const contact = this.getContact(id, tenantId);
    if (!contact) return false;
    contact.isDeleted = true;
    contact.updatedAt = this.now();
    contact.systemModstamp = this.now();
    return true;
  }

  // Lead operations
  createLead(data: Partial<Lead>): Lead {
    const base = this.createBaseRecord();
    const lead: Lead = {
      ...base,
      firstName: data.firstName,
      lastName: data.lastName || "Unknown",
      company: data.company || "Unknown Company",
      email: data.email,
      phone: data.phone,
      title: data.title,
      industry: data.industry,
      leadSource: data.leadSource,
      status: data.status || "New",
      rating: data.rating,
      address: data.address,
      isConverted: false,
    };
    this.leads.set(lead.id, lead);
    return lead;
  }

  getLead(id: string, tenantId: string): Lead | undefined {
    const lead = this.leads.get(id);
    if (lead && lead.tenantId === tenantId && !lead.isDeleted) {
      return lead;
    }
    return undefined;
  }

  getAllLeads(tenantId: string): Lead[] {
    return Array.from(this.leads.values()).filter(
      (l) => l.tenantId === tenantId && !l.isDeleted && !l.isConverted
    );
  }

  updateLead(
    id: string,
    tenantId: string,
    data: Partial<Lead>
  ): Lead | undefined {
    const lead = this.getLead(id, tenantId);
    if (!lead) return undefined;

    const updated: Lead = {
      ...lead,
      ...data,
      id: lead.id,
      tenantId: lead.tenantId,
      updatedAt: this.now(),
      updatedBy: DEFAULT_USER_ID,
      systemModstamp: this.now(),
    };
    this.leads.set(id, updated);
    return updated;
  }

  deleteLead(id: string, tenantId: string): boolean {
    const lead = this.getLead(id, tenantId);
    if (!lead) return false;
    lead.isDeleted = true;
    lead.updatedAt = this.now();
    lead.systemModstamp = this.now();
    return true;
  }

  convertLead(
    leadId: string,
    tenantId: string,
    accountData: Partial<Account>,
    contactData: Partial<Contact>,
    opportunityData?: Partial<Opportunity>
  ): {
    accountId: string;
    contactId: string;
    opportunityId?: string;
  } | null {
    const lead = this.getLead(leadId, tenantId);
    if (!lead || lead.status !== "Qualified") return null;

    // Create account
    const account = this.createAccount({
      ...accountData,
      name: accountData.name || lead.company,
      industry: accountData.industry || lead.industry,
    });

    // Create contact
    const contact = this.createContact({
      ...contactData,
      accountId: account.id,
      firstName: contactData.firstName || lead.firstName,
      lastName: contactData.lastName || lead.lastName,
      email: contactData.email || lead.email,
      phone: contactData.phone || lead.phone,
      title: contactData.title || lead.title,
      isPrimary: true,
    });

    // Create opportunity if requested
    let opportunity: Opportunity | undefined;
    if (opportunityData?.name !== undefined || opportunityData) {
      opportunity = this.createOpportunity({
        ...opportunityData,
        accountId: account.id,
        name: opportunityData.name || `${account.name} - New Opportunity`,
        stageName: opportunityData.stageName || "Qualification",
        closeDate: opportunityData.closeDate || this.getDefaultCloseDate(),
        leadSource: lead.leadSource,
      });
    }

    // Update lead as converted
    lead.isConverted = true;
    lead.convertedAccountId = account.id;
    lead.convertedContactId = contact.id;
    lead.convertedOpportunityId = opportunity?.id;
    lead.convertedAt = this.now();
    lead.updatedAt = this.now();
    lead.systemModstamp = this.now();

    return {
      accountId: account.id,
      contactId: contact.id,
      opportunityId: opportunity?.id,
    };
  }

  private getDefaultCloseDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    return date.toISOString().split("T")[0];
  }

  // Opportunity operations
  createOpportunity(data: Partial<Opportunity>): Opportunity {
    const base = this.createBaseRecord();
    const stageDef = STAGE_DEFINITIONS.find(
      (s) => s.stageName === (data.stageName || "Qualification")
    );

    const opportunity: Opportunity = {
      ...base,
      name: data.name || "New Opportunity",
      accountId: data.accountId || "",
      stageName: data.stageName || "Qualification",
      probability: stageDef?.probability || 10,
      amount: data.amount,
      closeDate: data.closeDate || this.getDefaultCloseDate(),
      isClosed: stageDef?.isClosed || false,
      isWon: stageDef?.isWon || false,
      forecastCategory: stageDef?.forecastCategory || "Pipeline",
      type: data.type,
      leadSource: data.leadSource,
      nextStep: data.nextStep,
      description: data.description,
      pricebookId: data.pricebookId,
    };
    this.opportunities.set(opportunity.id, opportunity);
    return opportunity;
  }

  getOpportunity(id: string, tenantId: string): Opportunity | undefined {
    const opp = this.opportunities.get(id);
    if (opp && opp.tenantId === tenantId && !opp.isDeleted) {
      return opp;
    }
    return undefined;
  }

  getAllOpportunities(tenantId: string): Opportunity[] {
    return Array.from(this.opportunities.values()).filter(
      (o) => o.tenantId === tenantId && !o.isDeleted
    );
  }

  getOpportunitiesByAccount(accountId: string, tenantId: string): Opportunity[] {
    return this.getAllOpportunities(tenantId).filter(
      (o) => o.accountId === accountId
    );
  }

  updateOpportunity(
    id: string,
    tenantId: string,
    data: Partial<Opportunity>
  ): Opportunity | undefined {
    const opp = this.getOpportunity(id, tenantId);
    if (!opp) return undefined;

    // If stage changed, update related fields
    let stageDef: StageDefinition | undefined;
    if (data.stageName && data.stageName !== opp.stageName) {
      stageDef = STAGE_DEFINITIONS.find((s) => s.stageName === data.stageName);
    }

    const updated: Opportunity = {
      ...opp,
      ...data,
      id: opp.id,
      tenantId: opp.tenantId,
      probability: stageDef?.probability ?? data.probability ?? opp.probability,
      isClosed: stageDef?.isClosed ?? opp.isClosed,
      isWon: stageDef?.isWon ?? opp.isWon,
      forecastCategory:
        stageDef?.forecastCategory ?? opp.forecastCategory,
      updatedAt: this.now(),
      updatedBy: DEFAULT_USER_ID,
      systemModstamp: this.now(),
    };
    this.opportunities.set(id, updated);
    return updated;
  }

  deleteOpportunity(id: string, tenantId: string): boolean {
    const opp = this.getOpportunity(id, tenantId);
    if (!opp) return false;
    opp.isDeleted = true;
    opp.updatedAt = this.now();
    opp.systemModstamp = this.now();
    return true;
  }

  changeOpportunityStage(
    id: string,
    tenantId: string,
    stageName: string,
    lostReason?: string
  ): Opportunity | undefined {
    const stageDef = STAGE_DEFINITIONS.find((s) => s.stageName === stageName);
    if (!stageDef) return undefined;

    // Validate lost reason for Closed Lost
    if (stageName === "Closed Lost" && !lostReason) {
      return undefined;
    }

    return this.updateOpportunity(id, tenantId, {
      stageName,
      lostReason: stageName === "Closed Lost" ? lostReason : undefined,
    });
  }

  // Quote operations
  createQuote(data: Partial<Quote>): Quote {
    const base = this.createBaseRecord();
    const quote: Quote = {
      ...base,
      name: data.name || "New Quote",
      opportunityId: data.opportunityId || "",
      status: data.status || "Draft",
      isPrimary: data.isPrimary || false,
      expirationDate: data.expirationDate,
      subtotal: data.subtotal || 0,
      discount: data.discount || 0,
      totalPrice: data.totalPrice || 0,
      taxAmount: data.taxAmount || 0,
      grandTotal: data.grandTotal || 0,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      pricebookId: data.pricebookId,
      description: data.description,
    };
    this.quotes.set(quote.id, quote);
    return quote;
  }

  getQuote(id: string, tenantId: string): Quote | undefined {
    const quote = this.quotes.get(id);
    if (quote && quote.tenantId === tenantId && !quote.isDeleted) {
      return quote;
    }
    return undefined;
  }

  getAllQuotes(tenantId: string): Quote[] {
    return Array.from(this.quotes.values()).filter(
      (q) => q.tenantId === tenantId && !q.isDeleted
    );
  }

  getQuotesByOpportunity(opportunityId: string, tenantId: string): Quote[] {
    return this.getAllQuotes(tenantId).filter(
      (q) => q.opportunityId === opportunityId
    );
  }

  updateQuote(
    id: string,
    tenantId: string,
    data: Partial<Quote>
  ): Quote | undefined {
    const quote = this.getQuote(id, tenantId);
    if (!quote) return undefined;

    const updated: Quote = {
      ...quote,
      ...data,
      id: quote.id,
      tenantId: quote.tenantId,
      updatedAt: this.now(),
      updatedBy: DEFAULT_USER_ID,
      systemModstamp: this.now(),
    };
    this.quotes.set(id, updated);
    return updated;
  }

  markQuoteAsPrimary(
    id: string,
    tenantId: string
  ): { quote: Quote; opportunity: Opportunity } | undefined {
    const quote = this.getQuote(id, tenantId);
    if (!quote) return undefined;

    // Unset other primary quotes for this opportunity
    const otherQuotes = this.getQuotesByOpportunity(quote.opportunityId, tenantId);
    for (const q of otherQuotes) {
      if (q.id !== id && q.isPrimary) {
        q.isPrimary = false;
        q.updatedAt = this.now();
        q.systemModstamp = this.now();
      }
    }

    // Set this quote as primary
    quote.isPrimary = true;
    quote.updatedAt = this.now();
    quote.systemModstamp = this.now();

    // Update opportunity's primaryQuoteId
    const opportunity = this.getOpportunity(quote.opportunityId, tenantId);
    if (opportunity) {
      opportunity.primaryQuoteId = id;
      opportunity.updatedAt = this.now();
      opportunity.systemModstamp = this.now();
      return { quote, opportunity };
    }

    return undefined;
  }

  // User operations
  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getCurrentUser(): User {
    return this.users.get(DEFAULT_USER_ID)!;
  }
}

// Singleton instance
export const db = new MockDatabase();
