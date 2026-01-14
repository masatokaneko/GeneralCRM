import fs from "fs";
import path from "path";
import { detectProjectRoot } from "./path-resolver.js";

/**
 * MCPサーバー設定インターフェース
 */
export interface MCPServerConfig {
	server: {
		name: string;
		version: string;
		description?: string;
	};
	paths: {
		docsDir: string;
		uxFormatDir: string;
		mcpServerDir: string;
	};
	storybook?: {
		enabled: boolean;
		url: string;
		port: number;
	};
	features: {
		docs: boolean;
		uxFormat: boolean;
		components: boolean;
		biome: boolean;
	};
}

/**
 * デフォルト設定
 */
const defaultConfig: MCPServerConfig = {
	server: {
		name: "Generic MCP Server",
		version: "1.0.0",
		description: "Generic development tools MCP server",
	},
	paths: {
		docsDir: "docs",
		uxFormatDir: "ux/format",
		mcpServerDir: "mcp",
	},
	storybook: {
		enabled: true,
		url: "http://localhost",
		port: 6006,
	},
	features: {
		docs: true,
		uxFormat: true,
		components: true,
		biome: true,
	},
};

/**
 * 設定ファイルを読み込み
 */
export function loadServerConfig(): MCPServerConfig {
	const projectRoot = detectProjectRoot();
	const configPath = path.join(projectRoot, ".mcp-config.json");

	// 設定ファイルが存在する場合は読み込み
	if (fs.existsSync(configPath)) {
		try {
			const configContent = fs.readFileSync(configPath, "utf-8");
			const userConfig = JSON.parse(configContent);

			// デフォルト設定とマージ
			return mergeConfig(defaultConfig, userConfig);
		} catch (error) {
			console.warn(`設定ファイル読み込みエラー: ${error}`);
			console.warn("デフォルト設定を使用します");
		}
	}

	return defaultConfig;
}

/**
 * 設定をマージする（ディープマージ）
 */
function mergeConfig(
	defaultConfig: MCPServerConfig,
	userConfig: any,
): MCPServerConfig {
	const merged = JSON.parse(JSON.stringify(defaultConfig)); // ディープコピー

	// server設定をマージ
	if (userConfig.server) {
		merged.server = { ...merged.server, ...userConfig.server };
	}

	// paths設定をマージ
	if (userConfig.paths) {
		merged.paths = { ...merged.paths, ...userConfig.paths };
	}

	// storybook設定をマージ
	if (userConfig.storybook) {
		merged.storybook = { ...merged.storybook, ...userConfig.storybook };
	}

	// features設定をマージ
	if (userConfig.features) {
		merged.features = { ...merged.features, ...userConfig.features };
	}

	return merged;
}

/**
 * 設定情報をデバッグ出力
 */
export function debugServerConfig(): string {
	const config = loadServerConfig();
	const projectRoot = detectProjectRoot();
	const configPath = path.join(projectRoot, ".mcp-config.json");

	const debugInfo = [
		"=== MCP Server Configuration Debug ===",
		`Server Name: ${config.server.name}`,
		`Server Version: ${config.server.version}`,
		`Description: ${config.server.description || "not set"}`,
		``,
		`Project Root: ${projectRoot}`,
		`Config File: ${configPath} (exists: ${fs.existsSync(configPath)})`,
		``,
		`Paths:`,
		`  - Docs: ${config.paths.docsDir}`,
		`  - UX Format: ${config.paths.uxFormatDir}`,
		`  - MCP Server: ${config.paths.mcpServerDir}`,
		``,
		`Storybook:`,
		`  - Enabled: ${config.storybook?.enabled}`,
		`  - URL: ${config.storybook?.url}:${config.storybook?.port}`,
		``,
		`Features:`,
		`  - Docs: ${config.features.docs}`,
		`  - UX Format: ${config.features.uxFormat}`,
		`  - Components: ${config.features.components}`,
		`  - Biome: ${config.features.biome}`,
		`======================================`,
	];

	return debugInfo.join("\n");
}
