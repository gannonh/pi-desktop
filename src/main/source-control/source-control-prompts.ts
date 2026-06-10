import type { PullRequestGenerationContext, StagedGenerationContext } from "../git/generation-context";

export const COMMIT_MESSAGE_SYSTEM_PROMPT =
	"You draft concise git commit messages for Pi Desktop developers. Follow Conventional Commits when the change type is clear. Return only the commit message text.";

export const PULL_REQUEST_SYSTEM_PROMPT =
	"You draft GitHub pull request titles and bodies for Pi Desktop developers. Return only valid JSON with string fields `title` and `body`.";

export const buildCommitMessagePrompt = (context: StagedGenerationContext): string => {
	const branchLine = context.branch ? `Branch: ${context.branch}\n` : "";
	return `${branchLine}Staged files (${context.stagedPaths.length}):\n${context.stagedPaths.map((path) => `- ${path}`).join("\n")}\n\nStaged diff:\n${context.patch}`;
};

export const buildPullRequestPrompt = (context: PullRequestGenerationContext): string => {
	const fileSummary = context.files
		.slice(0, 40)
		.map((file) => `- ${file.status}: ${file.path}`)
		.join("\n");
	const truncatedFileNote =
		context.files.length > 40 ? `\n- …and ${context.files.length - 40} more changed files` : "";

	return `Compare ${context.baseRef}...${context.headRef}\nAhead: ${context.ahead}\nBehind: ${context.behind}\n\nChanged files:\n${fileSummary}${truncatedFileNote}\n\nDiff:\n${context.patch}`;
};

export const parsePullRequestGeneration = (
	raw: string,
): {
	title: string;
	body: string;
} => {
	const trimmed = raw.trim();
	const fencedJson = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim();
	const candidate = fencedJson ?? trimmed;
	const parsed = JSON.parse(candidate) as { title?: unknown; body?: unknown };
	const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
	const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
	if (!title) {
		throw new Error("Generated pull request title was empty.");
	}
	return { title, body };
};

export const normalizeCommitMessage = (raw: string): string => {
	const trimmed = raw.trim();
	const fenced = trimmed.match(/^```(?:\w+)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim();
	const message = (fenced ?? trimmed).trim();
	if (!message) {
		throw new Error("Generated commit message was empty.");
	}
	return message;
};
