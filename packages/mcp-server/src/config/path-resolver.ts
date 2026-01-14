import path from "path";
import fs from "fs";

/**
 * 汎用的なパス解決システム
 * ~/.cursor/mcp.json への依存を排除し、プロジェクトベースのパス管理を実現
 */

export interface PathConfig {
	projectRoot: string;
	docsDir: string;
	uxFormatDir: string;
	mcpServerDir: string;
}

/**
 * プロジェクトルートディレクトリを自動検出
 */
export function detectProjectRoot(): string {
	// 1. 環境変数から取得（最優先）
	if (process.env.MCP_PROJECT_ROOT) {
		const envPath = path.resolve(process.env.MCP_PROJECT_ROOT);
		if (fs.existsSync(envPath)) {
			return envPath;
		}
	}

	// 2. 現在のディレクトリから上位へ遡ってpackage.jsonを探す
	let currentDir = process.cwd();
	const maxDepth = 10; // 無限ループ防止
	let depth = 0;

	while (currentDir !== path.dirname(currentDir) && depth < maxDepth) {
		// package.jsonが存在するかチェック
		const packageJsonPath = path.join(currentDir, "package.json");

		if (fs.existsSync(packageJsonPath)) {
			try {
				const packageContent = fs.readFileSync(packageJsonPath, "utf-8");
				const packageObj = JSON.parse(packageContent);

				// MCPサーバーのpackage.jsonの場合は親ディレクトリを探す
				if (currentDir.endsWith("/mcp") || currentDir.endsWith("\\mcp")) {
					const parentDir = path.dirname(currentDir);
					const parentPackageJsonPath = path.join(parentDir, "package.json");

					if (fs.existsSync(parentPackageJsonPath)) {
						return parentDir;
					}
				} else {
					// メインプロジェクトのpackage.jsonを発見
					return currentDir;
				}
			} catch (error) {
				// JSON解析エラーの場合は続行
			}
		}

		currentDir = path.dirname(currentDir);
		depth++;
	}

	// フォールバック: MCPサーバーディレクトリの場合は親ディレクトリ
	const fallbackDir =
		process.cwd().endsWith("/mcp") || process.cwd().endsWith("\\mcp")
			? path.dirname(process.cwd())
			: process.cwd();

	return fallbackDir;
}

/**
 * 設定ファイルからパス設定を読み込み
 */
export function loadPathConfig(): PathConfig {
	const projectRoot = detectProjectRoot();

	// 1. プロジェクト固有の設定ファイルを確認
	const configPath = path.join(projectRoot, ".mcp-config.json");

	let config: Partial<PathConfig> = {};

	if (fs.existsSync(configPath)) {
		try {
			const configContent = fs.readFileSync(configPath, "utf-8");
			const configObj = JSON.parse(configContent);
			config = configObj.paths || {};
		} catch (error) {
			console.warn(`設定ファイル読み込みエラー: ${error}`);
		}
	}

	// 2. デフォルト値を適用
	const pathConfig: PathConfig = {
		projectRoot,
		docsDir: config.docsDir || "docs",
		uxFormatDir: config.uxFormatDir || "ux/format",
		mcpServerDir: config.mcpServerDir || "mcp",
	};

	return pathConfig;
}

/**
 * 絶対パスを取得
 */
export function getAbsolutePath(
	relativePath: string,
	basePath?: string,
): string {
	const pathConfig = loadPathConfig();
	const base = basePath || pathConfig.projectRoot;
	return path.resolve(base, relativePath);
}

/**
 * docsディレクトリの絶対パスを取得
 */
export function getDocsPath(): string {
	const pathConfig = loadPathConfig();
	return path.resolve(pathConfig.projectRoot, pathConfig.docsDir);
}

/**
 * ux/formatディレクトリの絶対パスを取得
 */
export function getUxFormatPath(): string {
	const pathConfig = loadPathConfig();
	return path.resolve(pathConfig.projectRoot, pathConfig.uxFormatDir);
}

/**
 * プロジェクト設定情報をデバッグ出力
 */
export function debugPathConfig(): string {
	const pathConfig = loadPathConfig();
	const configPath = path.join(pathConfig.projectRoot, ".mcp-config.json");

	const debugInfo = [
		"=== MCP Path Configuration Debug ===",
		`Project Root: ${pathConfig.projectRoot}`,
		`Docs Directory: ${pathConfig.docsDir} (${getDocsPath()})`,
		`UX Format Directory: ${pathConfig.uxFormatDir} (${getUxFormatPath()})`,
		`MCP Server Directory: ${pathConfig.mcpServerDir}`,
		`Config File: ${configPath} (exists: ${fs.existsSync(configPath)})`,
		`Current Working Directory: ${process.cwd()}`,
		`MCP_PROJECT_ROOT env: ${process.env.MCP_PROJECT_ROOT || "not set"}`,
		"======================================",
	];

	return debugInfo.join("\n");
}
