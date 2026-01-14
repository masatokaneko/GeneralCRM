import fs from "fs";
import path from "path";
import { promisify } from "util";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getDocsPath, debugPathConfig } from "../../config/path-resolver.js";

const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

export function registerGetDocsTool(server: McpServer) {
	server.tool(
		"getDocs",
		"docsディレクトリ内のMarkdownファイルを探索し、ファイルの内容をテキストとして返します。特定のファイル名を指定するか、全ファイルの内容を取得できます。",
		{
			fileName: z
				.string()
				.optional()
				.describe("ファイル名（省略時は全ファイル一覧を返す）"),
			debug: z
				.boolean()
				.optional()
				.default(false)
				.describe("パス設定のデバッグ情報を表示"),
		},
		async (args) => {
			try {
				// デバッグモードの場合は設定情報を出力
				if (args.debug) {
					const debugInfo = debugPathConfig();
					return {
						content: [{ type: "text" as const, text: debugInfo }],
					};
				}

				if (args.fileName) {
					// 特定のファイルの内容を返す
					return await getFileContent(args.fileName);
				} else {
					// docsディレクトリ内の全ファイルリストとその内容を返す
					return await getAllDocsContent();
				}
			} catch (error: any) {
				return {
					content: [
						{ type: "text" as const, text: `エラー: ${error.message}` },
					],
					isError: true,
				};
			}
		},
	);
}

/**
 * 特定のファイルの内容を取得する
 */
async function getFileContent(fileName: string) {
	const docsDir = getDocsPath();

	// ファイルパスを正規化
	let filePath = fileName;
	if (!filePath.endsWith(".md")) {
		filePath = `${filePath}.md`;
	}

	filePath = path.join(docsDir, filePath);

	// ファイルがdocsディレクトリ外にアクセスしようとしていないか確認（セキュリティ対策）
	const normalizedPath = path.normalize(filePath);
	if (!normalizedPath.startsWith(docsDir)) {
		return {
			content: [{ type: "text" as const, text: `エラー: 無効なファイルパス` }],
			isError: true,
		};
	}

	// ファイルの存在確認
	try {
		await statAsync(filePath);
	} catch (error) {
		return {
			content: [
				{ type: "text" as const, text: `エラー: ${fileName} が見つかりません` },
			],
			isError: true,
		};
	}

	// ファイルの読み込み
	const content = await readFileAsync(filePath, "utf-8");
	return {
		content: [
			{
				type: "text" as const,
				text: content,
			},
		],
	};
}

/**
 * docsディレクトリ内の全ファイルの内容を取得する
 */
async function getAllDocsContent() {
	const docsDir = getDocsPath();

	// ディレクトリの存在確認
	try {
		await statAsync(docsDir);
	} catch (error) {
		return {
			content: [
				{
					type: "text" as const,
					text: `エラー: docsディレクトリが見つかりません (${docsDir})`,
				},
			],
			isError: true,
		};
	}

	// ファイル一覧を取得
	const files = await readdirAsync(docsDir);
	const markdownFiles = files.filter((file) => file.endsWith(".md"));

	if (markdownFiles.length === 0) {
		return {
			content: [
				{
					type: "text" as const,
					text: `docsディレクトリに.mdファイルが見つかりません (${docsDir})`,
				},
			],
		};
	}

	// 全ファイルの内容を結合
	const allContents = await Promise.all(
		markdownFiles.map(async (file) => {
			const filePath = path.join(docsDir, file);
			const content = await readFileAsync(filePath, "utf-8");
			return `# ${file}\n\n${content}\n\n---\n\n`;
		}),
	);

	return {
		content: [
			{
				type: "text" as const,
				text: allContents.join(""),
			},
		],
	};
}
