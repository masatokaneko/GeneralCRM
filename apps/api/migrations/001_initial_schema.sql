-- CRM Initial Schema
-- Based on SPEC/20_機能設計/25_物理DB設計_v1.md

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Deleted')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    role VARCHAR(50) DEFAULT 'User',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    owner_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    parent_id UUID REFERENCES accounts(id),
    industry VARCHAR(100),
    website VARCHAR(255),
    phone VARCHAR(50),
    billing_street VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100),
    shipping_street VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(100),
    annual_revenue DECIMAL(18, 2),
    number_of_employees INTEGER,
    status VARCHAR(50) DEFAULT 'Active',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_accounts_tenant ON accounts(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_accounts_owner ON accounts(tenant_id, owner_id) WHERE is_deleted = false;
CREATE INDEX idx_accounts_name ON accounts(tenant_id, name) WHERE is_deleted = false;

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    owner_id UUID REFERENCES users(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    title VARCHAR(100),
    department VARCHAR(100),
    mailing_street VARCHAR(255),
    mailing_city VARCHAR(100),
    mailing_state VARCHAR(100),
    mailing_postal_code VARCHAR(20),
    mailing_country VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_contacts_account ON contacts(tenant_id, account_id) WHERE is_deleted = false;
CREATE INDEX idx_contacts_email ON contacts(tenant_id, email) WHERE is_deleted = false;

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    owner_id UUID REFERENCES users(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    title VARCHAR(100),
    industry VARCHAR(100),
    lead_source VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'Working', 'Closed - Converted', 'Closed - Not Converted')),
    rating VARCHAR(50) CHECK (rating IN ('Hot', 'Warm', 'Cold')),
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    is_converted BOOLEAN DEFAULT false,
    converted_account_id UUID REFERENCES accounts(id),
    converted_contact_id UUID REFERENCES contacts(id),
    converted_opportunity_id UUID,
    converted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_leads_owner ON leads(tenant_id, owner_id) WHERE is_deleted = false;
CREATE INDEX idx_leads_status ON leads(tenant_id, status) WHERE is_deleted = false AND is_converted = false;

-- Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    owner_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    account_id UUID NOT NULL REFERENCES accounts(id),
    stage_name VARCHAR(100) NOT NULL CHECK (stage_name IN (
        'Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition',
        'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost'
    )),
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    amount DECIMAL(18, 2),
    close_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    is_won BOOLEAN DEFAULT false,
    lost_reason VARCHAR(255),
    forecast_category VARCHAR(50) CHECK (forecast_category IN ('Pipeline', 'Best Case', 'Commit', 'Closed')),
    type VARCHAR(100),
    lead_source VARCHAR(100),
    next_step VARCHAR(255),
    description TEXT,
    pricebook_id UUID,
    primary_quote_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_opportunities_tenant ON opportunities(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_opportunities_account ON opportunities(tenant_id, account_id) WHERE is_deleted = false;
CREATE INDEX idx_opportunities_stage ON opportunities(tenant_id, stage_name) WHERE is_deleted = false;
CREATE INDEX idx_opportunities_close_date ON opportunities(tenant_id, close_date) WHERE is_deleted = false AND is_closed = false;

-- Add foreign key for converted_opportunity_id after opportunities table is created
ALTER TABLE leads ADD CONSTRAINT fk_leads_converted_opportunity
    FOREIGN KEY (converted_opportunity_id) REFERENCES opportunities(id);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    owner_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    opportunity_id UUID NOT NULL REFERENCES opportunities(id),
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN (
        'Draft', 'Needs Review', 'In Review', 'Approved', 'Rejected', 'Presented', 'Accepted'
    )),
    is_primary BOOLEAN DEFAULT false,
    expiration_date DATE,
    subtotal DECIMAL(18, 2) DEFAULT 0,
    discount DECIMAL(18, 2) DEFAULT 0,
    total_price DECIMAL(18, 2) DEFAULT 0,
    tax_amount DECIMAL(18, 2) DEFAULT 0,
    grand_total DECIMAL(18, 2) DEFAULT 0,
    billing_street VARCHAR(255),
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100),
    shipping_street VARCHAR(255),
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(100),
    pricebook_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_quotes_tenant ON quotes(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_quotes_opportunity ON quotes(tenant_id, opportunity_id) WHERE is_deleted = false;

-- Add foreign key for primary_quote_id after quotes table is created
ALTER TABLE opportunities ADD CONSTRAINT fk_opportunities_primary_quote
    FOREIGN KEY (primary_quote_id) REFERENCES quotes(id);

-- Quote Line Items table
CREATE TABLE IF NOT EXISTS quote_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    quote_id UUID NOT NULL REFERENCES quotes(id),
    product_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(18, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(18, 2) DEFAULT 0,
    total_price DECIMAL(18, 2) GENERATED ALWAYS AS (quantity * unit_price - discount) STORED,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_quote_line_items_quote ON quote_line_items(tenant_id, quote_id) WHERE is_deleted = false;

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    description TEXT,
    family VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_products_tenant ON products(tenant_id) WHERE is_deleted = false;

-- Pricebooks table
CREATE TABLE IF NOT EXISTS pricebooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_standard BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_pricebooks_tenant ON pricebooks(tenant_id) WHERE is_deleted = false;

-- Pricebook Entries table
CREATE TABLE IF NOT EXISTS pricebook_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pricebook_id UUID NOT NULL REFERENCES pricebooks(id),
    product_id UUID NOT NULL REFERENCES products(id),
    unit_price DECIMAL(18, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    use_standard_price BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),
    UNIQUE(tenant_id, pricebook_id, product_id)
);

CREATE INDEX idx_pricebook_entries_pricebook ON pricebook_entries(tenant_id, pricebook_id) WHERE is_deleted = false;

-- Audit Events table
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    object_type VARCHAR(100) NOT NULL,
    object_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'UNDELETE')),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_events_tenant ON audit_events(tenant_id);
CREATE INDEX idx_audit_events_object ON audit_events(tenant_id, object_type, object_id);
CREATE INDEX idx_audit_events_created ON audit_events(tenant_id, created_at);

-- Add foreign keys for pricebook references
ALTER TABLE quotes ADD CONSTRAINT fk_quotes_pricebook
    FOREIGN KEY (pricebook_id) REFERENCES pricebooks(id);
ALTER TABLE opportunities ADD CONSTRAINT fk_opportunities_pricebook
    FOREIGN KEY (pricebook_id) REFERENCES pricebooks(id);
ALTER TABLE quote_line_items ADD CONSTRAINT fk_quote_line_items_product
    FOREIGN KEY (product_id) REFERENCES products(id);
