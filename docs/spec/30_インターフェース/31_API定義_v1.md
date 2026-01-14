# API仕様書 v1（Core CRM Platform API）

## 0. 基本方針

* プロトコル：HTTP/HTTPS
* データ形式：JSON
* 認証：Bearer Token（OAuth2/JWT想定）
* すべてのAPIは **保存パイプライン**（AuthZ→Validation→Automation→Audit）に従う
* すべての読み取りは **Object/Field/Record** の権限制御を適用（INV-SH1）

---

# 1. 共通仕様

## 1.1 HTTPヘッダ

* `Authorization: Bearer <token>`
* `Content-Type: application/json`
* `X-Tenant-Id: <tenantId>`（またはtoken内に内包。いずれにせよTenant境界は必須）
* `Idempotency-Key: <uuid>`（POST系の冪等性確保：推奨）
* `X-Correlation-Id: <uuid>`（追跡：任意）

## 1.2 リソース識別

* `id`：ULID/UUID
* 参照は必ず同一Tenant（INV-T1）

## 1.3 フィールドマスキング

* Field Readable=false の項目は **レスポンスに含めない**（または `null` で返す方式も可だが、標準は「含めない」）
* 依頼された `fields=` でも、権限が無ければ返さない

## 1.4 ページング

* `limit`（default 50, max 200）
* `cursor`（次ページトークン）
* レスポンス：`nextCursor`

## 1.5 ソート

* `sort=FieldName` or `sort=-FieldName`（降順は-）
* Field Readable=false でソートは禁止（情報漏洩対策）

---

# 2. エラー仕様（統一フォーマット）

## 2.1 Errorレスポンス

HTTPステータス：400/401/403/404/409/422/429/500

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
    "correlationId": "..."
  }
}
```

## 2.2 代表的なcode

* `UNAUTHENTICATED`（401）
* `FORBIDDEN`（403：Object/Field/Record）
* `NOT_FOUND`（404：見えない場合も404を返す＝存在漏洩防止）
* `VALIDATION_ERROR`（422）
* `CONFLICT`（409：楽観ロック、衝突更新）
* `AUTOMATION_CONFLICT`（409：危険フィールド衝突）
* `RATE_LIMITED`（429）

---

# 3. 認証・ユーザ

## 3.1 自分の情報

`GET /v1/me`

* 自分のUser、Role、Groups、Territories、Permission概要を返す（表示可能範囲のみ）

---

# 4. メタデータ（Describe / Setup API）

## 4.1 オブジェクト一覧

`GET /v1/metadata/objects`

* 返却：オブジェクト名、ラベル、標準/カスタム、API名

## 4.2 オブジェクトDescribe

`GET /v1/metadata/objects/{objectName}/describe`

* 返却：

  * fields（型、必須、参照先、enum、Readable/Editable）
  * layouts（ページレイアウト、セクション、関連リスト）
  * stageDefinitions（Opportunity等）
  * validationRules/workflows/approvals（要約）
* Field Permissionが適用された結果を返す（見えない項目は含めない）

## 4.3 フィールド定義（管理者）

`POST /v1/metadata/fields`

* FieldDefinitionを追加（Custom Field）
  `PATCH /v1/metadata/fields/{fieldId}`
  `GET /v1/metadata/fields?object=Account`

---

# 5. 標準CRUD API（SObject API）

## 5.1 取得（Get）

`GET /v1/sobjects/{objectName}/{id}?fields=...`

* RecordAccess>=Read 必須
* 返却はFieldマスク済み

## 5.2 作成（Create）

`POST /v1/sobjects/{objectName}`

* Body：フィールドJSON
* 実行：AuthZ→Validation→Automation→Audit
* レスポンス：`id`, `warnings`（任意）

## 5.3 更新（Update）

`PATCH /v1/sobjects/{objectName}/{id}`

* 楽観ロック：`If-Match: <SystemModstamp or version>`（必須）
* 競合時：409 `CONFLICT`

## 5.4 削除（Delete）

`DELETE /v1/sobjects/{objectName}/{id}`

* 論理削除：IsDeleted=true
* Delete権限＋RecordAccess>=Write

## 5.5 複数取得（Batch Get）

`POST /v1/sobjects/{objectName}/batchGet`

```json
{ "ids": ["...","..."], "fields": ["Name","OwnerId"] }
```

* 返却：見えるレコードだけ返す（見えないものは404扱いでerrorsへ）

---

# 6. クエリ（Query API）

## 6.1 オブジェクト単体クエリ（フィルタ/ソート/ページング）

`GET /v1/query/{objectName}?filter=...&sort=...&limit=...&cursor=...&fields=...`

### filter DSL（簡易）

* `field op value` をAND/ORで結合
* 例：`StageName = "Proposal" AND CloseDate >= "2026-01-01"`

制約：

* Field Readable=false のフィールドは filter/sort 禁止
* 参照を跨ぐフィルタは制限（必要なら「Report API」に寄せる）

## 6.2 グローバル検索（Search API）

`GET /v1/search?q=keyword&objects=Account,Contact,Opportunity&limit=...`

* 対象：検索可能オブジェクトのみ
* RecordAccess>=Readのみ
* Field Permissionに従い返却

---

# 7. 関連（Relationship API）

## 7.1 関連リスト取得（例：Account→Contacts）

`GET /v1/sobjects/Account/{id}/related/Contacts?limit=...`

* 親が見えても子が見えない場合は返さない（子の共有も必須）

## 7.2 中間テーブル操作（例：OpportunityContactRole）

* 追加：`POST /v1/sobjects/OpportunityContactRole`
* 更新：`PATCH /v1/sobjects/OpportunityContactRole/{id}`
* 削除：`DELETE /v1/sobjects/OpportunityContactRole/{id}`

---

# 8. 重要業務API（専用エンドポイント）

## 8.1 Lead Convert

`POST /v1/leads/{leadId}/convert`

```json
{
  "account": { "mode": "new", "name": "..." },
  "contact": { "mode": "new", "lastName": "...", "email": "..." },
  "opportunity": { "create": true, "name": "...", "stageName": "Qualification", "closeDate": "2026-02-28" },
  "ownerId": "optional"
}
```

* ガード：LeadがQualified
* 成功レス：

```json
{
  "convertedAccountId": "...",
  "convertedContactId": "...",
  "convertedOpportunityId": "...",
  "convertLogId": "..."
}
```

* 失敗：重複・権限・整合違反は422/403

## 8.2 Opportunity Stage Change（明示操作を用意）

`POST /v1/opportunities/{id}/changeStage`

```json
{ "stageName": "Negotiation", "expectedVersion": "..." }
```

* 内部でWF-OPP-01が走り、確度/予測カテゴリ/Closed整合を同期
* RequiredFields不足は422

## 8.3 Close Won / Close Lost

`POST /v1/opportunities/{id}/close`

```json
{ "result": "WON", "closeDate": "2026-01-31" }
```

または

```json
{ "result": "LOST", "lostReason": "Price", "closeDate": "2026-01-31" }
```

## 8.4 Quote Present / Accept / Reject / MarkPrimary

`POST /v1/quotes/{id}/actions/present`
`POST /v1/quotes/{id}/actions/accept`
`POST /v1/quotes/{id}/actions/reject`
`POST /v1/quotes/{id}/actions/markPrimary`

## 8.5 Order Activate / Fulfill / Cancel

`POST /v1/orders/{id}/actions/activate`
`POST /v1/orders/{id}/actions/fulfill`
`POST /v1/orders/{id}/actions/cancel`

---

# 9. Bulk API（大量処理）

## 9.1 バルクジョブ作成

`POST /v1/bulk/jobs`

```json
{
  "objectName": "Opportunity",
  "operation": "upsert",
  "externalIdField": "ExternalIds.crmKey",
  "contentType": "application/jsonl"
}
```

## 9.2 データ投入

`PUT /v1/bulk/jobs/{jobId}/batches`

* JSONL/CSV等（実装選択）
* 各行は保存パイプライン適用
* レスポンス：行単位の成功/失敗

## 9.3 結果取得

`GET /v1/bulk/jobs/{jobId}/results`

---

# 10. Approval API

## 10.1 申請

`POST /v1/approvals/submit`

```json
{ "objectName": "Quote", "recordId": "...", "comment": "..." }
```

* ガード：EntryCriteria満たす、権限

## 10.2 承認/却下

`POST /v1/approvals/workItems/{workItemId}/decide`

```json
{ "decision": "APPROVE", "comment": "OK" }
```

## 10.3 申請取消

`POST /v1/approvals/{approvalInstanceId}/recall`

## 10.4 状態取得

`GET /v1/approvals/instances/{approvalInstanceId}`

---

# 11. 自動化メタデータAPI（管理者）

* Validation

  * `GET /v1/automation/validationRules?object=Opportunity`
  * `POST /v1/automation/validationRules`
* Workflow

  * `GET /v1/automation/workflows?object=Opportunity`
  * `POST /v1/automation/workflows`
* Scheduled Jobs

  * `GET /v1/automation/schedules`
  * `POST /v1/automation/schedules`
* 実行ログ

  * `GET /v1/automation/runLogs?recordId=...`

---

# 12. 共有（Sharing）API（管理者/特権）

## 12.1 OWD

`GET /v1/sharing/owd`
`PATCH /v1/sharing/owd/{objectName}`

## 12.2 Share Rules

`GET /v1/sharing/rules?object=Account`
`POST /v1/sharing/rules`
`PATCH /v1/sharing/rules/{ruleId}`

## 12.3 手動共有

`POST /v1/sharing/manual`

```json
{ "objectName": "Account", "recordId": "...", "subjectType": "User", "subjectId": "...", "accessLevel": "Read" }
```

## 12.4 共有再計算

`POST /v1/sharing/recalculate`

```json
{ "scope": "record", "objectName": "Opportunity", "recordId": "..." }
```

または

```json
{ "scope": "full", "objectName": "Account" }
```

* バージョニング方式（ShareModelVersion）を採用する場合：

  * `POST /v1/sharing/rebuild?version=...`

---

# 13. レポートAPI

## 13.1 レポート定義

`POST /v1/reports`

```json
{
  "name": "Pipeline by Stage",
  "baseObject": "Opportunity",
  "filters": [...],
  "groupBy": ["StageName"],
  "measures": [{ "field": "Amount", "agg": "SUM" }]
}
```

## 13.2 実行

`POST /v1/reports/{reportId}/run`

* RecordAccessとField Permissionを適用して集計
* 結果はテーブル形式（行/列/メジャー）

---

# 14. Events API（変更イベント）

## 14.1 変更イベント購読（Streaming）

* 方式は実装選択：WebSocket / SSE / Webhook
* 要件としては以下を満たす：

  * 変更イベント（Create/Update/Delete/Convert/Stage/Approval等）が発行される
  * サブスクライバは “見えるレコード” だけ受け取る（難しい場合は購読側で権限を再評価し、機密はpayloadに入れない）

### Webhook例

`POST /v1/events/subscriptions`

```json
{
  "objectName": "Opportunity",
  "eventTypes": ["created","updated"],
  "targetUrl": "https://example.com/webhook",
  "secret": "..."
}
```

---

# 15. 監査API

## 15.1 監査イベント検索

`GET /v1/audit/events?object=Opportunity&recordId=...`

* 監査閲覧権限が必要

## 15.2 フィールド履歴

`GET /v1/audit/fieldHistory?object=Opportunity&recordId=...`

---

# 16. 受入条件（API）

1. CRUD/Query/Search/Report で可視性が一致（INV-SH1）
2. Field Permissionでレスポンスがマスクされ、filter/sortにも使えない
3. 楽観ロックで競合が409になる
4. Lead Convert / Stage / Close / Quote actions / Approval が専用APIで完結
5. Bulkがレコード単位で成功/失敗を返し、同一パイプラインを通る
6. 監査と自動化実行ログが取得できる
7. Contract/ContractLineItem/PoolConsumption/InvoiceのCRUD・アクションが専用APIで完結
8. プール消費承認時にContractLineItem.RemainingValueが正しく減算される（INV-PC1）
9. 請求書送付・支払記録により適切なステータス遷移が行われる
10. Order作成時にContract.AccountIdとの整合性が検証される（INV-ORD3）

---

# 17. Contract API（契約管理）

## 17.1 契約 CRUD

### 一覧取得
`GET /v1/contracts?filter=...&sort=...&limit=...&cursor=...`

* フィルタ例：`AccountId = "..." AND Status = "Activated"`
* ソート例：`sort=-EndDate`

### 単件取得
`GET /v1/contracts/{id}`

### 作成
`POST /v1/contracts`

```json
{
  "accountId": "...",
  "contractType": "License",
  "status": "Draft",
  "startDate": "2026-01-01",
  "termMonths": 12,
  "totalContractValue": 1200000.00,
  "billingFrequency": "Yearly",
  "description": "..."
}
```

* EndDateはサーバー側でStartDate + TermMonths - 1日で自動計算（INV-CON2）
* 作成時StatusはDraftのみ

### 更新
`PATCH /v1/contracts/{id}`

* 楽観ロック：`If-Match: <SystemModstamp>`
* Activatedの場合、更新可能項目は制限（Description等のみ）

### 削除（論理削除）
`DELETE /v1/contracts/{id}`

* Draftステータスのみ削除可能

## 17.2 契約アクション

### 承認申請
`POST /v1/contracts/{id}/actions/submitForApproval`

```json
{ "comment": "契約内容の確認をお願いします" }
```

* ガード：Status = Draft
* 遷移：Draft → InApproval

### アクティベート
`POST /v1/contracts/{id}/actions/activate`

```json
{ "activationDate": "2026-01-01" }
```

* ガード：Status = InApproval（承認済み）
* 遷移：InApproval → Activated
* StartDateが空の場合、activationDateで上書き

### 解約
`POST /v1/contracts/{id}/actions/terminate`

```json
{
  "terminationDate": "2026-06-30",
  "terminationReason": "Customer request"
}
```

* ガード：Status = Activated
* 遷移：Activated → Terminated

### 更新（Renewal）
`POST /v1/contracts/{id}/actions/renew`

```json
{
  "renewalTermMonths": 12,
  "newStartDate": "2027-01-01"
}
```

* 元契約のEndDateを延長し、新しいContractLineItemを追加

## 17.3 契約関連リスト

### 契約明細一覧
`GET /v1/contracts/{id}/line-items`

### 発注一覧
`GET /v1/contracts/{id}/orders`

### 請求一覧
`GET /v1/contracts/{id}/invoices`

### プール消費一覧（PoF契約のみ）
`GET /v1/contracts/{id}/pool-consumptions`

---

# 18. ContractLineItem API（契約明細）

## 18.1 CRUD

### 一覧取得
`GET /v1/contract-line-items?contractId=...`

### 単件取得
`GET /v1/contract-line-items/{id}`

### 作成
`POST /v1/contract-line-items`

```json
{
  "contractId": "...",
  "productId": "...",
  "quantity": 100,
  "listUnitPrice": 12000.00,
  "customerUnitPrice": 10000.00,
  "termMonths": 12,
  "startDate": "2026-01-01",
  "description": "..."
}
```

* EndDateはサーバー側で自動計算（INV-CLI2）
* TotalValueは Quantity × CustomerUnitPrice × (TermMonths/12) で計算
* PoF契約の場合、RemainingValueにTotalValueを初期設定

### 更新
`PATCH /v1/contract-line-items/{id}`

* 楽観ロック必須
* 契約がActivated後は更新不可（INV-CLI1）

### 削除
`DELETE /v1/contract-line-items/{id}`

* 契約がDraftの場合のみ

---

# 19. PoolConsumption API（プール消費）

## 19.1 CRUD

### 一覧取得
`GET /v1/pool-consumptions?contractLineItemId=...&status=...`

### 単件取得
`GET /v1/pool-consumptions/{id}`

### 作成（消費申請）
`POST /v1/pool-consumptions`

```json
{
  "contractLineItemId": "...",
  "consumedUnits": 10.0,
  "unitPrice": 10000.00,
  "consumptionDate": "2026-01-15",
  "description": "1月分利用実績"
}
```

* ConsumedAmountはサーバー側で計算（ConsumedUnits × UnitPrice）
* 初期Status = Pending

### 更新
`PATCH /v1/pool-consumptions/{id}`

* Pendingステータスのみ更新可能

### 削除
`DELETE /v1/pool-consumptions/{id}`

* Pendingステータスのみ削除可能

## 19.2 消費アクション

### 承認
`POST /v1/pool-consumptions/{id}/actions/approve`

```json
{ "comment": "確認OK" }
```

* ガード：Status = Pending
* 遷移：Pending → Approved
* ContractLineItem.RemainingValueを減算（INV-PC1）
* RemainingValue不足時は422エラー（INV-PC2）

### 却下
`POST /v1/pool-consumptions/{id}/actions/reject`

```json
{ "rejectionReason": "利用実績の詳細が不明です" }
```

* ガード：Status = Pending
* 遷移：Pending → Rejected

### 請求紐付け（内部処理）
`POST /v1/pool-consumptions/{id}/actions/linkToInvoice`

```json
{ "invoiceLineItemId": "..." }
```

* ガード：Status = Approved
* 遷移：Approved → Invoiced

---

# 20. Invoice API（請求書）

## 20.1 CRUD

### 一覧取得
`GET /v1/invoices?contractId=...&status=...&filter=...`

* フィルタ例：`DueDate <= "2026-02-28" AND Status = "Sent"`

### 単件取得
`GET /v1/invoices/{id}`

### 作成
`POST /v1/invoices`

```json
{
  "contractId": "...",
  "orderId": "...",
  "invoiceNumber": "INV-2026-0001",
  "invoiceDate": "2026-01-31",
  "dueDate": "2026-02-28",
  "billingPeriodStart": "2026-01-01",
  "billingPeriodEnd": "2026-01-31",
  "subtotal": 100000.00,
  "taxAmount": 10000.00,
  "totalAmount": 110000.00
}
```

* 初期Status = Draft
* InvoiceNumberは自動採番も可（設定次第）

### 更新
`PATCH /v1/invoices/{id}`

* Draftステータスのみ更新可能（INV-INV1）

### 削除
`DELETE /v1/invoices/{id}`

* Draftステータスのみ

## 20.2 請求アクション

### 送付
`POST /v1/invoices/{id}/actions/send`

```json
{
  "sendMethod": "Email",
  "recipientEmail": "billing@customer.com"
}
```

* ガード：Status = Draft, TotalAmount > 0（INV-INV3）
* 遷移：Draft → Sent
* SentAtを記録

### 支払記録
`POST /v1/invoices/{id}/actions/recordPayment`

```json
{
  "paymentDate": "2026-02-15",
  "paymentAmount": 110000.00,
  "paymentMethod": "BankTransfer",
  "referenceNumber": "TRF-123456"
}
```

* PaidAmountを加算
* PaidAmount >= TotalAmount → Status = Paid
* PaidAmount < TotalAmount → Status = PartialPaid

### 督促（延滞マーク）
`POST /v1/invoices/{id}/actions/markOverdue`

* ガード：Status = Sent, DueDate < 今日
* 遷移：Sent → Overdue

### キャンセル
`POST /v1/invoices/{id}/actions/cancel`

```json
{ "cancelReason": "顧客要望による取消" }
```

* ガード：Status = Draft or Sent
* 遷移：→ Cancelled

## 20.3 請求関連リスト

### 請求明細一覧
`GET /v1/invoices/{id}/line-items`

---

# 21. InvoiceLineItem API（請求明細）

## 21.1 CRUD

### 一覧取得
`GET /v1/invoice-line-items?invoiceId=...`

### 単件取得
`GET /v1/invoice-line-items/{id}`

### 作成
`POST /v1/invoice-line-items`

```json
{
  "invoiceId": "...",
  "orderItemId": "...",
  "poolConsumptionId": "...",
  "description": "ScalarDB Enterprise License - January 2026",
  "quantity": 100,
  "unitPrice": 1000.00,
  "amount": 100000.00
}
```

* orderItemIdまたはpoolConsumptionIdのいずれかを指定
* Invoice.Subtotalの再計算をトリガー

### 更新
`PATCH /v1/invoice-line-items/{id}`

* 請求書がDraftの場合のみ

### 削除
`DELETE /v1/invoice-line-items/{id}`

* 請求書がDraftの場合のみ

---

# 22. Order API 拡張（契約連携）

## 22.1 既存APIへの追加パラメータ

### 作成時の契約連携
`POST /v1/orders`

```json
{
  "accountId": "...",
  "opportunityId": "...",
  "quoteId": "...",
  "contractId": "...",
  "orderType": "New",
  "orderDate": "2026-01-15",
  "effectiveDate": "2026-02-01",
  "status": "Draft"
}
```

* contractId指定時、Order.AccountIdとContract.AccountIdの一致を検証（INV-ORD3）
* orderType: New / Renewal / Upsell / Amendment

## 22.2 発注→契約作成
`POST /v1/orders/{id}/actions/createContract`

```json
{
  "contractType": "License",
  "startDate": "2026-02-01",
  "termMonths": 12
}
```

* 新規契約がない場合に発注から契約を自動生成
* Order.ContractIdを設定
* OrderItemからContractLineItemを生成

## 22.3 発注→契約更新（Renewal/Upsell）
`POST /v1/orders/{id}/actions/updateContract`

* 既存Contract.EndDateの延長
* 新規ContractLineItemの追加

---

# 23. Opportunity API 拡張（契約連携）

## 23.1 既存APIへの追加パラメータ

### 作成時
```json
{
  "name": "...",
  "accountId": "...",
  "type": "Renewal",
  "sourceOpportunityId": "...",
  "contractId": "...",
  "contractType": "License",
  "billingFrequency": "Yearly",
  "termMonths": 12
}
```

### Renewal商談の自動生成
`POST /v1/opportunities/{id}/actions/createRenewalOpportunity`

```json
{
  "renewalCloseDate": "2027-01-31",
  "renewalTermMonths": 12
}
```

* 元商談のWon後、契約更新用の新商談を自動生成
* Type = "Renewal"
* SourceOpportunityId = 元商談ID
* ContractId = 元商談の契約ID

---

# 24. GraphQL API Policy (Phase 2)

## 24.1 基本方針
*   REST APIと同等の認証（OAuth2/JWT）および認可（Object/Field/Record）を適用。
*   URL: `/v1/graphql`
*   スキーマ提供方式: イントロスペクションによる動的な型取得、およびSDL提供。

## 24.2 クエリ・ミューテーション
*   **Query**: SObjectの階層取得、関連リストの一括取得、集計クエリ。
*   **Mutation**: 単件/複数件のCRUD操作、Lead変換等の業務Action。

## 24.3 ページング・制限
*   Relay-style Cursor Paging を推奨。
*   クエリの計算コスト (Complexity) による流量制限。
