import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { resolve, dirname } from "node:path";
import { existsSync, statSync } from "node:fs";

// プロジェクトルートを検出する関数
function findProjectRoot(startPath: string): string {
	let currentPath = resolve(startPath);

	// ファイルが指定された場合はディレクトリを取得
	if (existsSync(currentPath) && statSync(currentPath).isFile()) {
		currentPath = dirname(currentPath);
	}

	// 上位ディレクトリを辿ってbiome.jsonまたはpackage.jsonを探す
	while (currentPath !== dirname(currentPath)) {
		// ルートディレクトリに達するまで
		if (
			existsSync(resolve(currentPath, "biome.json")) ||
			existsSync(resolve(currentPath, "package.json"))
		) {
			return currentPath;
		}
		currentPath = dirname(currentPath);
	}

	// 見つからない場合は元のパスのディレクトリを返す
	return dirname(resolve(startPath));
}

export function registerBiomeTool(server: McpServer) {
	server.tool(
		"biome-lint",
		"Run Biome linting on files",
		{
			paths: z.array(z.string()).describe("File paths to lint"),
			configPath: z
				.string()
				.optional()
				.describe("Path to the Biome configuration file"),
		},
		async ({ paths, configPath }) => {
			// デバッグ情報を収集
			const debugInfo: string[] = [];

			// プロジェクトルートディレクトリを特定
			const projectRoot =
				paths.length > 0 ? findProjectRoot(paths[0]) : process.cwd();

			debugInfo.push(`Project root: ${projectRoot}`);
			debugInfo.push(`Current working directory: ${process.cwd()}`);
			debugInfo.push(`First file path: ${paths[0] || "N/A"}`);

			// 設定ファイルのパスを明示的に指定
			const biomeCfg = configPath || resolve(projectRoot, "biome.json");
			debugInfo.push(`Config file path: ${biomeCfg}`);
			debugInfo.push(`Config file exists: ${existsSync(biomeCfg)}`);

			if (existsSync(biomeCfg)) {
				try {
					const stats = statSync(biomeCfg);
					debugInfo.push(`Config file size: ${stats.size} bytes`);
					debugInfo.push(`Config file modified: ${stats.mtime.toISOString()}`);
				} catch (err) {
					debugInfo.push(`Error reading config file stats: ${err}`);
				}
			}

			// 対象ファイルの存在確認
			debugInfo.push(`Target files:`);
			for (const path of paths) {
				const fullPath = resolve(path);
				debugInfo.push(`  - ${fullPath} (exists: ${existsSync(fullPath)})`);
			}

			// 設定ファイルが存在しない場合は、設定なしでBiomeを実行
			const biomeCommand = existsSync(biomeCfg)
				? `npx @biomejs/biome lint --config-path="${biomeCfg}" ${paths.join(" ")}`
				: `npx @biomejs/biome lint ${paths.join(" ")}`;

			debugInfo.push(`Command: ${biomeCommand}`);

			const execAsync = promisify(exec);
			try {
				const { stdout, stderr } = await execAsync(biomeCommand, {
					cwd: projectRoot,
					env: { ...process.env, TMPDIR: resolve(projectRoot, "tmp") },
				});

				const result = stdout || stderr;
				debugInfo.push(`Command executed successfully`);
				debugInfo.push(`Output length: ${result.length} characters`);

				return {
					content: [
						{
							type: "text",
							text: result,
						},
					],
				};
			} catch (error) {
				// エラー時の詳細情報
				const errorInfo = [
					"=== BIOME LINT ERROR DEBUG INFO ===",
					...debugInfo,
					"",
					"=== ERROR DETAILS ===",
					`Error type: ${error instanceof Error ? error.constructor.name : typeof error}`,
					`Error message: ${error instanceof Error ? error.message : String(error)}`,
				];

				if (error instanceof Error && "code" in error) {
					errorInfo.push(`Error code: ${error.code}`);
				}

				if (error instanceof Error && "stdout" in error) {
					errorInfo.push(`Stdout: ${error.stdout}`);
				}

				if (error instanceof Error && "stderr" in error) {
					errorInfo.push(`Stderr: ${error.stderr}`);
				}

				return {
					content: [
						{
							type: "text",
							text: errorInfo.join("\n"),
						},
					],
				};
			}
		},
	);

	server.tool(
		"biome-format",
		"Run Biome formatting on files",
		{
			paths: z.array(z.string()).describe("File paths to format"),
			configPath: z
				.string()
				.optional()
				.describe("Path to the Biome configuration file"),
		},
		async ({ paths, configPath }) => {
			// デバッグ情報を収集
			const debugInfo: string[] = [];

			// プロジェクトルートディレクトリを特定
			const projectRoot =
				paths.length > 0 ? findProjectRoot(paths[0]) : process.cwd();

			debugInfo.push(`Project root: ${projectRoot}`);
			debugInfo.push(`Current working directory: ${process.cwd()}`);
			debugInfo.push(`First file path: ${paths[0] || "N/A"}`);

			// 設定ファイルのパスを明示的に指定
			const biomeCfg = configPath || resolve(projectRoot, "biome.json");
			debugInfo.push(`Config file path: ${biomeCfg}`);
			debugInfo.push(`Config file exists: ${existsSync(biomeCfg)}`);

			if (existsSync(biomeCfg)) {
				try {
					const stats = statSync(biomeCfg);
					debugInfo.push(`Config file size: ${stats.size} bytes`);
					debugInfo.push(`Config file modified: ${stats.mtime.toISOString()}`);
				} catch (err) {
					debugInfo.push(`Error reading config file stats: ${err}`);
				}
			}

			// 対象ファイルの存在確認
			debugInfo.push(`Target files:`);
			for (const path of paths) {
				const fullPath = resolve(path);
				debugInfo.push(`  - ${fullPath} (exists: ${existsSync(fullPath)})`);
			}

			// 設定ファイルが存在しない場合は、設定なしでBiomeを実行
			const biomeCommand = existsSync(biomeCfg)
				? `npx @biomejs/biome format --config-path="${biomeCfg}" --write ${paths.join(" ")}`
				: `npx @biomejs/biome format --write ${paths.join(" ")}`;

			debugInfo.push(`Command: ${biomeCommand}`);

			const execAsync = promisify(exec);
			try {
				const { stdout, stderr } = await execAsync(biomeCommand, {
					cwd: projectRoot,
					env: { ...process.env, TMPDIR: resolve(projectRoot, "tmp") },
				});

				const result = stdout || stderr || "Files formatted successfully";
				debugInfo.push(`Command executed successfully`);
				debugInfo.push(`Output length: ${result.length} characters`);

				return {
					content: [
						{
							type: "text",
							text: result,
						},
					],
				};
			} catch (error) {
				// エラー時の詳細情報
				const errorInfo = [
					"=== BIOME FORMAT ERROR DEBUG INFO ===",
					...debugInfo,
					"",
					"=== ERROR DETAILS ===",
					`Error type: ${error instanceof Error ? error.constructor.name : typeof error}`,
					`Error message: ${error instanceof Error ? error.message : String(error)}`,
				];

				if (error instanceof Error && "code" in error) {
					errorInfo.push(`Error code: ${error.code}`);
				}

				if (error instanceof Error && "stdout" in error) {
					errorInfo.push(`Stdout: ${error.stdout}`);
				}

				if (error instanceof Error && "stderr" in error) {
					errorInfo.push(`Stderr: ${error.stderr}`);
				}

				return {
					content: [
						{
							type: "text",
							text: errorInfo.join("\n"),
						},
					],
				};
			}
		},
	);
}
