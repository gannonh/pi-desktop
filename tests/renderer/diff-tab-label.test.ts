import { describe, expect, it } from "vitest";
import { formatDiffMetadata, formatDiffTabLabel } from "../../src/renderer/file-workspace/diff-tab-label";

describe("diff tab labels", () => {
	it("formats working-tree diff labels", () => {
		expect(
			formatDiffTabLabel({
				relativePath: "src/index.ts",
				diffKind: "unstaged",
			}),
		).toBe("index.ts • Unstaged");
	});

	it("formats branch compare labels with refs", () => {
		expect(
			formatDiffTabLabel({
				relativePath: "README.md",
				diffKind: "branch",
				diffContext: { compareRefs: { base: "main", head: "HEAD" } },
			}),
		).toBe("README.md • main...HEAD");
	});

	it("formats commit diff metadata", () => {
		expect(
			formatDiffMetadata({
				relativePath: "src/app.ts",
				diffKind: "commit",
				diffContext: { commitRef: "abcdef1234567890" },
			}),
		).toEqual({
			title: "src › app.ts",
			subtitle: "Commit • abcdef1234567890",
		});
	});
});
