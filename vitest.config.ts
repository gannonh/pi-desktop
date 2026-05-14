import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["tests/shared/**/*.test.ts", "tests/main/**/*.test.ts", "tests/renderer/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: [
				"src/shared/**/*.ts",
				"src/renderer/shell/**/*.ts",
				"src/renderer/projects/**/*.ts",
				"src/renderer/chat/**/*.ts",
				"src/main/projects/**/*.ts",
			],
			exclude: ["**/*.test.ts", "**/*.config.ts", "tests/**", "src/**/*.d.ts"],
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
	},
});
