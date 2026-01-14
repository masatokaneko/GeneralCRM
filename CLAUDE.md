# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules
- ユーザーから質問をされた時に、勝手に作業に入ってはいけません。まずは質問への回答を行い、その後の作業は計画を立てて行います
- 「正しい」ことが最優先です。不明瞭や不正確な情報は最も悪いことです。「分からない」ことは悪いことではないです。不明なときは不明だという回答も全く問題ないです。適当な回答をしてはいけません
- 破壊的な変更や依存関係のインストールを行う場合はユーザーの許諾が必要です

## プロジェクト概要

このプロジェクトは、Salesforce Sales Cloud 同等の機能を持つエンタープライズ CRM システムの設計・開発仕様です。

### 主要特徴
- **モジュラーモノリス + マイクロサービス** のハイブリッドアーキテクチャ
- **イベント駆動アーキテクチャ (EDA)** による疎結合設計
- **マルチテナント** 対応のエンタープライズグレードセキュリティ
- **保存パイプライン** による統一的なデータ処理フロー

## ディレクトリ構造

```
/
├── SPEC/                       # CRM仕様書
│   ├── 10_要件定義/           # 業務要件・機能要件・非機能要件
│   ├── 20_機能設計/           # システム設計・DB設計・アーキテクチャ設計
│   └── 30_インターフェース/    # API定義・サービス境界・イベント仕様
├── ui-ux-framework-main/       # UIフレームワーク（モノレポ）
│   ├── apps/
│   │   ├── web/               # Next.js メインアプリ
│   │   └── docs/              # Nextra ドキュメント
│   └── packages/
│       ├── mcp/               # MCPクライアント
│       ├── mcp-server/        # MCPサーバー
│       └── shared-i18n/       # 国際化リソース
└── README.md                   # プロジェクト概要
```

## アーキテクチャ概要

### サービス構成

```
[API Gateway]
     ↓
[Core Platform] ← データの Single Writer
     ↓ (Outbox Events)
[Event Bus] → 各マイクロサービス
           → Sharing Service（権限管理）
           → Automation Service（自動化）
           → Approval Service（承認）
           → Search Service（検索）
           → Reporting Service（レポート）
```

### 保存パイプライン

全てのデータ更新は以下の統一パイプラインを通過：

```
AuthZ → Validation → Before Save → Persist → After Save → Async → Audit
```

## 主要設計ドキュメント

### 要件定義 (SPEC/10_要件定義/)
- **01_用語集_v1.md** - ドメイン用語の正準定義
- **02_スコープ_同等性マトリクス_v1.md** - MoSCoW優先度とフェーズ計画
- **03_業務プロセス定義_状態遷移_v1.md** - 各オブジェクトの業務フローと状態遷移
- **11-13_要件.md** - ビジネス/機能/非機能要件

### 機能設計 (SPEC/20_機能設計/)
- **01_ドメインERD_不変条件_v1.md** - エンティティ設計と70+の不変条件
- **02_データ辞書_v1.md** - 全エンティティの詳細項目定義
- **03_権限_共有設計_v1.md** - 権限・共有の評価アルゴリズム
- **25_物理DB設計_v1.md** - PostgreSQL物理スキーマ
- **26_アプリケーションアーキテクチャ設計_v1.md** - システム全体設計
- **27_Core内部モジュール設計_v1.md** - モジュラーモノリス内部設計

### インターフェース (SPEC/30_インターフェース/)
- **31_API定義_v1.md** - REST API仕様
- **32_サービス境界仕様書_v1.md** - サービス間の責務と依存関係
- **33_イベント仕様書_v1.md** - ドメインイベント定義

## 開発における重要事項

### 技術スタック

#### CRMバックエンド（推奨）
- **言語**: Go, Java, Node.js 等のモダン言語
- **API**: REST API (Phase 1), GraphQL (Phase 2)
- **認証**: OAuth 2.0 / OpenID Connect
- **RDBMS**: PostgreSQL（メイン）
- **キャッシュ**: Redis
- **検索**: OpenSearch/Elasticsearch
- **メッセージング**: RabbitMQ/Kafka

#### UIフレームワーク（実装済み）
- **Next.js 15.5.7** + React 19.2.1
- **Tailwind CSS 4.1.17** + shadcn/ui
- **Storybook 10.1.4**
- **Vitest 4.0.15** / Playwright 1.57.0
- **TypeScript 5.9.3**
- **Biome 2.3.7** (リンター・フォーマッター)

### データ設計原則

1. **マルチテナント設計**
   - 全テーブルに `tenant_id` を含める
   - 複合主キー: `(tenant_id, id)`
   - API レベルでテナント分離を強制

2. **論理削除**
   - `is_deleted` フラグで削除管理
   - 実際の物理削除は別途バッチ処理

3. **楽観的ロック**
   - `system_modstamp` による同時更新制御
   - API で If-Match ヘッダーサポート

### セキュリティ設計

1. **3層権限モデル**
   - Object レベル権限（CRUD）
   - Field レベル権限（FLS）
   - Record レベル権限（共有ルール）

2. **共有計算**
   - Role 階層による上位者アクセス
   - 共有ルールによる横断的アクセス
   - 権限展開キャッシュで高速化

### 不変条件の実装

70以上の不変条件が定義されており、以下の多重防御で保証：

1. **DB制約** - 外部キー、チェック制約、一意制約
2. **アプリ検証** - 保存パイプラインでの検証
3. **バリデーションルール** - カスタムルールによる業務検証

### API設計原則

1. **統一エラーフォーマット**
   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Validation failed",
       "details": [...]
     }
   }
   ```

2. **楽観的ロック必須**
   - If-Match ヘッダーで system_modstamp 指定
   - 競合時は 409 Conflict 返却

3. **フィールドマスキング**
   - FLS に基づく自動マスキング
   - 権限のないフィールドは null 返却

### サービス間通信

1. **Single Writer 原則**
   - 業務データの書き込みは Core Platform のみ
   - 他サービスはイベント経由で更新

2. **イベント駆動**
   - Outbox パターンによるイベント発行
   - At-least-once デリバリー保証

3. **権限評価**
   - 最終的な権限チェックは必ず Core で実施
   - キャッシュされた権限情報は参考程度

## 実装フェーズ

### Phase 1 (MVP) - Must Have
- コア CRUD 機能
- 基本的なセキュリティ（OWD、Role、共有）
- シンプルなバリデーション
- 基本的な監査ログ

### Phase 2 - Should Have
- 高度な自動化（ワークフロー、承認）
- 予測機能
- GraphQL API
- 高度なレポート

### Phase 3 - Could Have
- AI 機能（Einstein 相当）
- Territory 管理
- 高度な CPQ 機能

## パフォーマンス目標

- **初期表示**: 3秒以内
- **操作応答**: 1秒以内
- **同時ユーザー**: 1000ユーザー
- **稼働率**: 99.5%
- **RPO**: 4時間
- **RTO**: 2時間

## 開発時の注意事項

1. **仕様書の参照順序**
   - 要件定義 → ドメインERD → 物理DB設計 → API定義
   - 不明点は不変条件リストを確認

2. **テスト戦略**
   - 不変条件のテストカバレッジ 100%
   - API のエッジケーステスト必須
   - マルチテナント境界のテスト必須

3. **コード規約**
   - エラーハンドリングは統一フォーマット使用
   - ログには必ず tenant_id, user_id を含める
   - DB アクセスは必ずテナントフィルター適用

4. **セキュリティチェックリスト**
   - [ ] テナント境界の強制
   - [ ] 権限チェックの実装
   - [ ] 監査ログの記録
   - [ ] 暗号化の適用（保存時/通信時）
   - [ ] SQL インジェクション対策

## よく使うコマンド

### CRM仕様書の確認
```bash
# 重要度順の仕様書確認
cat SPEC/10_要件定義/01_用語集_v1.md                    # ドメイン用語の確認
cat SPEC/20_機能設計/01_ドメインERD_不変条件_v1.md       # エンティティと不変条件
cat SPEC/30_インターフェース/31_API定義_v1.md           # API仕様

# 実装フェーズと優先度の確認
cat SPEC/10_要件定義/02_スコープ_同等性マトリクス_v1.md  # MoSCoW優先度

# データベース設計の確認
cat SPEC/20_機能設計/25_物理DB設計_v1.md                # PostgreSQL物理設計
cat SPEC/20_機能設計/02_データ辞書_v1.md                # 項目定義

# アーキテクチャの確認
cat SPEC/20_機能設計/26_アプリケーションアーキテクチャ設計_v1.md
cat SPEC/20_機能設計/27_Core内部モジュール設計_v1.md
```

### UIフレームワーク開発
```bash
cd ui-ux-framework-main

# 開発サーバー起動
npm run dev         # Web/Docsアプリ起動（MCPサーバー除外）
npm run storybook   # Storybook起動（ポート6006）
npm run mcp:dev     # MCPパッケージ開発
npm run mcp:start   # MCPサーバー起動

# ビルド・検証
npm run build       # 本番ビルド
npm run lint        # Biome リント実行
npm run type-check  # TypeScript 型チェック
npm run test        # Vitest テスト実行
npm run format      # Biome コード整形

# クリーンアップ
npm run clean       # ビルド成果物削除
```

### Git操作（推奨フロー）
```bash
# 機能開発
git checkout -b feature/[機能名]
git add .
git commit -m "feat: [変更内容]"

# バグ修正
git checkout -b fix/[バグ名]
git commit -m "fix: [修正内容]"

# ドキュメント更新
git commit -m "docs: [更新内容]"

# リファクタリング
git commit -m "refactor: [改善内容]"

# テスト追加
git commit -m "test: [テスト内容]"
```

## トラブルシューティング

### よくある問題

1. **テナントデータの混在**
   - 全クエリで tenant_id フィルターを確認
   - ORM のデフォルトスコープ設定を利用

2. **権限計算のパフォーマンス**
   - 権限展開キャッシュの有効期限確認
   - Redis への権限情報キャッシュを活用

3. **イベント配信の遅延**
   - Outbox テーブルの処理状況確認
   - イベントバスのキュー状態確認

4. **UIフレームワークの問題**
   ```bash
   # 依存関係の問題
   rm -rf node_modules package-lock.json
   npm install
   
   # ポート競合
   lsof -i :3000  # 使用中のプロセス確認
   lsof -i :6006  # Storybookポート確認
   
   # TypeScript エラー
   npm run type-check -- --noEmit
   
   # テストの失敗
   npm run test -- --reporter=verbose
   ```

## プロジェクト構成詳細

### 1. CRM仕様書（SPEC/）
Salesforce同等のCRMシステムの完全な設計仕様書。実装の際はこれらのドキュメントを参照。

### 2. UIフレームワーク（ui-ux-framework-main/）
モノレポ構成のNext.jsベースUIフレームワーク：

#### apps/
- **web**: メインWebアプリケーション（Next.js 15.5.7）
- **docs**: ドキュメントサイト（Nextra）

#### packages/
- **mcp**: MCPクライアントパッケージ
- **mcp-server**: MCPサーバー実装
- **shared-i18n**: 国際化対応（ja/en）

#### 重要設定ファイル
- **turbo.json**: Turborepo モノレポ設定
- **biome.json**: コード品質ツール設定
- **package.json**: ワークスペース定義
- **.devcontainer/**: VSCode DevContainer設定

## 関連リソース

- [Salesforce Developer Documentation](https://developer.salesforce.com/)
- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/)
- [Microservices Patterns](https://microservices.io/patterns/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)

## 連絡先

プロジェクトに関する質問は、設計ドキュメントの該当セクションを参照してください。
アーキテクチャに関する相談は、このファイルと関連設計書を基に議論を進めましょう。