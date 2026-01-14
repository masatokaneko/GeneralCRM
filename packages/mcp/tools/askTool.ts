import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerAskTool(server: McpServer) {
  server.registerTool(
    "ask",
    {
      title: "ask",
      description: `ユーザーへの質問を整形されたフォーマットで生成します。
選択肢を含む質問をわかりやすく構造化して表示できます。

【使用ケース】
- 実装方針の確認（「どちらの実装方法を選びますか？」）
- 複数選択肢からの選択（「どの機能を優先しますか？」）
- ユーザー意思確認（「このファイルを削除してもよろしいですか？」）

【出力フォーマット】
❓ [質問内容]
[要約]

OPTIONS:
1. [選択肢A]
2. [選択肢B]
3. [追加の選択肢...]

/answer <番号> で回答してください。`,
      inputSchema: z.object({
        question: z
          .string()
          .describe("質問内容（例: 'どちらの実装方法を選びますか？'）"),
        summary: z
          .string()
          .optional()
          .describe(
            "質問の要約や補足説明（省略可能）。例: '現在の状況: パフォーマンス重視が必要'",
          ),
        optionA: z.string().describe("選択肢A（例: 'TypeScriptで実装する'）"),
        optionB: z.string().describe("選択肢B（例: 'JavaScriptで実装する'）"),
        additionalOptions: z
          .array(z.string())
          .optional()
          .describe(
            "追加の選択肢（省略可能）。例: ['両方使用する', '別の方法を検討する']",
          ),
      }),
      outputSchema: z.object({
        formattedQuestion: z.string(),
        question: z.string(),
        options: z.array(z.string()),
        error: z.string().optional(),
      }),
    },
    async ({
      question,
      summary,
      optionA,
      optionB,
      additionalOptions,
    }: {
      question: string;
      summary?: string;
      optionA: string;
      optionB: string;
      additionalOptions?: string[];
    }) => {
      try {
        const formattedQuestion = formatQuestion(
          question,
          summary || "",
          optionA,
          optionB,
          additionalOptions || [],
        );

        const allOptions = [optionA, optionB, ...(additionalOptions || [])];

        const output = {
          formattedQuestion,
          question,
          options: allOptions,
        };

        return {
          content: [{ type: "text" as const, text: formattedQuestion }],
          structuredContent: output,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const output = {
          formattedQuestion: "",
          question: "",
          options: [],
          error: `エラー: ${errorMessage}`,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(output) }],
          structuredContent: output,
          isError: true,
        };
      }
    },
  );
}

function formatQuestion(
  question: string,
  summary: string,
  optionA: string,
  optionB: string,
  additionalOptions: string[],
): string {
  let formattedText = `❓ ${question}\n`;

  if (summary && summary.trim() !== "") {
    formattedText += `${summary}\n`;
  }

  formattedText += "\nOPTIONS:\n";
  formattedText += `1. ${optionA}\n`;
  formattedText += `2. ${optionB}\n`;

  additionalOptions.forEach((option, index) => {
    formattedText += `${index + 3}. ${option}\n`;
  });

  formattedText += "\n/answer <番号> で回答してください。";

  return formattedText;
}
