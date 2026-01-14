-- Migration: 023_field_history
-- Description: Create field_histories table for audit trail of field changes

-- Field tracking settings - which fields to track for each object
CREATE TABLE IF NOT EXISTS field_tracking_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    is_tracked BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL REFERENCES users(id),

    CONSTRAINT uq_field_tracking UNIQUE (tenant_id, object_name, field_name),
    CONSTRAINT chk_tracking_object_name CHECK (object_name IN (
        'Account', 'Contact', 'Lead', 'Opportunity', 'Quote', 'Order',
        'Contract', 'Invoice', 'Product', 'Pricebook', 'PricebookEntry',
        'Task', 'Event', 'Campaign', 'CampaignMember'
    ))
);

-- Field history - stores actual field change records
CREATE TABLE IF NOT EXISTS field_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,

    old_value JSONB,
    new_value JSONB,

    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID NOT NULL REFERENCES users(id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_field_hist_record
    ON field_histories (tenant_id, object_name, record_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_field_hist_field
    ON field_histories (tenant_id, object_name, field_name, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_field_hist_changed_by
    ON field_histories (tenant_id, changed_by, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_field_tracking_lookup
    ON field_tracking_settings (tenant_id, object_name, is_tracked)
    WHERE is_tracked = true;

-- Add comments
COMMENT ON TABLE field_histories IS 'Audit trail of field value changes';
COMMENT ON TABLE field_tracking_settings IS 'Configuration for which fields to track history';
COMMENT ON COLUMN field_histories.old_value IS 'Previous value stored as JSONB for type flexibility';
COMMENT ON COLUMN field_histories.new_value IS 'New value stored as JSONB for type flexibility';

-- Default tracking settings for important fields (Demo Tenant)
INSERT INTO field_tracking_settings (tenant_id, object_name, field_name, created_by, updated_by)
SELECT t.id, obj.object_name, obj.field_name, u.id, u.id
FROM tenants t
CROSS JOIN users u
CROSS JOIN (VALUES
    -- Account
    ('Account', 'name'),
    ('Account', 'type'),
    ('Account', 'status'),
    ('Account', 'ownerId'),
    ('Account', 'industry'),
    ('Account', 'annualRevenue'),
    -- Contact
    ('Contact', 'accountId'),
    ('Contact', 'ownerId'),
    ('Contact', 'email'),
    ('Contact', 'phone'),
    ('Contact', 'isPrimary'),
    -- Lead
    ('Lead', 'status'),
    ('Lead', 'ownerId'),
    ('Lead', 'rating'),
    ('Lead', 'isConverted'),
    ('Lead', 'email'),
    -- Opportunity
    ('Opportunity', 'stageName'),
    ('Opportunity', 'amount'),
    ('Opportunity', 'closeDate'),
    ('Opportunity', 'probability'),
    ('Opportunity', 'ownerId'),
    ('Opportunity', 'isClosed'),
    ('Opportunity', 'isWon'),
    ('Opportunity', 'lostReason'),
    ('Opportunity', 'forecastCategory'),
    -- Quote
    ('Quote', 'status'),
    ('Quote', 'totalPrice'),
    ('Quote', 'discount'),
    ('Quote', 'expirationDate'),
    ('Quote', 'isPrimary'),
    -- Order
    ('Order', 'status'),
    ('Order', 'totalAmount'),
    ('Order', 'activatedDate'),
    -- Contract
    ('Contract', 'status'),
    ('Contract', 'startDate'),
    ('Contract', 'endDate'),
    ('Contract', 'contractTerm'),
    ('Contract', 'totalAmount'),
    -- Invoice
    ('Invoice', 'status'),
    ('Invoice', 'totalAmount'),
    ('Invoice', 'dueDate'),
    ('Invoice', 'paidAmount'),
    -- Campaign
    ('Campaign', 'status'),
    ('Campaign', 'type'),
    ('Campaign', 'budgetedCost'),
    ('Campaign', 'actualCost'),
    ('Campaign', 'isActive')
) AS obj(object_name, field_name)
WHERE t.name = 'Demo Tenant' AND u.email = 'admin@example.com'
ON CONFLICT DO NOTHING;
