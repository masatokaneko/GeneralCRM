-- Opportunity Contact Roles table
-- Tracks the contacts associated with opportunities and their roles

CREATE TABLE IF NOT EXISTS opportunity_contact_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id),
    contact_id UUID NOT NULL REFERENCES contacts(id),
    role VARCHAR(50) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    influence_level INTEGER,
    stance VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    CONSTRAINT uq_opportunity_contact UNIQUE (tenant_id, opportunity_id, contact_id),
    CONSTRAINT chk_role CHECK (role IN ('DecisionMaker', 'Influencer', 'Evaluator', 'Executive', 'User', 'Other')),
    CONSTRAINT chk_influence_level CHECK (influence_level IS NULL OR influence_level BETWEEN 1 AND 5),
    CONSTRAINT chk_stance CHECK (stance IS NULL OR stance IN ('Support', 'Neutral', 'Oppose'))
);

-- Primary contact is maximum 1 per opportunity (partial unique index)
CREATE UNIQUE INDEX uq_opportunity_contact_role_primary
    ON opportunity_contact_roles (tenant_id, opportunity_id)
    WHERE is_deleted = false AND is_primary = true;

-- Indexes for efficient lookups
CREATE INDEX idx_opportunity_contact_roles_opportunity ON opportunity_contact_roles(tenant_id, opportunity_id) WHERE is_deleted = false;
CREATE INDEX idx_opportunity_contact_roles_contact ON opportunity_contact_roles(tenant_id, contact_id) WHERE is_deleted = false;
