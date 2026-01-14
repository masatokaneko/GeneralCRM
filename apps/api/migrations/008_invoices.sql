-- Migration: Create invoices and invoice_line_items tables
-- Invoice management with payment tracking

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    contract_id UUID REFERENCES contracts(id),
    order_id UUID REFERENCES orders(id),
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'PartialPaid', 'Overdue', 'Cancelled', 'Void')),
    subtotal DECIMAL(18,2) DEFAULT 0,
    tax_amount DECIMAL(18,2) DEFAULT 0,
    total_amount DECIMAL(18,2) DEFAULT 0,
    paid_amount DECIMAL(18,2) DEFAULT 0,
    balance_due DECIMAL(18,2) DEFAULT 0,
    billing_period_start DATE,
    billing_period_end DATE,
    sent_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    billing_address_street TEXT,
    billing_address_city VARCHAR(100),
    billing_address_state VARCHAR(100),
    billing_address_postal_code VARCHAR(20),
    billing_address_country VARCHAR(100),
    notes TEXT,
    owner_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    contract_line_item_id UUID REFERENCES contract_line_items(id),
    order_item_id UUID REFERENCES order_items(id),
    pool_consumption_id UUID REFERENCES pool_consumptions(id),
    product_id UUID NOT NULL REFERENCES products(id),
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(18,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(18,2) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(18,2) DEFAULT 0,
    billing_period_start DATE,
    billing_period_end DATE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(tenant_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(tenant_id, due_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_tenant_number ON invoices(tenant_id, invoice_number) WHERE is_deleted = false;

-- Indexes for invoice_line_items
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_tenant_id ON invoice_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_product_id ON invoice_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_contract_line_item_id ON invoice_line_items(contract_line_item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_pool_consumption_id ON invoice_line_items(pool_consumption_id);
