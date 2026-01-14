import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname =
	typeof __dirname !== "undefined"
		? __dirname
		: path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/writing-tests/test-addon
export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(dirname, "./src"),
		},
	},
	optimizeDeps: {
		include: [
			"react",
			"react-dom",
			"react/jsx-runtime",
			"@storybook/nextjs-vite",
			"@storybook/addon-vitest",
			"lucide-react",
			"class-variance-authority",
			"clsx",
			"tailwind-merge",
		],
	},
	define: {
		global: "globalThis",
	},
	test: {
		projects: [
			{
				plugins: [
					// The plugin will run tests for the stories defined in your Storybook config
					// See options at: https://storybook.js.org/docs/writing-tests/test-addon#storybooktest
					storybookTest({
						configDir: path.join(dirname, ".storybook"),
					}),
				],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						name: "chromium",
						// @ts-expect-error - playwright provider
						provider: "playwright",
					},
					setupFiles: [".storybook/vitest.setup.ts"],
					environment: "jsdom",
					globals: true,
				},
				resolve: {
					alias: {
						"@": path.resolve(dirname, "./src"),
					},
				},
			},
		],
	},
});
