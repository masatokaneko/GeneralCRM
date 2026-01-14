# CRM Development Environment

Docker Compose を使用した CRM 開発環境のセットアップ。

## サービス構成

| サービス | ポート | 説明 |
|----------|--------|------|
| Keycloak | 8080 | Identity Provider (認証基盤) |
| keycloak-db | - | Keycloak 用 PostgreSQL |
| crm-db | 5432 | CRM アプリケーション用 PostgreSQL |
| Redis | 6379 | セッション・権限キャッシュ |

## クイックスタート

### 1. 環境起動

```bash
cd docker
docker compose up -d
```

### 2. サービス確認

```bash
docker compose ps
```

### 3. ログ確認

```bash
# 全サービス
docker compose logs -f

# 特定サービス
docker compose logs -f keycloak
```

## Keycloak 設定

### 管理コンソールアクセス

- URL: http://localhost:8080/admin
- ユーザー: `admin`
- パスワード: `admin`

### CRM Realm

Realm `crm` が自動インポートされ、以下が設定済み：

#### 開発用ユーザー

| ユーザー | パスワード | ロール |
|----------|------------|--------|
| admin@example.com | admin123! | System Administrator |
| manager@example.com | manager123! | Sales Manager |
| user1@example.com | user123! | Sales Representative |
| user2@example.com | user123! | Sales Representative |
| readonly@example.com | readonly123! | Read Only |

#### クライアント設定

| Client ID | 用途 |
|-----------|------|
| crm-web | Next.js フロントエンド |
| crm-api | バックエンド API |

### トークン属性

JWTに以下のカスタム属性が含まれます：

- `tenant_id`: テナント識別子
- `crm_role`: CRM内ロール名
- `profile_id`: プロファイル識別子

## PostgreSQL (CRM DB)

### 接続情報

```
Host: localhost
Port: 5432
Database: crm
Username: crm_user
Password: crm_password
```

### psql接続

```bash
docker compose exec crm-db psql -U crm_user -d crm
```

### 初期データ

`init-scripts/01_create_schema.sql` により以下が作成：

- テナント・ユーザー・ロール・プロファイル
- Account/Contact/Lead/Opportunity/Quote テーブル
- Product/Pricebook テーブル
- Audit Events テーブル
- Stage Definitions

## Redis

### 接続情報

```
Host: localhost
Port: 6379
```

### redis-cli接続

```bash
docker compose exec redis redis-cli
```

## 開発ワークフロー

### 環境の停止

```bash
docker compose stop
```

### 環境の削除（データ保持）

```bash
docker compose down
```

### 環境の完全削除（データ含む）

```bash
docker compose down -v
```

### データベースのリセット

```bash
docker compose down -v
docker compose up -d
```

## Next.js 連携設定

### 環境変数 (.env.local)

```env
# Keycloak
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=crm
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=crm-web

# API (開発時はMSWを使用)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/v1

# Database (バックエンド開発時)
DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/crm

# Redis
REDIS_URL=redis://localhost:6379
```

## トラブルシューティング

### Keycloak が起動しない

```bash
# ログ確認
docker compose logs keycloak

# DB接続待機が長い場合、再起動
docker compose restart keycloak
```

### Realm がインポートされない

```bash
# Keycloakコンテナに入ってインポート確認
docker compose exec keycloak /opt/keycloak/bin/kc.sh export --dir /tmp/export --realm crm

# 手動インポート
docker compose exec keycloak /opt/keycloak/bin/kc.sh import --file /opt/keycloak/data/import/crm-realm.json
```

### PostgreSQL 接続エラー

```bash
# ヘルスチェック確認
docker compose ps

# 接続テスト
docker compose exec crm-db pg_isready -U crm_user -d crm
```

### ポート競合

```bash
# 使用中のポート確認
lsof -i :8080
lsof -i :5432
lsof -i :6379

# 競合プロセスを停止するか、docker-compose.yml のポートを変更
```

## 本番環境への注意

本設定は**開発専用**です。本番環境では：

1. 全てのパスワードを変更
2. SSL/TLS を有効化
3. `start-dev` を `start` に変更
4. ボリュームをマネージドストレージへ
5. 環境変数は Secret Manager で管理
