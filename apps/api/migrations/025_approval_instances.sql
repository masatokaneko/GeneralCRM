-- =============================================
-- 025_approval_instances.sql
-- Approval Instances, Work Items, and Histories
-- =============================================

-- approval_instances table (actual approval requests)
CREATE TABLE IF NOT EXISTS approval_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    process_definition_id UUID NOT NULL REFERENCES approval_processes(id),

    target_object_name VARCHAR(100) NOT NULL,
    target_record_id UUID NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'Pending',

    submitted_by UUID NOT NULL REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),

    current_step INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    CONSTRAINT chk_approval_instance_status CHECK (
        status IN ('Pending', 'Approved', 'Rejected', 'Recalled')
    )
);

CREATE INDEX IF NOT EXISTS idx_approval_inst_tenant
    ON approval_instances(tenant_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_approval_inst_target
    ON approval_instances(tenant_id, target_object_name, target_record_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_approval_inst_status
    ON approval_instances(tenant_id, status) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_approval_inst_submitter
    ON approval_instances(tenant_id, submitted_by, status) WHERE is_deleted = false;

-- approval_work_items table (individual approval tasks)
CREATE TABLE IF NOT EXISTS approval_work_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    approval_instance_id UUID NOT NULL REFERENCES approval_instances(id),

    step_number INTEGER NOT NULL,
    approver_id UUID NOT NULL REFERENCES users(id),

    status VARCHAR(50) NOT NULL DEFAULT 'Pending',

    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,

    -- Reassignment info
    original_approver_id UUID REFERENCES users(id),
    reassigned_by UUID REFERENCES users(id),
    reassigned_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4(),

    CONSTRAINT chk_work_item_status CHECK (
        status IN ('Pending', 'Approved', 'Rejected', 'Reassigned')
    )
);

CREATE INDEX IF NOT EXISTS idx_approval_work_tenant
    ON approval_work_items(tenant_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_approval_work_approver
    ON approval_work_items(tenant_id, approver_id, status) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_approval_work_instance
    ON approval_work_items(tenant_id, approval_instance_id, step_number) WHERE is_deleted = false;

-- approval_histories table (audit trail)
CREATE TABLE IF NOT EXISTS approval_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    approval_instance_id UUID NOT NULL REFERENCES approval_instances(id),

    actor_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,

    step_number INTEGER,
    comments TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,

    CONSTRAINT chk_approval_history_action CHECK (
        action IN ('Submit', 'Approve', 'Reject', 'Recall', 'Reassign', 'Comment')
    )
);

CREATE INDEX IF NOT EXISTS idx_approval_hist_tenant
    ON approval_histories(tenant_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_approval_hist_instance
    ON approval_histories(tenant_id, approval_instance_id, created_at);

CREATE INDEX IF NOT EXISTS idx_approval_hist_actor
    ON approval_histories(tenant_id, actor_id, created_at);

-- Comments
COMMENT ON TABLE approval_instances IS 'Actual approval request instances';
COMMENT ON TABLE approval_work_items IS 'Individual approval tasks for each step';
COMMENT ON TABLE approval_histories IS 'Audit trail for all approval actions';
