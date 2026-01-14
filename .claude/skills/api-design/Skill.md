---
name: api-design
description: REST API設計、エンドポイント、HTTPメソッド、リクエスト/レスポンス、認証、エラーハンドリングに関する支援。「API」「エンドポイント」「REST」「HTTP」で呼び出される。
---

# REST API設計スキル

REST APIの設計・実装をガイドします。

## いつ使用するか

- APIエンドポイントの設計・実装時
- リクエスト/レスポンス形式の確認時
- エラーハンドリングの実装時
- 「API」「エンドポイント」「REST」に関する質問時

## 主要参照ファイル

- `SPEC/30_インターフェース/31_API定義_v1.md` - **必須**
- `SPEC/30_インターフェース/32_サービス境界仕様書_v1.md`
- `SPEC/20_機能設計/03_権限_共有設計_v1.md`

## API基本仕様

### 共通ヘッダ
```http
Authorization: Bearer <token>
Content-Type: application/json
X-Tenant-Id: <tenantId>
Idempotency-Key: <uuid>        # POST系の冪等性確保
X-Correlation-Id: <uuid>       # 追跡用
If-Match: <SystemModstamp>     # 楽観ロック（PATCH/DELETE必須）
```

### ページング
```
?limit=50&cursor=<nextCursor>
```
- `limit`: default 50, max 200
- `cursor`: 次ページトークン
- レスポンス: `nextCursor`

### ソート
```
?sort=FieldName       # 昇順
?sort=-FieldName      # 降順
```
- Field Readable=false でソート禁止

## 主要エンドポイント

### 標準CRUD (SObject API)
```
GET    /v1/sobjects/{objectName}/{id}?fields=...
POST   /v1/sobjects/{objectName}
PATCH  /v1/sobjects/{objectName}/{id}
DELETE /v1/sobjects/{objectName}/{id}
POST   /v1/sobjects/{objectName}/batchGet
```

### クエリ・検索
```
GET /v1/query/{objectName}?filter=...&sort=...&limit=...
GET /v1/search?q=keyword&objects=Account,Contact&limit=...
```

### 関連リスト
```
GET /v1/sobjects/Account/{id}/related/Contacts
```

### 重要業務API

| エンドポイント | メソッド | 説明 |
|---------------|--------|------|
| `/v1/leads/{leadId}/convert` | POST | リード変換 |
| `/v1/opportunities/{id}/changeStage` | POST | ステージ変更 |
| `/v1/opportunities/{id}/close` | POST | 商談クローズ |
| `/v1/quotes/{id}/actions/present` | POST | 見積提示 |
| `/v1/quotes/{id}/actions/accept` | POST | 見積受諾 |
| `/v1/quotes/{id}/actions/markPrimary` | POST | Primary見積設定 |
| `/v1/orders/{id}/actions/activate` | POST | 受注有効化 |

### 承認API
```
POST /v1/approvals/submit
POST /v1/approvals/workItems/{workItemId}/decide
POST /v1/approvals/{approvalInstanceId}/recall
```

## 統一エラーフォーマット

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力に誤りがあります。",
    "details": [
      {
        "field": "LostReason",
        "message": "Closed Lostでは失注理由が必須です。",
        "rule": "VR-OPP-03"
      }
    ],
    "correlationId": "uuid"
  }
}
```

### エラーコード一覧

| コード | HTTPステータス | 説明 |
|-------|--------------|------|
| UNAUTHENTICATED | 401 | 認証失敗 |
| FORBIDDEN | 403 | 権限なし |
| NOT_FOUND | 404 | リソースなし/見えない |
| CONFLICT | 409 | 楽観ロック競合 |
| VALIDATION_ERROR | 422 | バリデーション失敗 |
| RATE_LIMITED | 429 | レート制限 |
| INTERNAL_ERROR | 500 | サーバーエラー |

## Lead Convert API詳細

### リクエスト
```json
POST /v1/leads/{leadId}/convert
{
  "account": {
    "mode": "new",  // "new" or "existing"
    "name": "株式会社ABC",
    "existingId": null
  },
  "contact": {
    "mode": "new",
    "lastName": "山田",
    "firstName": "太郎",
    "email": "yamada@example.com"
  },
  "opportunity": {
    "create": true,
    "name": "ABC社 - 新規案件",
    "stageName": "Qualification",
    "closeDate": "2026-03-31"
  },
  "ownerId": "optional-new-owner-id"
}
```

### レスポンス
```json
{
  "convertedAccountId": "uuid",
  "convertedContactId": "uuid",
  "convertedOpportunityId": "uuid",
  "convertLogId": "uuid"
}
```

## API実装チェックリスト

- [ ] テナント境界の強制（tenant_id）
- [ ] Object権限チェック（CRUD）
- [ ] Field権限チェック（FLS）
- [ ] Record権限チェック（共有）
- [ ] 楽観ロック（If-Match必須）
- [ ] フィールドマスキング（FLS適用）
- [ ] 統一エラーフォーマット
- [ ] 監査ログ記録
- [ ] ページング対応
- [ ] 冪等性（Idempotency-Key）
- [ ] レート制限

## レスポンスのフィールドマスキング

```json
// FLSでReadableでないフィールドはnull返却
{
  "id": "uuid",
  "name": "株式会社ABC",
  "annualRevenue": null,  // FLS: Readable=false
  "phone": "03-1234-5678"
}
```

## 楽観ロックの実装

### リクエスト
```http
PATCH /v1/sobjects/Account/123
If-Match: "2026-01-10T12:34:56.789Z"

{
  "name": "新しい名前"
}
```

### 競合時のレスポンス
```json
HTTP 409 Conflict
{
  "error": {
    "code": "CONFLICT",
    "message": "レコードが他のユーザーによって更新されました。",
    "currentVersion": "2026-01-10T13:00:00.000Z"
  }
}
```
