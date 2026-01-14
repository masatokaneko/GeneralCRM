---
name: db-schema
description: 物理DB設計、PostgreSQL、テーブル設計、インデックス、パーティション、DDLに関する支援。「データベース」「テーブル」「スキーマ」「SQL」「PostgreSQL」で呼び出される。
---

# 物理DB設計スキル

PostgreSQLの物理スキーマ設計をガイドします。

## いつ使用するか

- テーブル設計・DDL作成時
- インデックス設計時
- パーティション戦略の検討時
- 「データベース」「テーブル」「スキーマ」「SQL」に関する質問時

## 主要参照ファイル

- `SPEC/20_機能設計/25_物理DB設計_v1.md` - **必須**
- `SPEC/20_機能設計/01_ドメインERD_不変条件_v1.md`
- `SPEC/20_機能設計/02_データ辞書_v1.md`

## 設計原則

### マルチテナント
- 全テーブルに `tenant_id uuid NOT NULL`
- 主キー: `PRIMARY KEY (tenant_id, id)`
- 複合FK: `FOREIGN KEY (tenant_id, xxx_id) REFERENCES target (tenant_id, id)`

### ID方式
- ULID/UUID（アプリ生成推奨）
- 18文字のSalesforce形式ID（オプション）

### 論理削除
- `is_deleted boolean NOT NULL DEFAULT false`
- 通常クエリは `WHERE is_deleted = false`

### 楽観ロック
- `system_modstamp timestamptz NOT NULL DEFAULT now()`
- 更新時: `WHERE system_modstamp = :expected`

### 命名規約
- テーブル: スネークケース複数形（`accounts`, `opportunities`）
- FK列: `xxx_id`
- enum: text + CHECK（DB enumは避ける）

## 共通カラムセット

```sql
-- 全テーブルに含める共通カラム
tenant_id uuid NOT NULL,
id uuid NOT NULL,
owner_id uuid NOT NULL,
created_at timestamptz NOT NULL DEFAULT now(),
created_by uuid NOT NULL,
updated_at timestamptz NOT NULL DEFAULT now(),
updated_by uuid NOT NULL,
is_deleted boolean NOT NULL DEFAULT false,
system_modstamp timestamptz NOT NULL DEFAULT now()
```

## 主要テーブルDDL例

### accounts
```sql
CREATE TABLE accounts (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  type text,
  parent_id uuid,
  industry text,
  website text,
  phone text,
  billing_address jsonb,
  shipping_address jsonb,
  annual_revenue numeric(18,2),
  number_of_employees integer,
  status text NOT NULL DEFAULT 'Active',
  external_ids jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  system_modstamp timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, parent_id) REFERENCES accounts (tenant_id, id),
  FOREIGN KEY (tenant_id, owner_id) REFERENCES users (tenant_id, id),
  CHECK (status IN ('Active','Inactive'))
);

CREATE INDEX idx_accounts_tenant_owner ON accounts (tenant_id, owner_id) WHERE is_deleted=false;
CREATE INDEX idx_accounts_tenant_parent ON accounts (tenant_id, parent_id) WHERE is_deleted=false;
CREATE INDEX idx_accounts_name_trgm ON accounts USING gin (name gin_trgm_ops) WHERE is_deleted=false;
```

### opportunities
```sql
CREATE TABLE opportunities (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  account_id uuid NOT NULL,
  stage_name text NOT NULL,
  probability integer,
  amount numeric(18,2),
  close_date date NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  is_won boolean NOT NULL DEFAULT false,
  lost_reason text,
  pricebook_id uuid,
  primary_quote_id uuid,
  forecast_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  system_modstamp timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, account_id) REFERENCES accounts (tenant_id, id),
  FOREIGN KEY (tenant_id, pricebook_id) REFERENCES pricebooks (tenant_id, id),
  CHECK (probability BETWEEN 0 AND 100),
  CHECK (NOT is_won OR is_closed)  -- is_won => is_closed
);
```

### object_shares（共有テーブル）
```sql
CREATE TABLE object_shares (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  object_name text NOT NULL,
  record_id uuid NOT NULL,
  subject_type text NOT NULL,  -- 'User','Role','Group','Territory'
  subject_id uuid NOT NULL,
  access_level text NOT NULL,  -- 'Read','Write'
  row_cause text NOT NULL,     -- 'Owner','Rule','Manual','Team','Territory','RoleHierarchy','Implicit'
  source_rule_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  PRIMARY KEY (tenant_id, id),
  CHECK (access_level IN ('Read','Write')),
  CHECK (subject_type IN ('User','Role','Group','Territory')),
  CHECK (row_cause IN ('Owner','Rule','Manual','Team','Territory','RoleHierarchy','Implicit'))
);

CREATE INDEX idx_share_lookup_record ON object_shares (tenant_id, object_name, record_id) WHERE is_deleted=false;
CREATE INDEX idx_share_lookup_subject ON object_shares (tenant_id, object_name, subject_type, subject_id) WHERE is_deleted=false;
```

## インデックス戦略

### 必須インデックス
```sql
-- 全主要オブジェクト
CREATE INDEX idx_{table}_tenant_owner ON {table} (tenant_id, owner_id) WHERE is_deleted=false;

-- 時系列検索
CREATE INDEX idx_{table}_tenant_created ON {table} (tenant_id, created_at) WHERE is_deleted=false;

-- 増分同期
CREATE INDEX idx_{table}_tenant_modstamp ON {table} (tenant_id, system_modstamp) WHERE is_deleted=false;
```

### 検索用
```sql
-- pg_trgm 拡張: 部分一致検索
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_{table}_name_trgm ON {table} USING gin (name gin_trgm_ops) WHERE is_deleted=false;

-- 全文検索（オプション）
CREATE INDEX idx_{table}_fts ON {table} USING gin (to_tsvector('simple', name || ' ' || coalesce(description, '')));
```

## パーティション戦略

### 必須パーティションテーブル

| テーブル | パーティション方式 | 理由 |
|---------|-----------------|------|
| object_shares | LIST(object_name) | オブジェクト毎のアクセスパターン |
| automation_run_logs | RANGE(created_at) 月次 | 時系列データ |
| field_histories | RANGE(changed_at) 月次 | 履歴データ |
| audit_events | RANGE(occurred_at) 月次 | 監査ログ |
| outbox_events | RANGE(created_at) 月次 | イベント配信ログ |

### パーティション例
```sql
CREATE TABLE audit_events (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  -- ...
  PRIMARY KEY (tenant_id, id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE audit_events_2026_01 PARTITION OF audit_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

## DBで守る制約 vs アプリで守る制約

| 制約種別 | 実装場所 | 例 |
|---------|---------|-----|
| テナント境界のPK/FK | DB | `(tenant_id, id)` |
| NOT NULL | DB | account_id, tenant_id |
| 一意制約 | DB | (tenant_id, pricebook_id, product_id) |
| 基本CHECK | DB | probability BETWEEN 0 AND 100 |
| 参照整合（単純FK） | DB | account_id REFERENCES accounts |
| 循環禁止 | アプリ | Role/Account/Territory階層 |
| 価格表整合 | アプリ | Opp.pricebook = LineItem.pricebook |
| 条件付き必須 | アプリ | ClosedLost => LostReason必須 |
| ステージ遷移 | アプリ | 許可された遷移のみ |

## 追加テーブルセクション（物理DB設計）

| セクション | 内容 |
|-----------|------|
| 6.2-6.3 | owd_settings, sharing_rules（共有設定） |
| 8.1-8.5 | validation_rules, workflow_rules, workflow_actions, scheduled_jobs, automation_run_logs |
| 9.1-9.4 | approval_process_definitions, approval_instances, approval_work_items, approval_histories |
| 21 | bulk_jobs, bulk_job_batches（Bulk API） |
| 22 | event_subscriptions, outbox_events（イベント・Webhook） |
| 23 | report_folders, report_definitions, dashboard_definitions |

## 実装チェックリスト

- [ ] 全テーブルに `tenant_id` カラム
- [ ] 主キーが `(tenant_id, id)`
- [ ] 外部キーが `(tenant_id, xxx_id)`
- [ ] 共通カラムセットを含む
- [ ] 論理削除フラグ `is_deleted`
- [ ] 楽観ロック `system_modstamp`
- [ ] 必須インデックス作成
- [ ] パーティション対象テーブルの設計
