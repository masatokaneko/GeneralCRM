# D4 Core内部モジュール設計 v1（Core Platform / Modular Monolith）

## 0. 目的と非目的

### 0.1 目的

* Coreを「一枚岩」ではなく **明確な境界を持つモジュール集合**として実装する
* 保存パイプライン（AuthZ→Validation→Automation(sync)→Persist→Audit→Outbox）を **一貫して通す**
* 後から周辺をマイクロサービスに切り出しやすい構造にする

### 0.2 非目的

* UI、周辺サービス（Sharing/Search/Automation/Approval/Reporting）の実装詳細は含めない
* ただし、Coreがそれらに依存する“参照点”はインターフェースとして定義する

---

# 1. コードベースのトップ構造（推奨）

以下は言語に依らない論理構造です（Java/Kotlin/Go/TSでも同様に実現可能）。

```
/core-platform
  /src
    /core        # 共有カーネル（横断）
    /modules     # 業務モジュール群（境界単位）
    /adapters    # 外部I/F（HTTP, MQ, etc）
  /tests
```

---

# 2. レイヤ方針（絶対ルール）

## 2.1 3層（Domain / Application / Infrastructure）

* **Domain層**：業務ルール・不変条件・状態遷移。外部依存なし。
* **Application層**：ユースケース（コマンド/クエリ）とパイプライン制御。トランザクション境界。
* **Infrastructure層**：DB/外部サービス/メッセージバス等の実装。Domainへは依存禁止。

## 2.2 依存方向（禁止依存の根本）

* Domain →（依存禁止）→ Application / Infrastructure
* Application → Domain（OK）
* Infrastructure → Domain（OK：永続化に必要な型参照のみ）
  ※ただしDomainの内部ロジックを呼ぶのはApplication経由を推奨

## 2.3 “横断（Cross-cutting）”の扱い

* AuthZ / Validation / Workflow(sync) / Audit / Outbox / Idempotency / Observability は `src/core` に集約
* 業務モジュールは `core` の“抽象”に依存し、実装は `infrastructure` に置く

---

# 3. モジュール境界（Bounded Context）

Core内のモジュールは以下に固定します。

## 3.1 業務モジュール（/modules）

* `accounts`
* `contacts`
* `leads`
* `opportunities`
* `activities`（tasks/events）
* `products`
* `pricebooks`
* `quotes`
* `orders`
* `campaigns`（スコープに含める場合）
* `reports`（※Coreは“最終評価付きの明細取得”のみ。集計は外）
* `setup_read`（Describe/Layoutsの“読み取り専用”窓口：Metadataサービスが正本だがCoreはキャッシュして読む）

## 3.2 横断コア（/core）

* `core.kernel`：ID/日時/Result/Error/DomainEvent/ValueObject基盤
* `core.security`：AuthN情報、Object/Field/Record Access評価の抽象
* `core.validation`：Validation Rule評価器（DSL ASTの抽象、実装は後で）
* `core.workflow`：Workflow(sync) 実行基盤（Before/After Save同期）
* `core.audit`：field_history/audit_event 書き込み抽象
* `core.outbox`：Outbox insert/publish抽象
* `core.tx`：トランザクション/UnitOfWork
* `core.idempotency`：Idempotency-Key処理
* `core.idempotency`：Idempotency-Key処理
* `core.time`：Clock（テスト容易性）
* `core.observability`：logging/tracing/metrics抽象

## 3.3 アダプタ（/adapters）

* `adapters.http`：REST（API仕様書 v1 を実装）
* `adapters.mq`：イベントバス購読（基本は周辺が購読するのでCoreは発行中心）
* `adapters.admin`：管理系（必要なら）

---

# 4. モジュール内部構造（テンプレ）

各業務モジュールは必ず以下の形を守る。

```
/modules/<module>
  /domain
    /model        # Entity/Aggregate/ValueObject
    /service      # Domain Service（必要時のみ）
    /policy       # 不変条件・ガード（例：ステージ遷移）
    /event        # Domain Event（型）
  /application
    /command      # UseCase（Create/Update/Actions）
    /query        # Read UseCase（List/Get）
    /dto          # 入出力（API DTOとは分離推奨）
    /port         # 外部I/F（Repository, External services）
  /infrastructure
    /repository   # DB永続化実装
    /mapper       # DB row <-> domain
```

---

# 5. Aggregate設計（更新の単位）

**“1トランザクションで強整合を保つ単位”**を固定します。

## 5.1 Aggregate一覧（コア）

* Account（+ AccountTeam/ManualShareは別モジュールでも可）
* Contact
* Lead
* Opportunity（+ LineItems, ContactRoles, Team）
* Quote（+ LineItems）
* Order（+ Items）
* Task / Event
* Product
* Pricebook（+ Entries）

## 5.2 ルール：他Aggregateを直接書き換えない

* Opportunity更新で Account を直接更新しない
  → 必要なら **ドメインイベント** →（同期はApplication orchestration）で行う
* 例外：同一画面で“必ず一緒に更新される”もの（Opp + LineItems）は Opportunity Aggregate 内に含める

---

# 6. 保存パイプライン（Coreの“背骨”）

Application層に `SavePipeline` を持ち、全Writeがここを通る。

## 6.1 Pipelineのステップ（順序固定）

1. **AuthZ Pre-check**（Object/Field/Recordの最低限）
2. **Normalize**（型変換、trim、通貨等）
3. **Validate**（Validation Rules + ドメイン不変条件）
4. **Workflow(sync) BeforeSave**
5. **Persist**（Repository）
6. **Workflow(sync) AfterSave**
7. **Audit**（field_history / audit_event）
8. **Outbox Append**（同一TXでinsert）
9. Commit

> 重要：AfterSaveでフィールド更新が起きる場合は「再Persist」せず、
> “Update set …” を同一UoW内で適用して最後にまとめて保存、または AfterSaveは副作用なし（通知等）は非同期へ。

---

# 7. 外部依存（Ports）と禁止依存

## 7.1 Ports（Applicationが依存して良い抽象）

* `PermissionEvaluator`（Object/Field/Record Access）
* `SharingAccessReader`（sharesを読む：DB直 or service）
* `ApprovalStateReader`（承認ロック状態）
* `MetadataProvider`（Describe/Layouts/Rulesの読み取り）
* `OutboxWriter`
* `AuditWriter`
* `Clock`

## 7.2 禁止依存（強制）

* 業務モジュールが **他モジュールのInfrastructure** を呼ぶことを禁止
  例：`opportunities.infrastructure` → `accounts.infrastructure` 呼び出しは禁止
* 業務モジュールが **adapters層** を参照禁止
* domain層が port/repository を参照禁止（純粋性維持）

## 7.3 モジュール間参照の許可範囲

* 原則：モジュール間は **Application層でオーケストレーション**し、Domain同士の直参照を避ける
* 例外：参照IDやValueObject（`AccountId`等）は `core.kernel` に置く

---

# 8. イベント発行点（DomainEvent / IntegrationEvent）

## 8.1 発行点（いつ作るか）

* **Persist後、Audit前**に DomainEvent を確定（更新差分が必要なため）
* **Outbox Append** は Auditと同じTXで必ず実行

## 8.2 発行するイベント（Core内で生成）

* `RecordCreated/Updated/Deleted`
* `OwnerChanged`
* `StageChanged`
* `LeadConverted`
* `PrimaryQuoteChanged`（必要なら）
* `QuoteStatusChanged`（Presented/Accepted等）

## 8.3 生成責務

* “業務的イベント”（StageChanged等）は **該当モジュールのDomain** が作る
* “汎用イベント”（RecordUpdated）は **SavePipeline** が作る（changedFieldsはUoWが差分を持つ）

---

# 9. テスト境界（Test Strategy）

## 9.1 テストレベル定義

### (T1) Domain Unit Test（最優先）

* domain/model/policy/service を **DBなしで** テスト
* 例：Opportunityのステージ遷移、CloseLostでLostReason必須 等

### (T2) Application UseCase Test（次点）

* Repository/Portsをモックしてパイプライン順序と分岐をテスト
* 例：AuthZ失敗でValidationが走らない、AfterSaveでOutboxが追加される等

### (T3) Persistence Integration Test

* PostgresでDDLに対して repository が正しく動くか
* 索引/制約（PrimaryQuote部分一意など）も確認

### (T4) Contract Test（API）

* adapters/http のDTOとApplication DTOの整合
* エラーフォーマット統一、フィールドマスキング

### (T5) Event Contract Test

* outboxに入るイベントpayloadが仕様書 v1 に合致
* schemaVersion、recordVersion、changedFields の妥当性

## 9.2 テストの責務分離（禁止）

* DomainテストでDBを使わない
* ApplicationテストでHTTPを叩かない（adapterの責務）
* adapterテストで業務ルール詳細を検証しない（domainの責務）

---

# 10. 具体例（Opportunityのモジュール構造）

```
/modules/opportunities
  /domain/model
    Opportunity
    OpportunityLineItem
    OpportunityContactRole
  /domain/policy
    StageTransitionPolicy
    ClosePolicy
    PricebookConsistencyPolicy  # PBEとOpp Pricebook一致（Validationでも可）
  /domain/event
    StageChanged
    OwnerChanged
  /application/command
    CreateOpportunity
    UpdateOpportunity
    ChangeStage
    CloseOpportunity
    AddLineItem
    AddContactRole
  /application/port
    OpportunityRepository
    PricebookEntryReader
  /infrastructure/repository
    PgOpportunityRepository
```

* `ChangeStage` は

  * AuthZ（Update）
  * Validation（RequiredFields）
  * Policy（StageTransitionPolicy）
  * Persist
  * Audit + Outbox（StageChanged + RecordUpdated）

---

# 11. “禁止依存”を機械的に守る方法（実装ルール）

言語により手段は違うが、以下のいずれかを必須にする：

* パッケージ可視性制限（internal/package-private）
* 静的解析（ArchUnit/dep-cruiser等）
* CIで依存ルール違反を落とす

最低限のルールセット：

1. `modules/*/domain` は `core/*` 以外を import禁止
2. `modules/*/infrastructure` は 他モジュールの `infrastructure` を import禁止
3. `adapters/*` は `application` のみ参照し、`domain` を直接参照禁止（DTO分離する場合）

---

# 12. 実装開始に必要な“最低限の雛形”（ここまでがDoneの定義）

このD4が意味を持つために、実装上は以下の骨格を最初に作る：

* `core.tx.UnitOfWork`
* `core.outbox.OutboxWriter`
* `core.audit.AuditWriter`
* `core.security.PermissionEvaluator`（暫定でも可）
* `SavePipeline`（Writeの共通処理）
* 1モジュール（例：Accounts）で end-to-end（HTTP→UseCase→Repo→Audit→Outbox）
