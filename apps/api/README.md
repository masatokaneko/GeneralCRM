# GeneralCRM API

Salesforce Sales Cloud同等の機能を持つエンタープライズCRMシステムのREST APIバックエンド。

## 機能概要

### コアCRM機能
- **Account（取引先）** - 企業情報管理、階層構造対応
- **Contact（担当者）** - 取引先に紐づく担当者管理
- **Lead（リード）** - 見込み客管理、Account/Contact/Opportunityへの変換機能
- **Opportunity（商談）** - 案件管理、ステージ遷移、確度管理
- **Quote（見積）** - 見積書管理、Primary設定
- **Order（発注）** - 受注管理、Activate/Fulfill/Cancelフロー
- **Contract（契約）** - 契約管理、終了日自動計算
- **Invoice（請求書）** - 請求管理

### 商品・価格管理（CPQ）
- **Product（商品）** - 商品マスタ
- **Pricebook（価格表）** - 価格表管理、標準価格表対応
- **PricebookEntry** - 商品×価格表の価格設定
- **LineItem** - 各ドキュメントの明細行管理

### 活動管理
- **Task（タスク）** - ToDo管理、完了追跡
- **Event（予定）** - カレンダー予定管理
- **多態参照（WhoId/WhatId）** - Lead/Contactへの「誰と」、Account/Opportunity/Quoteへの「何に関連」

### マーケティング
- **Campaign（キャンペーン）** - マーケティング施策管理
- **CampaignMember** - キャンペーン参加者管理（Lead/Contact）

### 権限・共有機能
- **Role（ロール）** - 階層構造のロール管理
- **PermissionProfile（権限プロファイル）** - オブジェクト/フィールドレベル権限
- **PermissionSet（権限セット）** - 追加権限の割当
- **OrgWideDefault（組織の共有設定）** - デフォルトアクセスレベル
- **SharingRule（共有ルール）** - 条件ベース/オーナーベースの共有
- **PublicGroup（公開グループ）** - グループベースの共有

### 自動化機能
- **WorkflowRule（ワークフロー）** - 条件トリガーの自動処理
- **ApprovalProcess（承認プロセス）** - 多段階承認フロー
- **ValidationRule（入力規則）** - データ検証ルール

### テリトリー管理
- **Territory** - 販売テリトリーの階層管理
- **TerritoryAssignment** - ユーザー/取引先の割当

### レポート・ダッシュボード
- **Query Engine** - 動的SQLクエリ生成
- **Report** - レポート定義・実行
- **Dashboard** - KPI、パイプライン集計

### 監査・履歴
- **FieldHistory** - フィールド変更履歴の追跡
- **User** - ユーザー管理

---

## 技術スタック

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 16+
- **ORM**: Raw SQL with pg library

---

## セットアップ

### 前提条件

- Node.js 20以上
- PostgreSQL 16以上（またはDocker）

### 1. 依存関係のインストール

```bash
npm install
```

### 2. PostgreSQLの起動

Docker Composeを使用:

```bash
docker-compose up -d
```

または既存のPostgreSQLインスタンスに接続。

### 3. 環境設定

```bash
cp .env.example .env
# .envファイルを編集してデータベース接続情報を設定
```

### 4. マイグレーション実行

```bash
npm run db:migrate
```

### 5. シードデータ投入（開発用）

```bash
npm run db:seed
```

### 6. サーバー起動

開発モード（ホットリロード付き）:

```bash
npm run dev
```

本番モード:

```bash
npm run build
npm start
```

---

## APIエンドポイント

Base URL: `http://localhost:3002/api/v1`

### 認証

すべてのAPIリクエストには認証ヘッダーが必要:

```
Authorization: Bearer {tenantId}:{userId}:{email}:{roles}
```

### ヘルスチェック

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/health` | サーバー状態確認 |

### コアエンティティ CRUD

各エンティティは以下の標準エンドポイントを提供:

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/{entity}` | 一覧取得（ページネーション対応） |
| GET | `/{entity}/:id` | 単一レコード取得 |
| POST | `/{entity}` | 新規作成 |
| PATCH | `/{entity}/:id` | 更新 |
| DELETE | `/{entity}/:id` | 削除（論理削除） |

#### 対応エンティティ

- `/accounts` - 取引先
- `/contacts` - 担当者
- `/leads` - リード
- `/opportunities` - 商談
- `/quotes` - 見積
- `/orders` - 発注
- `/contracts` - 契約
- `/invoices` - 請求書
- `/products` - 商品
- `/pricebooks` - 価格表
- `/pricebook-entries` - 価格表エントリ
- `/tasks` - タスク
- `/events` - 予定
- `/campaigns` - キャンペーン
- `/users` - ユーザー

### 特殊アクション

#### Lead

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/leads/:id/convert` | Account + Contact + Opportunityへ変換 |

#### Opportunity

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/opportunities/:id/stage` | ステージ変更 |
| POST | `/opportunities/:id/close` | クローズ（Won/Lost） |
| GET | `/opportunities/:id/contact-roles` | 担当者ロール一覧 |
| POST | `/opportunities/:id/contact-roles` | 担当者ロール追加 |

#### Quote

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/quotes/:id/set-primary` | Primary見積に設定 |
| POST | `/quotes/:id/status` | ステータス変更 |

#### Order

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/orders/:id/activate` | 有効化 |
| POST | `/orders/:id/fulfill` | 履行完了 |
| POST | `/orders/:id/cancel` | キャンセル |

#### Campaign

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/campaigns/:id/members` | メンバー一覧 |
| POST | `/campaigns/:id/members` | メンバー追加 |
| PATCH | `/campaigns/:id/members/:memberId` | メンバー更新 |
| DELETE | `/campaigns/:id/members/:memberId` | メンバー削除 |

### 権限・共有設定

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET/POST | `/roles` | ロール管理 |
| GET/POST | `/permission-profiles` | 権限プロファイル |
| GET/POST | `/permission-sets` | 権限セット |
| GET/POST | `/org-wide-defaults` | 組織の共有設定 |
| GET/POST | `/sharing-rules` | 共有ルール |
| GET/POST | `/sharing-rules/public-groups` | 公開グループ |

### 自動化

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET/POST | `/workflow-rules` | ワークフロールール |
| GET/POST | `/approval-processes` | 承認プロセス |
| GET/POST | `/validation-rules` | 入力規則 |
| POST | `/approvals/submit` | 承認申請 |
| POST | `/approvals/work-items/:id/decide` | 承認決定 |

### テリトリー

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET/POST | `/territories` | テリトリー管理 |
| GET | `/territories/tree` | 階層ツリー取得 |

### レポート・分析

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET/POST | `/reports` | レポート定義 |
| POST | `/reports/:id/run` | レポート実行 |
| POST | `/query/execute` | 動的クエリ実行 |
| GET | `/query/objects` | クエリ可能オブジェクト一覧 |

### ダッシュボード

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/dashboard/kpis` | KPI集計 |
| GET | `/dashboard/pipeline` | パイプライン分析 |
| GET | `/dashboard/activities` | 最近の活動 |
| GET | `/dashboard/closing-soon` | 期限間近案件 |

### 監査・履歴

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/field-history` | 変更履歴一覧 |
| GET | `/field-history/record/:objectName/:recordId` | レコードの変更履歴 |
| GET | `/field-history/tracking/settings` | 追跡設定一覧 |
| POST | `/field-history/tracking/settings` | 追跡設定作成 |

### 検索

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/search?q=:query` | グローバル検索 |

---

## アーキテクチャ

### プロジェクト構造

```
src/
├── index.ts                    # サーバーエントリポイント
├── db/
│   ├── connection.ts           # PostgreSQL接続プール
│   ├── migrate.ts              # マイグレーション実行
│   └── seed.ts                 # シードデータ
├── middleware/
│   ├── auth.ts                 # 認証ミドルウェア
│   ├── errorHandler.ts         # エラーハンドリング
│   └── permissionMiddleware.ts # 権限チェック
├── repositories/
│   ├── baseRepository.ts       # 基底リポジトリ（CRUD共通処理）
│   └── *Repository.ts          # 各エンティティのリポジトリ
├── routes/
│   ├── index.ts                # ルーター集約
│   └── *.ts                    # 各エンティティのルート
├── services/
│   ├── permissionService.ts    # 権限評価ロジック
│   ├── sharingService.ts       # 共有計算
│   ├── accessibleIdsService.ts # レコードレベルアクセス制御
│   ├── validationService.ts    # 入力規則評価
│   ├── fieldHistoryService.ts  # 変更履歴追跡
│   └── queryEngineService.ts   # 動的クエリ生成
└── types/
    └── index.ts                # 型定義
```

### マルチテナント設計

- すべてのテーブルに`tenant_id`カラム
- すべてのクエリでテナント分離を強制
- APIレベルでのテナント境界保護

### 楽観的ロック

`If-Match`ヘッダーで`systemModstamp`を指定して競合を検出:

```bash
curl -X PATCH http://localhost:3002/api/v1/accounts/123 \
  -H "Authorization: Bearer tenant:user:email:admin" \
  -H "If-Match: abc-def-123" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

競合時は`409 Conflict`を返却。

### 論理削除

- `is_deleted`フラグによる論理削除
- 物理削除は別途バッチ処理で実施

### 権限モデル（3層）

1. **Object権限** - オブジェクトレベルのCRUD権限
2. **Field権限（FLS）** - フィールドレベルの読み取り/編集権限
3. **Record権限** - レコードレベルのアクセス制御
   - OWD（組織の共有設定）
   - ロール階層
   - 共有ルール
   - 手動共有

### Field History追跡対象

以下のエンティティでフィールド変更履歴を追跡:

- Account, Contact, Lead, Opportunity
- Quote, Order, Contract, Campaign
- Product, Pricebook, Task, Event

---

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npx tsc --noEmit

# マイグレーション
npm run db:migrate

# シードデータ
npm run db:seed
```

---

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| DATABASE_URL | PostgreSQL接続URL | - |
| PORT | サーバーポート | 3002 |

---

## ライセンス

MIT

---

## 貢献

プルリクエストを歓迎します。大きな変更を行う場合は、まずissueを作成して変更内容を議論してください。
