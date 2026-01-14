# [コンポーネント名] テスト実装・デバッグ

## 📋 タスク概要

### テスト対象
<!-- テスト対象のコンポーネント名、ファイルパス、階層（Atoms/Molecules/Organisms/Templates/Pages）を記載 -->

### テストスコープ
<!-- 実装するテストの種類にチェック -->
- [ ] Storybookストーリーテスト
- [ ] インタラクションテスト（Given-When-Then）
- [ ] MSW API モックテスト
- [ ] アクセシビリティテスト
- [ ] スナップショットテスト
- [ ] E2Eテスト

### 階層別要件
<!-- コンポーネント階層に応じた要件 -->

#### Atoms層
- [ ] 基本レンダリングテスト
- [ ] Props検証テスト
- [ ] 状態変化テスト
- [ ] インタラクションテスト

#### Molecules層
- [ ] 組み合わせ動作テスト
- [ ] フォームバリデーションテスト
- [ ] 状態管理テスト

#### Organisms層
- [ ] API統合テスト（MSW必須）
- [ ] 複雑な機能フローテスト
- [ ] エラーハンドリングテスト

#### Templates/Pages層
- [ ] レイアウトテスト
- [ ] ナビゲーションテスト
- [ ] E2Eテスト（必要に応じて）

---

## 🎯 計画

### 目的
<!-- テスト実装の目的を具体的に記載 -->

### 要件
<!-- 必要な機能要件・非機能要件を記載 -->

#### 機能要件
<!-- 実装すべき機能の詳細 -->

#### 非機能要件
<!-- パフォーマンス、アクセシビリティ、保守性等の要件 -->

### 完了条件
<!-- テスト実装の完了条件を明確に定義 -->
- [ ] 全ストーリーが正常に動作する
- [ ] Given-When-Thenパターンが適用されている
- [ ] MSW APIテストが実装されている（Organisms層）
- [ ] アクセシビリティテストが実装されている
- [ ] 全テストがパスする
- [ ] ビルドエラーがない
- [ ] Lintエラーがない

### 制約
<!-- 技術的制約、時間的制約、リソース制約等 -->

---

## 🔍 テスト対象分析

### コンポーネント詳細
<!-- コンポーネントの詳細情報 -->

#### ファイル構造
```
src/components/[階層]/[コンポーネント名]/
├── [コンポーネント名].tsx
├── [コンポーネント名].stories.tsx  # テスト対象
├── index.ts
└── README.md
```

#### Props Interface
```typescript
interface [コンポーネント名]Props {
  // Props定義
}
```

#### 主要機能
<!-- コンポーネントの主要機能を列挙 -->

#### API統合
<!-- API統合がある場合の詳細 -->
- [ ] API統合あり
  - エンドポイント: 
  - メソッド: 
  - レスポンス形式: 
- [ ] API統合なし

### 既存テスト状況
<!-- 既存のテストファイルの確認結果 -->

#### 既存ストーリー
<!-- 既存のストーリーファイルがある場合の内容確認 -->

#### 既存テストケース
<!-- 既存のテストケースがある場合の一覧 -->

#### 不足しているテスト
<!-- 不足しているテストケースの特定 -->

---

## 🧪 テスト実装計画

### テストケース設計

#### 1. 基本レンダリングテスト
<!-- Default、バリエーション、状態別のテストケース -->

| ストーリー名 | 目的 | テスト内容 |
|-------------|------|-----------|
| Default | デフォルト表示 | 基本的なレンダリング確認 |
| [Variant] | バリエーション表示 | 各variant での表示確認 |
| [State] | 状態別表示 | disabled, loading等の状態確認 |

#### 2. インタラクションテスト
<!-- Given-When-Thenパターンによるインタラクションテスト -->

| ストーリー名 | Given | When | Then |
|-------------|-------|------|------|
| ClickInteraction | 初期状態が表示されている | ボタンをクリックする | onClick関数が呼ばれる |
| KeyboardNavigation | フォーカス可能な状態 | キーボード操作を行う | 適切に操作が実行される |

#### 3. API統合テスト（Organisms層のみ）
<!-- MSWを使ったAPI統合テストケース -->

| ストーリー名 | シナリオ | モックレスポンス | 期待結果 |
|-------------|----------|-----------------|----------|
| ApiSuccessTest | 正常レスポンス | 成功データ | データが正しく表示される |
| ApiErrorTest | エラーレスポンス | エラーメッセージ | エラー状態が表示される |
| ApiLoadingTest | 遅延レスポンス | 2秒遅延 | ローディング状態が表示される |

#### 4. アクセシビリティテスト
<!-- アクセシビリティ要件のテストケース -->

| 項目 | テスト内容 | 検証方法 |
|------|-----------|----------|
| ARIA属性 | 適切なrole、aria-label等 | 属性値の確認 |
| キーボード操作 | Tab、Enter、Escape等 | キーボードイベントテスト |
| フォーカス管理 | フォーカスの移動と表示 | フォーカス状態の確認 |

### MSWハンドラー設計（Organisms層）
<!-- API統合がある場合のMSWハンドラー設計 -->

#### エンドポイント
```typescript
const apiHandlers = {
  success: http.get("/api/[endpoint]", () => {
    return HttpResponse.json(createSuccessResponse(mockData));
  }),
  error: http.get("/api/[endpoint]", () => {
    return HttpResponse.json(createErrorResponse("エラーメッセージ"), { status: 500 });
  }),
  delayed: http.get("/api/[endpoint]", async () => {
    await delay(2000);
    return HttpResponse.json(createSuccessResponse(mockData));
  }),
};
```

#### モックデータ
```typescript
const mockData = [
  // モックデータ定義
];
```

### カスタムフック設計（API統合時）
<!-- API統合がある場合のカスタムフック設計 -->

```typescript
const useData = (enabled = true) => {
  // フックの実装計画
};
```

---

## 📋 実装チェックリスト

### 事前準備
- [ ] 既存ストーリーファイルの確認
- [ ] コンポーネントの詳細分析
- [ ] 必要なインポートの確認
- [ ] testing-guide.mdの確認

### ストーリーファイル実装
- [ ] Meta定義の実装
- [ ] 基本ストーリーの実装
- [ ] インタラクションテストの実装（Given-When-Then）
- [ ] MSW APIテストの実装（Organisms層のみ）
- [ ] アクセシビリティテストの実装

### テスト実行・検証
- [ ] `npm run storybook` での動作確認
- [ ] `npm run test-storybook` でのテスト実行
- [ ] `npm run component-snapshot` でのスナップショット確認
- [ ] 全テストケースのパス確認

### 品質チェック
- [ ] `biome-lint` でのコード品質チェック
- [ ] `biome-format` でのフォーマット統一
- [ ] `npm run build` でのビルド確認
- [ ] TypeScriptエラーの解消

### ドキュメント更新
- [ ] ストーリーへのdescription追加
- [ ] コンポーネントのJSDoc更新
- [ ] README.mdの更新（必要に応じて）

---

## 🔧 実装

### テストファイル作成
<!-- 実装するファイルのパスと概要 -->

#### 対象ファイル
- `src/components/[階層]/[コンポーネント名]/[コンポーネント名].stories.tsx`

#### 実装内容
<!-- 実装の詳細を記載（実際のコードは実行結果セクションに記載） -->

---

## 🧩 技術的詳細

### 使用技術・ライブラリ
- **Storybook**: v[バージョン]
- **@storybook/test**: テストライブラリ
- **MSW**: v[バージョン]（API統合テスト）
- **Vitest**: テストフレームワーク

### Given-When-Thenパターン実装
<!-- パターンの具体的な実装方針 -->

```typescript
export const ExampleTest: Story = {
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: [初期状態の説明]", async () => {
      // Given部分の実装
    });

    await step("When: [アクション実行の説明]", async () => {
      // When部分の実装
    });

    await step("Then: [期待結果の説明]", async () => {
      // Then部分の実装
    });
  },
};
```

### MSW統合パターン（Organisms層）
<!-- MSW統合の具体的なパターン -->

#### API統合コンポーネント
```typescript
const ComponentWithAPI = ({ onDataChange, ...props }) => {
  const { data, loading, error } = useData(true);
  // 実装詳細
};
```

#### テストパラメータ
```typescript
parameters: createMSWParameters([apiHandlers.success])
```

### アクセシビリティテストパターン
<!-- アクセシビリティテストの実装パターン -->

```typescript
export const AccessibilityTest: Story = {
  play: async ({ canvasElement, step }) => {
    // アクセシビリティテストの実装
  },
};
```

---

## 🐛 デバッグ・トラブルシューティング

### よくある問題と対処法

#### MSW関連
- **問題**: ハンドラーが呼ばれない
- **対処**: URLパターンにワイルドカード使用

#### タイムアウト関連
- **問題**: waitForタイムアウト
- **対処**: timeout値を15000に延長

#### テスト実行関連
- **問題**: Rerun時の不具合
- **対処**: toHaveBeenNthCalledWithを使用

#### Docs表示関連
- **問題**: MSWストーリーがDocs表示されない
- **対処**: docs: { disable: true }設定

---

## ✅ テスト結果

### 実行コマンド結果
<!-- 各コマンドの実行結果を記載 -->

#### Storybook起動
```bash
npm run storybook
# 結果:
```

#### ストーリーテスト実行
```bash
npm run test-storybook [story-file-name]
# 結果:
```

#### スナップショットテスト実行
```bash
npm run component-snapshot [component-name]
# 結果:
```

#### 品質チェック
```bash
biome-lint
biome-format
npm run build
# 結果:
```

### テストカバレッジ
<!-- テストカバレッジの結果 -->

### 発見された問題と解決策
<!-- テスト実行中に発見された問題とその解決策 -->

---

## 📈 効果・改善点

### テスト実装による効果
<!-- テスト実装によって得られた効果を記載 -->

### 品質向上の定量的評価
<!-- 可能であれば数値で評価 -->

### 今後の改善提案
<!-- さらなる改善のための提案 -->

---

## 📚 注意事項・制限事項

### 使用時の注意点
<!-- テスト使用時の注意点 -->

### 既知の制限事項
<!-- 現在の実装での制限事項 -->

### メンテナンス要件
<!-- 定期的なメンテナンスが必要な項目 -->

---

## 🔄 実行履歴

<!-- getDateで取得した日時とともに実行内容を記録 -->

---

## 📖 参考資料

### 関連ドキュメント
- [testing-guide.md](../mcp/docs/testing-guide.md)
- [component-design-framework.md](../mcp/docs/component-design-framework.md)

### 参考実装
<!-- 参考になる他のテスト実装があれば記載 -->

### 外部リソース
- [Storybook Testing Handbook](https://storybook.js.org/docs/react/writing-tests/introduction)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles) 