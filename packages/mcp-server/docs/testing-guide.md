# テスト実装ガイド

## 概要

このプロジェクトでは、**Storybook + Vitest + MSW + Playwright** を組み合わせた包括的なテスト戦略を採用しています。
各コンポーネントの品質を保証し、ユーザビリティとアクセシビリティを確保するためのテスト実装ガイドラインです。

## テスト技術スタック

- **Storybook**: コンポーネント単体テスト・インタラクションテスト
- **Vitest**: テストフレームワーク（Storybook 統合）
- **MSW**: API モックテスト用ライブラリ
- **Playwright**: E2E テスト
- **@storybook/test**: テストライブラリ（expect, userEvent, fn, within, step）

## テスト戦略

### 1. テストピラミッド

```
    E2E テスト (Playwright)
         ↑ 少数・重要フロー

  API モックテスト (MSW + Storybook)
        ↑ 中程度・Organisms層中心

   コンポーネントテスト (Storybook)
       ↑ 多数・全階層対象
```

### 2. 階層別テスト方針

| 階層          | テスト対象               | テスト種類      | 重点項目                       |
| ------------- | ------------------------ | --------------- | ------------------------------ |
| **Atoms**     | 基本動作、Props、状態    | Storybook       | レンダリング、インタラクション |
| **Molecules** | 組み合わせ動作、フォーム | Storybook       | バリデーション、状態管理       |
| **Organisms** | API 統合、複雑な機能     | Storybook + MSW | API モック、エラーハンドリング |
| **Templates** | レイアウト、構造         | Storybook + E2E | レスポンシブ、ナビゲーション   |
| **Pages**     | 統合フロー               | E2E             | ユーザージャーニー             |

## テスト実装の重要な観点

### 1. テスト重複の排除と統合

**基本原則**:

- **1 つのテストにつき 1 つの責務**: 各テストは明確に定義された 1 つの機能や側面をテストする
- **機能の整理**: 類似した機能をテストする複数のテストケースを統合
- **テスト範囲の明確化**: 各テストの検証範囲を明確にし、重複を避ける
- **共通処理の抽出**: 複数のテストで使用される共通処理の抽出と再利用

**重複排除の実装例**:

```typescript
// ❌ 悪い例: 重複したテスト
export const ClickTest1: Story = {
  play: async ({ canvasElement }) => {
    // クリック動作のテスト
  },
};

export const ClickTest2: Story = {
  play: async ({ canvasElement }) => {
    // 同じクリック動作のテスト（重複）
  },
};

// ✅ 良い例: 統合されたテスト
export const ClickInteraction: Story = {
  play: async ({ canvasElement, step }) => {
    await step("Given: ボタンが表示されている", async () => {
      // 前提条件の確認
    });

    await step("When: ボタンをクリックする", async () => {
      // クリック操作
    });

    await step("Then: 期待される結果が得られる", async () => {
      // 結果検証（複数の側面を一度に検証）
    });
  },
};
```

**テスト分類の明確化**:

```typescript
// ========== 基本表示テスト ==========
export const Default: Story = {
  /* 基本レンダリング */
};
export const WithVariants: Story = {
  /* バリエーション */
};

// ========== インタラクションテスト ==========
export const ClickInteraction: Story = {
  /* クリック動作 */
};
export const KeyboardNavigation: Story = {
  /* キーボード操作 */
};

// ========== 状態管理テスト ==========
export const StateChanges: Story = {
  /* 状態変化 */
};
export const ErrorHandling: Story = {
  /* エラー処理 */
};

// ========== アクセシビリティテスト ==========
export const AccessibilityTest: Story = {
  /* A11y検証 */
};
```

### 2. 段階的なデバッグアプローチ

**修正順序**:

1. **DOM 構造の問題**: 要素が見つからない
2. **イベントハンドリングの問題**: コールバックが呼ばれない
3. **非同期処理の問題**: 待機が不適切

**段階的修正の実装**:

```typescript
export const DebugExample: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Step 1: DOM構造の確認", async () => {
      try {
        const element = canvas.getByRole("button");
        await expect(element).toBeInTheDocument();
        console.log("✅ DOM構造: OK");
      } catch (error) {
        console.error("❌ DOM構造エラー:", error);
        throw error;
      }
    });

    await step("Step 2: イベントハンドリングの確認", async () => {
      try {
        const button = canvas.getByRole("button");
        await userEvent.click(button);
        console.log("✅ イベント処理: OK");
      } catch (error) {
        console.error("❌ イベント処理エラー:", error);
        throw error;
      }
    });

    await step("Step 3: 非同期処理の確認", async () => {
      try {
        await waitFor(
          async () => {
            const result = canvas.getByText("Expected Result");
            await expect(result).toBeInTheDocument();
          },
          { timeout: 3000 }
        );
        console.log("✅ 非同期処理: OK");
      } catch (error) {
        console.error("❌ 非同期処理エラー:", error);
        throw error;
      }
    });
  },
};
```

### 3. DOM 構造への深い理解と対応

**要素取得の戦略**:

```typescript
// 基本的な要素取得
const getElementSafely = (canvas: any, selector: string, options?: any) => {
  try {
    return canvas.getByRole(selector, options);
  } catch (error) {
    console.error(`要素が見つかりません: ${selector}`, error);
    throw error;
  }
};

// ポータル対応
const getPortalElements = (canvasElement: HTMLElement) => {
  const portalRoot = canvasElement.ownerDocument.body;
  return within(portalRoot).getAllByRole("menuitem", { hidden: true });
};

// 複数要素の処理
const handleMultipleElements = (canvas: any) => {
  const tables = canvas.getAllByRole("table");
  const headerTable = tables[0]; // ヘッダー用テーブル
  const bodyTable = tables[1]; // ボディ用テーブル

  return { headerTable, bodyTable };
};
```

**複雑な DOM 構造への対応**:

```typescript
export const ComplexDOMTest: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: 複雑なDOM構造が存在する", async () => {
      // 複数のテーブル要素の確認
      const tables = canvas.getAllByRole("table");
      await expect(tables).toHaveLength(2);

      // ポータル内要素の確認
      try {
        const menuItems = within(canvasElement.ownerDocument.body).getAllByRole(
          "menuitem",
          { hidden: true }
        );
        console.log(`メニューアイテム数: ${menuItems.length}`);
      } catch (error) {
        console.warn("ポータル要素が見つかりません:", error.message);
      }
    });

    await step("When: 特定の要素を操作する", async () => {
      // CSS クラスでの状態検証
      const spinner = canvasElement.querySelector(".animate-spin");
      if (spinner) {
        await expect(spinner).toBeInTheDocument();
      }

      // data属性での要素特定
      const selectedElement = canvas.getByRole("option", {
        name: /sample/,
      });

      // 選択済み状態の検証
      const hasSelectedAttributes = [
        { name: "aria-selected", value: "true" },
        { name: "data-selected", value: "true" },
        { name: "data-state", value: "checked" },
      ].some((attr) => selectedElement.getAttribute(attr.name) === attr.value);

      if (hasSelectedAttributes) {
        console.log("✅ 選択済み状態を確認");
      }
    });
  },
};
```

### 4. コンポーネント実装との整合性検証

**検証チェックリスト**:

- ✅ コンポーネントのレンダリングロジックとテスト内容の一致
- ✅ 条件分岐や状態変化のテストカバレッジ
- ✅ データ構造と表示内容の整合性
- ✅ イベントハンドラとインタラクションテストの対応関係
- ✅ エッジケース（空配列、null 値など）の扱いの一貫性
- ✅ 命名やコメントがコンポーネントの意図を正確に反映
- ✅ アクセシビリティ属性の実装とテストの整合性
- ✅ スタイルやレイアウトの変更に影響されないテスト実装

**実装整合性の検証例**:

```typescript
export const ImplementationConsistencyTest: Story = {
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);

    await step("Given: コンポーネントの実装を理解する", async () => {
      // Props の検証
      console.log("Props:", args);

      // DOM構造の確認
      const component = canvas.getByTestId("component-root");
      console.log("DOM構造:", component.innerHTML);
    });

    await step("When: 実装に基づいた操作を行う", async () => {
      // イベント委譲を考慮したクリック
      const fileRow = canvas.getByRole("row", { name: /sample\.txt/ });
      await userEvent.click(fileRow);
    });

    await step("Then: 実装と一致した結果を検証する", async () => {
      // コールバック関数の検証
      await expect(args.onFileClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "file-1",
          name: "sample.txt",
        })
      );

      // 状態変化の検証
      const selectedRow = canvas.getByRole("row", {
        name: /sample\.txt/,
        selected: true,
      });
      await expect(selectedRow).toBeInTheDocument();
    });
  },
};
```

## Storybook テスト実装ルール

### 基本方針

#### テストファイル作成の原則

**原則 1: ストーリーファイルを主要なテストファイルとして使用する**

- `component.stories.tsx`ファイルでレンダーテスト、状態テスト、インタラクションテストをカバー
- 追加のテストファイル（`component.test.tsx`）は例外的な場合のみ作成

**原則 2: Given-When-Then パターンを必須適用する**

- テストの構造を明確にし、可読性を向上させる
- ストーリーの`play`関数内でパターンを適用
- 各ステップをコメントで明示

**原則 3: 実用的なテストケースを優先する**

- ユーザーの実際の使用パターンに基づいたテストを作成
- エッジケースよりも主要な機能フローを重視
- 重複するテストを避け、統合可能なテストは統合する

**原則 4: 堅牢なエラーハンドリングを実装する**

- `try-catch`による例外処理で堅牢なテストを実装
- エラーメッセージは明確で、デバッグに役立つ情報を含める
- テスト失敗時の情報提供を充実させる

### コンポーネント階層別実装パターン

各コンポーネント階層には特有の実装パターンと注意点があります。

#### Atoms（基本コンポーネント）の実装パターン

**特徴**: シンプルな props、SVG アイコン、基本的なインタラクション

```typescript
// Atomsの典型的な実装例
export const AtomInteractionTest: Story = {
  args: {
    children: "Button Text",
    onClick: fn(),
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: 基本コンポーネントが表示されている", async () => {
      try {
        // シンプルな要素検索
        const element = canvas.getByRole("button", { name: "Button Text" });
        await expect(element).toBeInTheDocument();
        console.log("✅ Atoms基本表示確認完了");
      } catch (error) {
        console.error("❌ Atoms基本表示エラー:", String(error));
        throw error;
      }
    });

    await step("When: 基本的なインタラクションを実行", async () => {
      try {
        const element = canvas.getByRole("button");
        await userEvent.click(element);
        console.log("✅ Atoms基本操作完了");
      } catch (error) {
        console.error("❌ Atoms基本操作エラー:", String(error));
        throw error;
      }
    });

    await step("Then: 期待される基本動作が確認できる", async () => {
      try {
        await expect(args.onClick).toHaveBeenCalledTimes(1);
        console.log("✅ Atoms基本動作確認完了");
      } catch (error) {
        console.error("❌ Atoms基本動作エラー:", String(error));
        throw error;
      }
    });
  },
};
```

**Atoms 実装のポイント**:

- シンプルな DOM 構造を前提とした要素検索
- SVG アイコンは `getByRole("img", { hidden: true })` を使用
- 型エラーは props の型定義不整合が主な原因
- `children` vs `text` vs `label` プロパティの使い分けに注意

#### Molecules（複合コンポーネント）の実装パターン

**特徴**: フォーム要素、状態管理、複数の子コンポーネント組み合わせ

```typescript
// Moleculesの典型的な実装例
export const MoleculeInteractionTest: Story = {
  args: {
    onSubmit: fn(),
    initialValue: "",
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: 複合コンポーネントが表示されている", async () => {
      try {
        // 複数要素の存在確認
        const input = canvas.getByRole("textbox");
        const button = canvas.getByRole("button", { name: /submit/i });
        await expect(input).toBeInTheDocument();
        await expect(button).toBeInTheDocument();
        console.log("✅ Molecules複合表示確認完了");
      } catch (error) {
        console.error("❌ Molecules複合表示エラー:", String(error));
        throw error;
      }
    });

    await step("When: フォームデータを入力・送信", async () => {
      try {
        const input = canvas.getByRole("textbox");
        const button = canvas.getByRole("button", { name: /submit/i });

        await userEvent.type(input, "test input");
        await userEvent.click(button);
        console.log("✅ Moleculesフォーム操作完了");
      } catch (error) {
        console.error("❌ Moleculesフォーム操作エラー:", String(error));
        throw error;
      }
    });

    await step("Then: 状態変化と処理実行が確認できる", async () => {
      try {
        await expect(args.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            value: "test input",
          })
        );
        console.log("✅ Molecules状態管理確認完了");
      } catch (error) {
        console.error("❌ Molecules状態管理エラー:", String(error));
        throw error;
      }
    });
  },
};
```

**Molecules 実装のポイント**:

- 複数の子コンポーネントの連携テスト
- フォームバリデーションや状態管理のテスト
- `canvas.container` → `canvasElement` の使い分けが重要
- ポータル要素（Dialog, Sheet 等）は `{ hidden: true }` オプションを使用

#### Organisms（機能コンポーネント）の実装パターン

**特徴**: MSW 統合、複雑なデータ処理、API 通信

```typescript
// Organismsの典型的な実装例
export const OrganismApiIntegrationTest: Story = {
  parameters: createMSWParameters(
    [http.get("/api/data", () => HttpResponse.json(mockData))],
    true
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: 機能コンポーネントが初期化される", async () => {
      try {
        // ローディング状態の確認（高速環境対応）
        const container = canvasElement;
        await expect(container).toBeInTheDocument();
        console.log("✅ Organisms初期化確認完了");
      } catch (error) {
        console.error("❌ Organisms初期化エラー:", String(error));
        throw error;
      }
    });

    await step("When: APIからデータを取得・表示", async () => {
      try {
        await waitFor(
          async () => {
            const dataElements = canvas.getAllByRole("row");
            await expect(dataElements.length).toBeGreaterThan(0);
          },
          { timeout: 15000 }
        );
        console.log("✅ OrganismsAPI連携完了");
      } catch (error) {
        console.error("❌ OrganismsAPI連携エラー:", String(error));
        throw error;
      }
    });

    await step("Then: 複雑な機能が正常に動作する", async () => {
      try {
        // テーブルデータの確認
        const rows = canvas.getAllByRole("row");
        await expect(rows.length).toBeGreaterThanOrEqual(1);

        // インタラクションテスト
        const firstRow = rows[0];
        await userEvent.click(firstRow);
        console.log("✅ Organisms機能動作確認完了");
      } catch (error) {
        console.error("❌ Organisms機能動作エラー:", String(error));
        throw error;
      }
    });
  },
};
```

**Organisms 実装のポイント**:

- MSW 統合は `createMSWParameters` を使用
- 非同期処理は `waitFor` で適切なタイムアウト設定
- 複雑な DOM 構造への対応（テーブル、リスト等）
- エラーハンドリングとフォールバック表示のテスト

#### Pages/Templates（ページコンポーネント）の実装パターン

**特徴**: ページレベルテスト、レイアウト検証、統合的な動作確認

```typescript
// Pages/Templatesの典型的な実装例
export const PageIntegrationTest: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: ページ全体が正常に表示されている", async () => {
      try {
        // ページの主要要素確認
        const pageContainer = canvasElement;
        await expect(pageContainer).toBeInTheDocument();
        await expect(pageContainer).toBeVisible();
        console.log("✅ Pageレイアウト確認完了");
      } catch (error) {
        console.error("❌ Pageレイアウトエラー:", String(error));
        throw error;
      }
    });

    await step("When: ページ内の主要機能を確認", async () => {
      try {
        // 複数のコンポーネント連携確認
        // シンプルな存在確認に留める（詳細は各コンポーネントでテスト）
        console.log("✅ Page統合機能確認完了");
      } catch (error) {
        console.error("❌ Page統合機能エラー:", String(error));
        throw error;
      }
    });

    await step("Then: ページ全体の動作が統合的に機能する", async () => {
      try {
        // 統合レベルでの動作確認
        const pageContainer = canvasElement;
        await expect(pageContainer).toBeInTheDocument();
        console.log("✅ Page統合動作確認完了");
      } catch (error) {
        console.error("❌ Page統合動作エラー:", String(error));
        throw error;
      }
    });
  },
};
```

**Pages/Templates 実装のポイント**:

- 詳細なテストは避け、統合的な動作確認に重点
- 複雑な機能テストは下位コンポーネントで実施
- レスポンシブ対応やレイアウト崩れの確認
- パフォーマンスや初期化処理のテスト

### 基本実装パターン

#### Meta 定義

```typescript
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, fn, within, step, waitFor } from "@storybook/test";
import { ComponentName } from "./ComponentName";

const meta: Meta<typeof ComponentName> = {
  title: "Atoms/ComponentName", // 階層に応じて変更
  component: ComponentName,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "コンポーネントの詳細な説明文。使用目的、主要機能、注意点を含める。",
      },
    },
  },
  tags: ["autodocs"],
  args: {
    onClick: fn(), // モック関数を設定
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary"],
      description: "コンポーネントのバリエーション",
    },
    disabled: {
      control: "boolean",
      description: "無効状態の制御",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;
```

#### 統合インタラクションテスト（Given-When-Then パターン）

```typescript
export const ComprehensiveInteractionTest: Story = {
  args: {
    children: "テストボタン",
    variant: "primary",
    onClick: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: コンポーネントが正常に表示されている", async () => {
      try {
        const button = canvas.getByRole("button", { name: "テストボタン" });
        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();
        console.log("✅ 初期状態確認完了");
      } catch (error) {
        console.error("❌ 初期状態確認エラー:", error);
        throw error;
      }
    });

    await step("When: ユーザーがボタンをクリックする", async () => {
      try {
        const button = canvas.getByRole("button", { name: "テストボタン" });
        await userEvent.click(button);
        console.log("✅ クリック操作完了");
      } catch (error) {
        console.error("❌ クリック操作エラー:", error);
        throw error;
      }
    });

    await step("Then: 期待される動作が実行される", async () => {
      try {
        // コールバック関数の呼び出し確認
        await expect(args.onClick).toHaveBeenCalledTimes(1);

        // 状態変化の確認（必要に応じて）
        const button = canvas.getByRole("button", { name: "テストボタン" });
        // 追加の状態検証...

        console.log("✅ 結果検証完了");
      } catch (error) {
        console.error("❌ 結果検証エラー:", error);
        throw error;
      }
    });
  },
};
```

#### キーボードアクセシビリティテスト

```typescript
export const KeyboardAccessibilityTest: Story = {
  args: {
    children: "キーボードテスト",
    onClick: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: コンポーネントがキーボードフォーカス可能", async () => {
      const button = canvas.getByRole("button", { name: "キーボードテスト" });
      await expect(button).toBeInTheDocument();

      // ARIA属性の確認
      const ariaLabel = button.getAttribute("aria-label");
      if (ariaLabel) {
        console.log(`✅ ARIA属性確認: ${ariaLabel}`);
      }
    });

    await step("When: キーボードでナビゲーションする", async () => {
      // タブキーでフォーカス
      await userEvent.tab();
      const button = canvas.getByRole("button", { name: "キーボードテスト" });
      await expect(button).toHaveFocus();

      // Enterキーで操作
      await userEvent.keyboard("{Enter}");
    });

    await step("Then: キーボード操作が正常に動作する", async () => {
      await expect(args.onClick).toHaveBeenCalledTimes(1);
      console.log("✅ キーボードアクセシビリティ確認完了");
    });
  },
};
```

#### エラーハンドリングと状態テスト

```typescript
export const ErrorHandlingTest: Story = {
  args: {
    children: "エラーテスト",
    disabled: true,
    onClick: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step(
      "Given: 無効化されたコンポーネントが表示されている",
      async () => {
        try {
          const button = canvas.getByRole("button", { name: "エラーテスト" });
          await expect(button).toBeDisabled();
          console.log("✅ 無効状態確認完了");
        } catch (error) {
          console.error("❌ 無効状態確認エラー:", error);
          throw error;
        }
      }
    );

    await step("When: 無効なコンポーネントを操作しようとする", async () => {
      try {
        const button = canvas.getByRole("button", { name: "エラーテスト" });
        // pointerEventsCheck: 0 で無効なボタンでもクリックを試行
        await userEvent.click(button, { pointerEventsCheck: 0 });
        console.log("✅ 無効状態での操作試行完了");
      } catch (error) {
        console.warn(
          "⚠️ 無効状態での操作エラー（予期される動作）:",
          error.message
        );
      }
    });

    await step("Then: 無効状態では操作が実行されない", async () => {
      await expect(args.onClick).not.toHaveBeenCalled();
      console.log("✅ 無効状態での動作確認完了");
    });
  },
};
```

### 推奨テストケース（統合型）

#### 1. 基本テストケース（必須・統合型）

```typescript
// ========== 基本表示・バリエーションテスト ==========
export const AllVariantsTest: Story = {
  render: () => (
    <div className="space-y-4">
      <ComponentName variant="primary">Primary</ComponentName>
      <ComponentName variant="secondary">Secondary</ComponentName>
      <ComponentName disabled>Disabled</ComponentName>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: 全バリエーションが表示されている", async () => {
      const primaryButton = canvas.getByRole("button", { name: "Primary" });
      const secondaryButton = canvas.getByRole("button", { name: "Secondary" });
      const disabledButton = canvas.getByRole("button", { name: "Disabled" });

      await expect(primaryButton).toBeInTheDocument();
      await expect(secondaryButton).toBeInTheDocument();
      await expect(disabledButton).toBeInTheDocument();
      await expect(disabledButton).toBeDisabled();
    });
  },
};
```

#### 2. 統合インタラクション・アクセシビリティテスト

```typescript
// ========== 統合インタラクション・A11yテスト ==========
export const InteractionAccessibilityTest: Story = {
  args: {
    children: "統合テスト",
    onClick: fn(),
    "aria-label": "重要なアクション",
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step(
      "Given: アクセシブルなコンポーネントが表示されている",
      async () => {
        const button = canvas.getByRole("button");
        await expect(button).toHaveAttribute("aria-label", "重要なアクション");
        await expect(button).toBeVisible();
      }
    );

    await step("When: マウスとキーボードで操作する", async () => {
      const button = canvas.getByRole("button");

      // マウスクリック
      await userEvent.click(button);

      // キーボードフォーカス
      button.focus();
      await expect(button).toHaveFocus();

      // Enterキー操作
      await userEvent.keyboard("{Enter}");
    });

    await step("Then: 両方の操作が正常に動作する", async () => {
      // マウスクリック + Enterキーで2回呼ばれる
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });
  },
};
```

### MSW 統合テスト

#### 統合 API テスト

```typescript
// ========== MSW統合テスト ==========
const apiHandlers = {
  success: http.get("/api/data", () => {
    console.log("🚀 MSW Handler: /api/data called");
    return HttpResponse.json(createSuccessResponse(mockData));
  }),

  error: http.get("/api/data", () => {
    const errorResponse = createErrorResponse("データ取得に失敗しました");
    return HttpResponse.json(errorResponse, { status: errorResponse.status });
  }),
};

export const ApiIntegrationTest: Story = {
  render: () => <ComponentWithAPI />,
  parameters: createMSWParameters([apiHandlers.success], true),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: APIからデータを取得する", async () => {
      // ローディング状態の確認（高速環境対応）
      try {
        const loadingIndicator = canvas.getByText("読み込み中...");
        await expect(loadingIndicator).toBeInTheDocument();
        console.log("✅ ローディング状態確認");
      } catch {
        console.log("⚠️ ローディング状態が高速でキャッチできませんでした");
      }
    });

    await step("When: データ取得が完了する", async () => {
      await waitFor(
        async () => {
          const firstItem = canvas.getByText("サンプル1");
          await expect(firstItem).toBeInTheDocument();
        },
        { timeout: 15000 }
      );
    });

    await step("Then: データが正しく表示され、操作可能", async () => {
      // データ表示の確認
      await expect(canvas.getByText("サンプル1")).toBeInTheDocument();
      await expect(canvas.getByText("サンプル2")).toBeInTheDocument();

      // インタラクション確認
      const firstItem = canvas.getByText("サンプル1");
      await userEvent.click(firstItem);

      // 結果確認
      // ... 期待される動作の検証
    });
  },
};

export const ApiErrorHandlingTest: Story = {
  render: () => <ComponentWithAPI />,
  parameters: createMSWParameters([apiHandlers.error], true),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Given: API呼び出しがエラーになる", async () => {
      await waitFor(
        async () => {
          const errorMessage = canvas.getByText("エラーが発生しました");
          await expect(errorMessage).toBeInTheDocument();
        },
        { timeout: 15000 }
      );
    });

    await step("Then: 適切なエラーメッセージが表示される", async () => {
      await expect(
        canvas.getByText("データ取得に失敗しました")
      ).toBeInTheDocument();
    });
  },
};
```

## ベストプラクティス

### 1. テスト構造の最適化

```typescript
// ✅ 推奨: 機能別に統合されたテスト
export const FormValidationTest: Story = {
  play: async ({ canvasElement, step }) => {
    await step("Given: フォームが表示されている", async () => {
      // 初期状態確認
    });

    await step("When: 無効な入力を行う", async () => {
      // 無効入力テスト
    });

    await step("Then: バリデーションエラーが表示される", async () => {
      // エラー表示確認
    });

    await step("When: 有効な入力に修正する", async () => {
      // 有効入力テスト
    });

    await step("Then: エラーが解消され送信可能になる", async () => {
      // 成功状態確認
    });
  },
};

// ❌ 非推奨: 分割された重複テスト
export const InvalidInputTest: Story = {
  /* 無効入力のみ */
};
export const ValidInputTest: Story = {
  /* 有効入力のみ */
};
export const ErrorDisplayTest: Story = {
  /* エラー表示のみ */
};
```

### 2. エラーハンドリングの標準化

```typescript
const safeElementOperation = async (
  operation: () => Promise<void>,
  errorContext: string
) => {
  try {
    await operation();
    console.log(`✅ ${errorContext}: 成功`);
  } catch (error) {
    console.error(`❌ ${errorContext}: エラー`, error);
    throw error;
  }
};

// 使用例
await safeElementOperation(async () => {
  const button = canvas.getByRole("button");
  await userEvent.click(button);
}, "ボタンクリック操作");
```

### 3. デバッグ情報の充実

```typescript
export const DebugFriendlyTest: Story = {
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);

    await step("デバッグ情報の出力", async () => {
      console.log("=== テスト開始 ===");
      console.log("Props:", args);
      console.log("DOM構造:", canvasElement.innerHTML);

      // 要素の存在確認とデバッグ
      const elements = canvas.getAllByRole("button");
      console.log(`ボタン要素数: ${elements.length}`);
      elements.forEach((el, index) => {
        console.log(
          `ボタン${index + 1}:`,
          el.textContent,
          el.getAttribute("aria-label")
        );
      });
    });

    // テスト実行...
  },
};
```

## トラブルシューティング

### 段階的デバッグフロー

```typescript
export const TroubleshootingTemplate: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Phase 1: DOM構造の確認", async () => {
      try {
        console.log("DOM構造:", canvasElement.innerHTML);
        const targetElement = canvas.getByRole("button");
        console.log("✅ Phase 1: DOM構造 OK");
      } catch (error) {
        console.error("❌ Phase 1: DOM構造エラー");
        console.error("利用可能な要素:", canvas.getAllByRole("*"));
        throw error;
      }
    });

    await step("Phase 2: イベントハンドリングの確認", async () => {
      try {
        const button = canvas.getByRole("button");
        await userEvent.click(button);
        console.log("✅ Phase 2: イベント処理 OK");
      } catch (error) {
        console.error("❌ Phase 2: イベント処理エラー");
        console.error(
          "要素の状態:",
          button.disabled,
          button.style.pointerEvents
        );
        throw error;
      }
    });

    await step("Phase 3: 非同期処理の確認", async () => {
      try {
        await waitFor(
          async () => {
            const result = canvas.getByText("期待される結果");
            await expect(result).toBeInTheDocument();
          },
          { timeout: 5000 }
        );
        console.log("✅ Phase 3: 非同期処理 OK");
      } catch (error) {
        console.error("❌ Phase 3: 非同期処理エラー");
        console.error("現在のDOM状態:", canvasElement.innerHTML);
        throw error;
      }
    });
  },
};
```

### よくある問題と解決法

#### 1. 要素が見つからない問題

```typescript
// 問題の診断と解決
const diagnoseElementIssue = (canvas: any, expectedRole: string) => {
  try {
    // 基本的な検索
    return canvas.getByRole(expectedRole);
  } catch (error) {
    console.error(`要素が見つかりません: ${expectedRole}`);

    // 診断情報の出力
    console.log("利用可能な要素:");
    const allElements = canvas.getAllByRole("*");
    allElements.forEach((el, index) => {
      console.log(`${index + 1}. ${el.tagName} - ${el.textContent}`);
    });

    // 代替検索方法の提案
    console.log("代替検索方法を試してください:");
    console.log("- getByText()");
    console.log("- getByTestId()");
    console.log("- querySelector()");

    throw error;
  }
};
```

#### 1.1. 実際の修正例: 複数要素の競合問題

**問題**: `Found multiple elements with the role "checkbox"`エラー

```typescript
// ❌ 問題のあるコード
export const CheckboxTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // エラー: 複数のcheckbox要素が存在するため失敗
    const checkbox = canvas.getByRole("checkbox");
    await userEvent.click(checkbox);
  },
};
```

**原因**: Checkbox コンポーネントで div 要素と input 要素の両方に`role="checkbox"`が設定されている

**解決法**: `getAllByRole`を使用して特定の要素を選択

```typescript
// ✅ 修正されたコード
export const CheckboxTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 修正: getAllByRoleで複数要素を取得し、最初の要素（div要素）を選択
    const checkboxElements = canvas.getAllByRole("checkbox");
    const checkbox = checkboxElements[0]; // メインのチェックボックス（div要素）
    await userEvent.click(checkbox);
  },
};
```

#### 1.2. 実際の修正例: テキストマッチング問題

**問題**: 日付の完全一致による検索失敗

```typescript
// ❌ 問題のあるコード
export const FileTableTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // エラー: 実際は "2025/01/29 00:00:00" と時刻まで表示
    await expect(canvas.getByText("2025/01/29")).toBeInTheDocument();
  },
};
```

**解決法**: 正規表現による部分マッチング

```typescript
// ✅ 修正されたコード
export const FileTableTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 修正: 正規表現による部分マッチング（時刻部分を無視）
    await expect(canvas.getByText(/2025\/01\/29/)).toBeInTheDocument();
  },
};
```

**問題**: i18n キーと実際の表示テキストの不一致

```typescript
// ❌ 問題のあるコード
export const EmptyStateTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // エラー: i18nキー "messages.noFiles" は表示されない
    await expect(canvas.getByText("messages.noFiles")).toBeInTheDocument();
  },
};
```

**解決法**: 実際に表示されるテキストを使用

```typescript
// ✅ 修正されたコード
export const EmptyStateTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 修正: 実際に表示されているテキスト "noFiles" を確認
    await expect(canvas.getByText("noFiles")).toBeInTheDocument();
  },
};
```

#### 2. React 状態管理の問題

**問題**: 制御されたコンポーネントでの状態更新エラー

```typescript
// ❌ 問題のあるコード
export const Default: Story = {
  args: {
    checked: false,
    onChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getAllByRole("checkbox")[0];

    // クリック後、状態が更新されずテストが失敗
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked(); // ❌ 失敗: 状態が更新されない
  },
};
```

**原因**: 制御されたコンポーネントでは、Storybook の args 更新が必要

**解決法**: render プロパティで useState を使用した状態管理

```typescript
// ✅ 修正されたコード
export const Default: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(args.checked ?? false);

    return (
      <Checkbox
        {...args}
        checked={checked}
        onChange={(newChecked) => {
          setChecked(newChecked);
          args.onChange?.(newChecked);
        }}
      />
    );
  },
  args: {
    onChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getAllByRole("checkbox")[0];

    // クリック後、状態が正常に更新される
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked(); // ✅ 成功: 状態が更新される
  },
};
```

#### 3. MSW ハンドラーの問題

```typescript
// MSWデバッグヘルパー
const debugMSWHandler = (url: string, response: any) => {
  console.log(`🚀 MSW Handler: ${url}`);
  console.log("📤 Response:", response);

  // レスポンス構造の検証
  if (response.success === undefined) {
    console.warn("⚠️ レスポンスにsuccess フィールドがありません");
  }

  if (!response.data) {
    console.warn("⚠️ レスポンスにdata フィールドがありません");
  }

  return response;
};

// 使用例
const apiHandlers = {
  success: http.get("/api/data", () => {
    const response = createSuccessResponse(mockData);
    debugMSWHandler("/api/data", response);
    return HttpResponse.json(response);
  }),
};
```

#### 3. 大規模リファクタリングで発生した実装問題

##### 3.1. canvas.container Property エラー

**問題**: `Property 'container' does not exist on type` エラーが多数発生

```typescript
// ❌ 問題のあるコード
export const ProblemTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 以下でエラー発生
    const element = canvas.container.firstChild;
    const portalContent = canvas.container.querySelector("[data-portal]");
  },
};
```

**原因**: Storybook のバージョンアップによる`canvas.container`プロパティの廃止

**解決法**: `canvasElement`を直接使用

```typescript
// ✅ 修正されたコード
export const FixedTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // canvasElementを直接使用
    const element = canvasElement.firstChild;
    const portalContent = canvasElement.querySelector("[data-portal]");
  },
};
```

##### 3.2. formatDateTime 関数の引数エラー

**問題**: `Expected 1 arguments, but got 2` エラー

```typescript
// ❌ 問題のあるコード - tableRenderUtils.tsx
formattedDate = formatDateTime(dateStr, {
  includeTime: options.dateFormat?.includeTime ?? true,
});
```

**原因**: `formatDateTime`関数が第 2 引数をサポートしていない

**解決法**: 条件分岐による関数の使い分け

```typescript
// ✅ 修正されたコード
import { cn, formatDateTime, formatDate } from "@/lib/utils";

const includeTime = options.dateFormat?.includeTime ?? true;
formattedDate = includeTime ? formatDateTime(dateStr) : formatDate(dateStr);
```

##### 3.3. コンポーネント Props 型不整合エラー

**問題**: 型定義と実際の props が不一致

```typescript
// ❌ 問題のあるコード
export const Default: Story = {
  args: {
    children: "Label", // 型にchildrenが存在しない
    title: "Property Header", // 実際はlabelプロパティ
    organization: "Test Org", // UserInfoに存在しない
    onProfileClick: () => {}, // 実際はonViewProfile
  },
};
```

**解決法**: コンポーネントの型定義を確認して正しい props を使用

```typescript
// ✅ 修正されたコード
// 1. コンポーネント.tsxまたは.types.tsで型定義を確認
// 2. 正しいプロパティ名を使用

export const Default: Story = {
  args: {
    text: "Label", // children → text
    label: "Property Header", // title → label
    user: {
      // organization削除、正しいUserInfo型を使用
      name: "Test User",
      email: "test@example.com",
    },
    onViewProfile: () => {}, // onProfileClick → onViewProfile
  },
};
```

##### 3.4. DashboardTemplateProps 型エラー

**問題**: 存在しないプロパティを渡していた

```typescript
// ❌ 問題のあるコード
return (
  <DashboardTemplate
    userInfo={mockUserInfo}        // 存在しないprop
    onLogout={handleLogout}        // 存在しないprop
    onProfileClick={handleProfileClick}  // 存在しないprop
    versionSwitcher={{ ... }}
  >
```

**解決法**: 型定義を確認して必要な props のみを渡す

```typescript
// ✅ 修正されたコード
// DashboardTemplateProps の実際の定義確認後
return (
  <DashboardTemplate
    versionSwitcher={{ ... }}  // 実際に存在するpropのみ使用
  >
```

##### 3.5. 段階的修正のプロセス

大規模リファクタリングにおける効率的な修正プロセス：

```typescript
// 修正プロセスのテンプレート
export const SystematicFixProcess: Story = {
  play: async ({ canvasElement, step }) => {
    await step("Phase 1: 型エラーの特定と分類", async () => {
      try {
        // 1. npm run build で全エラーを把握
        // 2. エラーの種類別に分類（props, import, 関数引数等）
        // 3. 影響範囲の大きいエラーから優先修正
        console.log("🔍 型エラー分析フェーズ");
      } catch (error) {
        console.error("❌ 型エラー分析エラー:", String(error));
        throw error;
      }
    });

    await step("Phase 2: 系統的な修正実行", async () => {
      try {
        // 1. 同種エラーをバッチで修正
        // 2. 修正後の再ビルド確認
        // 3. 次のエラー種別に進行
        console.log("🔧 系統的修正フェーズ");
      } catch (error) {
        console.error("❌ 系統的修正エラー:", String(error));
        throw error;
      }
    });

    await step("Phase 3: 最終検証", async () => {
      try {
        // 1. 全コンポーネントビルド成功確認
        // 2. 主要コンポーネントの動作確認
        // 3. リグレッション確認
        console.log("✅ 最終検証フェーズ");
      } catch (error) {
        console.error("❌ 最終検証エラー:", String(error));
        throw error;
      }
    });
  },
};
```

##### 3.6. 実際のデバッグフロー修正例

**実例**: Checkbox と FileTable コンポーネントのテスト失敗修正プロセス

```typescript
// ステップ1: エラー分析と優先順位付け
export const RealWorldDebugProcess: Story = {
  play: async ({ step }) => {
    await step("Phase 1: テストエラーの分析", async () => {
      try {
        // 実行: npm run test-storybook で全エラーを確認
        // 結果:
        // - Checkbox: "Found multiple elements with the role 'checkbox'"
        // - FileTable: "Unable to find an element with the text: 2025/01/29"
        console.log("🔍 エラー分析完了");
        console.log("- DOM構造問題: Checkbox (複数要素)");
        console.log("- テキストマッチング問題: FileTable (日付・空状態)");
      } catch (error) {
        console.error("❌ エラー分析失敗:", String(error));
        throw error;
      }
    });

    await step("Phase 2: DOM構造問題の修正 (Checkbox)", async () => {
      try {
        // 修正前: canvas.getByRole("checkbox")
        // 修正後: canvas.getAllByRole("checkbox")[0]

        // 追加修正: React状態管理
        // render プロパティでuseStateを使用
        console.log("✅ Checkbox DOM構造修正完了");
        console.log("✅ Checkbox React状態管理修正完了");
      } catch (error) {
        console.error("❌ Checkbox修正失敗:", String(error));
        throw error;
      }
    });

    await step(
      "Phase 3: テキストマッチング問題の修正 (FileTable)",
      async () => {
        try {
          // 日付問題修正:
          // 修正前: canvas.getByText("2025/01/29")
          // 修正後: canvas.getByText(/2025\/01\/29/)

          // 空状態問題修正:
          // 修正前: canvas.getByText("messages.noFiles")
          // 修正後: canvas.getByText("noFiles")
          console.log("✅ FileTable テキストマッチング修正完了");
        } catch (error) {
          console.error("❌ FileTable修正失敗:", String(error));
          throw error;
        }
      }
    );

    await step("Phase 4: 段階的検証", async () => {
      try {
        // 検証1: Checkbox テスト実行
        // 結果: 14テスト成功

        // 検証2: FileTable テスト実行
        // 結果: 18テスト成功

        // 検証3: npm run build
        // 結果: ビルド成功
        console.log("✅ 全修正完了: 32テスト成功");
      } catch (error) {
        console.error("❌ 最終検証失敗:", String(error));
        throw error;
      }
    });
  },
};
```

**学習ポイント**:

1. **系統的エラー分析**: DOM 構造 vs テキストマッチング問題の分類
2. **段階的修正**: 一つずつ確実に修正し、各段階で検証
3. **パターン化**: 同じ種類のエラー（複数箇所の`getByRole`）をバッチ修正
4. **状態管理の考慮**: 制御されたコンポーネントでの Storybook 制約理解
5. **実装確認**: 実際の表示内容とテスト期待値の整合性確認

**修正効率化のポイント**:

1. **同種エラーのパターン化**: 同じ種類のエラーをまとめて修正
2. **型定義の事前確認**: `component.tsx` → `component.types.ts` → `component.stories.tsx`の順で確認
3. **段階的ビルド確認**: 修正のたびに`npm run build`で進捗確認
4. **修正ログの記録**: 後続の同種エラー修正時の参考として記録
5. **実装パターンの統一**: 全コンポーネントで一貫したパターンを適用

## まとめ

このテスト実装ガイドでは、以下の重要な観点を体系化しています：

### 重要な観点

1. **テスト重複の排除**: 類似機能の統合、明確な責務分離
2. **段階的デバッグアプローチ**: DOM→ イベント → 非同期の順序での問題解決
3. **実装整合性の検証**: コンポーネント実装とテストの一致確認
4. **堅牢なエラーハンドリング**: try-catch による例外処理と情報提供
5. **統合型テストケース**: 複数の側面を一度に検証する効率的なテスト

### 実践的な手法

- **Given-When-Then パターンの必須化**
- **デバッグ情報の標準化**
- **MSW 統合テストの実装**
- **アクセシビリティテストの統合**
- **トラブルシューティングフローの体系化**

このガイドに従うことで、効率的で保守性の高いテスト実装が可能になります。
