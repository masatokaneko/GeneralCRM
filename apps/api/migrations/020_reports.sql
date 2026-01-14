-- 020_reports.sql
-- Report and Dashboard functionality

-- Report folders for organizing reports
CREATE TABLE IF NOT EXISTS report_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES report_folders(id),
    access_type VARCHAR(50) DEFAULT 'Private' CHECK (access_type IN ('Private', 'Public', 'Shared')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

-- Report definitions
CREATE TABLE IF NOT EXISTS report_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES report_folders(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('Tabular', 'Summary', 'Matrix', 'Joined')),
    base_object VARCHAR(100) NOT NULL,
    -- Query definition stored as JSON
    definition JSONB NOT NULL,
    -- Chart configuration (optional)
    chart_config JSONB,
    -- Visibility
    is_public BOOLEAN DEFAULT false,
    owner_id UUID REFERENCES users(id),
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

-- Report execution history
CREATE TABLE IF NOT EXISTS report_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Running', 'Completed', 'Failed', 'Cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    row_count INTEGER,
    -- Cached result data (for quick reload)
    result_data JSONB,
    error_message TEXT,
    run_by UUID REFERENCES users(id),
    -- Runtime parameters (for parameterized reports)
    parameters JSONB
);

-- Dashboard definitions
CREATE TABLE IF NOT EXISTS dashboard_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES report_folders(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- Layout configuration
    layout JSONB NOT NULL DEFAULT '{"columns": 2, "components": []}',
    -- Visibility
    is_public BOOLEAN DEFAULT false,
    owner_id UUID REFERENCES users(id),
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

-- Dashboard components (widgets)
CREATE TABLE IF NOT EXISTS dashboard_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    dashboard_id UUID NOT NULL REFERENCES dashboard_definitions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    component_type VARCHAR(50) NOT NULL CHECK (component_type IN ('Chart', 'Table', 'Metric', 'Gauge')),
    -- Source can be a report or direct query
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('Report', 'Query')),
    report_id UUID REFERENCES report_definitions(id),
    query_definition JSONB,
    -- Component-specific configuration
    config JSONB NOT NULL DEFAULT '{}',
    -- Position in dashboard grid
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 1,
    height INTEGER NOT NULL DEFAULT 1,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

-- Report subscriptions (scheduled reports)
CREATE TABLE IF NOT EXISTS report_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    -- Schedule configuration
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('Daily', 'Weekly', 'Monthly')),
    day_of_week INTEGER, -- 0-6 for Sunday-Saturday (Weekly)
    day_of_month INTEGER, -- 1-31 (Monthly)
    run_time TIME NOT NULL DEFAULT '08:00:00',
    -- Delivery options
    delivery_format VARCHAR(50) DEFAULT 'Email' CHECK (delivery_format IN ('Email', 'Slack', 'Webhook')),
    delivery_config JSONB,
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_folders_tenant ON report_folders(tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_folders_parent ON report_folders(parent_folder_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_report_definitions_tenant ON report_definitions(tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_definitions_folder ON report_definitions(folder_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_definitions_owner ON report_definitions(owner_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_report_definitions_base_object ON report_definitions(base_object) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_report_runs_tenant ON report_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_report ON report_runs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_status ON report_runs(status);
CREATE INDEX IF NOT EXISTS idx_report_runs_started ON report_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_definitions_tenant ON dashboard_definitions(tenant_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_dashboard_definitions_owner ON dashboard_definitions(owner_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_dashboard_components_dashboard ON dashboard_components(dashboard_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_report_subscriptions_report ON report_subscriptions(report_id) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_next_run ON report_subscriptions(next_run_at) WHERE is_deleted = false AND is_active = true;

-- Insert default "My Reports" and "All Reports" folders
-- (This will be done per-tenant in application code or tenant setup)

COMMENT ON TABLE report_definitions IS 'Stores report definitions including query structure, filters, and display options';
COMMENT ON COLUMN report_definitions.definition IS 'JSON structure containing: select fields, filters, groupBy, orderBy, limit';
COMMENT ON COLUMN report_definitions.chart_config IS 'JSON structure containing chart type, data mapping, and visual options';
COMMENT ON TABLE report_runs IS 'Execution history for reports with cached results';
COMMENT ON TABLE dashboard_definitions IS 'Dashboard layouts containing multiple report components';
COMMENT ON TABLE dashboard_components IS 'Individual widgets within a dashboard, linked to reports or direct queries';
