-- Migration: 029_territory_closure
-- Description: Fix territory_models and territory_types PKs, add Closure Table

-- Drop and recreate territory_models with single-column PK
DROP TABLE IF EXISTS territory_models CASCADE;
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

CREATE INDEX idx_territory_models_tenant ON territory_models (tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_territory_models_state ON territory_models (tenant_id, state) WHERE is_deleted = false;
CREATE UNIQUE INDEX idx_territory_models_active_unique
  ON territory_models (tenant_id)
  WHERE state = 'Active' AND is_deleted = false;

-- Drop and recreate territory_types with single-column PK
DROP TABLE IF EXISTS territory_types CASCADE;
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

CREATE INDEX idx_territory_types_tenant ON territory_types (tenant_id) WHERE is_deleted = false;
CREATE INDEX idx_territory_types_priority ON territory_types (tenant_id, priority) WHERE is_deleted = false;

-- Extend territories table with model_id and territory_type_id
ALTER TABLE territories
  ADD COLUMN IF NOT EXISTS model_id UUID,
  ADD COLUMN IF NOT EXISTS territory_type_id UUID;

-- Add foreign key constraints (referencing single-column primary keys)
ALTER TABLE territories
  ADD CONSTRAINT fk_territories_model
    FOREIGN KEY (model_id) REFERENCES territory_models (id),
  ADD CONSTRAINT fk_territories_type
    FOREIGN KEY (territory_type_id) REFERENCES territory_types (id);

-- Index for model and type queries
CREATE INDEX IF NOT EXISTS idx_territories_model ON territories (tenant_id, model_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_territories_type ON territories (tenant_id, territory_type_id) WHERE is_deleted = false;

-- Closure Table: Pre-computed hierarchy relationships
CREATE TABLE territory_closure (
  tenant_id UUID NOT NULL,
  ancestor_id UUID NOT NULL,
  descendant_id UUID NOT NULL,
  depth INT NOT NULL,
  PRIMARY KEY (tenant_id, ancestor_id, descendant_id),
  FOREIGN KEY (ancestor_id) REFERENCES territories (id),
  FOREIGN KEY (descendant_id) REFERENCES territories (id)
);

CREATE INDEX idx_territory_closure_descendant ON territory_closure (tenant_id, descendant_id);
CREATE INDEX idx_territory_closure_depth ON territory_closure (tenant_id, depth);

-- Initialize self-reference entries (depth=0) for existing territories
INSERT INTO territory_closure (tenant_id, ancestor_id, descendant_id, depth)
SELECT tenant_id, id, id, 0 FROM territories WHERE is_deleted = false
ON CONFLICT DO NOTHING;

-- Initialize parent-child relationships (depth=1) for existing territories
INSERT INTO territory_closure (tenant_id, ancestor_id, descendant_id, depth)
SELECT tenant_id, parent_territory_id, id, 1 FROM territories WHERE parent_territory_id IS NOT NULL AND is_deleted = false
ON CONFLICT DO NOTHING;
