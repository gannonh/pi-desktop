import type { GitStatusResult, SourceControlPullRequestInfo } from "../../shared/source-control/types";

export type SourceControlPrimaryActionId =
	| "commit"
	| "commitStaged"
	| "stageAll"
	| "fetch"
	| "pull"
	| "push"
	| "sync"
	| "publish"
	| "fastForward"
	| "rebaseFromBase"
	| "createPullRequest"
	| "resolveConflicts";

export type SourceControlAction = {
	id: SourceControlPrimaryActionId;
	label: string;
	disabledReason?: string;
};

export type SourceControlActionResolverInput = {
	projectId: string | null;
	status: GitStatusResult | null;
	commitMessage: string;
	isBusy: boolean;
	pullRequest: SourceControlPullRequestInfo | null;
};

export const SOURCE_CONTROL_DROPDOWN_ACTION_IDS = [
	"commit",
	"commitStaged",
	"stageAll",
	"fetch",
	"pull",
	"push",
	"sync",
	"publish",
	"fastForward",
	"rebaseFromBase",
	"createPullRequest",
] as const satisfies readonly SourceControlPrimaryActionId[];

const ACTION_LABELS = {
	commit: "Commit",
	commitStaged: "Commit Staged",
	stageAll: "Stage All",
	fetch: "Fetch",
	pull: "Pull",
	push: "Push",
	sync: "Sync",
	publish: "Publish",
	fastForward: "Fast-forward",
	rebaseFromBase: "Rebase from Base",
	createPullRequest: "Create PR",
	resolveConflicts: "Resolve Conflicts",
} satisfies Record<SourceControlPrimaryActionId, string>;

const REBASE_FROM_UPSTREAM_LABEL = "Rebase from Upstream";

const hasProjectReason = (projectId: string | null) => (projectId ? undefined : "Select a project.");
const statusLoadedReason = (status: GitStatusResult | null) =>
	status ? undefined : "Source control status is loading.";
const busyReason = (isBusy: boolean) => (isBusy ? "A source control action is already running." : undefined);

const firstReason = (...reasons: (string | undefined)[]) => reasons.find(Boolean);

const conflictReason = (status: GitStatusResult | null) =>
	status?.conflictOperation && status.conflictOperation !== "unknown"
		? "Resolve conflicts before source control actions."
		: undefined;

const countsForStatus = (status: GitStatusResult | null) => {
	const entries = status?.entries ?? [];
	const staged = entries.filter((entry) => entry.area === "staged").length;
	const stageable = entries.filter((entry) => entry.area !== "staged").length;
	return { staged, stageable };
};

const action = (id: SourceControlPrimaryActionId, disabledReason?: string): SourceControlAction => ({
	id,
	label: ACTION_LABELS[id],
	disabledReason,
});

const DIVERGED_BRANCH_REASON = "Branch has diverged. Rebase or merge before syncing.";

export const resolveSourceControlActions = ({
	projectId,
	status,
	commitMessage,
	isBusy,
	pullRequest,
}: SourceControlActionResolverInput) => {
	const { staged, stageable } = countsForStatus(status);
	const upstream = status?.upstreamStatus;
	const baseReason = firstReason(hasProjectReason(projectId), busyReason(isBusy), statusLoadedReason(status));
	const blocksMutations = firstReason(baseReason, conflictReason(status));
	const hasMessage = commitMessage.trim().length > 0;
	const hasDiverged = Boolean(upstream?.hasUpstream && upstream.ahead > 0 && upstream.behind > 0);
	const divergedRebaseReason = hasDiverged && !upstream?.upstreamName ? "Upstream name is unavailable." : undefined;

	const byId = {
		commit: action(
			"commit",
			firstReason(
				blocksMutations,
				staged > 0 ? undefined : "Stage changes before committing.",
				hasMessage ? undefined : "Enter a commit message.",
			),
		),
		// Stable dropdown slot for Orca parity; commit only staged files today, same as `commit`.
		commitStaged: action(
			"commitStaged",
			firstReason(
				blocksMutations,
				staged > 0 ? undefined : "Stage changes before committing.",
				hasMessage ? undefined : "Enter a commit message.",
			),
		),
		stageAll: action(
			"stageAll",
			firstReason(blocksMutations, stageable > 0 ? undefined : "No unstaged changes to stage."),
		),
		fetch: action("fetch", baseReason),
		pull: action(
			"pull",
			firstReason(
				blocksMutations,
				upstream?.hasUpstream ? undefined : "Set an upstream before pulling.",
				upstream && upstream.behind > 0 ? undefined : "No incoming commits.",
			),
		),
		push: action(
			"push",
			firstReason(
				blocksMutations,
				upstream?.hasUpstream ? undefined : "Publish this branch before pushing.",
				upstream && upstream.ahead > 0 ? undefined : "No outgoing commits.",
			),
		),
		sync: action(
			"sync",
			firstReason(
				blocksMutations,
				upstream?.hasUpstream ? undefined : "Set an upstream before syncing.",
				hasDiverged ? DIVERGED_BRANCH_REASON : undefined,
				upstream && (upstream.ahead > 0 || upstream.behind > 0) ? undefined : "Branch is up to date.",
			),
		),
		publish: action(
			"publish",
			firstReason(
				blocksMutations,
				upstream === undefined ? "Source control status is loading." : undefined,
				upstream?.hasUpstream ? "Branch already has an upstream." : undefined,
			),
		),
		fastForward: action(
			"fastForward",
			firstReason(
				blocksMutations,
				upstream?.hasUpstream ? undefined : "Set an upstream before fast-forwarding.",
				upstream && upstream.behind > 0 ? undefined : "No incoming commits.",
			),
		),
		rebaseFromBase: action("rebaseFromBase", firstReason(blocksMutations, divergedRebaseReason)),
		createPullRequest: action(
			"createPullRequest",
			firstReason(
				blocksMutations,
				upstream === undefined ? "Source control status is loading." : undefined,
				upstream?.hasUpstream ? undefined : "Publish this branch before creating a PR.",
				pullRequest ? "Pull request already linked." : undefined,
				upstream && upstream.ahead === 0 ? undefined : "Push outgoing commits before creating a PR.",
			),
		),
		resolveConflicts: action("resolveConflicts", conflictReason(status)),
	} satisfies Record<SourceControlPrimaryActionId, SourceControlAction>;

	let primary: SourceControlAction = byId.createPullRequest;
	if (status?.conflictOperation && status.conflictOperation !== "unknown") {
		primary = byId.resolveConflicts;
	} else if (staged > 0 && (hasMessage || stageable === 0)) {
		primary = byId.commit;
	} else if (stageable > 0) {
		primary = byId.stageAll;
	} else if (hasDiverged) {
		primary = { ...byId.rebaseFromBase, label: REBASE_FROM_UPSTREAM_LABEL };
	} else if (upstream?.hasUpstream && upstream.behind > 0) {
		primary = byId.pull;
	} else if (upstream?.hasUpstream && upstream.ahead > 0) {
		primary = byId.push;
	} else if (upstream && !upstream.hasUpstream) {
		primary = byId.publish;
	}

	const dropdownAction = (id: (typeof SOURCE_CONTROL_DROPDOWN_ACTION_IDS)[number]) => {
		if (id === "rebaseFromBase" && hasDiverged) {
			return { ...byId.rebaseFromBase, label: REBASE_FROM_UPSTREAM_LABEL };
		}
		return byId[id];
	};

	return {
		primary,
		dropdown: SOURCE_CONTROL_DROPDOWN_ACTION_IDS.map((id) => dropdownAction(id)),
		byId,
	};
};
