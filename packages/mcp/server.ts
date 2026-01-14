import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAskTool } from "./tools/askTool.js";
import { registerGetDateTool } from "./tools/getDateTool.js";
import { registerGetDocsTool } from "./tools/getDocsTool.js";

// MCPサーバーの作成
const server = new McpServer({
  name: "local-mcp",
  version: "1.0.0",
});

registerGetDateTool(server);
registerGetDocsTool(server);
registerAskTool(server);

// stdioトランスポートでサーバー起動
const transport = new StdioServerTransport();
await server.connect(transport);
