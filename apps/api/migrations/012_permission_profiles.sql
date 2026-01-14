-- Migration: 012_permission_profiles
-- Description: Create PermissionProfile tables for object and field level permissions

-- Permission Profiles table
CREATE TABLE IF NOT EXISTS permission_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,  -- System profiles cannot be deleted
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    CONSTRAINT uq_permission_profile_name UNIQUE (tenant_id, name)
);

-- Indexes
CREATE INDEX idx_permission_profiles_tenant ON permission_profiles(tenant_id);
CREATE INDEX idx_permission_profiles_active ON permission_profiles(tenant_id, is_active) WHERE is_deleted = false;

-- Object Permissions table
CREATE TABLE IF NOT EXISTS profile_object_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    profile_id UUID NOT NULL REFERENCES permission_profiles(id),
    object_name VARCHAR(100) NOT NULL,  -- Account, Contact, Lead, Opportunity, etc.
    can_create BOOLEAN DEFAULT false,
    can_read BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    view_all BOOLEAN DEFAULT false,     -- Can view all records regardless of sharing
    modify_all BOOLEAN DEFAULT false,   -- Can modify all records regardless of sharing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT uq_profile_object_permission UNIQUE (tenant_id, profile_id, object_name)
);

-- Indexes
CREATE INDEX idx_profile_object_permissions_profile ON profile_object_permissions(tenant_id, profile_id);
CREATE INDEX idx_profile_object_permissions_object ON profile_object_permissions(tenant_id, object_name);

-- Field Permissions table
CREATE TABLE IF NOT EXISTS profile_field_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    profile_id UUID NOT NULL REFERENCES permission_profiles(id),
    object_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    is_readable BOOLEAN DEFAULT true,
    is_editable BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT uq_profile_field_permission UNIQUE (tenant_id, profile_id, object_name, field_name)
);

-- Indexes
CREATE INDEX idx_profile_field_permissions_profile ON profile_field_permissions(tenant_id, profile_id);
CREATE INDEX idx_profile_field_permissions_object ON profile_field_permissions(tenant_id, object_name);

-- Add profile_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES permission_profiles(id);
CREATE INDEX IF NOT EXISTS idx_users_profile ON users(tenant_id, profile_id);

-- Insert default System Administrator profile for existing tenants
INSERT INTO permission_profiles (tenant_id, name, description, is_system, is_active)
SELECT
    id,
    'System Administrator',
    'Full access to all objects and fields',
    true,
    true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM permission_profiles WHERE name = 'System Administrator');

-- Insert default Standard User profile for existing tenants
INSERT INTO permission_profiles (tenant_id, name, description, is_system, is_active)
SELECT
    id,
    'Standard User',
    'Standard access with limited administrative permissions',
    true,
    true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM permission_profiles WHERE name = 'Standard User');

-- Insert default Read Only profile for existing tenants
INSERT INTO permission_profiles (tenant_id, name, description, is_system, is_active)
SELECT
    id,
    'Read Only',
    'Read-only access to all objects',
    true,
    true
FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM permission_profiles WHERE name = 'Read Only');

-- Supported objects list
-- This function returns the list of supported objects for permission configuration
CREATE OR REPLACE FUNCTION get_supported_objects()
RETURNS TABLE (object_name VARCHAR, display_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Account'::VARCHAR, 'Accounts'::VARCHAR
    UNION ALL SELECT 'Contact', 'Contacts'
    UNION ALL SELECT 'Lead', 'Leads'
    UNION ALL SELECT 'Opportunity', 'Opportunities'
    UNION ALL SELECT 'Quote', 'Quotes'
    UNION ALL SELECT 'Order', 'Orders'
    UNION ALL SELECT 'Contract', 'Contracts'
    UNION ALL SELECT 'Invoice', 'Invoices'
    UNION ALL SELECT 'Product', 'Products'
    UNION ALL SELECT 'Pricebook', 'Pricebooks'
    UNION ALL SELECT 'Task', 'Tasks'
    UNION ALL SELECT 'Event', 'Events';
END;
$$ LANGUAGE plpgsql STABLE;

-- Insert default object permissions for System Administrator
INSERT INTO profile_object_permissions (
    tenant_id,
    profile_id,
    object_name,
    can_create,
    can_read,
    can_update,
    can_delete,
    view_all,
    modify_all
)
SELECT
    pp.tenant_id,
    pp.id,
    obj.object_name,
    true,  -- can_create
    true,  -- can_read
    true,  -- can_update
    true,  -- can_delete
    true,  -- view_all
    true   -- modify_all
FROM permission_profiles pp
CROSS JOIN get_supported_objects() obj
WHERE pp.name = 'System Administrator'
ON CONFLICT (tenant_id, profile_id, object_name) DO NOTHING;

-- Insert default object permissions for Standard User
INSERT INTO profile_object_permissions (
    tenant_id,
    profile_id,
    object_name,
    can_create,
    can_read,
    can_update,
    can_delete,
    view_all,
    modify_all
)
SELECT
    pp.tenant_id,
    pp.id,
    obj.object_name,
    true,  -- can_create
    true,  -- can_read
    true,  -- can_update
    false, -- can_delete (no delete for standard users)
    false, -- view_all
    false  -- modify_all
FROM permission_profiles pp
CROSS JOIN get_supported_objects() obj
WHERE pp.name = 'Standard User'
ON CONFLICT (tenant_id, profile_id, object_name) DO NOTHING;

-- Insert default object permissions for Read Only
INSERT INTO profile_object_permissions (
    tenant_id,
    profile_id,
    object_name,
    can_create,
    can_read,
    can_update,
    can_delete,
    view_all,
    modify_all
)
SELECT
    pp.tenant_id,
    pp.id,
    obj.object_name,
    false, -- can_create
    true,  -- can_read
    false, -- can_update
    false, -- can_delete
    false, -- view_all
    false  -- modify_all
FROM permission_profiles pp
CROSS JOIN get_supported_objects() obj
WHERE pp.name = 'Read Only'
ON CONFLICT (tenant_id, profile_id, object_name) DO NOTHING;

-- Comments
COMMENT ON TABLE permission_profiles IS 'Permission profiles defining object and field level access';
COMMENT ON TABLE profile_object_permissions IS 'Object-level permissions for each profile';
COMMENT ON TABLE profile_field_permissions IS 'Field-level permissions for each profile';
COMMENT ON COLUMN permission_profiles.is_system IS 'System profiles cannot be deleted';
COMMENT ON COLUMN profile_object_permissions.view_all IS 'Can view all records regardless of sharing rules';
COMMENT ON COLUMN profile_object_permissions.modify_all IS 'Can modify all records regardless of sharing rules';
