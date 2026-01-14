-- =============================================
-- 018_approval_processes.sql
-- Approval Processes for Workflow Automation
-- =============================================

-- approval_processes table
CREATE TABLE IF NOT EXISTS approval_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    object_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    description TEXT,
    entry_criteria JSONB DEFAULT '[]',
    filter_logic VARCHAR(255),
    record_editability VARCHAR(50) DEFAULT 'Locked',
    steps JSONB DEFAULT '[]',
    actions JSONB DEFAULT '{"onSubmit":[],"onApprove":[],"onReject":[]}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    CONSTRAINT chk_approval_editability CHECK (
        record_editability IN ('Locked', 'AdminOnly')
    ),
    CONSTRAINT uq_approval_name UNIQUE (tenant_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approval_processes_tenant
    ON approval_processes(tenant_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_approval_processes_object
    ON approval_processes(tenant_id, object_name) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_approval_processes_active
    ON approval_processes(tenant_id, is_active) WHERE is_deleted = false;

-- Comments
COMMENT ON TABLE approval_processes IS 'Approval process definitions for various objects';
COMMENT ON COLUMN approval_processes.entry_criteria IS 'JSON array of ApprovalCondition objects for process entry';
COMMENT ON COLUMN approval_processes.record_editability IS 'Record lock during approval: Locked or AdminOnly';
COMMENT ON COLUMN approval_processes.steps IS 'JSON array of ApprovalStep objects defining the approval flow';
COMMENT ON COLUMN approval_processes.actions IS 'JSON object with onSubmit, onApprove, onReject action arrays';
