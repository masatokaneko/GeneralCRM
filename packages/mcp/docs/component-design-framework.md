# コンポーネント設計フレームワーク

## Atomic Design 原則

このプロジェクトでは Atomic Design パターンを採用しています。

### 階層構造

```
src/components/
├── atoms/      # 最小単位のUI要素（Button, Input, Label）
├── molecules/  # atomsの組み合わせ（SearchBar, FormField）
├── organisms/  # 複雑なUIセクション（Header, Sidebar）
├── templates/  # ページレイアウト
├── pages/      # 完全なページ構成
└── ui/         # shadcn/ui ベースコンポーネント
```

### コンポーネント作成ルール

1. **atoms → molecules → organisms** の順でビルドアップ
2. shadcn/ui コンポーネントは `/ui` に配置し、カスタマイズは atoms/molecules で行う
3. 各コンポーネントフォルダには `index.ts`（エクスポート）と `.stories.tsx` を含める

### ファイル構成例

```
atoms/Button/
├── Button.tsx
├── Button.stories.tsx
└── index.ts
```

## shadcn/ui 統合

- `@/components/ui/*` から基本コンポーネントをインポート
- カスタマイズが必要な場合は atoms/molecules でラップ
- Tailwind CSS v4 のテーマ変数を活用

## デザイントークン

CSS 変数を使用してブランドカラーを管理:

```css
:root {
  --color-primary: 240 100% 50%;
  --color-secondary: 120 100% 40%;
}
```
