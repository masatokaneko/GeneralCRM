---
name: progress
description: 開発進捗状況の確認・更新。TypeScriptエラー数、各フェーズの完了状況、次のステップを表示する。「進捗」「progress」「ステータス」で呼び出される。
---

# 開発進捗管理スキル

このスキルは開発進捗状況を確認・更新するために使用します。

## スキル概要

- **コマンド**: `/progress` または `/progress update`
- **目的**: 開発進捗の確認と進捗文書の更新

## 実行手順

### 1. 現在の状態を収集

以下のコマンドを実行して現在の開発状態を把握する：

```bash
# TypeScriptエラー数の確認（web）
cd /Users/kanekomasato/SPEC\ -\ Antigravity/ui-ux-framework-main/apps/web && npm run type-check 2>&1 | grep "error TS" | wc -l

# TypeScriptエラー数の確認（api）
cd /Users/kanekomasato/SPEC\ -\ Antigravity/ui-ux-framework-main/apps/api && npm run type-check 2>&1 | grep "error TS" | wc -l
```

### 2. 進捗文書を読み込む

進捗文書を読み込む：
- `/Users/kanekomasato/SPEC - Antigravity/DEVELOPMENT_PROGRESS.md`

### 3. 進捗サマリーを表示

以下の形式でユーザーに進捗を報告：

```
## 開発進捗サマリー

### 全体進捗
- Phase 1 (MVP Core): [完了状況]
- Phase 1.5 (MVP補完): [完了状況]
- Phase 2 (権限・共有): [完了状況]
- Phase 3 (自動化・テリトリー): [完了状況]

### 現在の状態
- Web TypeScriptエラー: X件
- API TypeScriptエラー: X件

### 進行中の作業
- [現在作業中の項目]

### 問題・ブロッカー
- [既知の問題や障害]

### 次のステップ
- [次に取り組むべき項目]
```

### 4. 進捗文書を更新（自動）

収集した情報に基づいて `DEVELOPMENT_PROGRESS.md` を更新する：
- 最終更新日時を更新
- エラー数を更新
- 完了した項目があればステータスを更新
- 新たな問題があれば追記

## 別コマンド: `/progress update`

`/progress update` が明示的に呼ばれた場合は、より詳細な状態チェックを行う：

1. 各エンティティの実装状況を確認（ファイル存在チェック）
2. テストの実行状況を確認
3. 進捗文書の内容を全面的にレビュー・更新

## 注意事項

- 進捗文書の更新は慎重に行い、既存の情報を不用意に削除しない
- 問題点は具体的に記録する（ファイル名、エラー内容等）
- フェーズの完了判定は保守的に行う（全項目が完了していることを確認）
