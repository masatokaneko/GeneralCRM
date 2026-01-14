import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerGetDateTool(server: McpServer) {
  server.registerTool(
    "getDate",
    {
      title: "getDate",
      description: `現在の日時をJST（日本標準時）で取得します。
ドキュメント作成、ログ記録、タイムスタンプの生成などに使用できます。

【使用例】
- デフォルト: "2025/12/04 15:30:45"
- カスタム: format="yyyy年MM月dd日" → "2025年12月04日"

【対応フォーマット】
- yyyy: 年（4桁）
- MM: 月（2桁）
- dd: 日（2桁）
- HH: 時（2桁、24時間形式）
- mm: 分（2桁）
- ss: 秒（2桁）`,
      inputSchema: z.object({
        format: z
          .string()
          .optional()
          .describe(
            "日付フォーマット（省略可能）。例: 'yyyy/MM/dd HH:mm:ss'、'yyyy年MM月dd日'",
          ),
      }),
      outputSchema: z.object({
        formattedDate: z.string(),
      }),
    },
    async ({ format }: { format?: string }) => {
      // JSTの現在時刻を取得（UTC+9時間）
      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
      const jstDate = new Date(now.getTime() + jstOffset);

      let formattedDate: string;
      if (format) {
        try {
          formattedDate = formatDate(jstDate, format);
        } catch (error: unknown) {
          if (error instanceof Error) {
            throw new Error(
              `エラー: 無効な日付フォーマット - ${error.message}`,
            );
          }
          throw new Error(`エラー: 無効な日付フォーマット - ${String(error)}`);
        }
      } else {
        const year = jstDate.getUTCFullYear();
        const month = String(jstDate.getUTCMonth() + 1).padStart(2, "0");
        const day = String(jstDate.getUTCDate()).padStart(2, "0");
        const hours = String(jstDate.getUTCHours()).padStart(2, "0");
        const minutes = String(jstDate.getUTCMinutes()).padStart(2, "0");
        const seconds = String(jstDate.getUTCSeconds()).padStart(2, "0");

        formattedDate = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
      }

      const output = { formattedDate };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  );
}

function formatDate(date: Date, format: string): string {
  const tokens: Record<string, string> = {
    yyyy: date.getUTCFullYear().toString(),
    MM: (date.getUTCMonth() + 1).toString().padStart(2, "0"),
    dd: date.getUTCDate().toString().padStart(2, "0"),
    HH: date.getUTCHours().toString().padStart(2, "0"),
    mm: date.getUTCMinutes().toString().padStart(2, "0"),
    ss: date.getUTCSeconds().toString().padStart(2, "0"),
  };

  let result = format;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(token, "g"), value);
  }

  return result;
}
