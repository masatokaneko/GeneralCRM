-- Order/OrderItem Migration
-- Based on SPEC/20_機能設計/02_データ辞書_v1.md

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    owner_id UUID REFERENCES users(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    opportunity_id UUID REFERENCES opportunities(id),
    quote_id UUID REFERENCES quotes(id),
    contract_id UUID,  -- Will reference contracts table after creation
    order_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    order_type VARCHAR(50) DEFAULT 'New' CHECK (order_type IN ('New', 'Renewal', 'Upsell', 'Amendment')),
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Activated', 'Fulfilled', 'Cancelled')),
    order_date DATE,
    effective_date DATE,
    total_amount DECIMAL(18, 2) DEFAULT 0,
    billing_street TEXT,
    billing_city VARCHAR(100),
    billing_state VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(100),
    shipping_street TEXT,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_orders_account ON orders(tenant_id, account_id) WHERE is_deleted = false;
CREATE INDEX idx_orders_opportunity ON orders(tenant_id, opportunity_id) WHERE is_deleted = false;
CREATE INDEX idx_orders_status ON orders(tenant_id, status) WHERE is_deleted = false;
CREATE INDEX idx_orders_order_number ON orders(tenant_id, order_number) WHERE is_deleted = false;

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    pricebook_entry_id UUID REFERENCES pricebook_entries(id),
    quote_line_item_id UUID REFERENCES quote_line_items(id),
    quantity DECIMAL(18, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(18, 2) NOT NULL DEFAULT 0,
    customer_unit_price DECIMAL(18, 2),
    discount DECIMAL(18, 2) DEFAULT 0,
    term_months INTEGER,
    billing_frequency VARCHAR(50) CHECK (billing_frequency IN ('Monthly', 'Yearly', 'ThreeYear')),
    start_date DATE,
    end_date DATE,
    total_price DECIMAL(18, 2),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_order_items_tenant ON order_items(tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_order_items_order ON order_items(tenant_id, order_id) WHERE is_deleted = false;
CREATE INDEX idx_order_items_product ON order_items(tenant_id, product_id) WHERE is_deleted = false;

-- Add foreign key for contract_id after contracts table is created
-- ALTER TABLE orders ADD CONSTRAINT fk_orders_contract FOREIGN KEY (contract_id) REFERENCES contracts(id);
