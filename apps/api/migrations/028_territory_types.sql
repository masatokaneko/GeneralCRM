-- Migration: 028_territory_types
-- Description: TerritoryType - Territory classification (Region, Industry, Product, etc.)

CREATE TABLE territory_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  system_modstamp UUID NOT NULL DEFAULT uuid_generate_v4(),
  CONSTRAINT uq_territory_type_name UNIQUE (tenant_id, name)
);

-- Index for tenant and priority queries
CREATE INDEX idx_territory_types_tenant ON territory_types (tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_territory_types_priority ON territory_types (tenant_id, priority) WHERE is_deleted = false;
