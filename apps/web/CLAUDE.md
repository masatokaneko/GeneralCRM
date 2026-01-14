# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語設定

- 日本語で回答してください
- CLAUDE.md を読み込んだら「CLAUDE.md を読み込みました！」と伝えてください

## 制約事項

- 依存関係のインストールやファイルの削除、破壊的な変更を行う場合はユーザーの許諾が必要
- 現在は開発フェーズなので後方互換性よりも最適化を優先
- コードコメント内での絵文字使用は禁止（console.log、マークダウンでは許可）

## コマンド

```bash
# 開発サーバー起動（ポート3005推奨、3000/3001は他アプリが使用中の可能性あり）
PORT=3005 npm run dev

# リント・フォーマット
npm run lint          # Biome check
npm run lint:fix      # 自動修正
npm run format        # フォーマット
npm run check         # lint + format一括

# 型チェック
npm run type-check    # --skipLibCheck付き（推奨）
npm run type-check:strict

# テスト
npm run test          # Vitest実行
npm run test:watch    # ウォッチモード
npm run test:coverage # カバレッジ付き

# Storybook
npm run storybook     # ポート6006で起動
npm run build-storybook
```

## アーキテクチャ

### ディレクトリ構造

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # 認証必須のメインレイアウト
│   │   ├── accounts/      # 取引先 CRUD
│   │   ├── contacts/      # 取引先責任者 CRUD
│   │   ├── leads/         # リード CRUD
│   │   ├── opportunities/ # 商談 CRUD
│   │   ├── quotes/        # 見積 CRUD
│   │   ├── dashboard/     # ダッシュボード
│   │   └── layout.tsx     # AppLayout + 認証チェック
│   └── layout.tsx         # ルートレイアウト（Providers）
├── components/            # Atomic Design
│   ├── atoms/            # Button, Badge, Input等
│   ├── molecules/        # 複合コンポーネント
│   ├── organisms/        # RecordList, RecordDetail等
│   ├── templates/        # ListPageTemplate, DetailPageTemplate
│   └── layouts/          # AppLayout, Sidebar, Header
├── lib/
│   ├── api/              # React Query フック
│   │   ├── client.ts     # ApiClient（fetch wrapper）
│   │   ├── accounts.ts   # useAccounts, useAccount, useCreateAccount等
│   │   ├── contacts.ts
│   │   ├── leads.ts      # + useConvertLead
│   │   ├── opportunities.ts  # + useChangeOpportunityStage, useCloseOpportunity
│   │   └── quotes.ts     # + useSetPrimaryQuote, useChangeQuoteStatus
│   └── utils.ts          # cn()等ユーティリティ
├── providers/            # Context Providers
│   ├── AuthProvider.tsx  # 認証コンテキスト
│   ├── QueryClientProvider.tsx
│   ├── ThemeProvider.tsx
│   └── I18nProvider.tsx
├── mocks/                # MSW モックAPI（開発用）
│   ├── handlers/         # エンドポイント別ハンドラー
│   └── db.ts            # インメモリDB
└── contexts/             # TableProvider等の状態管理
```

### API統合パターン

```typescript
// lib/api/accounts.ts のパターン
export function useAccounts(params?: AccountsListParams) {
  return useQuery({
    queryKey: ["accounts", params],
    queryFn: () => apiClient.get<PaginatedResponse<Account>>("/accounts", {...}),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post("/accounts", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });
}
```

### リストページパターン

```typescript
// 一覧ページは ListPageTemplate を使用
export default function AccountsPage() {
  const { data, isLoading, error } = useAccounts();
  return (
    <ListPageTemplate
      title="Accounts"
      columns={columns}
      data={(data?.records as Account[]) || []}
      totalCount={data?.totalSize || 0}
      isLoading={isLoading}
      error={error}
      onRowClick={(row) => router.push(`/accounts/${row.id}`)}
    />
  );
}
```

## 環境変数

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002/api/v1  # API サーバーURL
NEXT_PUBLIC_MSW_ENABLED=false  # true: MSWモック使用, false: 実API使用
```

## バックエンドAPI

APIサーバーは `apps/api` にあり、ポート3002で動作:
- `GET/POST /api/v1/accounts`
- `GET/PATCH/DELETE /api/v1/accounts/:id`
- 同様に contacts, leads, opportunities, quotes
- `POST /api/v1/leads/:id/convert` - リード変換
- `POST /api/v1/opportunities/:id/stage` - ステージ変更
- `POST /api/v1/opportunities/:id/close` - 商談クローズ

## Plan Mode時の参照ドキュメント

計画前に以下をMCPツールで取得:
- `getDocs`: component-design-framework.md, testing-guide.md
- `resolve-library-id` + `get-library-docs`: Next.js, shadcn/ui, Tailwind CSS
- `get-ui-building-instructions`: Storybook MCP

## 技術スタック

- Next.js 15.5.7 (App Router, Turbopack)
- React 19.2.1
- TypeScript 5.9.3
- Tailwind CSS 4.1.17
- TanStack React Query 5
- shadcn/ui (Radix UI ベース)
- Biome 2.3.7 (Linter/Formatter)
- Vitest 4.0.15
- Storybook 10.1.4
- MSW 2.12.4 (Mock Service Worker)
