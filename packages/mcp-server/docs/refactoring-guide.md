# リファクタリングガイド

## 🎯 基本原則

### 1. **段階的リファクタリング**
- フェーズ分けで安全に実行
- 各フェーズでテスト実行
- 破壊的変更の最小化

### 2. **品質保証**
- Biome lint/format
- Storybookテスト
- 既存機能の互換性確認

## 🔧 実践パターン

### A. **UIコンポーネント置き換え**
```typescript
// ❌ 修正前
import { Button } from "@/components/ui/button"

// ✅ 修正後  
import { Button } from "@/components/atoms/Button"
```

**適用箇所**: `@/molecules`以上のコンポーネント

### B. **スタイル変数化**
```typescript
// ❌ 重複スタイル
className="border-steel-blue-300/50 text-steel-blue-700 hover:bg-steel-blue-100/50"
className="border-steel-blue-300/50 text-steel-blue-700 hover:bg-steel-blue-100/50" 

// ✅ 変数化
const buttonStyles = useMemo(() => ({
  common: "border-steel-blue-300/50 text-steel-blue-700 hover:bg-steel-blue-100/50"
}), []);

className={buttonStyles.common}
```

**効果**: 保守性向上、重複コード削減

### C. **cn関数の適切な使用**
```typescript
// ❌ テンプレートリテラル
className={`w-32 ${buttonStyles.dropdown}`}

// ✅ cn関数
className={cn("w-32", buttonStyles.dropdown)}

// ✅ 条件付きスタイル
className={cn(
  buttonStyles.filter,
  hasActiveFilters && "bg-steel-blue-100 border-steel-blue-400"
)}
```

**理由**: 型安全性、条件付きスタイルの適切な処理

### D. **アクティブ状態の統一**
```typescript
// ✅ 推奨パターン
className="[&[data-state=open]_svg]:rotate-180 [&[data-state=open]_svg]:text-steel-blue-600"
```

**対象**: ドロップダウン、モーダルなどの状態変化UI

### E. **パフォーマンス最適化**
```typescript
// ✅ メモ化の活用
const Component = React.memo(({ props }) => {
  const memoizedValue = useMemo(() => heavyCalculation(), [dependency]);
  const memoizedCallback = useCallback(() => {}, [dependency]);
});
```

## ⚠️ 注意事項

### 🚫 **禁止事項**
- `@/ui`コンポーネントの直接編集
- 一度に大量の変更
- テスト無しでの変更

### 💡 **推奨事項**
- 小さな単位での変更
- 変更前後の動作比較
- ドキュメント更新の並行実施

## 🎨 デザイントークン活用

### カラーパターン
```typescript
// Steel Blue系（推奨）
"border-steel-blue-300/50"     // ボーダー
"text-steel-blue-700"          // テキスト
"bg-steel-blue-100/50"         // 背景
"hover:bg-steel-blue-100/50"   // ホバー
"active:bg-steel-blue-200/50"  // アクティブ
```

### 状態管理
```typescript
// アクティブ状態の統一パターン
"data-[state=open]:bg-steel-blue-100/50"
"[&[data-state=open]_svg]:rotate-180"
```
