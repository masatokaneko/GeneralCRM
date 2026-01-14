-- =============================================
-- Forecast & Quota Management Tables
-- =============================================

-- 1. forecast_periods: 予測期間（月次/四半期/年次）
CREATE TABLE forecast_periods (
  tenant_id UUID NOT NULL,
  id UUID NOT NULL,
  name TEXT NOT NULL,
  period_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fiscal_year INT NOT NULL,
  fiscal_quarter INT,
  fiscal_month INT,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  system_modstamp UUID NOT NULL,

  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, name),
  CHECK (period_type IN ('Monthly', 'Quarterly', 'Yearly')),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_forecast_periods_dates ON forecast_periods (tenant_id, start_date, end_date) WHERE is_deleted = false;
CREATE INDEX idx_forecast_periods_fiscal ON forecast_periods (tenant_id, fiscal_year, fiscal_quarter) WHERE is_deleted = false;

COMMENT ON TABLE forecast_periods IS '予測期間マスタ';
COMMENT ON COLUMN forecast_periods.period_type IS 'Monthly: 月次, Quarterly: 四半期, Yearly: 年次';
COMMENT ON COLUMN forecast_periods.is_closed IS 'true: 期間クローズ済み（編集不可）';


-- 2. forecasts: 予測本体（ユーザ×期間×カテゴリ）
CREATE TABLE forecasts (
  tenant_id UUID NOT NULL,
  id UUID NOT NULL,
  owner_id UUID NOT NULL,
  period_id UUID NOT NULL,
  forecast_category TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(18,6),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  system_modstamp UUID NOT NULL,

  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, period_id) REFERENCES forecast_periods (tenant_id, id),
  UNIQUE (tenant_id, owner_id, period_id, forecast_category),
  CHECK (forecast_category IN ('Pipeline', 'BestCase', 'Commit', 'Closed'))
);

CREATE INDEX idx_forecasts_owner_period ON forecasts (tenant_id, owner_id, period_id) WHERE is_deleted = false;
CREATE INDEX idx_forecasts_period ON forecasts (tenant_id, period_id) WHERE is_deleted = false;
CREATE INDEX idx_forecasts_category ON forecasts (tenant_id, forecast_category) WHERE is_deleted = false;

COMMENT ON TABLE forecasts IS '売上予測';
COMMENT ON COLUMN forecasts.forecast_category IS 'Pipeline: 0-30%, BestCase: 31-70%, Commit: 71-99%, Closed: 100%';
COMMENT ON COLUMN forecasts.amount IS '予測金額';


-- 3. forecast_items: 予測明細（商談スナップショット）
CREATE TABLE forecast_items (
  tenant_id UUID NOT NULL,
  id UUID NOT NULL,
  forecast_id UUID NOT NULL,
  opportunity_id UUID NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  probability INT NOT NULL,
  close_date DATE NOT NULL,
  stage_name TEXT NOT NULL,
  forecast_category TEXT NOT NULL,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  system_modstamp UUID NOT NULL,

  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, forecast_id) REFERENCES forecasts (tenant_id, id),
  UNIQUE (tenant_id, forecast_id, opportunity_id)
);

CREATE INDEX idx_forecast_items_forecast ON forecast_items (tenant_id, forecast_id) WHERE is_deleted = false;
CREATE INDEX idx_forecast_items_opportunity ON forecast_items (tenant_id, opportunity_id) WHERE is_deleted = false;

COMMENT ON TABLE forecast_items IS '予測明細（商談スナップショット）';
COMMENT ON COLUMN forecast_items.snapshot_date IS 'スナップショット取得日時';


-- 4. forecast_adjustments: 予測調整
CREATE TABLE forecast_adjustments (
  tenant_id UUID NOT NULL,
  id UUID NOT NULL,
  forecast_id UUID NOT NULL,
  adjusted_by UUID NOT NULL,
  adjustment_type TEXT NOT NULL,
  original_amount NUMERIC(18,2) NOT NULL,
  adjusted_amount NUMERIC(18,2) NOT NULL,
  adjustment_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  system_modstamp UUID NOT NULL,

  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, forecast_id) REFERENCES forecasts (tenant_id, id),
  CHECK (adjustment_type IN ('OwnerAdjustment', 'ManagerAdjustment'))
);

CREATE INDEX idx_forecast_adjustments_forecast ON forecast_adjustments (tenant_id, forecast_id) WHERE is_deleted = false;

COMMENT ON TABLE forecast_adjustments IS '予測調整履歴';
COMMENT ON COLUMN forecast_adjustments.adjustment_type IS 'OwnerAdjustment: 所有者調整, ManagerAdjustment: マネージャー調整';


-- 5. quotas: 売上目標
CREATE TABLE quotas (
  tenant_id UUID NOT NULL,
  id UUID NOT NULL,
  owner_id UUID NOT NULL,
  period_id UUID NOT NULL,
  quota_amount NUMERIC(18,2) NOT NULL,
  currency_iso_code TEXT DEFAULT 'JPY',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  system_modstamp UUID NOT NULL,

  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, period_id) REFERENCES forecast_periods (tenant_id, id),
  UNIQUE (tenant_id, owner_id, period_id)
);

CREATE INDEX idx_quotas_owner ON quotas (tenant_id, owner_id) WHERE is_deleted = false;
CREATE INDEX idx_quotas_period ON quotas (tenant_id, period_id) WHERE is_deleted = false;

COMMENT ON TABLE quotas IS '売上目標';
COMMENT ON COLUMN quotas.quota_amount IS '目標金額';


-- =============================================
-- Seed Data: Sample Forecast Period
-- =============================================

INSERT INTO forecast_periods (
  tenant_id, id, name, period_type, start_date, end_date,
  fiscal_year, fiscal_quarter, fiscal_month,
  is_closed, created_by, updated_by, system_modstamp
) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a0000001-0000-0000-0000-000000000001', '2026-Q1', 'Quarterly', '2026-01-01', '2026-03-31', 2026, 1, NULL, false, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'a0000001-0000-0000-0000-000000000001'),
  ('11111111-1111-1111-1111-111111111111', 'a0000001-0000-0000-0000-000000000002', '2026-Q2', 'Quarterly', '2026-04-01', '2026-06-30', 2026, 2, NULL, false, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'a0000001-0000-0000-0000-000000000002'),
  ('11111111-1111-1111-1111-111111111111', 'a0000001-0000-0000-0000-000000000003', '2026-01', 'Monthly', '2026-01-01', '2026-01-31', 2026, NULL, 1, false, '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'a0000001-0000-0000-0000-000000000003');
