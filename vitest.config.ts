import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
	resolve: {
		alias: {
			obsidian: fileURLToPath(new URL("./src/test/mocks/obsidian.ts", import.meta.url)),
		},
	},
	test: {
		environment: "jsdom",
		setupFiles: ["src/test/setup.ts"],
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			reportsDirectory: "coverage",
		},
	},
});
