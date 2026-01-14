import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerGetDateTool(server: McpServer) {
	server.tool(
		"getDate",
		"現在の日時を取得します。フォーマットを指定することで、任意の形式で日時を取得できます。(例: yyyy/MM/dd HH:mm:ss)",
		{
			format: z.string().optional().describe("日付フォーマット（省略可能）"),
		},
		async (args) => {
			try {
				const now = new Date();
				let formattedDate: string;

				if (args.format) {
					// カスタムフォーマットを適用
					formattedDate = formatDate(now, args.format);
				} else {
					// デフォルトフォーマット
					formattedDate = now.toISOString();
				}

				return {
					content: [
						{
							type: "text" as const,
							text: `Tool: getDate, Result: ${formattedDate}`,
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
 * 日付をフォーマットする関数
 */
function formatDate(date: Date, format: string): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");

	return format
		.replace(/yyyy/g, String(year))
		.replace(/MM/g, month)
		.replace(/dd/g, day)
		.replace(/HH/g, hours)
		.replace(/mm/g, minutes)
		.replace(/ss/g, seconds);
}
