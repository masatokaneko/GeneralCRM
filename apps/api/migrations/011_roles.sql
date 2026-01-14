-- Migration: 011_roles
-- Description: Create Role hierarchy table for permission management

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    parent_role_id UUID REFERENCES roles(id),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    -- Constraints
    CONSTRAINT uq_role_name UNIQUE (tenant_id, name),
    CONSTRAINT chk_no_self_parent CHECK (id != parent_role_id)
);

-- Indexes
CREATE INDEX idx_roles_tenant ON roles(tenant_id);
CREATE INDEX idx_roles_parent ON roles(tenant_id, parent_role_id);
CREATE INDEX idx_roles_active ON roles(tenant_id, is_active) WHERE is_deleted = false;

-- Add role_id column to users table (nullable for migration compatibility)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(tenant_id, role_id);

-- Insert default roles for existing tenants
INSERT INTO roles (tenant_id, name, description, sort_order, is_active)
SELECT
    id,
    'CEO',
    'Chief Executive Officer - Top of hierarchy',
    1,
    true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM roles WHERE name = 'CEO');

-- Function to get all descendant roles (for hierarchy queries)
CREATE OR REPLACE FUNCTION get_role_descendants(p_tenant_id UUID, p_role_id UUID)
RETURNS TABLE (role_id UUID, depth INTEGER) AS $$
WITH RECURSIVE role_tree AS (
    -- Base case: start with the given role
    SELECT id, 0 as depth
    FROM roles
    WHERE tenant_id = p_tenant_id AND id = p_role_id AND is_deleted = false

    UNION ALL

    -- Recursive case: get children
    SELECT r.id, rt.depth + 1
    FROM roles r
    INNER JOIN role_tree rt ON r.parent_role_id = rt.id
    WHERE r.tenant_id = p_tenant_id AND r.is_deleted = false
)
SELECT id as role_id, depth FROM role_tree;
$$ LANGUAGE SQL STABLE;

-- Function to get all ancestor roles (for hierarchy queries)
CREATE OR REPLACE FUNCTION get_role_ancestors(p_tenant_id UUID, p_role_id UUID)
RETURNS TABLE (role_id UUID, depth INTEGER) AS $$
WITH RECURSIVE role_tree AS (
    -- Base case: start with the given role
    SELECT id, parent_role_id, 0 as depth
    FROM roles
    WHERE tenant_id = p_tenant_id AND id = p_role_id AND is_deleted = false

    UNION ALL

    -- Recursive case: get parent
    SELECT r.id, r.parent_role_id, rt.depth + 1
    FROM roles r
    INNER JOIN role_tree rt ON r.id = rt.parent_role_id
    WHERE r.tenant_id = p_tenant_id AND r.is_deleted = false
)
SELECT id as role_id, depth FROM role_tree;
$$ LANGUAGE SQL STABLE;

-- Comments
COMMENT ON TABLE roles IS 'Role hierarchy for permission management';
COMMENT ON COLUMN roles.parent_role_id IS 'Parent role in hierarchy - null for top-level roles';
COMMENT ON COLUMN roles.sort_order IS 'Order within same level of hierarchy';
COMMENT ON FUNCTION get_role_descendants IS 'Get all descendant roles for a given role';
COMMENT ON FUNCTION get_role_ancestors IS 'Get all ancestor roles for a given role';
