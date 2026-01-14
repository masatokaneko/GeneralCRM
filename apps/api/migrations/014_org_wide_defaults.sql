-- Migration: 014_org_wide_defaults
-- Description: Create Organization-Wide Defaults table for record-level access control

-- OWD table
CREATE TABLE IF NOT EXISTS org_wide_defaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    object_name VARCHAR(100) NOT NULL,
    internal_access VARCHAR(50) NOT NULL DEFAULT 'Private',
    external_access VARCHAR(50) DEFAULT 'Private',
    grant_access_using_hierarchies BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT uq_owd_object UNIQUE (tenant_id, object_name),
    CONSTRAINT chk_internal_access CHECK (
        internal_access IN ('Private', 'PublicReadOnly', 'PublicReadWrite', 'ControlledByParent')
    ),
    CONSTRAINT chk_external_access CHECK (
        external_access IN ('Private', 'PublicReadOnly', 'PublicReadWrite')
    )
);

-- Indexes
CREATE INDEX idx_owd_tenant ON org_wide_defaults(tenant_id);

-- Initialize OWD for existing tenants with default settings
-- Account: Private (records visible only to owner and above in hierarchy)
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Account', 'Private', 'Private', true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Account')
ON CONFLICT DO NOTHING;

-- Contact: Controlled by Account (parent relationship)
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Contact', 'ControlledByParent', 'Private', true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Contact')
ON CONFLICT DO NOTHING;

-- Lead: Public Read/Write (all users can see and edit leads)
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Lead', 'PublicReadWrite', 'Private', true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Lead')
ON CONFLICT DO NOTHING;

-- Opportunity: Private
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Opportunity', 'Private', 'Private', true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Opportunity')
ON CONFLICT DO NOTHING;

-- Quote: Controlled by Opportunity (parent relationship)
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Quote', 'ControlledByParent', 'Private', true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Quote')
ON CONFLICT DO NOTHING;

-- Order: Controlled by Account (parent relationship)
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Order', 'ControlledByParent', 'Private', true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Order')
ON CONFLICT DO NOTHING;

-- Contract: Private
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Contract', 'Private', 'Private', true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Contract')
ON CONFLICT DO NOTHING;

-- Invoice: Private
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Invoice', 'Private', 'Private', true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Invoice')
ON CONFLICT DO NOTHING;

-- Task: Controlled by parent (Who/What)
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Task', 'ControlledByParent', 'Private', true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Task')
ON CONFLICT DO NOTHING;

-- Event: Controlled by parent (Who/What)
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Event', 'ControlledByParent', 'Private', true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Event')
ON CONFLICT DO NOTHING;

-- Product: Public Read Only (all users can view products)
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Product', 'PublicReadOnly', 'Private', false
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Product')
ON CONFLICT DO NOTHING;

-- Pricebook: Public Read Only (all users can view pricebooks)
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies)
SELECT id, 'Pricebook', 'PublicReadOnly', 'Private', false
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM org_wide_defaults WHERE object_name = 'Pricebook')
ON CONFLICT DO NOTHING;

-- Helper function to get OWD access level for an object
CREATE OR REPLACE FUNCTION get_owd_access(
    p_tenant_id UUID,
    p_object_name VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
    v_access VARCHAR;
BEGIN
    SELECT internal_access INTO v_access
    FROM org_wide_defaults
    WHERE tenant_id = p_tenant_id AND object_name = p_object_name;

    IF v_access IS NULL THEN
        -- Default to Private if not configured
        RETURN 'Private';
    END IF;

    RETURN v_access;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if role hierarchy grants access
CREATE OR REPLACE FUNCTION use_role_hierarchy(
    p_tenant_id UUID,
    p_object_name VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_use_hierarchy BOOLEAN;
BEGIN
    SELECT grant_access_using_hierarchies INTO v_use_hierarchy
    FROM org_wide_defaults
    WHERE tenant_id = p_tenant_id AND object_name = p_object_name;

    IF v_use_hierarchy IS NULL THEN
        -- Default to true if not configured
        RETURN true;
    END IF;

    RETURN v_use_hierarchy;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comments
COMMENT ON TABLE org_wide_defaults IS 'Organization-Wide Default sharing settings for each object';
COMMENT ON COLUMN org_wide_defaults.internal_access IS 'Default access level for internal users: Private, PublicReadOnly, PublicReadWrite, ControlledByParent';
COMMENT ON COLUMN org_wide_defaults.external_access IS 'Default access level for external users: Private, PublicReadOnly, PublicReadWrite';
COMMENT ON COLUMN org_wide_defaults.grant_access_using_hierarchies IS 'Whether users higher in role hierarchy have access to subordinates records';
COMMENT ON FUNCTION get_owd_access IS 'Returns the OWD access level for a given object';
COMMENT ON FUNCTION use_role_hierarchy IS 'Returns whether role hierarchy should be used for access calculation';
