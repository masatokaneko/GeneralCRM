# 🔧 トラブルシューティングガイド

Generic MCP Server で発生する可能性のある問題と解決方法を説明します。

## 🚨 緊急時の対応

### MCP サーバーが全く認識されない

#### 即座に確認すべき項目

1. **Cursor の再起動**

   ```bash
   # Cursor を完全終了後、再起動
   ```

2. **MCP 設定ファイルの構文確認**

   ```bash
   cat ~/.cursor/mcp.json | jq .
   ```

3. **サーバーファイルの存在確認**

   ```bash
   ls -la /path/to/your-project/mcp/src/server.ts
   ```

4. **権限確認**
   ```bash
   # ファイルが実行可能か確認
   ls -la /path/to/your-project/mcp/src/server.ts
   ```

## 🔍 診断ツール

### デバッグモードの活用

```javascript
// パス設定の詳細確認
getDocs({ debug: true });

// 出力例の確認ポイント
/*
=== MCP Path Configuration Debug ===
Project Root: /Users/user/project        ← 正しいパスか？
Docs Directory: docs (/Users/user/project/docs)  ← ディレクトリ存在するか？
Config File: /Users/user/project/.mcp-config.json (exists: true)  ← 設定ファイル存在するか？
*/
```

### システム情報収集

```bash
# Node.js バージョン
node --version

# npm バージョン
npm --version

# TypeScript バージョン
npx tsc --version

# プロジェクト構造確認
tree -L 3
```

## 📂 ファイル・パス関連エラー

### Error: "docs ディレクトリが見つかりません"

**原因**:

- 指定されたディレクトリが存在しない
- パス設定が間違っている
- プロジェクトルートの検出失敗

**解決手順**:

1. **ディレクトリ存在確認**

   ```bash
   ls -la docs/
   # または設定で指定したディレクトリ
   ls -la documentation/
   ```

2. **設定ファイル確認**

   ```json
   // .mcp-config.json
   {
     "paths": {
       "docsDir": "docs" // 実際のディレクトリ名と一致するか？
     }
   }
   ```

3. **プロジェクトルート確認**

   ```bash
   # プロジェクトルートで実行
   pwd
   ls -la .mcp-config.json  # 設定ファイルが存在するか？
   ```

4. **手動でのディレクトリ作成**
   ```bash
   mkdir -p docs
   echo "# テストドキュメント" > docs/test.md
   ```

### Error: "プロジェクトルートが検出できません"

**原因**:

- package.json が見つからない
- MCP サーバーが間違った場所から実行されている

**解決手順**:

1. **環境変数での明示的指定**

   ```json
   // ~/.cursor/mcp.json
   {
     "mcpServers": {
       "your-project-mcp": {
         "command": "tsx",
         "args": ["/path/to/project/mcp/src/server.ts"],
         "env": {
           "MCP_PROJECT_ROOT": "/path/to/project" // 明示的指定
         }
       }
     }
   }
   ```

2. **package.json の確認**

   ```bash
   ls -la package.json
   cat package.json | head -5
   ```

3. **デバッグ出力確認**
   ```javascript
   getDocs({ debug: true });
   // Project Root の値を確認
   ```

## ⚙️ 設定関連エラー

### Error: "設定ファイル読み込みエラー"

**原因**:

- JSON 構文エラー
- ファイルの権限問題
- 文字エンコーディング問題

**解決手順**:

1. **JSON 構文チェック**

   ```bash
   cat .mcp-config.json | jq .
   # エラーが出た場合は構文修正が必要
   ```

2. **ファイル権限確認**

   ```bash
   ls -la .mcp-config.json
   # 読み取り権限があるか確認
   ```

3. **文字エンコーディング確認**

   ```bash
   file .mcp-config.json
   # UTF-8 であることを確認
   ```

4. **設定ファイル再作成**

   ```bash
   # バックアップ
   mv .mcp-config.json .mcp-config.json.backup

   # 新規作成
   cat > .mcp-config.json << 'EOF'
   {
     "server": {
       "name": "Test MCP",
       "version": "1.0.0"
     },
     "features": {
       "docs": true,
       "biome": false,
       "components": false,
       "uxFormat": false
     }
   }
   EOF
   ```

### Error: "機能が利用できません"

**原因**:

- 機能が無効化されている
- 依存関係が不足している

**解決手順**:

1. **機能設定確認**

   ```json
   {
     "features": {
       "docs": true, // 必要な機能が true になっているか
       "biome": true,
       "components": true
     }
   }
   ```

2. **依存関係確認**

   ```bash
   # Biome 機能の場合
   npm list @biomejs/biome

   # Storybook 機能の場合
   npm list storybook
   ```

3. **段階的有効化**
   ```json
   // まず基本機能のみ
   {
     "features": {
       "docs": true,
       "biome": false,
       "components": false,
       "uxFormat": false
     }
   }
   ```

## 🖥️ Cursor 連携エラー

### Error: "MCP サーバーが認識されない"

**原因**:

- Cursor MCP 設定の問題
- サーバー起動の失敗

**解決手順**:

1. **Cursor 設定ファイル確認**

   ```bash
   cat ~/.cursor/mcp.json
   ```

2. **設定の正確性確認**

   ```json
   {
     "mcpServers": {
       "your-project-mcp": {
         "command": "tsx", // tsx コマンド利用可能？
         "args": ["/absolute/path/to/mcp/src/server.ts"], // 絶対パス？
         "env": {
           "MCP_PROJECT_ROOT": "/absolute/path/to/project" // プロジェクトルート正しい？
         }
       }
     }
   }
   ```

3. **tsx の確認**

   ```bash
   which tsx
   npx tsx --version
   ```

4. **手動でのサーバー起動テスト**
   ```bash
   cd /path/to/project/mcp
   npx tsx src/server.ts
   ```

### Error: "ツールが応答しない"

**原因**:

- サーバープロセスの問題
- 無限ループまたはデッドロック

**解決手順**:

1. **Cursor プロセス確認**

   ```bash
   # macOS/Linux
   ps aux | grep cursor

   # Windows
   tasklist | findstr cursor
   ```

2. **MCP プロセス確認**

   ```bash
   ps aux | grep tsx
   ```

3. **Cursor 完全再起動**

   ```bash
   # すべてのCursorプロセスを終了
   killall Cursor  # macOS
   # Windows: タスクマネージャーで終了

   # Cursor 再起動
   ```

4. **設定の簡素化**
   ```json
   // 最小設定でテスト
   {
     "mcpServers": {
       "test-mcp": {
         "command": "tsx",
         "args": ["/path/to/mcp/src/server.ts"]
       }
     }
   }
   ```

## 🎨 Storybook 連携エラー

### Error: "Storybook server is not running"

**原因**:

- Storybook サーバーが起動していない
- ポート設定の不一致

**解決手順**:

1. **Storybook サーバー確認**

   ```bash
   # ポート確認
   lsof -i :6006
   netstat -an | grep 6006
   ```

2. **Storybook 起動**

   ```bash
   npm run storybook
   # または
   yarn storybook
   ```

3. **ポート設定確認**

   ```json
   // .mcp-config.json
   {
     "storybook": {
       "enabled": true,
       "url": "http://localhost",
       "port": 6006 // 実際のポートと一致するか？
     }
   }
   ```

4. **Storybook 設定確認**
   ```bash
   ls -la .storybook/
   cat .storybook/main.ts
   ```

### Error: "コンポーネントが見つからない"

**原因**:

- Storybook index の問題
- コンポーネントパスの不一致

**解決手順**:

1. **Storybook ビルド確認**

   ```bash
   npm run build-storybook
   ```

2. **ストーリーファイル確認**

   ```bash
   find src -name "*.stories.*"
   ```

3. **Storybook index 確認**
   ```bash
   curl http://localhost:6006/index.json | jq .
   ```

## 🔨 Biome ツールエラー

### Error: "Biome コマンドが見つからない"

**原因**:

- Biome がインストールされていない
- パス設定の問題

**解決手順**:

1. **Biome インストール確認**

   ```bash
   npm list @biomejs/biome
   npx @biomejs/biome --version
   ```

2. **手動インストール**

   ```bash
   npm install --save-dev @biomejs/biome
   ```

3. **手動実行テスト**

   ```bash
   npx @biomejs/biome lint src/
   ```

4. **設定ファイル確認**
   ```bash
   ls -la biome.json
   cat biome.json
   ```

### Error: "Biome 設定エラー"

**原因**:

- biome.json の構文エラー
- 設定内容の問題

**解決手順**:

1. **設定ファイル構文チェック**

   ```bash
   cat biome.json | jq .
   ```

2. **最小設定での動作確認**

   ```json
   // biome.json
   {
     "$schema": "https://biomejs.dev/schemas/1.5.3/schema.json",
     "linter": {
       "enabled": true
     },
     "formatter": {
       "enabled": true
     }
   }
   ```

3. **設定なしでの実行**
   ```bash
   npx @biomejs/biome lint --no-config src/
   ```

## 📊 パフォーマンス問題

### 動作が重い・応答が遅い

**原因**:

- 大量のファイル処理
- 不適切な設定
- リソース不足

**解決手順**:

1. **機能の選択的無効化**

   ```json
   {
     "features": {
       "docs": true,
       "biome": false, // 使用しない機能を無効化
       "components": false,
       "uxFormat": false
     }
   }
   ```

2. **パス範囲の限定**

   ```json
   {
     "paths": {
       "docsDir": "docs/api" // 特定のサブディレクトリのみ
     }
   }
   ```

3. **システムリソース確認**

   ```bash
   # CPU 使用率
   top

   # メモリ使用量
   free -h

   # ディスク容量
   df -h
   ```

## 🆘 緊急時の復旧手順

### 完全に動作しなくなった場合

1. **設定の初期化**

   ```bash
   # MCP 設定バックアップ
   cp ~/.cursor/mcp.json ~/.cursor/mcp.json.emergency-backup

   # 最小設定に戻す
   cat > ~/.cursor/mcp.json << 'EOF'
   {
     "mcpServers": {}
   }
   EOF
   ```

2. **Cursor 完全再起動**

   ```bash
   # すべてのプロセス終了
   killall Cursor

   # 設定キャッシュクリア（必要に応じて）
   rm -rf ~/.cursor/cache

   # Cursor 再起動
   ```

3. **段階的復旧**

   ```json
   // Step 1: 最小設定
   {
     "mcpServers": {
       "test": {
         "command": "tsx",
         "args": ["/path/to/mcp/src/server.ts"]
       }
     }
   }

   // Step 2: 環境変数追加
   {
     "mcpServers": {
       "test": {
         "command": "tsx",
         "args": ["/path/to/mcp/src/server.ts"],
         "env": {
           "MCP_PROJECT_ROOT": "/path/to/project"
         }
       }
     }
   }
   ```

## 📞 サポート情報収集

問題報告時に含めるべき情報：

### システム情報

```bash
# OS バージョン
uname -a

# Node.js バージョン
node --version

# npm バージョン
npm --version
```

### プロジェクト情報

```bash
# プロジェクト構造
tree -L 3

# 設定ファイル
cat .mcp-config.json

# MCP 設定
cat ~/.cursor/mcp.json
```

### デバッグ出力

```javascript
// 必ず実行して結果を含める
getDocs({ debug: true });
```

### エラーメッセージ

- 完全なエラーメッセージ
- 発生時の操作手順
- 再現可能かどうか

## 🔄 定期メンテナンス

### 月次チェック項目

1. **依存関係更新**

   ```bash
   cd mcp
   npm update
   ```

2. **設定ファイル確認**

   ```bash
   cat .mcp-config.json | jq .
   ```

3. **動作確認**

   ```javascript
   // 基本機能テスト
   getDate();
   getDocs();
   ```

4. **ログ確認**
   - Cursor コンソールでエラーがないか確認

この情報で解決しない問題については、デバッグ出力を含めてお問い合わせください。
