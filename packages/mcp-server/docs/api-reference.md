# 📖 API リファレンス

Generic MCP Server で利用可能なツールの完全なリファレンスです。

## 🏗️ Core Tools（常に有効）

### `ask`

**説明**: AI エージェントに質問フォーマットを提供します。

**パラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `question` | string | ✅ | 質問内容 |
| `summary` | string | ❌ | 質問の要約 |
| `optionA` | string | ✅ | 選択肢 A |
| `optionB` | string | ✅ | 選択肢 B |
| `additionalOptions` | string[] | ❌ | 追加の選択肢 |

**使用例**:

```javascript
ask({
  question: "次の作業はどちらを優先しますか？",
  summary: "開発プロセスの優先順位決定",
  optionA: "新機能の実装",
  optionB: "既存バグの修正",
  additionalOptions: ["ドキュメント整備", "テスト強化"],
});
```

**レスポンス例**:

```
❓ 次の作業はどちらを優先しますか？
開発プロセスの優先順位決定

OPTIONS:
1. 新機能の実装
2. 既存バグの修正
3. ドキュメント整備
4. テスト強化

/answer <番号> で回答してください。
```

---

### `getDate`

**説明**: 現在の日時を指定フォーマットで取得します。

**パラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `format` | string | ❌ | 日付フォーマット（例: "yyyy/MM/dd HH:mm:ss"） |

**使用例**:

```javascript
// デフォルトフォーマット（ISO）
getDate();

// カスタムフォーマット
getDate({ format: "yyyy/MM/dd HH:mm:ss" });
getDate({ format: "yyyy-MM-dd" });
```

**フォーマット記号**:

- `yyyy`: 4 桁年
- `MM`: 2 桁月
- `dd`: 2 桁日
- `HH`: 2 桁時（24 時間制）
- `mm`: 2 桁分
- `ss`: 2 桁秒

**レスポンス例**:

```
Tool: getDate, Result: 2025/01/15 14:30:25
```

## 📁 Docs Tools（`features.docs: true`）

### `getDocs`

**説明**: プロジェクトの docs ディレクトリ内の Markdown ファイルを取得します。

**パラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `fileName` | string | ❌ | 特定ファイル名（省略時は全ファイル） |
| `debug` | boolean | ❌ | デバッグ情報の表示 |

**使用例**:

```javascript
// 全ドキュメント取得
getDocs();

// 特定ファイル取得
getDocs({ fileName: "api-guide" });
getDocs({ fileName: "setup.md" });

// デバッグモード
getDocs({ debug: true });
```

**レスポンス例**:

```markdown
# setup.md

## セットアップ手順

...

---

# api-guide.md

## API 仕様

...
```

### `getUxFormat`

**説明**: UX 調査フォーマットファイルを取得します（`features.uxFormat: true` の場合）。

**パラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `fileName` | string | ❌ | 特定ファイル名（省略時は全ファイル） |
| `debug` | boolean | ❌ | デバッグ情報の表示 |

**使用例**:

```javascript
// 全 UX フォーマット取得
getUxFormat();

// 特定フォーマット取得
getUxFormat({ fileName: "user-interview" });
```

## 🎨 Component Tools（`features.components: true`）

### `listComponents`

**説明**: Storybook に登録されているコンポーネントの一覧を取得します。

**前提条件**: Storybook サーバーが起動している必要があります（`npm run storybook`）

**パラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `category` | string | ❌ | カテゴリフィルタ（Atoms, Molecules, Organisms, Templates） |
| `includeDetails` | boolean | ❌ | 詳細情報（ストーリー一覧）を含める |

**使用例**:

```javascript
// 全コンポーネント一覧
listComponents();

// 特定カテゴリのみ
listComponents({ category: "Atoms" });

// 詳細情報付き
listComponents({ includeDetails: true });
```

**レスポンス例**:

```markdown
## 📦 コンポーネント一覧

**概要:**

- 総コンポーネント数: 25
- 表示件数: 25
- 利用可能カテゴリ: Atoms, Molecules, Organisms, Templates

**カテゴリ別統計:**

- Atoms: 8 件
- Molecules: 10 件
- Organisms: 5 件
- Templates: 2 件

#### Atoms

**Button**

- ストーリー数: 4
- パス: `./src/components/atoms/Button`

**Input**

- ストーリー数: 3
- パス: `./src/components/atoms/Input`
```

### `getComponentDetails`

**説明**: 指定したコンポーネントの詳細情報を取得します。

**パラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `componentName` | string | ✅ | コンポーネント名（例: "Button"） |
| `category` | string | ❌ | カテゴリ指定で検索を限定 |
| `includeExamples` | boolean | ❌ | 使用例を含める（デフォルト: true） |
| `includeDependencies` | boolean | ❌ | 依存関係を含める（デフォルト: true） |

**使用例**:

```javascript
// 基本的な使用
getComponentDetails({ componentName: "Button" });

// カテゴリ限定検索
getComponentDetails({
  componentName: "Button",
  category: "Atoms",
});

// オプション指定
getComponentDetails({
  componentName: "Button",
  includeExamples: true,
  includeDependencies: false,
});
```

**レスポンス例**:

````markdown
# 📖 Button コンポーネント詳細

## 基本情報

- **名前**: Button
- **カテゴリ**: Atoms
- **インポートパス**: `@/components/atoms/Button`
- **ファイルパス**: `./src/components/atoms/Button`
- **説明**: 基本的なボタンコンポーネント

## 📥 インポート方法

```typescript
import { Button } from "@/components/atoms/Button";
```
````

## 🔧 Props

| プロパティ | 型                         | 必須 | デフォルト値 | 説明                     |
| ---------- | -------------------------- | ---- | ------------ | ------------------------ |
| `variant`  | `"primary" \| "secondary"` | ❌   | `"primary"`  | ボタンのバリエーション   |
| `size`     | `"sm" \| "md" \| "lg"`     | ❌   | `"md"`       | ボタンのサイズ           |
| `disabled` | `boolean`                  | ❌   | `false`      | 無効状態                 |
| `children` | `ReactNode`                | ✅   | -            | ボタンの内容             |
| `onClick`  | `() => void`               | ❌   | -            | クリック時のコールバック |

## 💡 使用例

### Default

基本的な使用例

```tsx
<Button onClick={() => console.log("clicked")}>Click me</Button>
```

### Variants

```tsx
<Button variant="primary">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
```

````

## 🔧 Biome Tools（`features.biome: true`）

### `biome-lint`

**説明**: Biome を使用してファイルをリントします。

**パラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `paths` | string[] | ✅ | リント対象ファイルパス |
| `configPath` | string | ❌ | Biome 設定ファイルパス |

**使用例**:
```javascript
// 単一ファイル
biome-lint({ paths: ["src/components/Button.tsx"] })

// 複数ファイル
biome-lint({
  paths: [
    "src/components/Button.tsx",
    "src/components/Input.tsx"
  ]
})

// カスタム設定ファイル
biome-lint({
  paths: ["src/"],
  configPath: "./custom-biome.json"
})
````

### `biome-format`

**説明**: Biome を使用してファイルをフォーマットします。

**パラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| `paths` | string[] | ✅ | フォーマット対象ファイルパス |
| `configPath` | string | ❌ | Biome 設定ファイルパス |

**使用例**:

```javascript
// 単一ファイル
biome - format({ paths: ["src/components/Button.tsx"] });

// ディレクトリ全体
biome - format({ paths: ["src/components/"] });
```

## 🔍 デバッグ機能

### パス設定デバッグ

任意の docs ツールで `debug: true` を指定すると詳細情報が取得できます：

```javascript
getDocs({ debug: true });
```

**デバッグ出力例**:

```
=== MCP Path Configuration Debug ===
Project Root: /Users/user/project
Docs Directory: docs (/Users/user/project/docs)
UX Format Directory: ux/format (/Users/user/project/ux/format)
MCP Server Directory: mcp
Config File: /Users/user/project/.mcp-config.json (exists: true)
Current Working Directory: /Users/user/project/mcp
MCP_PROJECT_ROOT env: /Users/user/project
======================================
```

### サーバー起動ログ

MCP サーバー起動時に設定情報がコンソールに出力されます：

```
🚀 Your Project MCP v1.0.0 starting...
📁 Project features: docs, components, biome
```

## ⚠️ エラーハンドリング

### 一般的なエラーレスポンス

```json
{
  "content": [
    {
      "type": "text",
      "text": "❌ エラー: ファイルが見つかりません"
    }
  ],
  "isError": true
}
```

### Storybook 関連エラー

```
❌ エラー: Storybook server is not running at http://localhost:6006. Please start Storybook with: npm run storybook
```

### パス解決エラー

```
❌ エラー: docsディレクトリが見つかりません (/Users/user/project/docs)
```

## 🎯 ベストプラクティス

### 1. 効率的なファイル指定

```javascript
// ✅ 良い例: 具体的なファイル指定
getDocs({ fileName: "api-guide" });

// ❌ 避ける: 毎回全ファイル取得
getDocs();
```

### 2. カテゴリフィルタの活用

```javascript
// ✅ 良い例: 必要なカテゴリのみ
listComponents({ category: "Atoms" });

// ❌ 非効率: 全コンポーネント取得後に手動フィルタ
listComponents();
```

### 3. デバッグ情報の活用

```javascript
// トラブルシューティング時
getDocs({ debug: true });
```

### 4. バッチ処理

```javascript
// ✅ 良い例: 複数ファイルを一度に処理
biome -
  lint({
    paths: ["src/component1.tsx", "src/component2.tsx"],
  });

// ❌ 非効率: 個別に処理
biome - lint({ paths: ["src/component1.tsx"] });
biome - lint({ paths: ["src/component2.tsx"] });
```
