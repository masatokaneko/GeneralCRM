# 📸 cursor-nextjs-boilerplate テストガイド

## 🗂️ ディレクトリ構造

```
tests/
├── snapshots/                          # VRT (Visual Regression Testing)
│   ├── playwright.snapshots.config.ts      # 最適化されたPlaywright設定
│   ├── snapshots.spec.ts                   # スナップショットテストファイル
│   ├── results/                            # テスト結果・レポート
│   └── snapshots-results/                  # スナップショット保存先（自動生成）
├── unit/                               # 単体テスト用（将来拡張）
├── integration/                        # 統合テスト用（将来拡張）
└── README.md                           # このファイル
```

## 🚀 テスト実行方法

### 基本テストコマンド

#### Vitest（Storybook 統合テスト）

```bash
# 基本テスト実行
npm run test
# ウォッチモード
npm run test:watch
# Storybook統合テスト
npm run test-storybook
# カバレッジ測定
npm run test:coverage
```

#### 型チェック

```bash
# 基本的な型チェック
npm run type-check
# 厳密な型チェック
npm run type-check:strict
```

#### Biome (リント・フォーマット)

```bash
# リント実行
npm run lint
# リント修正
npm run lint:fix
# フォーマット
npm run format
# 全チェック実行
npm run check
```

### VRT (Visual Regression Testing)

#### 前提条件

VRT テストを実行する前に、以下の準備が必要です：

```bash
# 1. Storybookをビルド
npm run build-storybook

# 2. Storybookサーバーを起動（別ターミナルで実行）
npm run start-storybook
# → http://localhost:8080 でStorybookが起動します
```

#### VRT テスト実行

```bash
# 基本的なスナップショットテスト
npm run snapshots-test
# → テスト実行後、HTMLレポートが自動で開きます

# スナップショット更新（初回実行時）
npm run snapshots-update
# → 新しいスナップショットを生成・更新します

# 高速テスト（4並列実行）
npm run snapshots-fast
# → ローカル開発で最大4並列実行により高速化

# CI環境用（2並列・JSON形式レポート）
npm run snapshots-ci
# → CI/CD環境に最適化された実行

# スナップショットクリーンアップ
npm run snapshots-clean
# → 既存のスナップショットファイルを全削除
```

## 🎯 最適化された特徴

### パフォーマンス最適化

- **実行時間**: 約 40-60%短縮
- **並列実行**: CI 環境 2 並列、ローカル 4 並列
- **タイムアウト最適化**: 30 秒 →10-15 秒
- **効率的な待機処理**: 1 秒 →0.3-0.5 秒

### Vitest 設定の最適化

- **エイリアス設定**: `@/` で src ディレクトリを参照可能
- **optimizeDeps**: 主要ライブラリの事前最適化
- **globals 設定**: テストでのグローバル関数利用可能
- **Storybook 統合**: Storybook ストーリーの自動テスト化

### VRT 機能

- **スクリーンショット比較**: UI 変更の自動検出
- **ARIA スナップショット**: アクセシビリティ自動検証
- **複数ブラウザ対応**: Chromium 最適化（将来的に Firefox、Webkit 対応可能）

## 📋 テスト戦略

### 階層別テスト方針

| 階層          | テスト対象               | テスト種類      | 重点項目                       |
| ------------- | ------------------------ | --------------- | ------------------------------ |
| **Atoms**     | 基本動作、Props、状態    | Storybook       | レンダリング、インタラクション |
| **Molecules** | 組み合わせ動作、フォーム | Storybook       | バリデーション、状態管理       |
| **Organisms** | API 統合、複雑な機能     | Storybook + VRT | VRT、エラーハンドリング        |
| **Templates** | レイアウト、構造         | VRT + E2E       | レスポンシブ、ナビゲーション   |
| **Pages**     | 統合フロー               | VRT + E2E       | ユーザージャーニー             |

## 🔧 設定カスタマイズ

### VRT テスト対象の変更

`tests/snapshots/snapshots.spec.ts`でテスト対象のコンポーネントを変更できます。

### タイムアウト調整

`tests/snapshots/playwright.snapshots.config.ts`の各種タイムアウト値を調整できます。

### 並列実行数変更

```typescript
// playwright.snapshots.config.ts
workers: process.env.CI ? 2 : 4, // CI: 2並列、ローカル: 4並列
```

## 🐛 トラブルシューティング

### よくある問題

#### 1. VRT テストが失敗する

```bash
# Storybookサーバーが起動しているか確認
curl http://localhost:8080

# スナップショットを更新
npm run snapshots-update

# Storybookを再ビルド
npm run build-storybook
```

#### 2. Vitest テストが失敗する

```bash
# 型チェック実行
npm run type-check

# Storybook設定を確認
npm run storybook
```

#### 3. 依存関係エラー

```bash
# 依存関係を再インストール
npm ci

# http-serverが見つからない場合
npm install http-server --save-dev
```

### デバッグ用コマンド

```bash
# Playwrightデバッグモード
npm run snapshots-test -- --debug

# ヘッドレスモード無効
npm run snapshots-test -- --headed

# 特定ブラウザでのみ実行
npm run snapshots-test -- --project=chromium
```

## 📊 期待される効果

- **実行時間**: 約 40-60%短縮
- **開発効率**: エイリアス設定により import が簡潔に
- **品質保証**: VRT による自動 UI 検証
- **保守性**: 統一されたテスト戦略

## 🚀 今後の拡張予定

1. **MSW 統合**: API モックテストの追加
2. **E2E テスト**: 完全なユーザーフロー測定
3. **パフォーマンステスト**: Core Web Vitals 測定
4. **アクセシビリティテスト**: ARIA スナップショットの拡充

このテスト環境により、高品質で保守性の高い Next.js アプリケーションの開発が可能になります。
