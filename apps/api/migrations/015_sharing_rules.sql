-- Migration: 015_sharing_rules
-- Description: Create Sharing Rules table for sharing record access

-- Sharing Rules table
CREATE TABLE IF NOT EXISTS sharing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    object_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,  -- OwnerBased / CriteriaBased
    description TEXT,
    is_active BOOLEAN DEFAULT true,

    -- Source: Who owns the records being shared
    source_type VARCHAR(50),         -- Role / RoleAndSubordinates / PublicGroup
    source_id UUID,                  -- Role ID or Group ID

    -- Target: Who gets access to the records
    target_type VARCHAR(50) NOT NULL, -- Role / RoleAndSubordinates / PublicGroup / User
    target_id UUID NOT NULL,          -- Role ID, Group ID, or User ID

    -- Access level granted by this rule
    access_level VARCHAR(50) NOT NULL DEFAULT 'Read',  -- Read / ReadWrite

    -- For CriteriaBased rules: filter conditions (JSON)
    filter_criteria JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    CONSTRAINT uq_sharing_rule_name UNIQUE (tenant_id, object_name, name),
    CONSTRAINT chk_rule_type CHECK (rule_type IN ('OwnerBased', 'CriteriaBased')),
    CONSTRAINT chk_source_type CHECK (
        source_type IS NULL OR source_type IN ('Role', 'RoleAndSubordinates', 'PublicGroup')
    ),
    CONSTRAINT chk_target_type CHECK (
        target_type IN ('Role', 'RoleAndSubordinates', 'PublicGroup', 'User')
    ),
    CONSTRAINT chk_access_level CHECK (access_level IN ('Read', 'ReadWrite')),
    -- Owner-based rules must have source, criteria-based may not
    CONSTRAINT chk_owner_source CHECK (
        rule_type != 'OwnerBased' OR (source_type IS NOT NULL AND source_id IS NOT NULL)
    ),
    -- Criteria-based rules must have filter_criteria
    CONSTRAINT chk_criteria_filter CHECK (
        rule_type != 'CriteriaBased' OR filter_criteria IS NOT NULL
    )
);

-- Indexes
CREATE INDEX idx_sharing_rules_tenant ON sharing_rules(tenant_id);
CREATE INDEX idx_sharing_rules_object ON sharing_rules(tenant_id, object_name) WHERE is_deleted = false;
CREATE INDEX idx_sharing_rules_active ON sharing_rules(tenant_id, is_active) WHERE is_deleted = false;
CREATE INDEX idx_sharing_rules_source ON sharing_rules(tenant_id, source_type, source_id) WHERE is_deleted = false;
CREATE INDEX idx_sharing_rules_target ON sharing_rules(tenant_id, target_type, target_id) WHERE is_deleted = false;

-- Public Groups table (for sharing rules targeting groups)
CREATE TABLE IF NOT EXISTS public_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    does_include_bosses BOOLEAN DEFAULT false,  -- Include managers of members
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    CONSTRAINT uq_public_group_name UNIQUE (tenant_id, name)
);

CREATE INDEX idx_public_groups_tenant ON public_groups(tenant_id);

-- Group Members table
CREATE TABLE IF NOT EXISTS public_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    group_id UUID NOT NULL REFERENCES public_groups(id),
    member_type VARCHAR(50) NOT NULL,  -- User / Role / RoleAndSubordinates / Group
    member_id UUID NOT NULL,           -- User ID, Role ID, or Group ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT uq_group_member UNIQUE (tenant_id, group_id, member_type, member_id),
    CONSTRAINT chk_member_type CHECK (
        member_type IN ('User', 'Role', 'RoleAndSubordinates', 'Group')
    )
);

CREATE INDEX idx_group_members_group ON public_group_members(tenant_id, group_id);
CREATE INDEX idx_group_members_member ON public_group_members(tenant_id, member_type, member_id);

-- Helper function to get all users in a group (recursive for nested groups)
CREATE OR REPLACE FUNCTION get_group_members_expanded(
    p_tenant_id UUID,
    p_group_id UUID
)
RETURNS TABLE (user_id UUID) AS $$
WITH RECURSIVE member_expansion AS (
    -- Base case: direct user members
    SELECT pgm.member_id as user_id, pgm.member_type
    FROM public_group_members pgm
    WHERE pgm.tenant_id = p_tenant_id AND pgm.group_id = p_group_id

    UNION ALL

    -- Recursive case: expand nested groups
    SELECT pgm.member_id as user_id, pgm.member_type
    FROM public_group_members pgm
    JOIN member_expansion me ON me.member_type = 'Group' AND pgm.group_id = me.user_id
    WHERE pgm.tenant_id = p_tenant_id
)
-- Final output: get user IDs
SELECT DISTINCT
    CASE
        WHEN me.member_type = 'User' THEN me.user_id
        -- For Role members, get users in that role
        WHEN me.member_type = 'Role' THEN u.id
        -- For RoleAndSubordinates, get users in role and subordinate roles
        WHEN me.member_type = 'RoleAndSubordinates' THEN u.id
    END as user_id
FROM member_expansion me
LEFT JOIN users u ON (
    (me.member_type = 'User' AND u.id = me.user_id)
    OR (me.member_type = 'Role' AND u.role_id = me.user_id)
    OR (me.member_type = 'RoleAndSubordinates' AND u.role_id IN (
        SELECT role_id FROM get_role_descendants(p_tenant_id, me.user_id)
    ))
) AND u.tenant_id = p_tenant_id AND u.is_active = true
WHERE me.member_type != 'Group'; -- Groups are expanded recursively
$$ LANGUAGE SQL STABLE;

-- Comments
COMMENT ON TABLE sharing_rules IS 'Sharing rules for extending record access beyond OWD';
COMMENT ON COLUMN sharing_rules.rule_type IS 'OwnerBased: share based on record ownership, CriteriaBased: share based on field values';
COMMENT ON COLUMN sharing_rules.source_type IS 'For OwnerBased: who owns the records being shared';
COMMENT ON COLUMN sharing_rules.target_type IS 'Who gets access to the records';
COMMENT ON COLUMN sharing_rules.filter_criteria IS 'JSON filter conditions for CriteriaBased rules';
COMMENT ON TABLE public_groups IS 'Groups of users for sharing purposes';
COMMENT ON COLUMN public_groups.does_include_bosses IS 'Whether to automatically include managers of members';
COMMENT ON TABLE public_group_members IS 'Members of public groups';
