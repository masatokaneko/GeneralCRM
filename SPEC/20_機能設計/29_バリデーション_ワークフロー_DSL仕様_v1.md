# E3 Validation / Workflow DSL 仕様 v1

## 0. 目的と適用範囲

### 0.1 目的

* 管理者が定義する **Validation Rules / Workflow Rules / Field Updates（sync）** を、統一DSLで表現し、Core保存パイプライン内で評価できるようにする
* 評価順・衝突（同一フィールドへの複数更新）・再帰（無限ループ）を明確に規定し、挙動を固定する

### 0.2 適用範囲（v1）

**対象**

* Validation Rules（保存拒否）
* Workflow Rules（条件一致でアクション実行）

  * Field Update（同期）
  * Task作成 / Notification / Webhook（非同期：Automation Serviceへイベント）

**非対象（v1では別章）**

* Flowのような汎用プロセス（分岐/ループ/複数オブジェクト更新の大型機能）
* Apex相当の任意コード
* 複雑な集計参照（将来Reporting/Query関数で拡張）

---

# 1. 保存パイプライン内の位置（確定）

Writeは必ず以下の順で評価します：

1. AuthZ Pre-check
2. Normalize
3. **Validation Rules**（失敗なら即拒否）
4. **Workflow BeforeSave（同期）**：Field Updateのみ（同一レコード内）
5. Persist（1回で確定させる）
6. **Workflow AfterSave（同期）**：原則 “副作用なし”。どうしても必要な場合は「非同期」へ
7. Audit
8. Outbox Append
9. Commit

> v1のベスト：同期でレコードを書き換えるのは **BeforeSaveの Field Updateのみ** に限定（AfterSaveでの再書き込み地獄を防ぐ）。

---

# 2. 共通 DSL（Condition AST）仕様

## 2.1 式のデータ型

* `Null`
* `Boolean`
* `Number`（整数/小数）
* `String`
* `Date`（YYYY-MM-DD）
* `DateTime`（ISO8601）
* `Id`（UUID/ULID）
* `Enum`（Stringとして扱い、許容値はメタデータで制約）

## 2.2 参照可能なコンテキスト

* `record`：保存対象の“新しい状態”（フィールド更新適用後の値が見える）
* `prior`：更新前の状態（Create時は全部Null）
* `user`：操作者（id、role、locale等）
* `now`：現在日時（Clock）
* `metadata`：メタデータ（ただし条件式内で多用しない。基本は定義側が持つ）

## 2.3 フィールド参照

* `{"ref":"record.Amount"}`
* `{"ref":"prior.StageName"}`

※フィールド名は API Name（例：`CloseDate`, `ForecastCategoryName`）で固定。

---

# 3. Condition AST（JSON）正式スキーマ

DSLは JSON AST として保存（`jsonb`）し、`schemaVersion` を付ける。

## 3.1 ルート

```json
{
  "schemaVersion": 1,
  "expr": { ... }
}
```

## 3.2 Exprノード種類（v1）

### 3.2.1 論理

* `and`, `or`, `not`

```json
{"op":"and","args":[ <expr>, <expr> ]}
{"op":"or","args":[ <expr>, <expr> ]}
{"op":"not","arg": <expr> }
```

### 3.2.2 比較

* `eq`, `ne`, `gt`, `gte`, `lt`, `lte`
* `in`（集合に含まれる）
* `between`（数値/日付）

```json
{"op":"eq","left":<valueExpr>,"right":<valueExpr>}
{"op":"in","left":<valueExpr>,"right":{"op":"list","items":[<valueExpr>,...]}}
{"op":"between","value":<valueExpr>,"min":<valueExpr>,"max":<valueExpr>}
```

### 3.2.3 文字列

* `contains`, `startsWith`, `endsWith`, `matches`（正規表現）
* `length`

```json
{"op":"contains","text":<valueExpr>,"substr":<valueExpr>}
{"op":"matches","text":<valueExpr>,"pattern":"^A.*$"}
{"op":"length","text":<valueExpr>}
```

### 3.2.4 Null/空判定

* `isNull`
* `isBlank`（Null または 空文字 または 空白のみ）
* `isChanged`（Update時のみ true/false）
* `isNew`（Create）
* `wasNull`（priorがNull）

```json
{"op":"isNull","value":<valueExpr>}
{"op":"isBlank","value":<valueExpr>}
{"op":"isChanged","field":"StageName"}     // prior.StageName != record.StageName
{"op":"isNew"}
{"op":"wasNull","field":"CloseDate"}
```

### 3.2.5 数値/日付関数（v1最小）

* `addDays(date, n)`
* `today()`
* `dateDiffDays(a,b)`（a-b）
* `coalesce(a,b,...)`

```json
{"op":"today"}
{"op":"addDays","date":<valueExpr>,"days":<valueExpr>}
{"op":"coalesce","args":[<valueExpr>,<valueExpr>]}
```

### 3.2.6 値式

* `literal`
* `ref`
* `list`

```json
{"op":"literal","type":"String","value":"Closed Won"}
{"op":"ref","path":"record.StageName"}
{"op":"list","items":[{"op":"literal","type":"String","value":"A"}]}
```

---

# 4. Validation Rule 仕様

## 4.1 定義モデル

```json
{
  "id":"uuid",
  "tenantId":"uuid",
  "objectName":"Opportunity",
  "name":"CloseLostRequiresReason",
  "isActive":true,
  "errorMessage":"失注理由を入力してください。",
  "errorLocation": { "type":"field", "fieldName":"LostReason" },
  "condition": { "schemaVersion":1, "expr": { ... } },
  "severity":"error",
  "order": 100
}
```

### 4.1.1 `condition` の意味

* **condition が true のときにエラー**（＝禁止条件）

  * Salesforce互換の “エラー条件式” と同じ発想で統一します

## 4.2 評価順（固定）

1. `order` 昇順
2. 同一orderは `name` 昇順（安定化）
3. すべて評価して **エラーを集約**（fail-fastは禁止：管理者に優しい）

## 4.3 エラー形式（APIへ伝える）

```json
{
  "code":"VALIDATION_ERROR",
  "message":"Validation failed",
  "details":[
    {"ruleId":"...","ruleName":"CloseLostRequiresReason","message":"失注理由を入力してください。","location":{"type":"field","field":"LostReason"}}
  ]
}
```

---

# 5. Workflow Rule 仕様（同期/非同期を分離）

## 5.1 定義モデル

```json
{
  "id":"uuid",
  "objectName":"Opportunity",
  "name":"SetProbabilityDefault",
  "isActive":true,
  "trigger":"beforeSave",              // beforeSave | afterSave
  "evaluation":"onCreateOrUpdate",     // onCreate | onUpdate | onCreateOrUpdate
  "order": 200,
  "condition": { "schemaVersion":1, "expr": { ... } },
  "actions":[
    {"type":"fieldUpdate","fieldName":"Probability","valueExpr":{...},"guardEditable":true}
  ]
}
```

### 5.1.1 triggerルール（v1）

* `beforeSave`：**fieldUpdate のみ許可**（同期）
* `afterSave`：**非同期アクションのみ**（task/notification/webhook/job enqueue）

  * afterSaveでfieldUpdateは v1禁止（無限ループ/二重保存防止）

## 5.2 評価順（固定）

1. `trigger` ごとに分離（beforeSave→persist→afterSave）
2. 各trigger内で `order` 昇順、同orderはname昇順

---

# 6. Field Update（同期アクション）の仕様

## 6.1 アクションモデル

```json
{
  "type":"fieldUpdate",
  "fieldName":"ForecastCategoryName",
  "valueExpr": { "op":"literal","type":"String","value":"Commit" },
  "whenNullOnly": false,
  "guardEditable": true,
  "conflictPolicy": "lastWriteWins"   // v1固定
}
```

### 6.1.1 主要ルール

* `valueExpr` は DSL ValueExpr で評価
* `whenNullOnly=true` の場合：現在値がNull/Blankのときのみ上書き
* `guardEditable=true`：Field Permissionが editable=false の場合は **エラー**（サイレント無視禁止）

  * エラーコード：`FIELD_NOT_EDITABLE_BY_AUTOMATION`
* Field Update後の値は **同じbeforeSave中の後続ルール** から参照される（重要）

## 6.2 変更検知（差分）

* beforeSaveでフィールド更新が起きた場合、`changedFields` に含める
* ただし Audit は **prior → final** の差分（最終状態）で記録

---

# 7. 衝突解決（同一フィールドを複数ルールが更新する）

v1は **運用を単純にするため固定**します。

## 7.1 ルール（v1固定）

* 同一trigger内（beforeSave）の fieldUpdate が同一フィールドを更新した場合：

  * **後勝ち（lastWriteWins）**
  * ただし、衝突が発生したことを `workflow_conflicts` に記録（監査/デバッグ用）

## 7.2 衝突ログ（任意テーブル）

* `workflow_conflicts(tenant_id, object_name, record_id, field_name, rule_ids[], occurred_at, correlation_id)`

> v2で「優先度による勝ち」や「衝突時エラー」を選べるようにする余地を残す。

---

# 8. 再帰・無限ループ防止（最重要）

## 8.1 v1の設計上の防止策

* beforeSaveは1回だけ実行し、persistは1回だけ
* afterSaveでfieldUpdate禁止（再保存禁止）
  → これだけで典型的な無限ループの大半は防げます

## 8.2 それでも必要なガード

* beforeSaveの中で、同じルールが連鎖的に再評価されないよう、

  * **“ルール評価は最大1回”**（同一ルールは同一保存で再評価しない）
* Field Updateにより条件が変わっても **「前から順に一巡」**で終える

  * ルール再走査（fixpoint）は v1ではしない（複雑化を避ける）

> これにより「後続の更新で先頭条件が真になった」ケースは拾えないが、v1は安定性優先。必要なら管理者は order を調整して実現。

---

# 9. Bulk / 一括更新時の挙動（v1）

## 9.1 単位

* 1リクエストで複数レコード更新でも、**レコード単位に独立**して評価する
* Cross-record参照（例：同一アカウント配下の件数）を条件式で直接行うことは v1では禁止

  * どうしても必要なら Reporting/Automation側の非同期集計へ

## 9.2 失敗時

* バルクは「全体ロールバック」か「部分成功」をモードで選択

  * v1推奨：`allOrNothing=true` をデフォルト（整合性優先）
* エラーはレコードごとの details を返す

---

# 10. 実装I/F（Core内ポート設計）

## 10.1 ValidationEngine

* `evaluateValidations(objectName, record, prior, userContext) -> [ValidationError]`

## 10.2 WorkflowEngine (sync)

* `applyBeforeSaveFieldUpdates(objectName, recordMutable, prior, userContext) -> WorkflowResult`

  * WorkflowResult: `appliedActions[]`, `conflicts[]`, `changedFields[]`

## 10.3 MetadataProvider 依存

* 取得するもの：

  * 対象objectの validation_rules/workflow_rules（有効なもの）
  * field permissions（editableの判定に使うのは PermissionEvaluator でもOK）
  * フィールド型（valueExpr評価の型安全に使う）

---

# 11. テスト境界（E3に対するテスト）

## 11.1 DSLパーサ/評価器ユニット（必須）

* 各opの型チェック
* Null/Blankの境界
* isChanged / prior参照
* 日付関数

## 11.2 ルール評価順テスト（必須）

* orderが効く
* lastWriteWins が効く
* conflictsログが出る

## 11.3 パイプライン統合（必須）

* Validationがエラーならpersistしない
* beforeSave fieldUpdateが反映された状態でpersistされる
* outboxのchangedFieldsが最終状態に一致する

---

# 12. 受入条件（Validation/Workflow）

1. Validationは order順に全件評価し、エラーを集約して返す
2. beforeSave workflow fieldUpdate は order順に適用され、後続ルールから更新後値が見える
3. 同一フィールド更新の衝突は lastWriteWins で決着し、衝突ログが残る
4. afterSaveでレコード更新が走らず、保存は1回で完結する
5. 権限（Field editable）に反する自動更新はエラーになる（サイレント無視しない）
