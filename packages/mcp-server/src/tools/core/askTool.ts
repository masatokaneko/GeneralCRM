import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerAskTool(server: McpServer) {
	server.tool(
		"ask",
		"AIエージェントに質問フォーマットを提供します。質問内容と選択肢を指定して、整形された質問テキストを生成します。",
		{
			question: z.string().describe("質問内容"),
			summary: z.string().optional().describe("質問の要約（省略可能）"),
			optionA: z.string().describe("選択肢A"),
			optionB: z.string().describe("選択肢B"),
			additionalOptions: z
				.array(z.string())
				.optional()
				.describe("追加の選択肢（省略可能）"),
		},
		async (args) => {
			try {
				// 質問フォーマットを作成
				const formattedQuestion = formatQuestion(
					args.question,
					args.summary || "",
					args.optionA,
					args.optionB,
					args.additionalOptions || [],
				);

				return {
					content: [
						{
							type: "text" as const,
							text: formattedQuestion,
						},
					],
				};
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
 * 質問フォーマットを作成する関数
 *
 * @param question 質問内容
 * @param summary 質問の要約（省略可能）
 * @param optionA 選択肢A
 * @param optionB 選択肢B
 * @param additionalOptions 追加の選択肢（省略可能）
 * @returns フォーマット済みの質問文字列
 */
function formatQuestion(
	question: string,
	summary: string,
	optionA: string,
	optionB: string,
	additionalOptions: string[],
): string {
	// ヘッダー部分
	let formattedText = `❓ ${question}\n`;

	// 要約がある場合は追加
	if (summary && summary.trim() !== "") {
		formattedText += `${summary}\n`;
	}

	// 選択肢部分
	formattedText += "\nOPTIONS:\n";
	formattedText += `1. ${optionA}\n`;
	formattedText += `2. ${optionB}\n`;

	// 追加の選択肢がある場合は追加
	additionalOptions.forEach((option, index) => {
		formattedText += `${index + 3}. ${option}\n`;
	});

	// フッター部分
	formattedText += "\n/answer <番号> で回答してください。";

	return formattedText;
}
