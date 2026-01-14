# ⚙️ 設定リファレンス

Generic MCP Server の設定オプションの完全なリファレンスです。

## 📁 設定ファイルの場所

### プロジェクト設定ファイル

**場所**: プロジェクトルート直下
**ファイル名**: `.mcp-config.json`

```
your-project/
├── .mcp-config.json  ← プロジェクト固有設定
├── src/
├── docs/
└── mcp/
```

### 環境変数

| 変数名             | 説明                           | 例                            |
| ------------------ | ------------------------------ | ----------------------------- |
| `MCP_PROJECT_ROOT` | プロジェクトルートの明示的指定 | `/path/to/project`            |
| `MCP_CONFIG_PATH`  | 設定ファイルパスの明示的指定   | `/path/to/custom-config.json` |

## 🏗️ 設定スキーマ

### 完全な設定例

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

## 🔧 設定セクション詳細

### `server` セクション

MCP サーバーの基本情報を設定します。

```json
{
  "server": {
    "name": "string", // サーバー名（必須）
    "version": "string", // バージョン（必須）
    "description": "string" // 説明（オプション）
  }
}
```

**詳細**:

| プロパティ    | 型     | 必須 | デフォルト値                           | 説明                         |
| ------------- | ------ | ---- | -------------------------------------- | ---------------------------- |
| `name`        | string | ✅   | "Generic MCP Server"                   | MCP サーバーの表示名         |
| `version`     | string | ✅   | "1.0.0"                                | セマンティックバージョニング |
| `description` | string | ❌   | "Generic development tools MCP server" | サーバーの説明文             |

**使用例**:

```json
{
  "server": {
    "name": "E-commerce Admin MCP",
    "version": "2.1.0",
    "description": "MCP server for e-commerce admin dashboard development"
  }
}
```

### `paths` セクション

プロジェクト内のディレクトリパスを設定します。

```json
{
  "paths": {
    "docsDir": "string", // ドキュメントディレクトリ
    "uxFormatDir": "string", // UX フォーマットディレクトリ
    "mcpServerDir": "string" // MCP サーバーディレクトリ
  }
}
```

**詳細**:

| プロパティ     | 型     | 必須 | デフォルト値 | 説明                                  |
| -------------- | ------ | ---- | ------------ | ------------------------------------- |
| `docsDir`      | string | ❌   | "docs"       | ドキュメントディレクトリの相対パス    |
| `uxFormatDir`  | string | ❌   | "ux/format"  | UX フォーマットディレクトリの相対パス |
| `mcpServerDir` | string | ❌   | "mcp"        | MCP サーバーディレクトリの相対パス    |

**パス指定のルール**:

- プロジェクトルートからの相対パスで指定
- 先頭の `./` は不要
- スラッシュ `/` を使用（Windows でも `/` を使用）

**使用例**:

```json
{
  "paths": {
    "docsDir": "documentation",
    "uxFormatDir": "design/formats",
    "mcpServerDir": "tools/mcp"
  }
}
```

### `storybook` セクション

Storybook との連携設定を行います。

```json
{
  "storybook": {
    "enabled": boolean,  // Storybook 機能の有効化
    "url": "string",     // Storybook サーバーの URL
    "port": number       // Storybook サーバーのポート
  }
}
```

**詳細**:

| プロパティ | 型      | 必須 | デフォルト値       | 説明                           |
| ---------- | ------- | ---- | ------------------ | ------------------------------ |
| `enabled`  | boolean | ❌   | true               | Storybook 連携の有効化         |
| `url`      | string  | ❌   | "http://localhost" | Storybook サーバーの URL       |
| `port`     | number  | ❌   | 6006               | Storybook サーバーのポート番号 |

**使用例**:

```json
{
  "storybook": {
    "enabled": true,
    "url": "http://localhost",
    "port": 9009
  }
}
```

### `features` セクション

各機能の有効/無効を制御します。

```json
{
  "features": {
    "docs": boolean,        // ドキュメントツール
    "uxFormat": boolean,    // UX フォーマットツール
    "components": boolean,  // コンポーネントツール
    "biome": boolean       // Biome ツール
  }
}
```

**詳細**:

| プロパティ   | 型      | 必須 | デフォルト値 | 説明                     | 依存ツール                              |
| ------------ | ------- | ---- | ------------ | ------------------------ | --------------------------------------- |
| `docs`       | boolean | ❌   | true         | ドキュメント関連ツール   | `getDocs`                               |
| `uxFormat`   | boolean | ❌   | true         | UX フォーマットツール    | `getUxFormat`                           |
| `components` | boolean | ❌   | true         | コンポーネント関連ツール | `listComponents`, `getComponentDetails` |
| `biome`      | boolean | ❌   | true         | Biome ツール             | `biome-lint`, `biome-format`            |

**機能別の詳細説明**:

#### `docs` 機能

- **用途**: プロジェクトドキュメントの管理
- **対象**: Markdown ファイル（`.md`）
- **必要ディレクトリ**: `paths.docsDir` で指定

#### `uxFormat` 機能

- **用途**: UX 調査フォーマットの管理
- **対象**: UX 関連の Markdown ファイル
- **必要ディレクトリ**: `paths.uxFormatDir` で指定

#### `components` 機能

- **用途**: React コンポーネントの情報取得
- **前提条件**: Storybook サーバーが起動している
- **連携設定**: `storybook` セクションで設定

#### `biome` 機能

- **用途**: コードの lint と format
- **前提条件**: プロジェクトに `@biomejs/biome` がインストール済み
- **設定ファイル**: `biome.json` または指定パス

## 🎯 設定パターン例

### 最小設定

```json
{
  "server": {
    "name": "My Project MCP",
    "version": "1.0.0"
  }
}
```

### ドキュメント専用

```json
{
  "server": {
    "name": "Docs MCP",
    "version": "1.0.0"
  },
  "paths": {
    "docsDir": "documentation"
  },
  "features": {
    "docs": true,
    "uxFormat": false,
    "components": false,
    "biome": false
  }
}
```

### コンポーネント開発用

```json
{
  "server": {
    "name": "Component Dev MCP",
    "version": "1.0.0"
  },
  "storybook": {
    "enabled": true,
    "port": 6006
  },
  "features": {
    "docs": false,
    "uxFormat": false,
    "components": true,
    "biome": true
  }
}
```

### 完全機能有効

```json
{
  "server": {
    "name": "Full Stack MCP",
    "version": "1.0.0",
    "description": "Complete development tools MCP server"
  },
  "paths": {
    "docsDir": "docs",
    "uxFormatDir": "design/ux-formats"
  },
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

## 🔍 設定の優先順位

設定値の決定は以下の優先順位で行われます：

1. **環境変数** （最高優先度）
2. **プロジェクト設定ファイル** （`.mcp-config.json`）
3. **デフォルト値** （最低優先度）

### 環境変数による上書き例

```bash
# プロジェクトルートを明示的指定
export MCP_PROJECT_ROOT="/custom/project/path"

# カスタム設定ファイルを指定
export MCP_CONFIG_PATH="/custom/config/my-mcp.json"
```

## 🛠️ 設定の検証

### 設定ファイルの JSON 構文チェック

```bash
# macOS/Linux
cat .mcp-config.json | jq .

# Windows
type .mcp-config.json | jq .
```

### 設定内容の確認

MCP ツールの `debug` オプションを使用：

```javascript
getDocs({ debug: true });
```

### 機能の有効性確認

MCP サーバー起動時のログで確認：

```
🚀 Your Project MCP v1.0.0 starting...
📁 Project features: docs, components, biome
```

## ⚠️ 注意事項

### パス設定

- **絶対パス**: 環境変数や Cursor 設定では絶対パスを使用
- **相対パス**: `.mcp-config.json` 内では相対パスを使用
- **ディレクトリ存在**: 指定したディレクトリが存在しない場合はエラー

### 機能依存関係

- `components` 機能は Storybook サーバーの起動が必要
- `biome` 機能は `@biomejs/biome` のインストールが必要
- `docs` と `uxFormat` は対応するディレクトリの存在が必要

### 設定変更の反映

設定ファイルを変更した場合は Cursor を再起動してください：

1. Cursor を完全終了
2. 設定ファイルを変更
3. Cursor を再起動

## 🔄 設定の移行

### 従来の固有設定からの移行

```json
// 従来設定
{
  "mcpServers": {
    "local-mcp": {
      "command": "tsx",
      "args": ["/path/to/old-project/mcp/server.ts"]
    }
  }
}

// 汎用化後
{
  "mcpServers": {
    "your-project-mcp": {
      "command": "tsx",
      "args": ["/path/to/your-project/mcp/src/server.ts"],
      "env": {
        "MCP_PROJECT_ROOT": "/path/to/your-project"
      }
    }
  }
}
```

### 段階的移行アプローチ

1. **Phase 1**: 基本機能のみ有効化

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

2. **Phase 2**: 必要な機能を順次有効化

   ```json
   {
     "features": {
       "docs": true,
       "uxFormat": false,
       "components": true,
       "biome": false
     }
   }
   ```

3. **Phase 3**: 全機能有効化
   ```json
   {
     "features": {
       "docs": true,
       "uxFormat": true,
       "components": true,
       "biome": true
     }
   }
   ```
