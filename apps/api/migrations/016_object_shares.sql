-- Migration: 016_object_shares
-- Description: Create Object Share tables for record-level sharing

-- RowCause enum values:
-- Owner: Record owner always has full access
-- RoleHierarchy: Access via role hierarchy (manager has subordinate's records)
-- Rule: Access via sharing rule
-- Manual: Manually shared by owner or admin
-- Team: Access via account team membership
-- Territory: Access via territory
-- Implicit: Implied access from parent record

-- Account Share table
CREATE TABLE IF NOT EXISTS account_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    subject_type VARCHAR(50) NOT NULL,  -- User / Role / Group
    subject_id UUID NOT NULL,
    access_level VARCHAR(50) NOT NULL,  -- Read / ReadWrite
    row_cause VARCHAR(50) NOT NULL,     -- Owner / RoleHierarchy / Rule / Manual / Team / Territory / Implicit
    sharing_rule_id UUID REFERENCES sharing_rules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT uq_account_share UNIQUE (tenant_id, account_id, subject_type, subject_id, row_cause),
    CONSTRAINT chk_account_share_subject CHECK (subject_type IN ('User', 'Role', 'Group')),
    CONSTRAINT chk_account_share_access CHECK (access_level IN ('Read', 'ReadWrite')),
    CONSTRAINT chk_account_share_cause CHECK (row_cause IN ('Owner', 'RoleHierarchy', 'Rule', 'Manual', 'Team', 'Territory', 'Implicit'))
);

CREATE INDEX idx_account_shares_account ON account_shares(tenant_id, account_id) WHERE is_deleted = false;
CREATE INDEX idx_account_shares_subject ON account_shares(tenant_id, subject_type, subject_id) WHERE is_deleted = false;
CREATE INDEX idx_account_shares_rule ON account_shares(tenant_id, sharing_rule_id) WHERE sharing_rule_id IS NOT NULL;

-- Opportunity Share table
CREATE TABLE IF NOT EXISTS opportunity_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id),
    subject_type VARCHAR(50) NOT NULL,
    subject_id UUID NOT NULL,
    access_level VARCHAR(50) NOT NULL,
    row_cause VARCHAR(50) NOT NULL,
    sharing_rule_id UUID REFERENCES sharing_rules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT uq_opportunity_share UNIQUE (tenant_id, opportunity_id, subject_type, subject_id, row_cause),
    CONSTRAINT chk_opp_share_subject CHECK (subject_type IN ('User', 'Role', 'Group')),
    CONSTRAINT chk_opp_share_access CHECK (access_level IN ('Read', 'ReadWrite')),
    CONSTRAINT chk_opp_share_cause CHECK (row_cause IN ('Owner', 'RoleHierarchy', 'Rule', 'Manual', 'Team', 'Territory', 'Implicit'))
);

CREATE INDEX idx_opportunity_shares_opp ON opportunity_shares(tenant_id, opportunity_id) WHERE is_deleted = false;
CREATE INDEX idx_opportunity_shares_subject ON opportunity_shares(tenant_id, subject_type, subject_id) WHERE is_deleted = false;

-- Lead Share table
CREATE TABLE IF NOT EXISTS lead_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lead_id UUID NOT NULL REFERENCES leads(id),
    subject_type VARCHAR(50) NOT NULL,
    subject_id UUID NOT NULL,
    access_level VARCHAR(50) NOT NULL,
    row_cause VARCHAR(50) NOT NULL,
    sharing_rule_id UUID REFERENCES sharing_rules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT uq_lead_share UNIQUE (tenant_id, lead_id, subject_type, subject_id, row_cause),
    CONSTRAINT chk_lead_share_subject CHECK (subject_type IN ('User', 'Role', 'Group')),
    CONSTRAINT chk_lead_share_access CHECK (access_level IN ('Read', 'ReadWrite')),
    CONSTRAINT chk_lead_share_cause CHECK (row_cause IN ('Owner', 'RoleHierarchy', 'Rule', 'Manual', 'Team', 'Territory', 'Implicit'))
);

CREATE INDEX idx_lead_shares_lead ON lead_shares(tenant_id, lead_id) WHERE is_deleted = false;
CREATE INDEX idx_lead_shares_subject ON lead_shares(tenant_id, subject_type, subject_id) WHERE is_deleted = false;

-- Contract Share table
CREATE TABLE IF NOT EXISTS contract_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    contract_id UUID NOT NULL REFERENCES contracts(id),
    subject_type VARCHAR(50) NOT NULL,
    subject_id UUID NOT NULL,
    access_level VARCHAR(50) NOT NULL,
    row_cause VARCHAR(50) NOT NULL,
    sharing_rule_id UUID REFERENCES sharing_rules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT uq_contract_share UNIQUE (tenant_id, contract_id, subject_type, subject_id, row_cause),
    CONSTRAINT chk_contract_share_subject CHECK (subject_type IN ('User', 'Role', 'Group')),
    CONSTRAINT chk_contract_share_access CHECK (access_level IN ('Read', 'ReadWrite')),
    CONSTRAINT chk_contract_share_cause CHECK (row_cause IN ('Owner', 'RoleHierarchy', 'Rule', 'Manual', 'Team', 'Territory', 'Implicit'))
);

CREATE INDEX idx_contract_shares_contract ON contract_shares(tenant_id, contract_id) WHERE is_deleted = false;
CREATE INDEX idx_contract_shares_subject ON contract_shares(tenant_id, subject_type, subject_id) WHERE is_deleted = false;

-- Invoice Share table
CREATE TABLE IF NOT EXISTS invoice_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    subject_type VARCHAR(50) NOT NULL,
    subject_id UUID NOT NULL,
    access_level VARCHAR(50) NOT NULL,
    row_cause VARCHAR(50) NOT NULL,
    sharing_rule_id UUID REFERENCES sharing_rules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT uq_invoice_share UNIQUE (tenant_id, invoice_id, subject_type, subject_id, row_cause),
    CONSTRAINT chk_invoice_share_subject CHECK (subject_type IN ('User', 'Role', 'Group')),
    CONSTRAINT chk_invoice_share_access CHECK (access_level IN ('Read', 'ReadWrite')),
    CONSTRAINT chk_invoice_share_cause CHECK (row_cause IN ('Owner', 'RoleHierarchy', 'Rule', 'Manual', 'Team', 'Territory', 'Implicit'))
);

CREATE INDEX idx_invoice_shares_invoice ON invoice_shares(tenant_id, invoice_id) WHERE is_deleted = false;
CREATE INDEX idx_invoice_shares_subject ON invoice_shares(tenant_id, subject_type, subject_id) WHERE is_deleted = false;

-- Helper function to check if user has access to a record via shares
CREATE OR REPLACE FUNCTION has_record_access(
    p_tenant_id UUID,
    p_user_id UUID,
    p_object_type VARCHAR,
    p_record_id UUID,
    p_required_access VARCHAR DEFAULT 'Read'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN := false;
    v_user_role_id UUID;
    v_user_group_ids UUID[];
BEGIN
    -- Get user's role
    SELECT role_id INTO v_user_role_id
    FROM users
    WHERE tenant_id = p_tenant_id AND id = p_user_id AND is_deleted = false;

    -- Get user's groups (simplified - would need full expansion in production)
    SELECT ARRAY_AGG(DISTINCT pgm.group_id) INTO v_user_group_ids
    FROM public_group_members pgm
    WHERE pgm.tenant_id = p_tenant_id AND pgm.member_type = 'User' AND pgm.member_id = p_user_id;

    -- Check shares based on object type
    IF p_object_type = 'Account' THEN
        SELECT EXISTS(
            SELECT 1 FROM account_shares s
            WHERE s.tenant_id = p_tenant_id
              AND s.account_id = p_record_id
              AND s.is_deleted = false
              AND (
                  (s.subject_type = 'User' AND s.subject_id = p_user_id)
                  OR (s.subject_type = 'Role' AND s.subject_id = v_user_role_id)
                  OR (s.subject_type = 'Group' AND s.subject_id = ANY(v_user_group_ids))
              )
              AND (p_required_access = 'Read' OR s.access_level = 'ReadWrite')
        ) INTO v_has_access;
    ELSIF p_object_type = 'Opportunity' THEN
        SELECT EXISTS(
            SELECT 1 FROM opportunity_shares s
            WHERE s.tenant_id = p_tenant_id
              AND s.opportunity_id = p_record_id
              AND s.is_deleted = false
              AND (
                  (s.subject_type = 'User' AND s.subject_id = p_user_id)
                  OR (s.subject_type = 'Role' AND s.subject_id = v_user_role_id)
                  OR (s.subject_type = 'Group' AND s.subject_id = ANY(v_user_group_ids))
              )
              AND (p_required_access = 'Read' OR s.access_level = 'ReadWrite')
        ) INTO v_has_access;
    ELSIF p_object_type = 'Lead' THEN
        SELECT EXISTS(
            SELECT 1 FROM lead_shares s
            WHERE s.tenant_id = p_tenant_id
              AND s.lead_id = p_record_id
              AND s.is_deleted = false
              AND (
                  (s.subject_type = 'User' AND s.subject_id = p_user_id)
                  OR (s.subject_type = 'Role' AND s.subject_id = v_user_role_id)
                  OR (s.subject_type = 'Group' AND s.subject_id = ANY(v_user_group_ids))
              )
              AND (p_required_access = 'Read' OR s.access_level = 'ReadWrite')
        ) INTO v_has_access;
    ELSIF p_object_type = 'Contract' THEN
        SELECT EXISTS(
            SELECT 1 FROM contract_shares s
            WHERE s.tenant_id = p_tenant_id
              AND s.contract_id = p_record_id
              AND s.is_deleted = false
              AND (
                  (s.subject_type = 'User' AND s.subject_id = p_user_id)
                  OR (s.subject_type = 'Role' AND s.subject_id = v_user_role_id)
                  OR (s.subject_type = 'Group' AND s.subject_id = ANY(v_user_group_ids))
              )
              AND (p_required_access = 'Read' OR s.access_level = 'ReadWrite')
        ) INTO v_has_access;
    ELSIF p_object_type = 'Invoice' THEN
        SELECT EXISTS(
            SELECT 1 FROM invoice_shares s
            WHERE s.tenant_id = p_tenant_id
              AND s.invoice_id = p_record_id
              AND s.is_deleted = false
              AND (
                  (s.subject_type = 'User' AND s.subject_id = p_user_id)
                  OR (s.subject_type = 'Role' AND s.subject_id = v_user_role_id)
                  OR (s.subject_type = 'Group' AND s.subject_id = ANY(v_user_group_ids))
              )
              AND (p_required_access = 'Read' OR s.access_level = 'ReadWrite')
        ) INTO v_has_access;
    END IF;

    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comments
COMMENT ON TABLE account_shares IS 'Sharing records for accounts';
COMMENT ON TABLE opportunity_shares IS 'Sharing records for opportunities';
COMMENT ON TABLE lead_shares IS 'Sharing records for leads';
COMMENT ON TABLE contract_shares IS 'Sharing records for contracts';
COMMENT ON TABLE invoice_shares IS 'Sharing records for invoices';
COMMENT ON COLUMN account_shares.row_cause IS 'Reason for the share: Owner, RoleHierarchy, Rule, Manual, Team, Territory, Implicit';
COMMENT ON FUNCTION has_record_access IS 'Check if user has access to a record via sharing';
