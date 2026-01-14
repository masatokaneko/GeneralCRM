-- =============================================
-- 017_workflow_rules.sql
-- Workflow Rules for Automation
-- =============================================

-- workflow_rules table
CREATE TABLE IF NOT EXISTS workflow_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    object_name VARCHAR(100) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    evaluation_criteria VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    description TEXT,
    conditions JSONB DEFAULT '[]',
    filter_logic VARCHAR(255),
    actions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    CONSTRAINT chk_workflow_trigger CHECK (
        trigger_type IN ('BeforeSave', 'AfterSave', 'Async', 'Scheduled')
    ),
    CONSTRAINT chk_workflow_eval CHECK (
        evaluation_criteria IN ('Created', 'CreatedOrEdited', 'CreatedAndMeetsCriteria')
    ),
    CONSTRAINT uq_workflow_name UNIQUE (tenant_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_rules_tenant
    ON workflow_rules(tenant_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_workflow_rules_object
    ON workflow_rules(tenant_id, object_name) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_workflow_rules_active
    ON workflow_rules(tenant_id, is_active) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_workflow_rules_trigger
    ON workflow_rules(tenant_id, trigger_type) WHERE is_deleted = false;

-- Comments
COMMENT ON TABLE workflow_rules IS 'Workflow automation rules for various objects';
COMMENT ON COLUMN workflow_rules.trigger_type IS 'When to trigger: BeforeSave, AfterSave, Async, Scheduled';
COMMENT ON COLUMN workflow_rules.evaluation_criteria IS 'When to evaluate: Created, CreatedOrEdited, CreatedAndMeetsCriteria';
COMMENT ON COLUMN workflow_rules.conditions IS 'JSON array of WorkflowCondition objects';
COMMENT ON COLUMN workflow_rules.filter_logic IS 'Custom filter logic expression (e.g., "1 AND (2 OR 3)")';
COMMENT ON COLUMN workflow_rules.actions IS 'JSON array of WorkflowAction objects';
