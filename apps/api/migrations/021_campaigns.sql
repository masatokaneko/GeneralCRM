-- Migration: 021_campaigns.sql
-- Description: Campaign and CampaignMember tables for marketing automation

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Other',
    status VARCHAR(50) NOT NULL DEFAULT 'Planned',
    description TEXT,
    start_date DATE,
    end_date DATE,
    budgeted_cost NUMERIC(18, 2) DEFAULT 0,
    actual_cost NUMERIC(18, 2) DEFAULT 0,
    expected_revenue NUMERIC(18, 2) DEFAULT 0,
    expected_response NUMERIC(5, 2) DEFAULT 0,
    number_sent INTEGER DEFAULT 0,
    number_of_leads INTEGER DEFAULT 0,
    number_of_converted_leads INTEGER DEFAULT 0,
    number_of_contacts INTEGER DEFAULT 0,
    number_of_responses INTEGER DEFAULT 0,
    number_of_opportunities INTEGER DEFAULT 0,
    amount_all_opportunities NUMERIC(18, 2) DEFAULT 0,
    amount_won_opportunities NUMERIC(18, 2) DEFAULT 0,
    parent_campaign_id UUID REFERENCES campaigns(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp UUID NOT NULL DEFAULT uuid_generate_v4(),
    CONSTRAINT chk_campaign_type CHECK (type IN ('Email', 'Webinar', 'TradeShow', 'Conference', 'DirectMail', 'Telemarketing', 'Advertisement', 'Banner', 'Partners', 'Referral', 'Public Relations', 'Social', 'Other')),
    CONSTRAINT chk_campaign_status CHECK (status IN ('Planned', 'Active', 'Completed', 'Aborted'))
);

-- Campaign members table (Lead or Contact participation)
CREATE TABLE IF NOT EXISTS campaign_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    member_type VARCHAR(20) NOT NULL,
    member_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Sent',
    first_responded_date TIMESTAMP WITH TIME ZONE,
    has_responded BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp UUID NOT NULL DEFAULT uuid_generate_v4(),
    CONSTRAINT chk_member_type CHECK (member_type IN ('Lead', 'Contact')),
    CONSTRAINT chk_member_status CHECK (status IN ('Sent', 'Responded', 'Opened', 'Clicked', 'Converted', 'Unsubscribed', 'Bounced')),
    CONSTRAINT uq_campaign_member UNIQUE (tenant_id, campaign_id, member_type, member_id)
);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_owner ON campaigns(tenant_id, owner_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status ON campaigns(tenant_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_dates ON campaigns(tenant_id, start_date, end_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_campaigns_parent ON campaigns(tenant_id, parent_campaign_id) WHERE is_deleted = false;

-- Indexes for campaign_members
CREATE INDEX IF NOT EXISTS idx_campaign_members_campaign ON campaign_members(tenant_id, campaign_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_campaign_members_member ON campaign_members(tenant_id, member_type, member_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_campaign_members_status ON campaign_members(tenant_id, campaign_id, status) WHERE is_deleted = false;

-- Add Campaign to OWD settings
INSERT INTO org_wide_defaults (tenant_id, object_name, internal_access, external_access, grant_access_using_hierarchies, created_by, updated_by)
SELECT
    t.id,
    'Campaign',
    'PublicReadWrite',
    'Private',
    true,
    (SELECT id FROM users WHERE tenant_id = t.id AND username = 'admin' LIMIT 1),
    (SELECT id FROM users WHERE tenant_id = t.id AND username = 'admin' LIMIT 1)
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM org_wide_defaults WHERE tenant_id = t.id AND object_name = 'Campaign'
)
ON CONFLICT DO NOTHING;

-- Seed sample campaign data for demo tenant
INSERT INTO campaigns (id, tenant_id, owner_id, name, type, status, description, start_date, end_date, budgeted_cost, actual_cost, expected_revenue, is_active, created_by, updated_by)
SELECT
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Q1 Product Launch',
    'Email',
    'Active',
    'Email campaign for Q1 product launch',
    '2026-01-01',
    '2026-03-31',
    50000.00,
    35000.00,
    200000.00,
    true,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid
WHERE NOT EXISTS (SELECT 1 FROM campaigns WHERE id = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

INSERT INTO campaigns (id, tenant_id, owner_id, name, type, status, description, start_date, end_date, budgeted_cost, actual_cost, expected_revenue, is_active, created_by, updated_by)
SELECT
    '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    'Spring Webinar Series',
    'Webinar',
    'Planned',
    'Webinar series for spring promotion',
    '2026-03-01',
    '2026-05-31',
    30000.00,
    0.00,
    150000.00,
    true,
    '33333333-3333-3333-3333-333333333333'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid
WHERE NOT EXISTS (SELECT 1 FROM campaigns WHERE id = '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

INSERT INTO campaigns (id, tenant_id, owner_id, name, type, status, description, start_date, end_date, budgeted_cost, actual_cost, expected_revenue, is_active, created_by, updated_by)
SELECT
    '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Tech Conference 2026',
    'Conference',
    'Planned',
    'Annual tech conference participation',
    '2026-06-15',
    '2026-06-18',
    100000.00,
    0.00,
    500000.00,
    true,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid
WHERE NOT EXISTS (SELECT 1 FROM campaigns WHERE id = '33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
