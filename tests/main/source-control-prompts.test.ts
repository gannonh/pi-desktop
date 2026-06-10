import { describe, expect, it } from "vitest";
import {
	buildCommitMessagePrompt,
	buildPullRequestPrompt,
	normalizeCommitMessage,
	parsePullRequestGeneration,
} from "../../src/main/source-control/source-control-prompts";

describe("source control prompts", () => {
	it("builds a bounded commit message prompt from staged context", () => {
		const prompt = buildCommitMessagePrompt({
			branch: "refs/heads/feat/test",
			stagedPaths: ["src/a.ts", "src/b.ts"],
			patch: "diff --git a/src/a.ts b/src/a.ts\n+change",
		});

		expect(prompt).toContain("Branch: refs/heads/feat/test");
		expect(prompt).toContain("- src/a.ts");
		expect(prompt).toContain("Staged diff:");
	});

	it("normalizes fenced commit message output", () => {
		expect(normalizeCommitMessage("```\nfeat(changes): ship generation\n```")).toBe("feat(changes): ship generation");
	});

	it("parses pull request JSON output", () => {
		expect(parsePullRequestGeneration('{"title":"Add generation","body":"## Summary\\nDraft PR fields."}')).toEqual({
			title: "Add generation",
			body: "## Summary\nDraft PR fields.",
		});
	});

	it("builds pull request prompts from branch compare context", () => {
		const prompt = buildPullRequestPrompt({
			baseRef: "main",
			headRef: "feat/test",
			ahead: 2,
			behind: 0,
			files: [{ path: "README.md", status: "modified" }],
			patch: "diff --git a/README.md b/README.md\n+hello",
		});

		expect(prompt).toContain("Compare main...feat/test");
		expect(prompt).toContain("- modified: README.md");
		expect(prompt).toContain("Diff:");
	});
});
