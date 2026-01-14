-- CRM Database Initial Schema
-- Based on SPEC/20_機能設計/25_物理DB設計_v1.md

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Core Tables: Tenant & User Management
-- =============================================================================

-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    external_id VARCHAR(255), -- Keycloak user ID
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    role_id UUID,
    profile_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, username),
    UNIQUE (tenant_id, email)
);

-- Roles table (for role hierarchy)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    parent_role_id UUID REFERENCES roles(id),
    hierarchy_level INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, name)
);

-- Profiles table (for field-level security)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, name)
);

-- Add foreign keys for users
ALTER TABLE users
    ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
    ADD CONSTRAINT fk_users_profile FOREIGN KEY (profile_id) REFERENCES profiles(id);

-- =============================================================================
-- CRM Core Objects
-- =============================================================================

-- Accounts table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('Prospect', 'Customer', 'Partner', 'Competitor', 'Other')),
    parent_id UUID REFERENCES accounts(id),
    industry VARCHAR(255),
    website VARCHAR(500),
    phone VARCHAR(50),
    billing_street VARCHAR(500),
    billing_city VARCHAR(255),
    billing_state VARCHAR(255),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(255),
    shipping_street VARCHAR(500),
    shipping_city VARCHAR(255),
    shipping_state VARCHAR(255),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(255),
    annual_revenue DECIMAL(18, 2),
    number_of_employees INTEGER,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by_id UUID NOT NULL REFERENCES users(id),
    last_modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_tenant ON accounts(tenant_id);
CREATE INDEX idx_accounts_owner ON accounts(tenant_id, owner_id);
CREATE INDEX idx_accounts_parent ON accounts(tenant_id, parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_accounts_name ON accounts(tenant_id, name);

-- Contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    title VARCHAR(255),
    department VARCHAR(255),
    mailing_street VARCHAR(500),
    mailing_city VARCHAR(255),
    mailing_state VARCHAR(255),
    mailing_postal_code VARCHAR(20),
    mailing_country VARCHAR(255),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by_id UUID NOT NULL REFERENCES users(id),
    last_modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_account ON contacts(tenant_id, account_id);
CREATE INDEX idx_contacts_owner ON contacts(tenant_id, owner_id);
CREATE INDEX idx_contacts_email ON contacts(tenant_id, email) WHERE email IS NOT NULL;

-- Leads table
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    website VARCHAR(500),
    street VARCHAR(500),
    city VARCHAR(255),
    state VARCHAR(255),
    postal_code VARCHAR(20),
    country VARCHAR(255),
    status VARCHAR(50) NOT NULL CHECK (status IN ('New', 'Working', 'Qualified', 'Unqualified')),
    rating VARCHAR(20) CHECK (rating IN ('Hot', 'Warm', 'Cold')),
    lead_source VARCHAR(100),
    industry VARCHAR(255),
    annual_revenue DECIMAL(18, 2),
    number_of_employees INTEGER,
    description TEXT,
    is_converted BOOLEAN NOT NULL DEFAULT false,
    converted_date TIMESTAMP WITH TIME ZONE,
    converted_account_id UUID REFERENCES accounts(id),
    converted_contact_id UUID REFERENCES contacts(id),
    converted_opportunity_id UUID,
    owner_id UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by_id UUID NOT NULL REFERENCES users(id),
    last_modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- INV-L1: Converted leads must be in Qualified status
    CONSTRAINT chk_lead_convert_status CHECK (
        (is_converted = false) OR (is_converted = true AND status = 'Qualified')
    )
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_owner ON leads(tenant_id, owner_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_converted ON leads(tenant_id, is_converted);

-- Opportunities table
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    name VARCHAR(255) NOT NULL,
    stage_name VARCHAR(50) NOT NULL,
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    amount DECIMAL(18, 2),
    close_date DATE NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    is_won BOOLEAN NOT NULL DEFAULT false,
    lost_reason VARCHAR(255),
    forecast_category VARCHAR(50),
    next_step VARCHAR(500),
    description TEXT,
    lead_source VARCHAR(100),
    primary_contact_id UUID REFERENCES contacts(id),
    owner_id UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by_id UUID NOT NULL REFERENCES users(id),
    last_modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- INV-O3: Lost reason required when closed-lost
    CONSTRAINT chk_opp_lost_reason CHECK (
        (is_closed = false) OR (is_won = true) OR (is_won = false AND lost_reason IS NOT NULL)
    )
);

-- Add foreign key for leads converted_opportunity_id
ALTER TABLE leads
    ADD CONSTRAINT fk_leads_converted_opportunity
    FOREIGN KEY (converted_opportunity_id) REFERENCES opportunities(id);

CREATE INDEX idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX idx_opportunities_account ON opportunities(tenant_id, account_id);
CREATE INDEX idx_opportunities_owner ON opportunities(tenant_id, owner_id);
CREATE INDEX idx_opportunities_stage ON opportunities(tenant_id, stage_name);
CREATE INDEX idx_opportunities_close_date ON opportunities(tenant_id, close_date);

-- Stage definitions table
CREATE TABLE stage_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    stage_name VARCHAR(50) NOT NULL,
    probability INTEGER NOT NULL CHECK (probability >= 0 AND probability <= 100),
    forecast_category VARCHAR(50) NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    is_won BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, stage_name)
);

-- Quotes table
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Draft', 'Presented', 'Accepted', 'Rejected')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    expiration_date DATE,
    subtotal DECIMAL(18, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    total_price DECIMAL(18, 2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(18, 2) NOT NULL DEFAULT 0,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by_id UUID NOT NULL REFERENCES users(id),
    last_modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX idx_quotes_opportunity ON quotes(tenant_id, opportunity_id);
CREATE INDEX idx_quotes_owner ON quotes(tenant_id, owner_id);

-- =============================================================================
-- Product & Pricing Tables
-- =============================================================================

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    family VARCHAR(100),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_code ON products(tenant_id, product_code) WHERE product_code IS NOT NULL;

-- Pricebooks table
CREATE TABLE pricebooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_standard BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricebooks_tenant ON pricebooks(tenant_id);

-- Pricebook entries table
CREATE TABLE pricebook_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    pricebook_id UUID NOT NULL REFERENCES pricebooks(id),
    product_id UUID NOT NULL REFERENCES products(id),
    unit_price DECIMAL(18, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, pricebook_id, product_id)
);

CREATE INDEX idx_pricebook_entries_tenant ON pricebook_entries(tenant_id);
CREATE INDEX idx_pricebook_entries_product ON pricebook_entries(tenant_id, product_id);

-- Quote line items table
CREATE TABLE quote_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    quote_id UUID NOT NULL REFERENCES quotes(id),
    pricebook_entry_id UUID NOT NULL REFERENCES pricebook_entries(id),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(18, 2) NOT NULL,
    discount DECIMAL(5, 2) DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
    total_price DECIMAL(18, 2) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quote_line_items_tenant ON quote_line_items(tenant_id);
CREATE INDEX idx_quote_line_items_quote ON quote_line_items(tenant_id, quote_id);

-- =============================================================================
-- Audit Log
-- =============================================================================

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    object_type VARCHAR(100) NOT NULL,
    object_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_events_tenant ON audit_events(tenant_id);
CREATE INDEX idx_audit_events_object ON audit_events(tenant_id, object_type, object_id);
CREATE INDEX idx_audit_events_user ON audit_events(tenant_id, user_id);
CREATE INDEX idx_audit_events_created ON audit_events(tenant_id, created_at);

-- =============================================================================
-- Initial Data
-- =============================================================================

-- Insert default tenant
INSERT INTO tenants (id, name, subdomain, status) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Demo Tenant', 'demo', 'active');

-- Insert default profiles
INSERT INTO profiles (id, tenant_id, name, description) VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'System Administrator', 'Full access to all features'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Sales Manager', 'Manager level access'),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Sales User', 'Standard user access'),
    ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000001', 'Read Only', 'View only access');

-- Insert default roles (hierarchy: CEO > VP Sales > Sales Manager > Sales Rep)
INSERT INTO roles (id, tenant_id, name, parent_role_id, hierarchy_level) VALUES
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'CEO', NULL, 1),
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', 'VP Sales', '00000000-0000-0000-0002-000000000001', 2),
    ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000001', 'Sales Manager', '00000000-0000-0000-0002-000000000002', 3),
    ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000001', 'Sales Representative', '00000000-0000-0000-0002-000000000003', 4);

-- Insert default users
INSERT INTO users (id, tenant_id, external_id, username, email, display_name, is_active, role_id, profile_id) VALUES
    ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', NULL, 'admin', 'admin@example.com', 'System Administrator', true, '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001'),
    ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', NULL, 'manager', 'manager@example.com', 'Sales Manager', true, '00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0001-000000000002'),
    ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', NULL, 'user1', 'user1@example.com', 'Taro Yamada', true, '00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0001-000000000003'),
    ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000001', NULL, 'user2', 'user2@example.com', 'Hanako Tanaka', true, '00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0001-000000000003');

-- Insert stage definitions
INSERT INTO stage_definitions (tenant_id, stage_name, probability, forecast_category, is_closed, is_won, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Qualification', 10, 'Pipeline', false, false, 1),
    ('00000000-0000-0000-0000-000000000001', 'Needs Analysis', 20, 'Pipeline', false, false, 2),
    ('00000000-0000-0000-0000-000000000001', 'Value Proposition', 40, 'Pipeline', false, false, 3),
    ('00000000-0000-0000-0000-000000000001', 'Proposal/Price Quote', 60, 'Best Case', false, false, 4),
    ('00000000-0000-0000-0000-000000000001', 'Negotiation/Review', 80, 'Commit', false, false, 5),
    ('00000000-0000-0000-0000-000000000001', 'Closed Won', 100, 'Closed', true, true, 6),
    ('00000000-0000-0000-0000-000000000001', 'Closed Lost', 0, 'Omitted', true, false, 7);

-- Insert standard pricebook
INSERT INTO pricebooks (id, tenant_id, name, description, is_active, is_standard) VALUES
    ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000001', 'Standard Price Book', 'Standard pricing for all products', true, true);

COMMENT ON TABLE tenants IS 'Multi-tenant organization records';
COMMENT ON TABLE users IS 'User accounts within tenants';
COMMENT ON TABLE roles IS 'Role hierarchy for record access';
COMMENT ON TABLE profiles IS 'Profile definitions for field-level security';
COMMENT ON TABLE accounts IS 'Company/Organization records';
COMMENT ON TABLE contacts IS 'People associated with Accounts';
COMMENT ON TABLE leads IS 'Potential customers not yet qualified';
COMMENT ON TABLE opportunities IS 'Sales deals in progress';
COMMENT ON TABLE quotes IS 'Price quotes for opportunities';
COMMENT ON TABLE stage_definitions IS 'Opportunity stage configurations';
COMMENT ON TABLE audit_events IS 'Audit trail for all record changes';
