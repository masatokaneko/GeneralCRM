# CRM開発進捗管理

> 最終更新: 2026-01-14

---

## 全体サマリー

| フェーズ | 説明 | 進捗 | ステータス |
|---------|------|:----:|:----------:|
| Phase 1 | MVP Core CRUD | 100% | 完了 |
| Phase 1.5 | MVP補完 | 100% | 完了 |
| Phase 2 | 権限・共有機能 | 100% | 完了 |
| Phase 3 | 自動化・テリトリー | 100% | 完了 |
| Phase 4 | レポート・ダッシュボード | 100% | 完了 |

### SPEC整合性評価

| 領域 | 整合度 | コメント |
|------|:------:|----------|
| コアCRM | 95% | Account/Contact/Lead/Opp 完全 |
| CPQ | 90% | Product/Quote/Order 動作 |
| 契約/請求 | 85% | Contract/Invoice 基本OK |
| 権限/共有 | 70% | APIロジック実装済み、UI限定的 |
| 自動化 | 60% | 定義保存可、実行エンジン要確認 |
| 予測/テリトリ | 20% | 基本構造のみ |
| 監査/履歴 | 80% | FieldHistory実装完了、全主要エンティティ対応 |

**Phase 1（MVP）達成度: 約90%**

---

## 現在の技術的状態

### TypeScriptエラー

| パッケージ | エラー数 | 前回 | 傾向 |
|-----------|:-------:|:----:|:----:|
| @monorepo/web | 0 | 80+ | 改善 |
| @crm/api | 0 | 182 | 改善 |

### ビルド状態

- Web: 正常
- API: 正常
- Docs: 正常

---

## Phase 1: MVP Core CRUD

### 実装済みエンティティ

| エンティティ | API | UI (一覧) | UI (詳細) | UI (作成/編集) | MSW Mock |
|-------------|:---:|:--------:|:--------:|:-------------:|:--------:|
| Tenant | ✅ | - | - | - | ✅ |
| User | ✅ | - | - | - | ✅ |
| Account | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contact | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lead | ✅ | ✅ | ✅ | ✅ | ✅ |
| Opportunity | ✅ | ✅ | ✅ | ✅ | ✅ |
| OpportunityLineItem | ✅ | ✅ | - | ✅ | ✅ |
| Quote | ✅ | ✅ | ✅ | ✅ | ✅ |
| QuoteLineItem | ✅ | ✅ | - | ✅ | - |
| Order | ✅ | ✅ | ✅ | ✅ | - |
| OrderItem | ✅ | ✅ | - | ✅ | - |
| Contract | ✅ | ✅ | ✅ | ✅ | - |
| ContractLineItem | ✅ | ✅ | - | ✅ | - |
| Invoice | ✅ | ✅ | ✅ | ✅ | - |
| InvoiceLineItem | ✅ | ✅ | - | ✅ | - |
| Product | ✅ | ✅ | ✅ | ✅ | - |
| Pricebook | ✅ | ✅ | ✅ | ✅ | - |
| PricebookEntry | ✅ | ✅ | - | ✅ | - |
| Task | ✅ | ✅ | ✅ | ✅ | - |
| Event | ✅ | ✅ | ✅ | ✅ | - |
| Campaign | ✅ | ✅ | ✅ | ✅ | ✅ |

**ステータス**: 完了

---

## Phase 1.5: MVP補完

### OpportunityContactRole

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 010_opportunity_contact_roles.sql |
| API Repository | ✅ | opportunityContactRoleRepository.ts |
| API Routes | ✅ | opportunityContactRoles.ts |
| Web API Hooks | ✅ | lib/api/opportunityContactRoles.ts |
| MSW Handler | ✅ | handlers/opportunityContactRoles.ts |
| Mock Types | ✅ | mocks/types.ts |
| 関連リスト（Opportunity詳細） | ✅ | opportunities/[id]/page.tsx 行604-658 |

### 型エラー修正

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| Web パッケージ | ✅ | 0エラー |
| API パッケージ | ✅ | 0エラー (182→0) |

**ステータス**: 完了

---

## Phase 2: 権限・共有機能

### Role階層

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 011_roles.sql |
| Repository | ✅ | roleRepository.ts |
| API Routes | ✅ | roles.ts |
| Web API Hooks | ✅ | lib/api/roles.ts |
| 設定UI | ✅ | settings/roles/page.tsx（階層ツリーUI） |

### PermissionProfile

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 012_permission_profiles.sql |
| Repository | ✅ | permissionProfileRepository.ts |
| API Routes | ✅ | permissionProfiles.ts |
| Web API Hooks | ✅ | lib/api/permissionProfiles.ts |
| 設定UI | ✅ | settings/profiles/page.tsx |

### PermissionSet

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 013_permission_sets.sql |
| Repository | ✅ | permissionSetRepository.ts |
| API Routes | ✅ | permissionSets.ts |
| Web API Hooks | ✅ | lib/api/permissionSets.ts |
| 設定UI | ✅ | settings/permission-sets/page.tsx |

### OWD (Organization-Wide Default)

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 014_org_wide_defaults.sql |
| Repository | ✅ | orgWideDefaultRepository.ts |
| API Routes | ✅ | orgWideDefaults.ts |
| Web API Hooks | ✅ | lib/api/orgWideDefaults.ts |
| 設定UI | ✅ | settings/sharing/page.tsx |

### SharingRule

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 015_sharing_rules.sql |
| Repository | ✅ | sharingRuleRepository.ts |
| API Routes | ✅ | sharingRules.ts |
| Web API Hooks | ✅ | lib/api/sharingRules.ts |
| 設定UI | ✅ | settings/sharing/page.tsx |

### PublicGroup

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 015_sharing_rules.sql (public_groups テーブル含む) |
| Repository | ✅ | sharingRuleRepository.ts (PublicGroup メソッド含む) |
| API Routes | ✅ | sharingRules.ts (268-497行: /public-groups エンドポイント) |
| Web API Hooks | ✅ | lib/api/publicGroups.ts |
| 設定UI | ✅ | settings/public-groups/page.tsx |

### ObjectShare群

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 016_object_shares.sql |
| Repository | ✅ | sharingService.ts にシェア操作含む |

### 権限評価サービス

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| permissionService.ts | ✅ | 完全実装 (687行) - Object/Field/Record レベル権限評価 |
| sharingService.ts | ✅ | 完全実装 (782行) - 共有ルール/手動シェア計算 |
| permissionMiddleware.ts | ✅ | 完全実装 (410行) - list/get/create/update/delete |

### 権限ミドルウェア適用

| 対象ルート | ステータス | 備考 |
|-----------|:--------:|------|
| accounts.ts | ✅ | list, get, create, update, delete |
| contacts.ts | ✅ | list, get, create, update, delete |
| leads.ts | ✅ | list, get, create, update, delete, convert |
| opportunities.ts | ✅ | list, get, create, update, delete, stage, close |
| quotes.ts | ✅ | list, get, create, update, delete, set-primary, status |
| orders.ts | ✅ | list, get, create, update, delete, activate, fulfill, cancel, items |
| contracts.ts | ✅ | list, get, create, update, delete, アクション群, line-items |
| invoices.ts | ✅ | list, get, create, update, delete, アクション群, line-items |
| tasks.ts | ✅ | list, get, create, update, delete, complete |
| events.ts | ✅ | list, get, create, update, delete |

**Phase 2 ステータス**: 完了

---

## Phase 3: 自動化・テリトリー機能

### ワークフロールール

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 017_workflow_rules.sql |
| Repository | ✅ | workflowRuleRepository.ts |
| API Routes | ✅ | workflowRules.ts (8エンドポイント) |
| Mock Types | ✅ | mocks/types.ts |
| MSW Handler | ✅ | handlers/workflows.ts |
| Web API Hooks | ✅ | lib/api/workflows.ts |
| 一覧UI | ✅ | settings/workflows/page.tsx |
| 新規作成UI | ✅ | settings/workflows/new/page.tsx |
| 編集UI | ✅ | settings/workflows/[id]/page.tsx |
| ConditionBuilder | ✅ | organisms/ConditionBuilder.tsx |
| ActionEditor | ✅ | organisms/WorkflowActionEditor.tsx |

### 承認プロセス

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 018_approval_processes.sql |
| Repository | ✅ | approvalProcessRepository.ts |
| API Routes | ✅ | approvalProcesses.ts (9エンドポイント) |
| Mock Types | ✅ | mocks/types.ts |
| MSW Handler | ✅ | handlers/approvalProcesses.ts |
| Web API Hooks | ✅ | lib/api/approvalProcesses.ts |
| 一覧UI | ✅ | settings/approvals/page.tsx |
| 新規作成UI | ✅ | settings/approvals/new/page.tsx |
| 編集UI | ✅ | settings/approvals/[id]/page.tsx |
| StepEditor | ✅ | organisms/ApprovalStepEditor.tsx |
| ActionEditor | ✅ | organisms/ApprovalActionEditor.tsx |

### テリトリー管理

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 019_territories.sql (4テーブル) |
| Repository | ✅ | territoryRepository.ts |
| API Routes | ✅ | territories.ts (16エンドポイント) |
| Mock Types | ✅ | mocks/types.ts |
| MSW Handler | ✅ | handlers/territories.ts |
| Web API Hooks | ✅ | lib/api/territories.ts |
| 一覧UI（ツリー） | ✅ | settings/territories/page.tsx |
| 新規作成UI | ✅ | settings/territories/new/page.tsx |
| 詳細UI | ✅ | settings/territories/[id]/page.tsx |
| TerritoryTree | ✅ | organisms/TerritoryTree.tsx |

### Settings ページ

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| Automationセクション追加 | ✅ | - |
| Territoryセクション追加 | ✅ | - |

**Phase 3 ステータス**: 完了

**将来の拡張**:
- 自動化エンジン実行ロジック（ワークフロー/承認プロセスのトリガー実行）

---

## Phase 4: レポート・ダッシュボード機能

### レコードレベルフィルタリング

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| accessibleIdsService.ts | ✅ | OWD/ロール階層/共有ルールに基づくSQLフィルタ生成 |
| baseRepository accessFilter | ✅ | list()メソッドでフィルタ適用 |
| permissionMiddleware.list() | ✅ | 全10エンティティでフィルタ適用 |
| カスタムRepository対応 | ✅ | tasks/events/invoices に個別対応 |

### Query Engine

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| DB Migration | ✅ | 020_reports.sql |
| queryEngineService.ts | ✅ | 権限フィルタ付きクエリ実行、集計対応 |
| Query API Routes | ✅ | /query/execute, /query/objects |

### Report Engine

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| reportRepository.ts | ✅ | レポート定義・実行履歴CRUD |
| Report API Routes | ✅ | /reports CRUD, /reports/:id/run |

### Dashboard API

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| KPIs API | ✅ | 権限フィルタ適用済み |
| Pipeline API | ✅ | ステージ別集計 |
| Activities API | ✅ | 最新更新レコード |
| Closing Soon API | ✅ | 期限間近案件 |

### フロントエンド

| 項目 | ステータス | 備考 |
|-----|:--------:|------|
| recharts導入 | ✅ | - |
| BarChart.tsx | ✅ | 棒グラフコンポーネント |
| PieChart.tsx | ✅ | 円グラフコンポーネント |
| LineChart.tsx | ✅ | 折れ線グラフコンポーネント |
| Report API Hooks | ✅ | lib/api/reports.ts, query.ts, dashboard.ts |
| Report Builder チャート統合 | ✅ | recharts統合済み |

**Phase 4 ステータス**: 完了

---

## 既知の問題・ブロッカー

### 緊急度: 高

なし

### 緊急度: 中

| 問題 | 影響範囲 | 対応状況 |
|-----|---------|---------|
| Quote型にopportunityName未定義 | Quote詳細表示 | 回避策適用済み（opportunityId表示） |
| Dashboard 一部ハードコードデータ | Recent Activity, Upcoming Tasks | 将来的にAPI統合検討 |

### 緊急度: 低

| 問題 | 影響範囲 | 対応状況 |
|-----|---------|---------|
| 一部MSW Handlerの未実装 | 開発時モック | 必要に応じて対応 |
| Reports一覧ページ | モックデータ表示 | API hooks統合で解消可能 |

---

## 統合環境

### 現在の構成

```
[ブラウザ] → [Next.js :3005] → [Express API :3002] → [PostgreSQL :5433]
```

**MSW Mock**: 無効化済み（`NEXT_PUBLIC_MSW_ENABLED=false`）

---

## 次のステップ（推奨順）

### 高優先度（Phase 1 MVP完成に必要）

1. ~~**Campaign API実装**~~ - ✅ 完了（2026-01-14）
2. ~~**ValidationRule実装**~~ - ✅ 完了（2026-01-14）
3. ~~**FieldHistory実装**~~ - ✅ 完了（2026-01-14）
4. ~~**User管理API実装**~~ - ✅ 完了（2026-01-14）

### 中優先度（Phase 2 拡張）

5. **Forecast/Quota機能** - 売上予測・目標管理
6. **Territory高度機能** - TerritoryModel/TerritoryRule
7. **自動化エンジン実装** - ワークフロー/承認プロセスの実行エンジン
8. **イベント駆動処理** - Outboxパターン実装

### 低優先度（Phase 3）

9. **GraphQL API** - REST APIで代替可
10. **AI/Einstein機能** - Phase 3スコープ

---

## 更新履歴

| 日付 | 更新内容 |
|-----|---------|
| 2026-01-14 | Phase 1 高優先度タスク完了: Campaign API, ValidationRule, FieldHistory, User管理API全て実装完了。Field History追跡を全主要エンティティ（Account, Contact, Lead, Opportunity, Quote, Order, Contract, Campaign, Product, Pricebook, Task, Event）に統合 |
| 2026-01-14 | SPEC整合性分析実施: 全体整合度約75%。Campaign/ValidationRule/FieldHistory/User管理が未実装と特定 |
| 2026-01-13 | 統合テスト完了: CRUD/権限評価/データ永続化テスト実施。リストフィルタリング未実装の問題を発見・記録 |
| 2026-01-13 | DB統合完了: MSW Mock → PostgreSQL移行。permissionService.tsのis_deleted→is_active修正 |
| 2026-01-13 | Phase 3 バックエンドAPI完了: ワークフロー/承認プロセス/テリトリーのDB/Repository/Routes実装 |
| 2026-01-13 | Phase 2 完了: 全10エンティティルートに権限ミドルウェア適用完了 |
| 2026-01-13 | 大幅更新: Phase 1.5完了、Phase 2 の95%完了を確認。バックエンド実装済みファイルを正確に反映 |
| 2026-01-13 | OpportunityContactRole関連リストUIが既に実装済みであることを確認。Quote MSW Handler追加済みを反映。進捗更新 |
| 2026-01-13 | APIパッケージの型エラー修正完了（182→0）。バックエンドビルド正常化 |
| 2026-01-13 | 初版作成。Webパッケージの型エラー修正完了（80+→0） |
