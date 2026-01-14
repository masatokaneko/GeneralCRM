---
name: multi-tenant
description: マルチテナント、テナント分離、データ分離、セキュリティ境界に関する設計・実装支援。「テナント」「マルチテナント」「分離」「境界」で呼び出される。
---

# マルチテナント実装スキル

テナント分離とセキュリティ境界の設計をガイドします。

## いつ使用するか

- マルチテナント機能の設計・実装時
- テナント分離の確認時
- クロステナント問題の対処時
- 「テナント」「マルチテナント」「分離」に関する質問時

## 主要参照ファイル

- `SPEC/20_機能設計/25_物理DB設計_v1.md` - **必須**
- `SPEC/20_機能設計/01_ドメインERD_不変条件_v1.md`
- `SPEC/30_インターフェース/31_API定義_v1.md`

## 設計原則

### INV-T1: マルチテナント隔離
- **全クエリ**に `WHERE tenant_id = :currentTenantId`
- クロステナント参照は明示的権限が必要
- テナント削除時は全関連データの論理削除

## データベース設計

### 全テーブル必須カラム
```sql
tenant_id uuid NOT NULL
```

### 主キー構成
```sql
PRIMARY KEY (tenant_id, id)
```

### 外部キー構成（同一テナント強制）
```sql
FOREIGN KEY (tenant_id, xxx_id) REFERENCES target_table (tenant_id, id)
```

### インデックス
```sql
-- テナント+所有者での検索
CREATE INDEX idx_xxx_tenant_owner ON xxx (tenant_id, owner_id) WHERE is_deleted=false;

-- テナント+作成日での検索
CREATE INDEX idx_xxx_tenant_created ON xxx (tenant_id, created_at) WHERE is_deleted=false;
```

## API設計

### テナント識別
```http
# 方式1: ヘッダ
X-Tenant-Id: <tenantId>

# 方式2: JWT内に内包
Authorization: Bearer <token containing tenant_id>
```

### 全APIでテナント境界必須
- リクエストからテナントIDを取得
- 全クエリにテナントIDを適用
- レスポンスはテナント内データのみ

## 実装パターン

### ミドルウェア（テナント抽出）
```python
@middleware
def extract_tenant(request):
    # ヘッダから取得
    tenant_id = request.headers.get('X-Tenant-Id')

    # JWTから取得（フォールバック）
    if not tenant_id:
        tenant_id = extract_from_jwt(request.auth_token)

    if not tenant_id:
        raise UnauthorizedError("Tenant ID required")

    # リクエストコンテキストに設定
    request.tenant_id = tenant_id
    return next(request)
```

### リポジトリ層（ORM使用例）
```python
class TenantScopedRepository:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id

    def find_by_id(self, id: str):
        return db.query(Model).filter(
            Model.tenant_id == self.tenant_id,
            Model.id == id,
            Model.is_deleted == False
        ).first()

    def find_all(self, **filters):
        query = db.query(Model).filter(
            Model.tenant_id == self.tenant_id,
            Model.is_deleted == False
        )
        for key, value in filters.items():
            query = query.filter(getattr(Model, key) == value)
        return query.all()

    def create(self, data: dict):
        data['tenant_id'] = self.tenant_id
        return db.add(Model(**data))
```

### SQLクエリ（直接実行時）
```sql
-- 必ずtenant_idを条件に含める
SELECT * FROM accounts
WHERE tenant_id = :tenant_id
  AND id = :id
  AND is_deleted = false;

-- JOINでも同様
SELECT o.*, a.name as account_name
FROM opportunities o
JOIN accounts a ON o.tenant_id = a.tenant_id AND o.account_id = a.id
WHERE o.tenant_id = :tenant_id
  AND o.is_deleted = false
  AND a.is_deleted = false;
```

## テスト戦略

### マルチテナント境界テスト
```python
def test_tenant_isolation():
    # テナントA のデータ作成
    with tenant_context("tenant-a"):
        account_a = create_account(name="Account A")

    # テナントB からアクセス試行
    with tenant_context("tenant-b"):
        # 見えないこと
        result = account_repo.find_by_id(account_a.id)
        assert result is None

        # 更新できないこと
        with pytest.raises(NotFoundError):
            account_repo.update(account_a.id, {"name": "Hacked"})

        # 削除できないこと
        with pytest.raises(NotFoundError):
            account_repo.delete(account_a.id)
```

### 必須テストケース
- [ ] 別テナントのレコードが見えないこと
- [ ] 別テナントのレコードを更新できないこと
- [ ] 別テナントのレコードを削除できないこと
- [ ] 親子関係が別テナントを参照できないこと
- [ ] 検索結果が別テナントを含まないこと
- [ ] レポート結果が別テナントを含まないこと

## 運用考慮事項

### テナント作成
1. テナントレコード作成
2. 初期メタデータ（Profile, Role等）作成
3. 管理者ユーザ作成

### テナント削除（論理削除）
1. テナントレコードを `is_deleted=true`
2. 全関連データを `is_deleted=true`
3. 物理削除は別途バッチで実行

### パフォーマンス考慮
- テナント毎のデータ量監視
- 大規模テナントの分離（将来）
- インデックスの先頭に `tenant_id`

## ログ・監査

```json
// 全ログにtenant_idを含める
{
  "timestamp": "2026-01-10T12:34:56.789Z",
  "level": "INFO",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "action": "account.update",
  "record_id": "uuid",
  "changes": {...}
}
```

## 実装チェックリスト

- [ ] 全テーブルに `tenant_id` カラム
- [ ] 主キーが `(tenant_id, id)`
- [ ] 外部キーが `(tenant_id, xxx_id)`
- [ ] 全クエリにテナントフィルター
- [ ] APIでテナント境界強制
- [ ] ミドルウェアでテナント抽出
- [ ] リポジトリ層でテナントスコープ
- [ ] ログに `tenant_id` 含む
- [ ] テナント境界テスト実装

## アンチパターン

### NG: テナントフィルター漏れ
```sql
-- NG: tenant_id なし
SELECT * FROM accounts WHERE id = :id;

-- OK: tenant_id あり
SELECT * FROM accounts WHERE tenant_id = :tenant_id AND id = :id;
```

### NG: 直接ID参照
```sql
-- NG: 別テナントのIDを直接参照可能
SELECT * FROM contacts WHERE account_id = :account_id;

-- OK: tenant_idも必ず条件に
SELECT * FROM contacts
WHERE tenant_id = :tenant_id AND account_id = :account_id;
```

### NG: テナント境界チェックなしのバルク操作
```sql
-- NG: tenant_idチェックなし
DELETE FROM accounts WHERE created_at < '2025-01-01';

-- OK: tenant_id必須
DELETE FROM accounts
WHERE tenant_id = :tenant_id AND created_at < '2025-01-01';
```
