# 🚀 Generic MCP Server セットアップガイド

このガイドでは、Generic MCP Server をプロジェクトに導入する手順を段階的に説明します。

## 📋 前提条件

- Node.js 18.0.0 以上
- npm または yarn
- Cursor エディタ
- TypeScript プロジェクト（推奨）

## 🎯 セットアップ手順

### ステップ 1: MCP サーバーのセットアップ

#### 1.1 プロジェクトへの配置

```bash
# プロジェクトルートで実行
cd your-project-root

# MCP サーバーディレクトリが存在しない場合は作成
mkdir -p mcp

# 提供された MCP サーバーファイルをコピー
# (src/, package.json, tsconfig.json, README.md)
```

#### 1.2 依存関係のインストール

```bash
cd mcp
npm install
```

#### 1.3 ビルド確認

```bash
# TypeScript のコンパイル確認
npm run build

# リント確認
npm run lint
```

### ステップ 2: プロジェクト設定ファイルの作成

#### 2.1 設定ファイルの配置

プロジェクトルートに `.mcp-config.json` を作成：

```json
{
  "server": {
    "name": "Your Project MCP",
    "version": "1.0.0",
    "description": "Development tools MCP server for your project"
  },
  "paths": {
    "docsDir": "docs",
    "uxFormatDir": "ux/format",
    "mcpServerDir": "mcp"
  },
  "storybook": {
    "enabled": true,
    "url": "http://localhost",
    "port": 6006
  },
  "features": {
    "docs": true,
    "uxFormat": false,
    "components": true,
    "biome": true
  }
}
```

#### 2.2 設定項目の説明

| 項目                  | 説明                        | デフォルト値         |
| --------------------- | --------------------------- | -------------------- |
| `server.name`         | MCP サーバー名              | "Generic MCP Server" |
| `server.version`      | バージョン                  | "1.0.0"              |
| `paths.docsDir`       | ドキュメントディレクトリ    | "docs"               |
| `paths.uxFormatDir`   | UX フォーマットディレクトリ | "ux/format"          |
| `features.docs`       | ドキュメントツール有効化    | true                 |
| `features.uxFormat`   | UX フォーマットツール有効化 | true                 |
| `features.components` | コンポーネントツール有効化  | true                 |
| `features.biome`      | Biome ツール有効化          | true                 |

### ステップ 3: Cursor 設定の更新

#### 3.1 MCP 設定ファイルの場所確認

```bash
# macOS の場合
ls ~/.cursor/mcp.json

# Windows の場合
dir %USERPROFILE%\.cursor\mcp.json
```

#### 3.2 設定ファイルの更新

`~/.cursor/mcp.json` を編集：

```json
{
  "mcpServers": {
    "your-project-mcp": {
      "command": "tsx",
      "args": ["/absolute/path/to/your-project/mcp/src/server.ts"],
      "env": {
        "MCP_PROJECT_ROOT": "/absolute/path/to/your-project"
      }
    }
  }
}
```

**重要**:

- `your-project-mcp` は一意の名前に変更してください
- パスは絶対パスで指定してください
- 既存の MCP サーバー設定がある場合は追加してください

#### 3.3 複数プロジェクト対応の例

```json
{
  "mcpServers": {
    "project-a-mcp": {
      "command": "tsx",
      "args": ["/path/to/project-a/mcp/src/server.ts"],
      "env": {
        "MCP_PROJECT_ROOT": "/path/to/project-a"
      }
    },
    "project-b-mcp": {
      "command": "tsx",
      "args": ["/path/to/project-b/mcp/src/server.ts"],
      "env": {
        "MCP_PROJECT_ROOT": "/path/to/project-b"
      }
    }
  }
}
```

### ステップ 4: 動作確認

#### 4.1 Cursor の再起動

MCP 設定を反映するため、Cursor を完全に再起動してください。

#### 4.2 MCP 接続確認

Cursor で新しいチャットを開始し、以下を確認：

1. **MCP サーバーが認識されているか**

   - チャット画面で MCP ツールが利用可能か確認

2. **基本ツールのテスト**

   ```
   現在の日時を教えてください（getDates ツールを使用）
   ```

3. **パス設定のデバッグ**
   ```
   getDocs ツールで debug: true を指定してパス設定を確認してください
   ```

#### 4.3 機能別動作確認

```bash
# ドキュメント機能
"docs ディレクトリの内容を確認してください"

# Biome 機能
"このファイルを Biome でリントしてください: src/components/Button.tsx"

# コンポーネント機能（Storybook が必要）
"利用可能なコンポーネント一覧を表示してください"
```

### ステップ 5: カスタマイズ

#### 5.1 機能の有効/無効化

`.mcp-config.json` の `features` セクションを編集：

```json
{
  "features": {
    "docs": true, // ドキュメント機能を有効
    "uxFormat": false, // UX フォーマット機能を無効
    "components": true, // コンポーネント機能を有効
    "biome": true // Biome 機能を有効
  }
}
```

#### 5.2 パスのカスタマイズ

プロジェクト構造に合わせて調整：

```json
{
  "paths": {
    "docsDir": "documentation", // docs → documentation
    "uxFormatDir": "design/ux", // ux/format → design/ux
    "mcpServerDir": "tools/mcp" // mcp → tools/mcp
  }
}
```

#### 5.3 Storybook 設定

```json
{
  "storybook": {
    "enabled": true,
    "url": "http://localhost",
    "port": 9009 // デフォルトの 6006 から変更
  }
}
```

## 🔧 トラブルシューティング

### よくある問題と解決法

#### 1. MCP サーバーが認識されない

**原因**: Cursor 設定ファイルの構文エラーまたはパス設定ミス

**解決法**:

```bash
# JSON 構文チェック
cat ~/.cursor/mcp.json | jq .

# パス存在確認
ls /path/to/your-project/mcp/src/server.ts
```

#### 2. パス解決エラー

**原因**: プロジェクトルートの検出失敗

**解決法**:

1. 環境変数 `MCP_PROJECT_ROOT` を明示的に設定
2. `.mcp-config.json` が正しい場所にあるか確認
3. デバッグモードで詳細確認：
   ```
   getDocs({ debug: true })
   ```

#### 3. ツールが利用できない

**原因**: 機能が無効化されている

**解決法**:
`.mcp-config.json` の `features` セクションを確認：

```json
{
  "features": {
    "docs": true, // false になっていないか確認
    "biome": true // 必要な機能が有効か確認
  }
}
```

#### 4. Biome ツールエラー

**原因**: Biome 設定ファイルが見つからない

**解決法**:

```bash
# Biome 設定ファイル確認
ls biome.json

# 手動でのテスト
npx @biomejs/biome lint src/
```

## 🚀 パフォーマンス最適化

### 大きなプロジェクトでの最適化

1. **不要な機能の無効化**

   ```json
   {
     "features": {
       "components": false // Storybook が不要な場合
     }
   }
   ```

2. **パス範囲の限定**
   ```json
   {
     "paths": {
       "docsDir": "docs/api" // 特定のサブディレクトリのみ
     }
   }
   ```

## 📚 次のステップ

1. **[API リファレンス](./api-reference.md)** - 利用可能なツールの詳細
2. **[設定リファレンス](./configuration.md)** - 設定オプションの完全ガイド
3. **[移行ガイド](./migration-guide.md)** - 既存 MCP サーバーからの移行手順

## 🤝 サポート

問題が発生した場合は、以下の情報とともにお問い合わせください：

1. プロジェクト構造（`tree -L 2` の出力）
2. `.mcp-config.json` の内容
3. `getDocs({ debug: true })` の出力
4. エラーメッセージの詳細
