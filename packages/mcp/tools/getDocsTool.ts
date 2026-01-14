import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsDir = path.resolve(__dirname, "..", "docs");

export function registerGetDocsTool(server: McpServer) {
  server.registerTool(
    "getDocs",
    {
      title: "getDocs",
      description: `プロジェクトのドキュメントをMCPパッケージ内のdocsディレクトリから取得します。
開発ガイドライン、テンプレート、ベストプラクティスを参照できます。

【使用方法】
- fileName省略: 全ドキュメント一覧を取得
- fileName指定: 特定のドキュメントを取得（拡張子 .md は省略可）

【利用可能なドキュメント】
- component-design-framework.md: Atomic Designコンポーネント設計
- testing-guide.md: テスト戦略と実装ガイド
- design-token-guide.md: デザイントークン管理`,
      inputSchema: z.object({
        fileName: z
          .string()
          .optional()
          .describe(
            "ファイル名（省略時は全ファイル一覧を返す）。例: 'component-design-framework' または 'component-design-framework.md'",
          ),
      }),
      outputSchema: z.object({
        fileName: z.string().optional(),
        fileContent: z.string().optional(),
        files: z
          .array(
            z.object({
              name: z.string(),
              content: z.string(),
            }),
          )
          .optional(),
        error: z.string().optional(),
      }),
    },
    async ({ fileName }: { fileName?: string }) => {
      try {
        if (fileName) {
          return await getFileContent(fileName);
        }
        return await getAllDocsContent();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const output = { error: `エラー: ${errorMessage}` };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(output) }],
          structuredContent: output,
          isError: true,
        };
      }
    },
  );
}

async function getFileContent(fileName: string) {
  let filePath = fileName;
  if (!filePath.endsWith(".md")) {
    filePath = `${filePath}.md`;
  }

  filePath = path.join(docsDir, filePath);

  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(docsDir)) {
    const output = { error: "エラー: 無効なファイルパス" };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(output) }],
      structuredContent: output,
      isError: true,
    };
  }

  try {
    await statAsync(filePath);
  } catch (_error) {
    const output = { error: `エラー: ${fileName} が見つかりません` };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(output) }],
      structuredContent: output,
      isError: true,
    };
  }

  const fileContent = await readFileAsync(filePath, "utf-8");
  const output = { fileName, fileContent };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output) }],
    structuredContent: output,
  };
}

async function getAllDocsContent() {
  try {
    await statAsync(docsDir);
  } catch (_error) {
    const output = { error: "エラー: docsディレクトリが見つかりません" };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(output) }],
      structuredContent: output,
      isError: true,
    };
  }

  const fileList = await readdirAsync(docsDir);
  const markdownFiles = fileList.filter((file) => file.endsWith(".md"));

  if (markdownFiles.length === 0) {
    const output = {
      error: "docsディレクトリに.mdファイルが見つかりません",
      files: [],
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(output) }],
      structuredContent: output,
    };
  }

  const files = await Promise.all(
    markdownFiles.map(async (file) => {
      const filePath = path.join(docsDir, file);
      const content = await readFileAsync(filePath, "utf-8");
      return { name: file, content };
    }),
  );

  const allContentsText = files
    .map((file) => `# ${file.name}\n\n${file.content}\n\n---\n\n`)
    .join("");

  const output = { files };
  return {
    content: [{ type: "text" as const, text: allContentsText }],
    structuredContent: output,
  };
}
