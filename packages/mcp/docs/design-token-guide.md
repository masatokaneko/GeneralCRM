# デザイントークンガイド

## 概要

デザイントークンは、ブランドの一貫性を保つための設計変数です。

## CSS 変数定義

`src/app/globals.css` でテーマカラーを定義:

```css
:root {
  /* プライマリーカラー */
  --color-primary: 240 100% 50%;
  
  /* セカンダリーカラー */
  --color-secondary: 120 100% 40%;
  
  /* アクセントカラー */
  --color-accent: 30 100% 50%;
  
  /* 背景色 */
  --color-background: 0 0% 100%;
  
  /* 前景色 */
  --color-foreground: 0 0% 3.9%;
}

.dark {
  --color-background: 0 0% 3.9%;
  --color-foreground: 0 0% 98%;
}
```

## Tailwind CSS v4 統合

Tailwind CSS v4 では CSS 変数を直接参照:

```html
<div class="bg-primary text-primary-foreground">
  コンテンツ
</div>
```

## カスタマイズ手順

1. ブランドカラーの HEX コードを準備
2. HSL 形式に変換
3. `globals.css` の CSS 変数を更新
4. 開発サーバーで反映確認

## ダークモード

`next-themes` を使用してダークモード切り替え:

```tsx
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();
```
