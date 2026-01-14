-- Migration: 022_validation_rules
-- Description: Create validation_rules table for business rule validation

-- Validation Rules table
CREATE TABLE IF NOT EXISTS validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT true,
    condition_expression JSONB NOT NULL,  -- DSL/AST condition (true = error)
    error_message TEXT NOT NULL,
    error_field VARCHAR(100),  -- Optional: field to show error on

    -- Evaluation order (lower = earlier)
    execution_order INTEGER NOT NULL DEFAULT 100,

    -- Application timing
    apply_on_create BOOLEAN NOT NULL DEFAULT true,
    apply_on_update BOOLEAN NOT NULL DEFAULT true,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT uq_validation_rule_name UNIQUE (tenant_id, object_name, rule_name),
    CONSTRAINT chk_validation_object_name CHECK (object_name IN (
        'Account', 'Contact', 'Lead', 'Opportunity', 'Quote', 'Order',
        'Contract', 'Invoice', 'Product', 'Pricebook', 'PricebookEntry',
        'Task', 'Event', 'Campaign', 'CampaignMember'
    ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_validation_rules_tenant_object
    ON validation_rules (tenant_id, object_name, is_active)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_validation_rules_lookup
    ON validation_rules (tenant_id, object_name, execution_order, rule_name)
    WHERE is_deleted = false AND is_active = true;

-- OWD Setting (Private - admin only)
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access)
SELECT id, 'ValidationRule', 'Private', 'Private'
FROM tenants
ON CONFLICT (tenant_id, object_name) DO NOTHING;

-- Add comments
COMMENT ON TABLE validation_rules IS 'Business validation rules evaluated during save pipeline';
COMMENT ON COLUMN validation_rules.condition_expression IS 'JSON AST condition - when true, validation fails';
COMMENT ON COLUMN validation_rules.execution_order IS 'Evaluation order - lower numbers run first';
COMMENT ON COLUMN validation_rules.error_field IS 'Optional field name to attach error to';

-- Sample validation rules for demo tenant
INSERT INTO validation_rules (
    tenant_id, object_name, rule_name, description,
    condition_expression, error_message, error_field,
    execution_order, apply_on_create, apply_on_update,
    created_by, updated_by
)
SELECT
    t.id,
    'Opportunity',
    'ClosedLostRequiresReason',
    'Requires LostReason when opportunity is Closed Lost',
    '{
        "schemaVersion": 1,
        "expr": {
            "op": "and",
            "args": [
                {"op": "eq", "left": {"op": "ref", "path": "record.stageName"}, "right": {"op": "literal", "type": "String", "value": "Closed Lost"}},
                {"op": "isBlank", "value": {"op": "ref", "path": "record.lostReason"}}
            ]
        }
    }'::jsonb,
    'Lost reason is required when closing an opportunity as lost.',
    'lostReason',
    100,
    true,
    true,
    u.id,
    u.id
FROM tenants t
CROSS JOIN users u
WHERE t.name = 'Demo Tenant' AND u.email = 'admin@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO validation_rules (
    tenant_id, object_name, rule_name, description,
    condition_expression, error_message, error_field,
    execution_order, apply_on_create, apply_on_update,
    created_by, updated_by
)
SELECT
    t.id,
    'Opportunity',
    'CloseDateRequired',
    'CloseDate is required for opportunities in later stages',
    '{
        "schemaVersion": 1,
        "expr": {
            "op": "and",
            "args": [
                {"op": "in", "left": {"op": "ref", "path": "record.stageName"}, "right": {"op": "list", "items": [
                    {"op": "literal", "type": "String", "value": "Proposal"},
                    {"op": "literal", "type": "String", "value": "Negotiation"},
                    {"op": "literal", "type": "String", "value": "Closed Won"},
                    {"op": "literal", "type": "String", "value": "Closed Lost"}
                ]}},
                {"op": "isNull", "value": {"op": "ref", "path": "record.closeDate"}}
            ]
        }
    }'::jsonb,
    'Close date is required for opportunities in Proposal stage or later.',
    'closeDate',
    110,
    true,
    true,
    u.id,
    u.id
FROM tenants t
CROSS JOIN users u
WHERE t.name = 'Demo Tenant' AND u.email = 'admin@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO validation_rules (
    tenant_id, object_name, rule_name, description,
    condition_expression, error_message, error_field,
    execution_order, apply_on_create, apply_on_update,
    created_by, updated_by
)
SELECT
    t.id,
    'Quote',
    'QuoteExpirationNotPast',
    'Quote expiration date must be in the future',
    '{
        "schemaVersion": 1,
        "expr": {
            "op": "and",
            "args": [
                {"op": "not", "arg": {"op": "isNull", "value": {"op": "ref", "path": "record.expirationDate"}}},
                {"op": "lt", "left": {"op": "ref", "path": "record.expirationDate"}, "right": {"op": "today"}}
            ]
        }
    }'::jsonb,
    'Quote expiration date cannot be in the past.',
    'expirationDate',
    100,
    true,
    true,
    u.id,
    u.id
FROM tenants t
CROSS JOIN users u
WHERE t.name = 'Demo Tenant' AND u.email = 'admin@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO validation_rules (
    tenant_id, object_name, rule_name, description,
    condition_expression, error_message, error_field,
    execution_order, apply_on_create, apply_on_update,
    created_by, updated_by
)
SELECT
    t.id,
    'Lead',
    'LeadEmailOrPhoneRequired',
    'Lead must have either email or phone',
    '{
        "schemaVersion": 1,
        "expr": {
            "op": "and",
            "args": [
                {"op": "isBlank", "value": {"op": "ref", "path": "record.email"}},
                {"op": "isBlank", "value": {"op": "ref", "path": "record.phone"}}
            ]
        }
    }'::jsonb,
    'Either email or phone number is required for a lead.',
    'email',
    100,
    true,
    true,
    u.id,
    u.id
FROM tenants t
CROSS JOIN users u
WHERE t.name = 'Demo Tenant' AND u.email = 'admin@example.com'
ON CONFLICT DO NOTHING;
