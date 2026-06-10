import { afterEach, describe, expect, it, vi } from "vitest";
import {
	GhAuthRequiredError,
	GhUnavailableError,
	PullRequestNotFoundError,
	assertGhCommandSucceeded,
	getGhAuthStatus,
	isGhAuthErrorMessage,
	isGhUnavailableMessage,
	isNoPullRequestErrorMessage,
	parseGhAuthStatus,
} from "../../src/main/git/gh-auth";
import { gitExecFileAsync } from "../../src/main/git/runner";

vi.mock("../../src/main/git/runner", () => ({
	gitExecFileAsync: vi.fn(),
}));

const mockedGitExecFileAsync = vi.mocked(gitExecFileAsync);

describe("gh auth helpers", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("parses authenticated gh auth status output", () => {
		expect(
			parseGhAuthStatus("github.com\n  ✓ Logged in to github.com account gannonh (keyring)\n  - Active account: true"),
		).toEqual({ authenticated: true, account: "gannonh" });
	});

	it("parses unauthenticated gh auth status output", () => {
		expect(parseGhAuthStatus("You are not logged into any GitHub hosts.")).toEqual({
			authenticated: false,
			account: null,
		});
	});

	it("classifies gh auth, unavailable, and missing PR messages", () => {
		expect(isGhAuthErrorMessage("not logged in to github.com")).toBe(true);
		expect(isGhUnavailableMessage("spawn gh ENOENT")).toBe(true);
		expect(isNoPullRequestErrorMessage("no pull requests found for branch")).toBe(true);
	});

	it("returns authenticated gh auth status from gh auth status", async () => {
		mockedGitExecFileAsync.mockResolvedValue({
			stdout: "✓ Logged in to github.com account gannonh (keyring)",
			stderr: "",
		});

		await expect(getGhAuthStatus()).resolves.toEqual({
			ghAvailable: true,
			authenticated: true,
			account: "gannonh",
			remediation: null,
		});
		expect(mockedGitExecFileAsync).toHaveBeenCalledWith(["auth", "status"], { cwd: process.cwd() }, "gh");
	});

	it("returns remediation when gh is available but unauthenticated", async () => {
		mockedGitExecFileAsync.mockResolvedValue({
			stdout: "You are not logged into any GitHub hosts.",
			stderr: "",
		});

		await expect(getGhAuthStatus()).resolves.toEqual({
			ghAvailable: true,
			authenticated: false,
			account: null,
			remediation: "Run `gh auth login` in a terminal to connect GitHub.",
		});
	});

	it("returns install remediation when gh is unavailable", async () => {
		mockedGitExecFileAsync.mockRejectedValue({ stderr: "spawn gh ENOENT" });

		await expect(getGhAuthStatus()).resolves.toEqual({
			ghAvailable: false,
			authenticated: false,
			account: null,
			remediation: "Install the GitHub CLI (gh) from https://cli.github.com/ and run `gh auth login`.",
		});
	});

	it("maps gh command failures to typed errors", () => {
		expect(() => assertGhCommandSucceeded({ stderr: "spawn gh ENOENT" }, "Create pull request failed")).toThrow(
			GhUnavailableError,
		);
		expect(() => assertGhCommandSucceeded({ stderr: "not logged in to github.com" }, "Create pull request failed")).toThrow(
			GhAuthRequiredError,
		);
		expect(() =>
			assertGhCommandSucceeded({ stderr: "no pull requests found for branch" }, "Load pull request failed"),
		).toThrow(PullRequestNotFoundError);
	});
});
