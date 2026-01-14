import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadServerConfig } from "./config/server-config.js";

// Core tools (always available)
import { registerAskTool } from "./tools/core/askTool.js";
import { registerGetDateTool } from "./tools/core/getDateTool.js";
import { registerBiomeTool } from "./tools/core/biomeTool.js";

// Docs tools (feature-based)
import { registerGetDocsTool } from "./tools/docs/getDocsTool.js";

// Component tools (feature-based) - TODO: Implement when needed

// 設定を読み込み
const config = loadServerConfig();

// MCPサーバーの作成
const server = new McpServer({
	name: config.server.name,
	version: config.server.version,
});

// Core tools（常に有効）
registerAskTool(server);
registerGetDateTool(server);

// Feature-based tools
if (config.features.biome) {
	registerBiomeTool(server);
}

if (config.features.docs) {
	registerGetDocsTool(server);
}

// Component tools - TODO: Implement when needed

// ログ出力
console.log(`🚀 ${config.server.name} v${config.server.version} starting...`);
console.log(
	`📁 Project features: ${Object.entries(config.features)
		.filter(([_, enabled]) => enabled)
		.map(([feature]) => feature)
		.join(", ")}`,
);

// stdioトランスポートでサーバー起動
const transport = new StdioServerTransport();
await server.connect(transport);
