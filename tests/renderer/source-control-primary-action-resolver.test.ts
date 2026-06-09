import { describe, expect, it } from "vitest";
import {
	SOURCE_CONTROL_DROPDOWN_ACTION_IDS,
	resolveSourceControlActions,
	type SourceControlActionResolverInput,
} from "../../src/renderer/changes-panel/source-control-primary-action-resolver";
import type { GitStatusResult } from "../../src/shared/source-control/types";

const baseStatus = {
	entries: [],
	conflictOperation: "unknown",
	branch: "refs/heads/feature",
	upstreamStatus: { hasUpstream: true, upstreamName: "origin/feature", ahead: 0, behind: 0 },
} satisfies GitStatusResult;

const resolve = (overrides: Partial<SourceControlActionResolverInput> = {}) =>
	resolveSourceControlActions({
		projectId: "project-1",
		status: baseStatus,
		commitMessage: "",
		isBusy: false,
		pullRequest: null,
		...overrides,
	});

describe("resolveSourceControlActions", () => {
	it("exposes stable dropdown rows for commit variants, remote operations, publish, rebase, fetch, and create PR", () => {
		expect(SOURCE_CONTROL_DROPDOWN_ACTION_IDS).toEqual([
			"commit",
			"commitStaged",
			"stageAll",
			"fetch",
			"pull",
			"push",
			"forcePushWithLease",
			"sync",
			"publish",
			"fastForward",
			"rebaseFromBase",
			"createPullRequest",
		]);

		expect(resolve().dropdown.map((action) => action.id)).toEqual(SOURCE_CONTROL_DROPDOWN_ACTION_IDS);
	});

	it("prioritizes conflicts over commit, local changes, and remote actions", () => {
		const actions = resolve({
			commitMessage: "Ship it",
			status: {
				...baseStatus,
				conflictOperation: "merge",
				entries: [
					{ path: "staged.ts", status: "modified", area: "staged" },
					{ path: "unstaged.ts", status: "modified", area: "unstaged" },
				],
				upstreamStatus: { hasUpstream: true, upstreamName: "origin/feature", ahead: 1, behind: 1 },
			},
		});

		expect(actions.primary.id).toBe("resolveConflicts");
		expect(actions.primary.disabledReason).toBe("Resolve conflicts before source control actions.");
	});

	it("uses commit as the primary action only when staged changes and a message are present", () => {
		expect(
			resolve({
				commitMessage: "Ship it",
				status: { ...baseStatus, entries: [{ path: "staged.ts", status: "modified", area: "staged" }] },
			}).primary.id,
		).toBe("commit");

		const missingMessage = resolve({
			status: { ...baseStatus, entries: [{ path: "staged.ts", status: "modified", area: "staged" }] },
		});
		expect(missingMessage.primary.id).toBe("commit");
		expect(missingMessage.primary.disabledReason).toBe("Enter a commit message.");
	});

	it("uses stage all before disabled commit when unstaged changes remain and the message is empty", () => {
		const actions = resolve({
			status: {
				...baseStatus,
				entries: [
					{ path: "staged.ts", status: "modified", area: "staged" },
					{ path: "unstaged.ts", status: "modified", area: "unstaged" },
				],
			},
		});

		expect(actions.primary.id).toBe("stageAll");
	});

	it("prioritizes staging before remote operations when only unstaged or untracked changes exist", () => {
		const actions = resolve({
			status: {
				...baseStatus,
				entries: [
					{ path: "unstaged.ts", status: "modified", area: "unstaged" },
					{ path: "new.ts", status: "untracked", area: "untracked" },
				],
				upstreamStatus: { hasUpstream: true, upstreamName: "origin/feature", ahead: 2, behind: 0 },
			},
		});

		expect(actions.primary.id).toBe("stageAll");
		expect(actions.primary.disabledReason).toBeUndefined();
	});

	it("prioritizes explicit rebase, pull, push, publish, then create PR for clean working trees", () => {
		const diverged = resolve({
			status: {
				...baseStatus,
				upstreamStatus: { hasUpstream: true, upstreamName: "origin/feature", ahead: 1, behind: 1 },
			},
		});
		expect(diverged.primary.id).toBe("rebaseFromBase");
		expect(diverged.primary.label).toBe("Rebase from Upstream");
		expect(diverged.dropdown.find((action) => action.id === "rebaseFromBase")?.label).toBe("Rebase from Upstream");
		expect(diverged.byId.sync.disabledReason).toBe("Branch has diverged. Rebase or merge before syncing.");
		expect(diverged.byId.forcePushWithLease.disabledReason).toBeUndefined();
		expect(
			resolve({
				status: {
					...baseStatus,
					upstreamStatus: { hasUpstream: true, upstreamName: "origin/feature", ahead: 0, behind: 1 },
				},
			}).primary.id,
		).toBe("pull");
		expect(
			resolve({
				status: {
					...baseStatus,
					upstreamStatus: { hasUpstream: true, upstreamName: "origin/feature", ahead: 1, behind: 0 },
				},
			}).primary.id,
		).toBe("push");
		expect(
			resolve({
				status: { ...baseStatus, upstreamStatus: { hasUpstream: false, ahead: 0, behind: 0 } },
			}).primary.id,
		).toBe("publish");
		expect(
			resolve({
				pullRequest: null,
				status: {
					...baseStatus,
					upstreamStatus: { hasUpstream: true, upstreamName: "origin/feature", ahead: 0, behind: 0 },
				},
			}).primary.id,
		).toBe("createPullRequest");
	});

	it("disables the diverged rebase action when the upstream ref name is unavailable", () => {
		const actions = resolve({
			status: {
				...baseStatus,
				upstreamStatus: { hasUpstream: true, ahead: 1, behind: 1 },
			},
		});

		expect(actions.primary.id).toBe("rebaseFromBase");
		expect(actions.primary.disabledReason).toBe("Upstream name is unavailable.");
	});

	it("includes concise disabled reasons for unavailable dropdown actions", () => {
		const actions = resolve({
			projectId: null,
			status: {
				...baseStatus,
				upstreamStatus: undefined,
			},
		});

		expect(actions.byId.commit.disabledReason).toBe("Select a project.");
		expect(actions.byId.stageAll.disabledReason).toBe("Select a project.");
		expect(actions.byId.pull.disabledReason).toBe("Select a project.");
		expect(actions.byId.forcePushWithLease.disabledReason).toBe("Select a project.");
		expect(actions.byId.publish.disabledReason).toBe("Select a project.");
		expect(actions.byId.createPullRequest.disabledReason).toBe("Select a project.");
	});

	it("disables source control actions while another action is busy", () => {
		const actions = resolve({
			isBusy: true,
			status: {
				...baseStatus,
				entries: [{ path: "staged.ts", status: "modified", area: "staged" }],
			},
			commitMessage: "Ship it",
		});

		expect(actions.primary.disabledReason).toBe("A source control action is already running.");
		expect(actions.byId.push.disabledReason).toBe("A source control action is already running.");
	});

	it("disables create PR when a pull request is already linked", () => {
		const actions = resolve({
			pullRequest: { title: "Feature", url: "https://example.com/pr/1", state: "open" },
		});

		expect(actions.byId.createPullRequest.disabledReason).toBe("Pull request already linked.");
	});

	it("disables create PR while upstream status is still loading", () => {
		const actions = resolve({
			status: { ...baseStatus, upstreamStatus: undefined },
		});

		expect(actions.byId.createPullRequest.disabledReason).toBe("Source control status is loading.");
	});
});
