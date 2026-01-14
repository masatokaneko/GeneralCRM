---
name: domain-model
description: ドメインモデル、エンティティ、不変条件、ERD、データモデル、制約に関する設計・実装支援。「エンティティ」「ドメイン」「制約」「不変条件」で呼び出される。
---

# ドメインモデル・不変条件スキル

エンティティ設計と70+の不変条件（INV-xxx）をガイドします。

## いつ使用するか

- エンティティの設計・実装時
- 不変条件（INV-xxx）の確認・実装時
- データの整合性制約を検討するとき
- 「ドメインモデル」「エンティティ」「制約」に関する質問時

## 主要参照ファイル

- `SPEC/20_機能設計/01_ドメインERD_不変条件_v1.md` - **必須**
- `SPEC/20_機能設計/02_データ辞書_v1.md`
- `SPEC/10_要件定義/01_用語集_v1.md`
- `SPEC/10_要件定義/03_業務プロセス定義_状態遷移_v1.md`

## コアエンティティ一覧

### ユーザ・組織
| エンティティ | 説明 | 主要フィールド |
|------------|------|---------------|
| User | ユーザ | username, email, role_id |
| Role | ロール階層 | parent_role_id（階層） |
| Profile | プロファイル | Object/Field権限 |
| PermissionSet | 追加権限セット | 追加権限 |

### 営業ドメイン
| エンティティ | 説明 | 主要フィールド |
|------------|------|---------------|
| Account | 取引先 | parent_id（階層） |
| Contact | 担当者 | account_id（必須） |
| Lead | リード | コンバート管理 |
| Opportunity | 商談 | account_id（必須）, ステージ管理 |
| OpportunityStage | ステージマスタ | probability, forecast_category |

### 商品・価格
| エンティティ | 説明 | 主要フィールド |
|------------|------|---------------|
| Product | 商品マスタ | product_code, is_active |
| Pricebook | 価格表 | is_standard |
| PricebookEntry | 価格表エントリ | product_id × pricebook_id |

### 見積・受注
| エンティティ | 説明 | 主要フィールド |
|------------|------|---------------|
| Quote | 見積 | is_primary |
| QuoteLineItem | 見積明細 | pricebook_entry_id |
| Order | 受注 | status |
| OrderItem | 受注明細 | pricebook_entry_id |

### 活動
| エンティティ | 説明 | 主要フィールド |
|------------|------|---------------|
| Task | タスク | who_id, what_id（多態参照） |
| Event | イベント/予定 | who_id, what_id（多態参照） |

## 重要な不変条件チェックリスト

### テナント・セキュリティ
- [ ] **INV-T1**: 全クエリで `WHERE tenant_id = :currentTenantId`
- [ ] **INV-T2**: Role階層の非循環性（最大10レベル）
- [ ] **INV-T3**: 権限継承の整合性

### 営業ドメイン
- [ ] **INV-A1**: Contact.account_id NOT NULL
- [ ] **INV-A2**: Account階層の非循環性（最大5レベル）
- [ ] **INV-O1**: Opportunity.account_id NOT NULL
- [ ] **INV-O2**: StageName は有効なStageに存在
- [ ] **INV-O3**: IsWon=true => IsClosed=true AND StageName="Closed Won"
- [ ] **INV-O4**: CloseDate >= CreatedDate

### リード
- [ ] **INV-L1**: コンバートは原子的（全成功 or 全失敗）
- [ ] **INV-L2**: Status="Disqualified" => DisqualificationReason NOT NULL

### 商品・価格
- [ ] **INV-P1**: PricebookEntry.UnitPrice >= 0
- [ ] **INV-LI1**: 商談明細のPricebook = 商談のPricebook
- [ ] **INV-LI2**: 見積明細のPricebook = 見積のPricebook
- [ ] **INV-LI3**: Amount = SUM(LineItem.TotalPrice)
- [ ] **INV-Q1**: 商談毎にis_primary=true は最大1つ

### 共有
- [ ] **INV-SH1**: 全経路（UI/API/Report）で同一の共有ロジック

## 多態参照（Polymorphic References）

| 参照名 | 対象 | 実装 |
|-------|------|------|
| WhoId | Lead または Contact | who_type + who_id |
| WhatId | Account, Opportunity, Campaign等 | what_type + what_id |
| ParentId | 添付・ノートの親レコード | parent_type + parent_id |

```sql
-- 多態参照の例
CREATE TABLE tasks (
  -- ...
  who_type text,  -- 'Lead' or 'Contact'
  who_id uuid,
  what_type text, -- 'Account', 'Opportunity', etc.
  what_id uuid,
  -- ...
  CHECK (who_type IN ('Lead', 'Contact') OR who_type IS NULL),
  CHECK (what_type IN ('Account', 'Opportunity', 'Campaign') OR what_type IS NULL)
);
```

## 循環参照チェック（SQL例）

```sql
-- Account/Role/Territory階層の循環チェック
WITH RECURSIVE hierarchy AS (
  SELECT id, parent_id, 1 as level, ARRAY[id] as path
  FROM target_table
  WHERE parent_id IS NULL AND tenant_id = ?
  UNION ALL
  SELECT t.id, t.parent_id, h.level + 1, h.path || t.id
  FROM target_table t
  JOIN hierarchy h ON t.parent_id = h.id
  WHERE NOT t.id = ANY(h.path) AND h.level < 10
)
SELECT * FROM hierarchy;
```

## 不変条件のDB制約 vs アプリ検証

| 制約種別 | 実装場所 | 例 |
|---------|---------|-----|
| NOT NULL | DB | account_id, tenant_id |
| UNIQUE | DB | (tenant_id, pricebook_id, product_id) |
| CHECK | DB | probability BETWEEN 0 AND 100 |
| 参照整合（単純FK） | DB | account_id REFERENCES accounts |
| 循環禁止 | アプリ | Role/Account/Territory階層 |
| 価格表整合 | アプリ | Opp.pricebook = LineItem.pricebook |
| 条件付き必須 | アプリ | ClosedLost => LostReason必須 |

## 状態遷移の重要ルール

### Opportunity ステージ
```
Qualification -> Needs Analysis -> Proposal -> Negotiation -> Closed Won
                                                           -> Closed Lost
```
- IsClosed=true のステージからは戻れない
- IsWon=true は Closed Won のみ

### Lead ステータス
```
Open -> Working -> Converted
               -> Disqualified
```
- Converted/Disqualified からは変更不可

### Quote ステータス
```
Draft -> Presented -> Accepted -> Converted
                   -> Rejected
```

## 実装時の注意

1. エンティティ追加時は必ず不変条件を確認
2. 階層構造を持つエンティティは循環チェック必須
3. 多態参照は type + id のペアで管理
4. 状態遷移は許可されたパスのみ
