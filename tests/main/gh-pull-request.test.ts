import { afterEach, describe, expect, it, vi } from "vitest";
import { GhAuthRequiredError, PullRequestNotFoundError } from "../../src/main/git/gh-auth";
import { createPullRequest, getPullRequestInfo } from "../../src/main/git/status";
import { gitExecFileAsync } from "../../src/main/git/runner";

vi.mock("../../src/main/git/runner", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../src/main/git/runner")>();
	return {
		...actual,
		gitExecFileAsync: vi.fn(),
	};
});

const mockedGitExecFileAsync = vi.mocked(gitExecFileAsync);
const worktreePath = "/tmp/pi-project";

describe("gh pull request commands", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("loads linked pull request metadata for the current branch", async () => {
		mockedGitExecFileAsync.mockResolvedValue({
			stdout: JSON.stringify({
				title: "Hosted review",
				url: "https://github.com/gannonh/pi-desktop/pull/155",
				state: "OPEN",
				number: 155,
			}),
			stderr: "",
		});

		await expect(getPullRequestInfo(worktreePath)).resolves.toEqual({
			title: "Hosted review",
			url: "https://github.com/gannonh/pi-desktop/pull/155",
			state: "open",
			number: 155,
		});
		expect(mockedGitExecFileAsync).toHaveBeenCalledWith(
			["pr", "view", "--json", "title,url,state,number"],
			{ cwd: worktreePath },
			"gh",
		);
	});

	it("creates a pull request and reloads metadata", async () => {
		mockedGitExecFileAsync
			.mockResolvedValueOnce({
				stdout: "https://github.com/gannonh/pi-desktop/pull/156\n",
				stderr: "",
			})
			.mockResolvedValueOnce({
				stdout: JSON.stringify({
					title: "Wave 5.1",
					url: "https://github.com/gannonh/pi-desktop/pull/156",
					state: "OPEN",
					number: 156,
				}),
				stderr: "",
			});

		await expect(
			createPullRequest(worktreePath, { title: "Wave 5.1", body: "Hosted review slice" }),
		).resolves.toEqual({
			title: "Wave 5.1",
			url: "https://github.com/gannonh/pi-desktop/pull/156",
			state: "open",
			number: 156,
		});
		expect(mockedGitExecFileAsync).toHaveBeenNthCalledWith(
			1,
			["pr", "create", "--title", "Wave 5.1", "--body", "Hosted review slice"],
			{ cwd: worktreePath },
			"gh",
		);
	});

	it("maps missing linked pull requests to PullRequestNotFoundError", async () => {
		mockedGitExecFileAsync.mockRejectedValue({ stderr: "no pull requests found for branch feat/wave5-51" });

		await expect(getPullRequestInfo(worktreePath)).rejects.toThrow(PullRequestNotFoundError);
	});

	it("maps gh auth failures to GhAuthRequiredError", async () => {
		mockedGitExecFileAsync.mockRejectedValue({ stderr: "HTTP 401: authentication failed" });

		await expect(createPullRequest(worktreePath, { title: "Wave 5.1", body: "Hosted review slice" })).rejects.toThrow(
			GhAuthRequiredError,
		);
	});
});
