# テストガイド

## テスト戦略

このプロジェクトでは以下のテストツールを使用します。

### Storybook

コンポーネントの視覚的テストとドキュメンテーション。

```bash
npm run storybook
```

- 各コンポーネントに `.stories.tsx` ファイルを作成
- Storybook MCP を使用して AI 支援開発

### Vitest

ユニットテストとコンポーネントテスト。

```bash
npm run test
npm run test:watch
npm run test:coverage
```

### Playwright

E2E テスト。

```bash
npx playwright test
npx playwright test --ui
```

### MSW (Mock Service Worker)

API モッキング用。

- Storybook と統合済み
- `public/mockServiceWorker.js` で動作

## テスト作成ルール

1. **ユニットテスト**: ビジネスロジック、ユーティリティ関数
2. **コンポーネントテスト**: UI 動作、ユーザーインタラクション
3. **E2E テスト**: 重要なユーザーフロー

## ファイル命名規則

- `*.test.ts` または `*.test.tsx`
- テスト対象ファイルと同じディレクトリに配置
