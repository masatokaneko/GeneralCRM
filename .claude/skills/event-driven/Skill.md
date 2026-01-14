---
name: event-driven
description: イベント駆動アーキテクチャ、ドメインイベント、Outbox、メッセージング、非同期処理に関する設計・実装支援。「イベント」「非同期」「メッセージ」「Outbox」「Kafka」で呼び出される。
---

# イベント駆動アーキテクチャスキル

ドメインイベントとOutboxパターンの設計をガイドします。

## いつ使用するか

- ドメインイベントの設計・実装時
- サービス間連携の設計時
- Outboxパターンの実装時
- 非同期処理の設計時
- 「イベント」「非同期」「メッセージ」「Outbox」に関する質問時

## 主要参照ファイル

- `SPEC/30_インターフェース/33_イベント仕様書_v1.md` - **必須**
- `SPEC/30_インターフェース/32_サービス境界仕様書_v1.md` - **必須**
- `SPEC/20_機能設計/26_アプリケーションアーキテクチャ設計_v1.md`

## イベントの種類

### Domain Event（Core発行）
- Core保存トランザクションから発行
- 正本の状態変化を通知

### Integration Event（他サービス発行）
- Metadata/Approval/Sharing等が発行
- 設定・派生状態変化を通知

## 配信モデル

| 項目 | 仕様 |
|-----|------|
| 配信 | At-least-once（少なくとも1回） |
| 受信側 | 冪等（eventIdで重複排除） |
| 順序 | 原則保証なし（recordVersionで古いイベント無視） |

## イベントエンベロープ（共通フォーマット）

```json
{
  "eventId": "uuid",
  "schemaVersion": 1,
  "eventType": "RecordUpdated",
  "occurredAt": "2026-01-10T12:34:56.789Z",
  "tenantId": "uuid",
  "producer": {
    "service": "core-platform",
    "instanceId": "pod-xyz"
  },
  "correlationId": "uuid",
  "sequence": {
    "partitionKey": "Opportunity:tenantId:recordId",
    "recordVersion": "2026-01-10T12:34:56.789Z"
  },
  "payload": { }
}
```

## 主要イベント一覧

### Core発行（Domain Event）

| イベント | 発行条件 | 主要購読先 |
|---------|---------|----------|
| RecordCreated | Create成功 | Sharing, Search, Reporting |
| RecordUpdated | Update成功 | Sharing, Search, Automation |
| RecordDeleted | Delete成功 | Sharing, Search, Reporting |
| OwnerChanged | Owner変更 | Sharing（最重要） |
| StageChanged | ステージ変更 | Reporting, Automation |
| LeadConverted | Lead変換 | Search, Reporting |

### Integration Event

| イベント | 発行元 | 主要購読先 |
|---------|-------|----------|
| ApprovalSubmitted | Approval | Core（ロック適用） |
| ApprovalDecided | Approval | Core, Automation |
| MetadataChanged | Metadata | Core, Search, Reporting |
| PermissionChanged | Metadata | Core, Sharing |
| SharingUpdated | Sharing | Search, Reporting |

## Outbox仕様

### テーブル定義（Section 22.2）
```sql
CREATE TABLE outbox_events (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  event_type text NOT NULL,       -- 'Account.Created', 'Opportunity.StageChanged' 等
  aggregate_type text NOT NULL,   -- 'Account', 'Opportunity' 等
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  metadata jsonb,
  status text NOT NULL DEFAULT 'Pending',  -- Pending/Published/Failed
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  PRIMARY KEY (tenant_id, id),
  CHECK (status IN ('Pending','Published','Failed'))
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_outbox_pending ON outbox_events (tenant_id, status, created_at)
  WHERE status = 'Pending';
```

### 書き込み
```sql
-- レコード保存と同一トランザクションでINSERT
BEGIN;
  UPDATE opportunities SET ...;
  INSERT INTO outbox_events (tenant_id, event_id, event_type, payload)
  VALUES (:tenant_id, :event_id, 'RecordUpdated', :payload);
COMMIT;
```

### 配信
1. Outbox Publisherが未配信行を読む
2. Event Busへpublish
3. 成功後に `published_at` を更新

### 再送
- publish重複は許容（At-least-once）
- 受信側が `eventId` で重複排除

## 受信側の冪等ルール

### processed_events（受信ログ）
```sql
CREATE TABLE processed_events (
  tenant_id uuid NOT NULL,
  event_id uuid NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, event_id)
);
```

### 処理済みチェック
```python
def process_event(event):
    # 重複チェック
    if exists_processed_event(event.tenant_id, event.event_id):
        return  # スキップ

    # 処理実行
    handle_event(event)

    # 処理済み記録
    insert_processed_event(event.tenant_id, event.event_id)
```

## 順序保証

### partitionKey
- 同一レコード内の順序: `"{ObjectName}:{tenantId}:{recordId}"`
- Kafka等でパーティションキーによる順序配信

### recordVersionによる古いイベント無視
```python
def handle_event(event):
    record_id = event.payload["recordId"]
    event_version = event.sequence["recordVersion"]

    # 最後に適用したバージョンより古ければスキップ
    last_version = get_last_applied_version(record_id)
    if last_version and event_version < last_version:
        return  # 古いイベントを無視

    # 処理
    apply_event(event)

    # バージョン更新
    set_last_applied_version(record_id, event_version)
```

## リトライ・DLQ

### リトライ戦略
- 一時エラー: 指数バックオフで最大N回
- 恒久エラー: DLQへ

### DLQ運用
- 再投入（手動/自動）
- スキップ（監査残す）
- アラート通知

## サービス間依存ルール

### Single Writer原則
- 業務データの書き込みは **Core Platform のみ**
- 他サービスはイベント経由で更新

### 依存の基本ルール
- Coreは他サービスのDBを直接書かない
- Coreの同期依存は「参照（Read）」のみ
- 非同期サービスからのCore書き込みはCore API経由

## Payload設計の注意

```json
// OK: IDと変更フィールドのみ
{
  "recordId": "uuid",
  "objectName": "Opportunity",
  "changedFields": ["StageName", "Amount"],
  "newValues": {
    "StageName": "Closed Won",
    "Amount": 1000000
  }
}

// NG: 機密フィールドを含む
{
  "record": {
    "ssn": "123-45-6789",  // NG
    "creditCard": "..."    // NG
  }
}
```

## イベント購読（Webhook）

### テーブル定義（Section 22.1）: `event_subscriptions`
```sql
CREATE TABLE event_subscriptions (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  subscription_name text NOT NULL,
  object_name text NOT NULL,         -- 対象オブジェクト
  event_types jsonb NOT NULL,        -- ['Created','Updated','Deleted']
  target_url text NOT NULL,          -- Webhook送信先URL
  secret_hash text,                  -- HMAC署名用
  is_active boolean NOT NULL DEFAULT true,
  retry_policy jsonb,
  PRIMARY KEY (tenant_id, id)
);
```

## 実装チェックリスト

- [ ] Outboxへの確実な記録（同一TX）
- [ ] 受信側の `eventId` 重複排除
- [ ] `recordVersion` での古いイベント無視
- [ ] DLQ運用の実装
- [ ] payloadに機密フィールドを載せない
- [ ] correlationIdの伝播
- [ ] 監視・アラートの設定
- [ ] event_subscriptions による購読管理
