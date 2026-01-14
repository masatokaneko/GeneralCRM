# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語設定

- 日本語で回答してください
- CLAUDE.md を読み込んだら「CLAUDE.md を読み込みました！」と伝えてください

## 制約事項

- 依存関係のインストールやファイルの削除、破壊的な変更を行う場合はユーザーの許諾が必要
- 現在は開発フェーズなので後方互換性よりも最適化を優先
- コードコメント内での絵文字使用は禁止（console.log、マークダウンでは許可）

## コマンド

```bash
# 開発サーバー起動（ポート3002）
npm run dev

# ビルド
npm run build

# 型チェック
npx tsc --noEmit

# データベース
npm run db:migrate    # マイグレーション実行
npm run db:seed       # シードデータ投入
```

## アーキテクチャ

```
src/
├── index.ts              # Express アプリケーションエントリポイント
├── db/
│   ├── connection.ts     # PostgreSQL接続（pg pool）
│   ├── migrate.ts        # マイグレーション実行
│   └── seed.ts           # シードデータ
├── middleware/
│   ├── auth.ts           # 認証ミドルウェア（X-Tenant-Id, X-User-Id）
│   ├── errorHandler.ts   # エラーハンドリング（ValidationError, NotFoundError等）
│   └── permissionMiddleware.ts  # FLS（フィールドレベルセキュリティ）
├── repositories/
│   ├── baseRepository.ts # 基底クラス（CRUD, ListParams, snake_case変換）
│   └── *Repository.ts    # エンティティ別リポジトリ
├── routes/
│   ├── index.ts          # ルーター集約
│   └── *.ts              # エンティティ別APIルート
├── services/
│   ├── permissionService.ts  # 権限評価ロジック
│   └── sharingService.ts     # 共有計算
└── types/
    └── index.ts          # 型定義（BaseRecord, PaginatedResponse等）
```

## 主要パターン

### BaseRepository

```typescript
// 全リポジトリの基底クラス
export abstract class BaseRepository<T extends BaseRecord> {
  protected abstract tableName: string;
  protected abstract columns: string[];

  // 標準CRUD: findById, findByIdOrThrow, list, create, update, delete
  // snake_case ↔ camelCase 変換: mapToDb, mapFromDb
}
```

### ListParams

```typescript
interface ListParams {
  limit?: number;
  cursor?: string;
  page?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  filters?: Record<string, unknown>;
}
```

### ValidationError

```typescript
// 引数は1つ（details配列のみ）
throw new ValidationError([
  { field: "name", message: "Name is required." },
]);
```

### 楽観的ロック

```typescript
// If-Match ヘッダーで system_modstamp を検証
const etag = req.headers["if-match"] as string | undefined;
await repository.update(tenantId, userId, id, data, etag);
```

## データベース

- PostgreSQL + pg ライブラリ
- マルチテナント: 全テーブルに `tenant_id` カラム
- 論理削除: `is_deleted` フラグ
- 楽観的ロック: `system_modstamp` UUID

## 環境変数

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/crm
PORT=3002
```

## API エンドポイント

```
GET/POST    /api/v1/{entity}
GET/PATCH/DELETE  /api/v1/{entity}/:id
POST        /api/v1/leads/:id/convert
POST        /api/v1/opportunities/:id/stage
POST        /api/v1/opportunities/:id/close
POST        /api/v1/quotes/:id/primary
POST        /api/v1/quotes/:id/status
```

## 進捗状況

`DEVELOPMENT_PROGRESS.md` を参照（プロジェクトルートにあり）
