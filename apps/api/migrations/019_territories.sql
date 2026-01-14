-- =============================================
-- 019_territories.sql
-- Territory Management
-- =============================================

-- territories table (hierarchical structure)
CREATE TABLE IF NOT EXISTS territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    parent_territory_id UUID REFERENCES territories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    CONSTRAINT chk_no_self_parent CHECK (id != parent_territory_id),
    CONSTRAINT uq_territory_name UNIQUE (tenant_id, name)
);

-- territory_user_assignments table
CREATE TABLE IF NOT EXISTS territory_user_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    territory_id UUID NOT NULL REFERENCES territories(id),
    user_id UUID NOT NULL REFERENCES users(id),
    access_level VARCHAR(50) DEFAULT 'Read',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT uq_territory_user UNIQUE (tenant_id, territory_id, user_id),
    CONSTRAINT chk_access_level CHECK (access_level IN ('Read', 'ReadWrite'))
);

-- territory_account_assignments table
CREATE TABLE IF NOT EXISTS territory_account_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    territory_id UUID NOT NULL REFERENCES territories(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    assignment_type VARCHAR(50) DEFAULT 'Manual',
    assignment_rule_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT uq_territory_account UNIQUE (tenant_id, territory_id, account_id),
    CONSTRAINT chk_assignment_type CHECK (assignment_type IN ('Manual', 'RuleBased'))
);

-- territory_assignment_rules table
CREATE TABLE IF NOT EXISTS territory_assignment_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    territory_id UUID NOT NULL REFERENCES territories(id),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    conditions JSONB DEFAULT '[]',
    filter_logic VARCHAR(255),
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

-- Indexes for territories
CREATE INDEX IF NOT EXISTS idx_territories_tenant
    ON territories(tenant_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_territories_parent
    ON territories(tenant_id, parent_territory_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_territories_active
    ON territories(tenant_id, is_active) WHERE is_deleted = false;

-- Indexes for territory_user_assignments
CREATE INDEX IF NOT EXISTS idx_territory_users_territory
    ON territory_user_assignments(tenant_id, territory_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_territory_users_user
    ON territory_user_assignments(tenant_id, user_id) WHERE is_deleted = false;

-- Indexes for territory_account_assignments
CREATE INDEX IF NOT EXISTS idx_territory_accounts_territory
    ON territory_account_assignments(tenant_id, territory_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_territory_accounts_account
    ON territory_account_assignments(tenant_id, account_id) WHERE is_deleted = false;

-- Indexes for territory_assignment_rules
CREATE INDEX IF NOT EXISTS idx_territory_rules_territory
    ON territory_assignment_rules(tenant_id, territory_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_territory_rules_active
    ON territory_assignment_rules(tenant_id, is_active) WHERE is_deleted = false;

-- Add foreign key for assignment_rule_id after table creation
ALTER TABLE territory_account_assignments
    ADD CONSTRAINT fk_territory_account_rule
    FOREIGN KEY (assignment_rule_id) REFERENCES territory_assignment_rules(id);

-- Comments
COMMENT ON TABLE territories IS 'Territory hierarchy for sales organization';
COMMENT ON COLUMN territories.parent_territory_id IS 'Reference to parent territory for hierarchy';
COMMENT ON COLUMN territories.sort_order IS 'Display order within same parent';

COMMENT ON TABLE territory_user_assignments IS 'User assignments to territories';
COMMENT ON COLUMN territory_user_assignments.access_level IS 'Access level: Read or ReadWrite';

COMMENT ON TABLE territory_account_assignments IS 'Account assignments to territories';
COMMENT ON COLUMN territory_account_assignments.assignment_type IS 'Manual or RuleBased assignment';
COMMENT ON COLUMN territory_account_assignments.assignment_rule_id IS 'Reference to rule if RuleBased';

COMMENT ON TABLE territory_assignment_rules IS 'Rules for automatic account assignment to territories';
COMMENT ON COLUMN territory_assignment_rules.conditions IS 'JSON array of TerritoryCondition objects';
COMMENT ON COLUMN territory_assignment_rules.priority IS 'Rule priority (higher = evaluated first)';
