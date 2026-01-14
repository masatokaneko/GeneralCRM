-- Migration: Create pool_consumptions table
-- Pool of Funds (PoF) consumption tracking with approval workflow

CREATE TABLE IF NOT EXISTS pool_consumptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    contract_line_item_id UUID NOT NULL REFERENCES contract_line_items(id),
    consumption_date DATE NOT NULL,
    quantity DECIMAL(18,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(18,2) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    description TEXT,
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled', 'Invoiced')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    invoice_line_item_id UUID,
    external_reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pool_consumptions_tenant_id ON pool_consumptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pool_consumptions_contract_line_item_id ON pool_consumptions(contract_line_item_id);
CREATE INDEX IF NOT EXISTS idx_pool_consumptions_status ON pool_consumptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pool_consumptions_requested_by ON pool_consumptions(requested_by);
CREATE INDEX IF NOT EXISTS idx_pool_consumptions_consumption_date ON pool_consumptions(tenant_id, consumption_date);
