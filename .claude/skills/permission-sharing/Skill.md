---
name: permission-sharing
description: 権限、共有、セキュリティ、OWD、ロール階層、FLS、レコードアクセスに関する設計・実装支援。「権限」「共有」「セキュリティ」「アクセス制御」「OWD」「ロール」で呼び出される。
---

# 権限・共有設計スキル

3層権限モデルと共有評価アルゴリズムをガイドします。

## いつ使用するか

- 権限・共有機能の設計・実装時
- Object/Field/Record権限の確認時
- 共有ルール、ロール階層の実装時
- 「権限」「共有」「セキュリティ」「アクセス制御」に関する質問時

## 主要参照ファイル

- `SPEC/20_機能設計/03_権限_共有設計_v1.md` - **必須**
- `SPEC/20_機能設計/28_権限評価_共有_詳細決定表_v1.md` - **必須**
- `SPEC/20_機能設計/25_物理DB設計_v1.md`

## 3層権限モデル

```
FinalAccess = ObjectPerm ∩ FieldPerm ∩ RecordAccess
```

### 1. Object Permission（オブジェクト権限）

| 権限 | 説明 |
|-----|------|
| Create | 新規作成可能 |
| Read | 参照可能 |
| Update | 編集可能 |
| Delete | 削除可能 |
| ViewAll | 共有を無視して全件参照 |
| ModifyAll | 共有を無視して全件編集 |

### 2. Field Permission（項目権限）

| 権限 | 説明 |
|-----|------|
| Readable | 参照可能 |
| Editable | 編集可能（Readable を含む） |

### 3. Record Sharing（レコード共有）

| アクセスレベル | 説明 |
|--------------|------|
| Read | 閲覧のみ |
| Write | 編集可能 |

## OWD（Organization-Wide Default）

| 設定 | 説明 |
|-----|------|
| Private | 所有者以外は見えない |
| PublicReadOnly | 全員が見れる、編集は共有付与者 |
| PublicReadWrite | 全員が見れて編集できる |
| ControlledByParent | 親レコードに従う |

### 物理テーブル: `owd_settings`
- オブジェクト毎のデフォルトアクセスレベルを定義
- `default_internal_access`: 内部ユーザ向け
- `default_external_access`: 外部ユーザ向け（ポータル等）

## 共有のソース（RowCause）

| RowCause | 説明 |
|---------|------|
| Owner | 所有者 |
| RoleHierarchy | ロール階層による上位者アクセス |
| Rule | 共有ルール |
| Manual | 手動共有 |
| Team | チームメンバー |
| Territory | テリトリ |
| Implicit | 暗黙共有（親子関係） |

### 物理テーブル: `sharing_rules`
- 条件に基づくレコードアクセス拡張ルール定義
- `rule_type`: Criteria（条件ベース）/ Owner（オーナーベース）
- `target_subject_type`: Role / RoleAndSubordinates / Group / Territory
- `access_level`: Read / Write

## RecordAccess評価アルゴリズム

### 評価順序（短絡評価）
```
1. ModifyAll/ViewAll特権 → 即座にWrite/Read許可
2. Object Read権限なし → 即座に拒否
3. OWD Public → 対応するアクセスレベル
4. Owner → owner_id = userId なら Write
5. Role Hierarchy → 上位ロールならアクセス
6. Implicit Share → 親にアクセスあればRead
7. object_shares評価 → subject一致で最大アクセスレベル
```

### Read決定表

| 優先 | 条件 | 結果 |
|-----|------|------|
| 1 | ViewAll=true | Read許可 |
| 2 | owner_id=userId | Read許可 |
| 3 | OWD=PublicRead* | Read許可 |
| 4 | RoleHierarchy（上位） | Read許可 |
| 5 | Territory/Team | Read許可 |
| 6 | object_shares一致 | Read許可 |
| 7 | Implicit（親アクセス） | Read許可 |
| 8 | 上記なし | 拒否(404) |

### Write決定表

| 優先 | 条件 | 結果 |
|-----|------|------|
| 1 | ModifyAll=true | Write許可 |
| 2 | owner_id=userId かつ OWD許可 | Write許可 |
| 3 | OWD=PublicReadWrite | Write許可 |
| 4 | RoleHierarchy かつ GAUH=true | Write許可 |
| 5 | Territory/Team(Write) | Write許可 |
| 6 | object_shares(Write) | Write許可 |
| 7 | Implicit(Write) | Write許可 |
| 8 | 上記なし | 拒否(403) |

## クエリでの共有適用（SQL例）

```sql
-- Accessible IDsを先に絞る
WITH accessible_ids AS (
  -- Owner
  SELECT id AS record_id FROM opportunities
  WHERE tenant_id = :tenant_id
    AND owner_id = :user_id
    AND is_deleted = false

  UNION

  -- object_shares
  SELECT record_id FROM object_shares
  WHERE tenant_id = :tenant_id
    AND object_name = 'Opportunity'
    AND subject_type = 'User' AND subject_id = :user_id
    AND access_level >= 'Read'
    AND is_deleted = false

  UNION

  -- Role Hierarchy (要: role_hierarchyのCTE)
  SELECT o.id AS record_id FROM opportunities o
  JOIN users u ON o.owner_id = u.id AND o.tenant_id = u.tenant_id
  WHERE o.tenant_id = :tenant_id
    AND u.role_id IN (SELECT subordinate_role_id FROM role_hierarchy WHERE ancestor_role_id = :user_role_id)
    AND o.is_deleted = false
)
SELECT o.* FROM opportunities o
WHERE o.tenant_id = :tenant_id
  AND o.id IN (SELECT record_id FROM accessible_ids)
  AND o.is_deleted = false;
```

## 暗黙共有（Implicit Share）

| 子オブジェクト | 親オブジェクト | ルール |
|--------------|--------------|--------|
| Contact | Account | AccountにReadあれば ContactもRead |
| Opportunity | Account | AccountにReadあれば OpportunityもRead |
| OpportunityLineItem | Opportunity | OpportunityにReadあれば LineItemもRead |

## 承認中ロック

```json
{
  "isLocked": true,
  "lockedFields": ["Amount", "CloseDate", "StageName"]
}
```

- `isLocked=true` の場合、`lockedFields` への編集を拒否
- Delete/OwnerChange は原則拒否
- ModifyAll 持ちは例外的に許可（設定可能）

## 実装チェックリスト

- [ ] Object Permission評価を全CRUDに適用
- [ ] Field Permission評価をレスポンスマスキングに適用
- [ ] RecordAccess評価をGetById/Query/Search/Reportに適用
- [ ] 共有再計算の非同期処理
- [ ] 権限キャッシュの実装
- [ ] OWD変更時の全レコード再評価
- [ ] ロール階層変更時の影響範囲再計算
- [ ] 暗黙共有の実装
- [ ] 承認中ロックの実装

## パフォーマンス考慮

### 権限キャッシュ
- ユーザー毎のObject/Field権限はRedisにキャッシュ
- TTL: 5分程度
- Profile/PermissionSet変更時に無効化

### 共有展開キャッシュ
- 頻繁にアクセスされるレコードの共有結果をキャッシュ
- Owner変更時に無効化
