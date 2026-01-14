-- Migration: Create contracts and contract_line_items tables
-- ScalarDB software licensing: Subscription (License) + Pool of Funds (PoF)

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    owner_id UUID REFERENCES users(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    contract_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('License', 'PoF', 'Service')),
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'InApproval', 'Activated', 'Expired', 'Terminated')),
    start_date DATE,
    end_date DATE,
    term_months INTEGER NOT NULL,
    billing_frequency VARCHAR(50) CHECK (billing_frequency IN ('Monthly', 'Yearly', 'ThreeYear')),
    total_contract_value DECIMAL(18,2) DEFAULT 0,
    remaining_value DECIMAL(18,2) DEFAULT 0,
    auto_renewal BOOLEAN DEFAULT false,
    renewal_term_months INTEGER,
    renewal_notice_date DATE,
    activated_at TIMESTAMP WITH TIME ZONE,
    activated_by UUID REFERENCES users(id),
    terminated_at TIMESTAMP WITH TIME ZONE,
    termination_reason TEXT,
    primary_order_id UUID REFERENCES orders(id),
    source_contract_id UUID REFERENCES contracts(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

-- Contract line items table
CREATE TABLE IF NOT EXISTS contract_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    contract_id UUID NOT NULL REFERENCES contracts(id),
    product_id UUID NOT NULL REFERENCES products(id),
    pricebook_entry_id UUID REFERENCES pricebook_entries(id),
    source_order_item_id UUID REFERENCES order_items(id),
    quantity DECIMAL(18,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(18,2) NOT NULL,
    customer_unit_price DECIMAL(18,2),
    term_months INTEGER,
    billing_frequency VARCHAR(50) CHECK (billing_frequency IN ('Monthly', 'Yearly', 'ThreeYear')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price DECIMAL(18,2) NOT NULL,
    consumed_amount DECIMAL(18,2) DEFAULT 0,
    remaining_amount DECIMAL(18,2),
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Cancelled')),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

-- Indexes for contracts
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_account_id ON contracts(account_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(tenant_id, contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_primary_order_id ON contracts(primary_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_unique_contract_number ON contracts(tenant_id, contract_number) WHERE is_deleted = false;

-- Indexes for contract_line_items
CREATE INDEX IF NOT EXISTS idx_contract_line_items_tenant_id ON contract_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_line_items_contract_id ON contract_line_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_line_items_product_id ON contract_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_contract_line_items_status ON contract_line_items(tenant_id, status);

-- Add contract_id to orders table (for linking)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'contract_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN contract_id UUID REFERENCES contracts(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_contract_id ON orders(contract_id);
