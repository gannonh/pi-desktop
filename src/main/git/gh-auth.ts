import type { SourceControlGhAuthStatus } from "../../shared/source-control/types";
import { gitExecFileAsync } from "./runner";

export class GhUnavailableError extends Error {
	constructor(
		message = "GitHub CLI (gh) is not installed or not on PATH. Install gh from https://cli.github.com/ and try again.",
	) {
		super(message);
		this.name = "GhUnavailableError";
	}
}

export class GhAuthRequiredError extends Error {
	constructor(message = "GitHub is not authenticated. Run `gh auth login` in a terminal and try again.") {
		super(message);
		this.name = "GhAuthRequiredError";
	}
}

export class PullRequestNotFoundError extends Error {
	constructor(message = "No pull request is linked to the current branch.") {
		super(message);
		this.name = "PullRequestNotFoundError";
	}
}

const extractStream = (error: unknown, key: "stderr" | "stdout"): string => {
	if (error && typeof error === "object" && key in error) {
		return String((error as Record<string, unknown>)[key] ?? "");
	}
	return "";
};

const combinedGhOutput = (error: unknown): string => {
	const stderr = extractStream(error, "stderr");
	const stdout = extractStream(error, "stdout");
	const combined = `${stdout}\n${stderr}`.trim();
	if (combined.length > 0) {
		return combined;
	}
	return error instanceof Error ? error.message : String(error);
};

export const parseGhAuthStatus = (raw: string): { authenticated: boolean; account: string | null } => {
	const loggedIn = raw.match(/Logged in to \S+ account (\S+)/i);
	return {
		authenticated: Boolean(loggedIn),
		account: loggedIn?.[1] ?? null,
	};
};

export const isGhAuthErrorMessage = (message: string): boolean =>
	/not logged in|auth login|authentication failed|HTTP 401|HTTP 403|token.*invalid|gh auth login/i.test(message);

export const isNoPullRequestErrorMessage = (message: string): boolean =>
	/no pull requests? found|could not find pull request|there is no pull request|current branch does not have/i.test(
		message,
	);

export const isGhUnavailableMessage = (message: string): boolean =>
	/ENOENT|spawn gh|(?:^|[^\w])gh(?::|\s|$).*command not found|command not found:\s*gh(?:\s|$)/i.test(message);

export const getGhAuthStatus = async (): Promise<SourceControlGhAuthStatus> => {
	try {
		const { stdout, stderr } = await gitExecFileAsync(["auth", "status"], { cwd: process.cwd() }, "gh");
		const { authenticated, account } = parseGhAuthStatus(`${stdout}\n${stderr}`);
		return {
			ghAvailable: true,
			authenticated,
			account,
			remediation: authenticated ? null : "Run `gh auth login` in a terminal to connect GitHub.",
		};
	} catch (error) {
		const raw = combinedGhOutput(error);
		if (!raw || isGhUnavailableMessage(raw)) {
			return {
				ghAvailable: false,
				authenticated: false,
				account: null,
				remediation: "Install the GitHub CLI (gh) from https://cli.github.com/ and run `gh auth login`.",
			};
		}
		const { authenticated, account } = parseGhAuthStatus(raw);
		return {
			ghAvailable: true,
			authenticated,
			account,
			remediation: authenticated ? null : "Run `gh auth login` in a terminal to connect GitHub.",
		};
	}
};

export const assertGhCommandSucceeded = (error: unknown, context: string): never => {
	const message = combinedGhOutput(error);
	if (isNoPullRequestErrorMessage(message)) {
		throw new PullRequestNotFoundError();
	}
	if (isGhUnavailableMessage(message)) {
		throw new GhUnavailableError();
	}
	if (isGhAuthErrorMessage(message)) {
		throw new GhAuthRequiredError();
	}
	throw new Error(`${context}: ${message.trim() || "GitHub CLI command failed."}`);
};
