# 🔄 移行ガイド

既存の MCP サーバーから Generic MCP Server への移行手順を説明します。

## 🎯 移行対象

以下のケースでこのガイドが役立ちます：

- **既存プロジェクト**からの移行
- **既存の Cursor MCP 設定**の汎用化
- **チーム間での MCP サーバー設定**の統一

## 📋 移行前の準備

### 1. 現在の設定確認

既存の Cursor MCP 設定を確認：

```bash
# 現在の MCP 設定を表示
cat ~/.cursor/mcp.json
```

**典型的な従来設定例**:

```json
{
  "mcpServers": {
    "local-mcp": {
      "command": "tsx",
      "args": ["/Users/user/old-project/mcp/server.ts"]
    }
  }
}
```

### 2. バックアップ作成

```bash
# 設定ファイルのバックアップ
cp ~/.cursor/mcp.json ~/.cursor/mcp.json.backup

# 既存プロジェクトのバックアップ（必要に応じて）
cp -r /path/to/existing-project /path/to/existing-project.backup
```

### 3. 依存関係確認

```bash
# Node.js バージョン確認（18.0.0 以上推奨）
node --version

# TypeScript 確認
npx tsc --version

# Cursor バージョン確認
# Cursor > About で確認
```

## 🚀 段階的移行手順

### Phase 1: Generic MCP Server のセットアップ

#### 1.1 新プロジェクトへの導入

```bash
# 移行先プロジェクトに移動
cd /path/to/new-project

# MCP サーバーディレクトリ作成
mkdir -p mcp

# Generic MCP Server ファイルをコピー
# (提供された src/, package.json, tsconfig.json, README.md)
```

#### 1.2 依存関係インストール

```bash
cd mcp
npm install
```

#### 1.3 基本設定ファイル作成

```bash
# プロジェクトルートに戻る
cd ..

# 設定ファイル作成
cat > .mcp-config.json << 'EOF'
{
  "server": {
    "name": "Your Project MCP",
    "version": "1.0.0",
    "description": "Migrated from Previous MCP"
  },
  "paths": {
    "docsDir": "docs",
    "uxFormatDir": "ux/format",
    "mcpServerDir": "mcp"
  },
  "features": {
    "docs": true,
    "uxFormat": false,
    "components": false,
    "biome": false
  }
}
EOF
```

### Phase 2: 基本機能の動作確認

#### 2.1 Cursor 設定更新（一時的）

既存設定を保持しながら新設定を追加：

```json
{
  "mcpServers": {
    "local-mcp": {
      "command": "tsx",
      "args": ["/Users/user/old-project/mcp/server.ts"]
    },
    "new-project-mcp": {
      "command": "tsx",
      "args": ["/path/to/new-project/mcp/src/server.ts"],
      "env": {
        "MCP_PROJECT_ROOT": "/path/to/new-project"
      }
    }
  }
}
```

#### 2.2 動作確認

Cursor を再起動後、以下を確認：

```javascript
// 基本機能テスト
getDate({ format: "yyyy/MM/dd HH:mm:ss" });

// パス設定デバッグ
getDocs({ debug: true });

// ドキュメント取得テスト
getDocs();
```

**期待される結果**:

```
=== MCP Path Configuration Debug ===
Project Root: /path/to/new-project
Docs Directory: docs (/path/to/new-project/docs)
...
```

### Phase 3: 機能の段階的移行

#### 3.1 ドキュメント機能

既存ドキュメントの移行：

```bash
# 既存 docs ディレクトリの確認
ls -la docs/

# 必要に応じてディレクトリ構造調整
mkdir -p docs
```

設定で有効化：

```json
{
  "features": {
    "docs": true,
    "uxFormat": false,
    "components": false,
    "biome": false
  }
}
```

テスト：

```javascript
getDocs({ fileName: "setup-guide" });
```

#### 3.2 UX フォーマット機能（該当する場合）

```bash
# UX フォーマットディレクトリ確認
ls -la ux/format/
```

設定で有効化：

```json
{
  "features": {
    "docs": true,
    "uxFormat": true,
    "components": false,
    "biome": false
  }
}
```

#### 3.3 Biome 機能

```bash
# Biome 設定確認
ls -la biome.json

# Biome がインストールされているか確認
npm list @biomejs/biome
```

設定で有効化：

```json
{
  "features": {
    "docs": true,
    "uxFormat": true,
    "components": false,
    "biome": true
  }
}
```

テスト：

```javascript
biome - lint({ paths: ["src/components/Button.tsx"] });
```

#### 3.4 コンポーネント機能（Storybook 連携）

```bash
# Storybook が設定されているか確認
ls -la .storybook/

# Storybook サーバー起動
npm run storybook
```

設定で有効化：

```json
{
  "storybook": {
    "enabled": true,
    "url": "http://localhost",
    "port": 6006
  },
  "features": {
    "docs": true,
    "uxFormat": true,
    "components": true,
    "biome": true
  }
}
```

テスト：

```javascript
listComponents({ category: "Atoms" });
```

### Phase 4: 完全移行

#### 4.1 旧設定の削除

全機能が正常動作することを確認後：

```json
{
  "mcpServers": {
    "your-project-mcp": {
      "command": "tsx",
      "args": ["/path/to/new-project/mcp/src/server.ts"],
      "env": {
        "MCP_PROJECT_ROOT": "/path/to/new-project"
      }
    }
  }
}
```

#### 4.2 最終動作確認

全機能の包括的テスト：

```javascript
// 基本機能
getDate();
ask({
  question: "移行完了確認",
  optionA: "成功",
  optionB: "失敗",
});

// ドキュメント機能
getDocs();

// Biome 機能
biome - lint({ paths: ["src/"] });

// コンポーネント機能（Storybook 起動時）
listComponents();
```

## 📊 移行チェックリスト

### ✅ 移行前チェック

- [ ] 既存 MCP 設定のバックアップ完了
- [ ] Node.js 18.0.0 以上
- [ ] 移行先プロジェクト構造の確認
- [ ] 必要な依存関係の確認

### ✅ セットアップチェック

- [ ] Generic MCP Server ファイルの配置完了
- [ ] `npm install` 完了
- [ ] `.mcp-config.json` 作成完了
- [ ] Cursor 設定ファイル更新完了

### ✅ 機能別チェック

- [ ] 基本機能（`getDate`, `ask`）動作確認
- [ ] ドキュメント機能動作確認
- [ ] UX フォーマット機能動作確認（該当時）
- [ ] Biome 機能動作確認
- [ ] コンポーネント機能動作確認（Storybook 利用時）

### ✅ 移行完了チェック

- [ ] 旧設定の削除完了
- [ ] 全機能の包括的テスト完了
- [ ] チームメンバーへの移行手順共有完了

## 🔧 トラブルシューティング

### 一般的な移行問題

#### 1. パス解決エラー

**症状**:

```
❌ エラー: docsディレクトリが見つかりません
```

**解決法**:

```bash
# プロジェクト構造確認
tree -L 2

# 設定ファイル確認
cat .mcp-config.json

# デバッグモードで詳細確認
getDocs({ debug: true })
```

#### 2. 機能が利用できない

**症状**:

```
❌ エラー: 利用できないツールです
```

**解決法**:

```json
// .mcp-config.json で機能有効化確認
{
  "features": {
    "docs": true, // 必要な機能が true になっているか
    "biome": true
  }
}
```

#### 3. Storybook 連携エラー

**症状**:

```
❌ エラー: Storybook server is not running
```

**解決法**:

```bash
# Storybook サーバー起動
npm run storybook

# ポート確認
lsof -i :6006

# 設定確認
cat .mcp-config.json | jq .storybook
```

### 固有コードの移行

#### カスタムツールの移行

既存プロジェクトにカスタムツールがある場合：

1. **新しいツールファイル作成**:

   ```typescript
   // mcp/src/tools/custom/yourCustomTool.ts
   export function registerYourCustomTool(server: McpServer) {
     // カスタムツール実装
   }
   ```

2. **サーバーに登録**:

   ```typescript
   // mcp/src/server.ts に追加
   import { registerYourCustomTool } from "./tools/custom/yourCustomTool.js";

   // 機能有効化チェック後に登録
   if (config.features.customTool) {
     registerYourCustomTool(server);
   }
   ```

3. **設定に機能追加**:
   ```json
   {
     "features": {
       "docs": true,
       "customTool": true
     }
   }
   ```

## 👥 チーム移行戦略

### 大規模チームでの移行

#### 1. パイロット移行

1. **小規模グループでテスト**（1-2 名）
2. **フィードバック収集**
3. **手順の改善**
4. **本格展開**

#### 2. 段階的ロールアウト

```bash
# Week 1: 開発チーム
# Week 2: QA チーム
# Week 3: デザインチーム
# Week 4: 全チーム
```

#### 3. 設定の標準化

```json
// team-standard-config.json
{
  "server": {
    "name": "Team Standard MCP",
    "version": "1.0.0"
  },
  "features": {
    "docs": true,
    "uxFormat": false,
    "components": true,
    "biome": true
  }
}
```

### サポート体制

#### 1. ドキュメント共有

- 移行手順書の共有
- FAQ の整備
- トラブルシューティングガイド

#### 2. 技術サポート

- Slack/Teams チャンネル
- 定期的な質問会
- ペアセットアップセッション

## 🎯 移行後の最適化

### パフォーマンス調整

```json
{
  "features": {
    // 使用しない機能は無効化
    "uxFormat": false,

    // 必要な機能のみ有効化
    "docs": true,
    "components": true,
    "biome": true
  }
}
```

### 継続的改善

1. **使用状況の監視**
2. **フィードバック収集**
3. **設定の最適化**
4. **新機能の検討**

移行に関してご質問がある場合は、デバッグ出力を含めてお問い合わせください。
