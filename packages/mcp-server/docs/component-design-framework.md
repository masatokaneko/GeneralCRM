# コンポーネント設計ルール

## 概要

このプロジェクトでは、Atomic Design の概念を基にしたコンポーネント設計を採用しています。
保守性と再利用性を重視し、shadcn/ui との統合を考慮した設計ルールを定めています。

## Figma Dev Mode MCP 連携ガイドライン

### Figma からのコンポーネント実装

**Figma リンクが提供された場合の実装手順**:

1. **Figma Dev Mode MCP を使用**:

   - Figma デザインからコードを生成する際は、必ず Figma Dev Mode MCP を使用してください
   - `get_code`ツールを使用して Figma の選択内容からコードを生成します

2. **重要な実装制約**:

   - **画像・SVG ソース**: Figma Dev Mode MCP サーバーが画像または SVG のローカルホストソースを返す場合、その画像または SVG ソースを直接使用してください
   - **アイコンパッケージ禁止**: 新しいアイコンパッケージをインポート/追加しないでください。すべてのアセットは Figma ペイロードに含まれている必要があります
   - **プレースホルダー禁止**: ローカルホストソースが提供されている場合、プレースホルダーを使用または作成しないでください

3. **このドキュメントとの整合性**:

   - Figma から生成されたコードも、このドキュメントで定められた Atomic Design の原則に従って適切な階層に配置してください
   - コンポーネントファイル構成ルールに従って、適切なファイル構造を作成してください
   - shadcn/ui との統合ルールも適用してください

4. **生成後の調整**:
   - Figma から生成されたコードをベースに、プロジェクトの技術スタックと設計ルールに適合するよう調整を行ってください
   - TypeScript の型定義、アクセシビリティ対応、テスト実装も含めて完全なコンポーネントを実装してください

## 技術スタック

- **Atomic Design**: コンポーネント設計手法
- **React**: UI ライブラリ
- **Next.js**: フルスタックフレームワーク（App Router 使用）
- **TypeScript**: 型安全性を提供する言語
- **Tailwind CSS**: ユーティリティファースト CSS フレームワーク
- **shadcn/ui**: 再利用可能なコンポーネントライブラリ
- **Storybook**: コンポーネント開発・ドキュメント化ツール
- **Vitest**: テストフレームワーク（Storybook 統合）
- **MSW**: API モックテスト用ライブラリ

## ディレクトリ構成

```
src/components/
├── ui/           # shadcn/ui コンポーネント（編集制限あり）
├── atoms/        # 最小単位のコンポーネント
├── molecules/    # Atomsの組み合わせ
├── organisms/    # 複雑なコンポーネント
├── templates/    # ページ構造・レイアウト
└── pages/        # 具体的なページコンポーネント
```

## コンポーネントファイル構成ルール

### 基本構造

各コンポーネント（ui フォルダ以外）は以下の構造に従います：

```
ComponentName/
├── index.ts                    # エクスポート用
├── ComponentName.tsx           # メインコンポーネント
├── ComponentName.stories.tsx   # Storybook ストーリー（テスト機能付き）
└── ComponentName.types.ts      # 型定義（必要に応じて）
```

### 各ファイルの役割

#### index.ts（エクスポート用）

- **責任**: コンポーネントと関連する型の統一エクスポート
- **命名**: 必ず `index.ts`
- **内容**: 名前付きエクスポートのみ使用

```typescript
// 良い例
export { ComponentName } from "./ComponentName";
export type { ComponentNameProps } from "./ComponentName";

// 悪い例
export { default } from "./ComponentName"; // デフォルトエクスポートは禁止
```

#### ComponentName.tsx（メインコンポーネント）

- **責任**: コンポーネントの実装と Props 型定義
- **命名**: PascalCase（例：`Button.tsx`, `SearchBox.tsx`）
- **エクスポート**: 名前付きエクスポートのみ

```typescript
// 良い例
export interface ButtonProps {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export function Button({ variant = "primary", children }: ButtonProps) {
  return <button className={`btn-${variant}`}>{children}</button>;
}
```

#### ComponentName.stories.tsx（Storybook + テスト）

- **責任**: コンポーネントのストーリー定義とテスト実装
- **命名**: `ComponentName.stories.tsx`
- **テスト方針**: Given-When-Then パターンを適用したインタラクションテスト
- **テストライブラリ**: `@storybook/test` (expect, userEvent, fn, within, step)

#### ComponentName.types.ts（型定義）

- **責任**: 複雑な型定義の分離（オプション）
- **使用条件**: Props 以外の複雑な型が必要な場合のみ
- **命名**: `ComponentName.types.ts`

### エクスポート戦略

#### 統一ルール

1. **デフォルトエクスポート禁止**: 全て名前付きエクスポートを使用
2. **index.ts 経由**: 外部からは必ず index.ts 経由でインポート
3. **型エクスポート**: Props 型も明示的にエクスポート

```typescript
// 良い例
import { Button, type ButtonProps } from "@/components/atoms/Button";

// 悪い例
import Button from "@/components/atoms/Button/Button"; // 直接インポート禁止
```

## 各階層の設計ルール

### Atoms（原子）

**責任範囲**: 最小単位の UI コンポーネント

**制約条件**:

- 汎用的である必要がある
- ドメイン固有の制約を持たない
- Context に依存しない
- 状態は最小限に留める
- 他のコンポーネントに依存しない

**実装例**:

- BrandButton（shadcn/ui Button のカスタマイズ）
- CustomInput（shadcn/ui Input の拡張）
- StatusBadge（ステータス表示用バッジ）

### Molecules（分子）

**責任範囲**: Atoms を組み合わせた機能的なコンポーネント

**制約条件**:

- 汎用的である必要がある
- ドメイン固有の制約を持たない
- 他のコンポーネント（主に Atoms）に依存可能
- 単一の機能を提供する

**実装例**:

- SearchBox（Input + Button の組み合わせ）
- FormField（Label + Input + ErrorMessage）
- ConfirmDialog（Dialog + Button 群）

### Organisms（有機体）

**責任範囲**: ドメイン固有の複雑なコンポーネント

**制約条件**:

- ドメイン固有の制約を持つことが許可される
- Context への接続が可能
- API 呼び出しが可能
- 複数の Molecules や Atoms を組み合わせる

**実装例**:

- FileTable（ファイル一覧表示テーブル）
- ValidationSetForm（検証セット作成フォーム）
- StorageSelector（ストレージ選択コンポーネント）

### Templates（テンプレート）

**責任範囲**: ページの構造とレイアウト

**制約条件**:

- レイアウトの責任のみを持つ
- ビジネスロジックを含まない
- props でコンテンツを受け取る
- 再利用可能なレイアウト構造

**実装例**:

- DashboardTemplate（ダッシュボードレイアウト）
- AuthTemplate（認証ページレイアウト）
- ModalTemplate（モーダルレイアウト）

### Pages（ページ）

**責任範囲**: 具体的なページの実装

**制約条件**:

- Next.js のページコンポーネントのラッパー
- データフェッチと Templates の組み合わせ
- ルーティング固有のロジック

**実装例**:

- FilesPage（ファイル管理ページ）
- ValidationSetsPage（検証セット管理ページ）
- SettingsPage（設定ページ）

## shadcn/ui との統合ルール

### 編集制限

- **原則**: shadcn/ui コンポーネントは編集禁止
- **例外**: プロジェクト要件で必要な場合のみ編集可能
- **推奨**: atoms/ でラッパーコンポーネントを作成

### 分類ルール

- **単純なコンポーネント**（Button、Input 等）: Atoms として扱う
- **複雑なコンポーネント**（Table、Form 等）: Molecules として扱う

### カスタマイズ方法

1. **軽微なカスタマイズ**: atoms/ でラッパー作成
2. **大幅なカスタマイズ**: ui/ で直接編集（要承認）

## 判断フローチャート

```
shadcn/ui で実現可能？
├─ Yes → カスタマイズが必要？
│   ├─ No → shadcn/ui をそのまま使用
│   └─ Yes → atoms/ でラッパー作成 or ui/ で編集
└─ No → 汎用的？
    ├─ Yes → ドメイン固有？
    │   ├─ No → atoms/ or molecules/
    │   └─ Yes → organisms/
    └─ No → レイアウト？
        ├─ Yes → templates/
        └─ No → pages/
```

## 命名規則

### コンポーネント名

- **形式**: PascalCase
- **例**: `SearchBox`, `FileTable`, `DashboardTemplate`

### Props 型

- **形式**: `ComponentName + Props`
- **例**: `SearchBoxProps`, `FileTableProps`

### shadcn/ui 同名回避

- **方法**: 接頭辞を使用
- **例**: `BrandButton`（shadcn/ui の Button と区別）

## 実装ガイドライン

### TypeScript

- 厳密な型定義を必須とする
- Props 型は明示的に定義する
- Generic 型の適切な使用

### パフォーマンス

- React.memo() の適切な使用
- useMemo、useCallback の適切な使用
- 不要な再レンダリングの防止

### アクセシビリティ

- ARIA 属性の適切な実装
- キーボードナビゲーション対応
- スクリーンリーダー対応

### テスト

- Storybook でのコンポーネント単体テスト
- Playwright での E2E テスト
- アクセシビリティテスト

## 例外処理

### 緊急対応

- 緊急時は一時的にルール違反を許可
- 後日リファクタリングで修正

### レガシーコード

- 段階的な移行を推奨
- 新規開発は必ずルールに従う

## テスト

- **Storybook**: コンポーネント単体テスト・インタラクションテスト
- **Playwright**: E2E テスト・ページレベルの統合テスト
- **アクセシビリティ**: ARIA 属性・キーボードナビゲーション対応

**詳細なテスト実装方法は testing-guide.md を参照してください。**
