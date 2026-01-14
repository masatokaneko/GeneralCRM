#!/bin/bash

# Dev Container作成後に実行されるセットアップスクリプト

set -e

echo "🚀 Dev Container セットアップを開始します..."
echo ""

# カレントディレクトリを確認
echo "📂 現在のディレクトリ: $(pwd)"

# npmキャッシュディレクトリの権限を修正
echo "🔧 npmキャッシュディレクトリの権限を修正しています..."
if [ -d "/home/vscode/.npm-global" ]; then
    sudo chown -R 1000:1000 /home/vscode/.npm-global 2>/dev/null || echo "   ⚠️  権限変更をスキップ"
    echo "   ✅ npmキャッシュディレクトリの権限修正が完了しました"
else
    mkdir -p /home/vscode/.npm-global
    echo "   ✅ ディレクトリを作成しました"
fi
echo ""

# node_modulesディレクトリの権限を修正（存在する場合）
echo "🔧 ディレクトリの権限を設定しています..."

declare -a node_modules_dirs=(
    "/workspace/node_modules"
    "/workspace/apps/web/node_modules"
    "/workspace/apps/docs/node_modules"
    "/workspace/packages/mcp/node_modules"
    "/workspace/packages/shared-i18n/node_modules"
    "/workspace/.turbo"
)

for dir in "${node_modules_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "   📁 作成: $dir"
        mkdir -p "$dir"
    fi
    current_owner=$(stat -c '%u:%g' "$dir" 2>/dev/null || echo "unknown")
    if [ "$current_owner" != "1000:1000" ] && [ "$current_owner" != "unknown" ]; then
        echo "   🔧 権限修正: $dir"
        sudo chown -R 1000:1000 "$dir" 2>/dev/null || echo "   ⚠️  権限変更をスキップ: $dir"
    fi
done
echo ""

# バージョン確認
echo "📦 Node.js バージョン: $(node --version)"
echo "📦 npm バージョン: $(npm --version)"
echo "📦 AWS CLI バージョン: $(aws --version 2>/dev/null || echo 'AWS CLI not found')"
echo "📦 uv バージョン: $(uv --version 2>/dev/null || echo 'uv not found')"
echo ""

# AWS認証情報の確認
if [ -f "/home/vscode/.aws/credentials" ] || [ -f "/home/vscode/.aws/config" ]; then
    echo "✅ AWS認証情報が見つかりました"
else
    echo "⚠️  AWS認証情報が見つかりません"
    echo "   Claude Codeを使用する場合は、aws configureで設定してください"
fi
echo ""

# Git設定の確認
if [ -f "/home/vscode/.gitconfig" ]; then
    echo "✅ Git設定が見つかりました"
else
    echo "⚠️  Git設定が見つかりません"
fi
echo ""

# 依存関係のインストール
echo "📥 依存関係をインストールしています..."
npm cache clean --force
npm install --verbose
echo ""
echo "✅ 依存関係のインストールが完了しました"
echo ""

# Claude Codeのインストール（グローバル）
echo "📦 Claude Codeをインストールしています..."
npm install -g @anthropic-ai/claude-code || echo "⚠️  Claude Codeのインストールをスキップしました"
echo ""

# .claudeディレクトリの権限設定
if [ -d "/workspace/.claude" ]; then
    echo "📝 Claude設定ディレクトリを確認しています..."
    chmod -R 755 /workspace/.claude 2>/dev/null || echo "⚠️  権限設定をスキップしました"
fi

# Biome/Turborepoの設定確認
if [ -f "biome.json" ]; then
    echo "✅ Biome設定ファイルが見つかりました"
fi
if [ -f "turbo.json" ]; then
    echo "✅ Turbo設定ファイルが見つかりました"
fi
echo ""

# shared-i18nのビルド
if [ -d "packages/shared-i18n" ]; then
    echo "🔨 shared-i18nパッケージをビルドしています..."
    npm run build -w @monorepo/shared-i18n || echo "⚠️  shared-i18nのビルドをスキップ"
fi
echo ""

# web appのsetup-symlink実行
if [ -d "apps/web" ]; then
    echo "🔗 webのシンボリックリンクを作成しています..."
    cd apps/web && npm run setup-symlink 2>/dev/null && cd ../.. || echo "⚠️  シンボリックリンク作成をスキップ"
fi
echo ""

echo "═══════════════════════════════════════════════════════"
echo "✅ セットアップが完了しました！"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "🎉 開発環境の準備が整いました。以下のコマンドで開発サーバーを起動できます："
echo ""
echo "   npm run dev            - 開発サーバーを起動"
echo "   npm run storybook      - Storybookを起動"
echo "   npm run build          - プロジェクトをビルド"
echo "   npm run lint           - リンターを実行"
echo "   npm run test           - テストを実行"
echo ""
echo "═══════════════════════════════════════════════════════"

# シェルエイリアスの設定
echo ""
echo "🔧 claudeコマンドのエイリアス(cld)を設定しています..."
cat >> /home/vscode/.bashrc << 'EOL'

# Claude Code エイリアス
alias cld='npm run claude --prefix /workspace'
EOL

echo "✅ 'cld'エイリアスが設定されました（新しいターミナルで有効）"
echo ""
