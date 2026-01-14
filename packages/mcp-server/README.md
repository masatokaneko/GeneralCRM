# Generic MCP Server

`~/.cursor/mcp.json` 依存を排除した汎用的な MCP（Model Context Protocol）サーバーです。

## 🎯 特徴

### **汎用化されたパス解決システム**

- ❌ `~/.cursor/mcp.json` への依存を完全排除
- ✅ プロジェクトルートの自動検出
- ✅ 環境変数による設定の外部化
- ✅ プロジェクト固有設定ファイル（`.mcp-config.json`）

### **機能ベースの有効/無効制御**

- ✅ `docs`: ドキュメント関連ツール
- ✅ `components`: Storybook コンポーネントツール
- ✅ `biome`: Biome lint/format ツール

### **柔軟な設定システム**

- プロジェクトごとの個別設定
- デフォルト値による安全な動作
- デバッグ機能内蔵

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
cd mcp
npm install
```

### 2. プロジェクト設定ファイルの作成

プロジェクトルートに `.mcp-config.json` を配置：

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

### 3. Cursor 設定の更新

`~/.cursor/mcp.json` を更新：

```json
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

## 📋 利用可能なツール

### Core Tools（常に有効）

- `ask` - 質問フォーマット生成
- `getDate` - 日時取得

### Feature-based Tools

- `getDocs` - ドキュメント取得（`features.docs: true`）
- `biome-lint` / `biome-format` - Biome ツール（`features.biome: true`）

## 🔧 デバッグ機能

### パス設定の確認

```javascript
// getDocs または getUxFormat ツールで debug: true を指定
getDocs({ debug: true });
```

### サーバー設定の確認

MCP サーバー起動時にコンソールに設定情報が出力されます。

## 🌟 従来版からの改善点

### Before（従来版）

```typescript
// ❌ ユーザー固有パスにハードコーディング
const mcpJsonPath = path.join(process.env.HOME ?? "", ".cursor", "mcp.json");
const mcpConfig = JSON.parse(fs.readFileSync(mcpJsonPath, "utf-8"));
const serverJsPath = mcpConfig.mcpServers["local-mcp"].args.filter(...)
```

### After（汎用化）

```typescript
// ✅ 汎用的なパス解決
const config = loadServerConfig();
const projectRoot = detectProjectRoot();
const docsPath = path.resolve(projectRoot, config.paths.docsDir);
```

## 🎯 利用シーン

- **新規プロジェクト**: 設定ファイルを作成して即座に利用開始
- **既存プロジェクト**: 段階的な機能有効化で安全に導入
- **チーム開発**: プロジェクト固有設定でチーム間の環境統一

## 📁 ディレクトリ構造

```
mcp/
├── src/
│   ├── config/
│   │   ├── path-resolver.ts      # パス解決システム
│   │   └── server-config.ts      # サーバー設定管理
│   ├── tools/
│   │   ├── core/                # 基本ツール
│   │   ├── docs/                # ドキュメント系ツール
│   │   └── components/          # コンポーネント系ツール
│   └── server.ts                # メインサーバー
├── package.json
├── tsconfig.json
└── README.md
```

## 🤝 貢献

新しいツールの追加や設定オプションの拡張は `src/config/server-config.ts` の `MCPServerConfig` インターフェースを更新してください。
