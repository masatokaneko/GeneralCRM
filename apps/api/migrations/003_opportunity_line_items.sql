-- Opportunity Line Items table
CREATE TABLE IF NOT EXISTS opportunity_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id),
    pricebook_entry_id UUID NOT NULL REFERENCES pricebook_entries(id),
    product_id UUID NOT NULL REFERENCES products(id),
    quantity DECIMAL(18,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount DECIMAL(18,2) DEFAULT 0,
    total_price DECIMAL(18,2) GENERATED ALWAYS AS (quantity * unit_price - discount) STORED,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    system_modstamp UUID DEFAULT uuid_generate_v4()
);

CREATE INDEX idx_opportunity_line_items_opportunity ON opportunity_line_items(tenant_id, opportunity_id) WHERE is_deleted = false;
CREATE INDEX idx_opportunity_line_items_product ON opportunity_line_items(tenant_id, product_id) WHERE is_deleted = false;
