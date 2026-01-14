-- Migration: 004_activities.sql
-- Description: Create tasks and events tables for activity management

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    owner_id UUID REFERENCES users(id),
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'NotStarted',
    priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
    activity_date DATE,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    who_type VARCHAR(50),  -- 'Lead' | 'Contact'
    who_id UUID,
    what_type VARCHAR(50), -- 'Account' | 'Opportunity' | 'Quote'
    what_id UUID,
    description TEXT,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    -- Standard audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp UUID NOT NULL DEFAULT uuid_generate_v4(),

    -- Constraints
    CONSTRAINT tasks_status_check CHECK (status IN ('NotStarted', 'InProgress', 'Completed', 'WaitingOnSomeoneElse', 'Deferred')),
    CONSTRAINT tasks_priority_check CHECK (priority IN ('High', 'Normal', 'Low')),
    CONSTRAINT tasks_who_type_check CHECK (who_type IS NULL OR who_type IN ('Lead', 'Contact')),
    CONSTRAINT tasks_what_type_check CHECK (what_type IS NULL OR what_type IN ('Account', 'Opportunity', 'Quote'))
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    owner_id UUID REFERENCES users(id),
    subject VARCHAR(255) NOT NULL,
    start_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_all_day_event BOOLEAN NOT NULL DEFAULT false,
    location VARCHAR(255),
    who_type VARCHAR(50),  -- 'Lead' | 'Contact'
    who_id UUID,
    what_type VARCHAR(50), -- 'Account' | 'Opportunity' | 'Quote'
    what_id UUID,
    description TEXT,
    -- Standard audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_by UUID,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    system_modstamp UUID NOT NULL DEFAULT uuid_generate_v4(),

    -- Constraints
    CONSTRAINT events_who_type_check CHECK (who_type IS NULL OR who_type IN ('Lead', 'Contact')),
    CONSTRAINT events_what_type_check CHECK (what_type IS NULL OR what_type IN ('Account', 'Opportunity', 'Quote')),
    CONSTRAINT events_date_check CHECK (end_date_time >= start_date_time)
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(tenant_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(tenant_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_activity_date ON tasks(tenant_id, activity_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(tenant_id, due_date) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_who ON tasks(tenant_id, who_type, who_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_what ON tasks(tenant_id, what_type, what_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tasks_is_closed ON tasks(tenant_id, is_closed) WHERE is_deleted = false;

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_tenant_id ON events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON events(tenant_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(tenant_id, start_date_time) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_events_who ON events(tenant_id, who_type, who_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_events_what ON events(tenant_id, what_type, what_id) WHERE is_deleted = false;

-- Record migration
INSERT INTO schema_migrations (version)
VALUES ('004')
ON CONFLICT (version) DO NOTHING;
