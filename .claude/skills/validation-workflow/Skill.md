---
name: validation-workflow
description: バリデーション、ワークフロー、保存パイプライン、自動化、承認プロセスに関する設計・実装支援。「バリデーション」「ワークフロー」「自動化」「承認」「パイプライン」で呼び出される。
---

# バリデーション・ワークフロースキル

保存パイプラインとバリデーション・ワークフローの設計をガイドします。

## いつ使用するか

- バリデーションルールの設計・実装時
- ワークフロー・自動化の設計時
- 保存パイプラインの実装時
- 承認プロセスの設計時
- 「バリデーション」「ワークフロー」「自動化」「承認」に関する質問時

## 主要参照ファイル

- `SPEC/20_機能設計/04_自動化設計_v1.md` - **必須**
- `SPEC/20_機能設計/29_バリデーション_ワークフロー_DSL仕様_v1.md` - **必須**
- `SPEC/20_機能設計/01_ドメインERD_不変条件_v1.md`

## 保存パイプライン（全経路共通）

```
1. AuthZ Gate        ← 権限チェック
2. Input Normalization ← 正規化
3. Before-Automation  ← 派生項目補完
4. Validation        ← 入力制約（失敗時は中断）
5. Persist           ← DB保存（楽観ロック）
6. After-Automation   ← 同期処理
7. Async Automation   ← 非同期処理
8. Audit Finalize    ← 監査ログ確定
```

**重要**: UI/API/バルクの全てがこのパイプラインを通る

## Validation Rule

### 定義構造
```json
{
  "id": "uuid",
  "objectName": "Opportunity",
  "name": "CloseLostRequiresReason",
  "isActive": true,
  "errorMessage": "失注理由を入力してください。",
  "errorLocation": { "type": "field", "fieldName": "LostReason" },
  "condition": { "schemaVersion": 1, "expr": { ... } },
  "severity": "error",
  "order": 100
}
```

**condition が true のときにエラー**（禁止条件）

### コア必須Validation

| ID | 対象 | 条件 | エラー |
|----|------|------|--------|
| VR-OPP-01 | Opportunity | IsBlank(AccountId) | 取引先は必須 |
| VR-OPP-02 | Opportunity | IsWon=true AND IsClosed=false | Won商談はClosed必須 |
| VR-OPP-03 | Opportunity | IsClosedLost AND IsBlank(LostReason) | 失注理由必須 |
| VR-LI-01 | OppLineItem | PBE.Pricebook != Opp.Pricebook | 価格表不一致 |
| VR-QUOTE-01 | Quote | IsPrimary重複 | Primary見積は1つ |

## Workflow Rule

### 定義構造
```json
{
  "id": "uuid",
  "objectName": "Opportunity",
  "name": "SetProbabilityDefault",
  "isActive": true,
  "trigger": "beforeSave",
  "evaluation": "onCreateOrUpdate",
  "order": 200,
  "condition": { ... },
  "actions": [
    {"type": "fieldUpdate", "fieldName": "Probability", "valueExpr": {...}}
  ]
}
```

### triggerルール

| trigger | 許可アクション | タイミング |
|---------|-------------|----------|
| beforeSave | fieldUpdateのみ | 同期（Persist前） |
| afterSave | 通知、Webhook等 | 非同期（Persist後） |

### コア必須Workflow

| ID | トリガ | 条件 | アクション |
|----|-------|------|----------|
| WF-OPP-01 | BeforeSave | Changed("StageName") | Probability/ForecastCategory同期 |
| WF-QUOTE-01 | AfterSave | IsPrimary AND Status="Accepted" | Opp.PrimaryQuoteId設定 |
| WF-SHARE-01 | Async | Changed("OwnerId") | 共有再計算 |

## 条件式DSL（Condition AST）

### 参照可能コンテキスト
- `record`: 保存対象の新しい状態
- `prior`: 更新前の状態
- `user`: 操作者
- `now`: 現在日時

### 主要オペレータ

```json
// 論理演算
{"op": "and", "args": [...]}
{"op": "or", "args": [...]}
{"op": "not", "arg": {...}}

// 比較
{"op": "eq", "left": {...}, "right": {...}}
{"op": "ne", "left": {...}, "right": {...}}
{"op": "gt", "left": {...}, "right": {...}}
{"op": "gte", "left": {...}, "right": {...}}
{"op": "lt", "left": {...}, "right": {...}}
{"op": "lte", "left": {...}, "right": {...}}
{"op": "in", "left": {...}, "right": {"op": "list", "items": [...]}}

// Null/Blank検知
{"op": "isNull", "value": {"op": "ref", "path": "record.Amount"}}
{"op": "isBlank", "value": {...}}

// 変更検知
{"op": "isChanged", "field": "StageName"}
{"op": "isNew"}

// 参照
{"op": "ref", "path": "record.StageName"}
{"op": "ref", "path": "prior.StageName"}
{"op": "ref", "path": "user.ProfileId"}

// リテラル
{"op": "literal", "value": "Closed Lost"}
{"op": "literal", "value": 100}
```

### 条件式の例

```json
// ClosedLost かつ LostReason が空
{
  "op": "and",
  "args": [
    {
      "op": "eq",
      "left": {"op": "ref", "path": "record.StageName"},
      "right": {"op": "literal", "value": "Closed Lost"}
    },
    {
      "op": "isBlank",
      "value": {"op": "ref", "path": "record.LostReason"}
    }
  ]
}
```

## 衝突・ループ防止

### 衝突解決（v1）
- 同一フィールドを複数ルールが更新: **後勝ち（lastWriteWins）**
- 衝突ログを記録

### ループ防止
- BeforeSave → Persist → AfterSave を1回のみ
- AfterSaveでのfieldUpdate禁止
- 同一ルールは同一保存で1回のみ評価

## 承認プロセス

### 状態遷移
```
Draft → Submitted → Approved
                  → Rejected
      → Recalled
```

### 承認中ロック
- `lockedFields` への編集禁止
- Delete/OwnerChange 原則禁止

### 承認API
```
POST /v1/approvals/submit
POST /v1/approvals/workItems/{workItemId}/decide
POST /v1/approvals/{approvalInstanceId}/recall
```

## 物理テーブル（自動化・承認）

### 自動化テーブル（Section 8）
| テーブル | 説明 |
|---------|------|
| validation_rules | 入力検証ルール定義 |
| workflow_rules | ワークフロールール定義 |
| workflow_actions | アクション定義（FieldUpdate, Task, Email等） |
| scheduled_jobs | スケジュールジョブ（cron形式） |
| automation_run_logs | 実行ログ（パーティション推奨） |

### 承認テーブル（Section 9）
| テーブル | 説明 |
|---------|------|
| approval_process_definitions | 承認プロセス定義 |
| approval_instances | 承認インスタンス（申請単位） |
| approval_work_items | ワークアイテム（承認ステップ単位） |
| approval_histories | 承認履歴（全アクション記録） |

## 実装チェックリスト

- [ ] Validationは order順に全件評価、エラー集約
- [ ] beforeSave fieldUpdateは order順適用
- [ ] 後続ルールから更新値参照可能
- [ ] 同一フィールド衝突は lastWriteWins
- [ ] 衝突ログ記録
- [ ] afterSaveでレコード更新なし
- [ ] Field editable違反の自動更新はエラー
- [ ] 承認中ロックが確実に効く
- [ ] ループ防止の実装
