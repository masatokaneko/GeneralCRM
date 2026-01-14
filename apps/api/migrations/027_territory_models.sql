-- Migration: 027_territory_models
-- Description: TerritoryModel - Territory planning version management
-- INV-TERR2: Only one Active model per tenant at a time

CREATE TABLE territory_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL DEFAULT 'Planning' CHECK (state IN ('Planning', 'Active', 'Archived')),
  activated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  system_modstamp UUID NOT NULL DEFAULT uuid_generate_v4(),
  CONSTRAINT uq_territory_model_name UNIQUE (tenant_id, name)
);

-- Index for state-based queries
CREATE INDEX idx_territory_models_tenant ON territory_models (tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_territory_models_state ON territory_models (tenant_id, state) WHERE is_deleted = false;

-- Partial unique index to enforce INV-TERR2: only one Active per tenant
CREATE UNIQUE INDEX idx_territory_models_active_unique
  ON territory_models (tenant_id)
  WHERE state = 'Active' AND is_deleted = false;
