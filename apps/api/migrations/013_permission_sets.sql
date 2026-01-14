-- Migration: 013_permission_sets
-- Description: Create PermissionSet tables for additional permissions beyond profiles

-- Permission Sets table
CREATE TABLE IF NOT EXISTS permission_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    CONSTRAINT uq_permission_set_name UNIQUE (tenant_id, name)
);

-- Indexes
CREATE INDEX idx_permission_sets_tenant ON permission_sets(tenant_id);
CREATE INDEX idx_permission_sets_active ON permission_sets(tenant_id, is_active) WHERE is_deleted = false;

-- User Permission Set Assignments
CREATE TABLE IF NOT EXISTS user_permission_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT uq_user_permission_set UNIQUE (tenant_id, user_id, permission_set_id)
);

-- Indexes
CREATE INDEX idx_user_permission_sets_user ON user_permission_sets(tenant_id, user_id);
CREATE INDEX idx_user_permission_sets_perm_set ON user_permission_sets(tenant_id, permission_set_id);

-- Permission Set Object Permissions (same structure as profile object permissions)
CREATE TABLE IF NOT EXISTS permission_set_object_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id),
    object_name VARCHAR(100) NOT NULL,
    can_create BOOLEAN DEFAULT false,
    can_read BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    view_all BOOLEAN DEFAULT false,
    modify_all BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT uq_perm_set_object_permission UNIQUE (tenant_id, permission_set_id, object_name)
);

-- Indexes
CREATE INDEX idx_perm_set_object_permissions_perm_set ON permission_set_object_permissions(tenant_id, permission_set_id);

-- Permission Set Field Permissions (same structure as profile field permissions)
CREATE TABLE IF NOT EXISTS permission_set_field_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    permission_set_id UUID NOT NULL REFERENCES permission_sets(id),
    object_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    is_readable BOOLEAN DEFAULT true,
    is_editable BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),

    CONSTRAINT uq_perm_set_field_permission UNIQUE (tenant_id, permission_set_id, object_name, field_name)
);

-- Indexes
CREATE INDEX idx_perm_set_field_permissions_perm_set ON permission_set_field_permissions(tenant_id, permission_set_id);

-- Comments
COMMENT ON TABLE permission_sets IS 'Permission sets for additional permissions beyond profile';
COMMENT ON TABLE user_permission_sets IS 'Assignment of permission sets to users';
COMMENT ON TABLE permission_set_object_permissions IS 'Object-level permissions for each permission set';
COMMENT ON TABLE permission_set_field_permissions IS 'Field-level permissions for each permission set';
