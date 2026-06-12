export const COMMIT_SECTION_MIN_HEIGHT = 118;
export const COMMIT_SECTION_MAX_HEIGHT = 360;

export const WORKFLOW_BLOCK_DEFAULT_HEIGHTS = {
	branchCompare: 220,
	history: 320,
	pullRequest: 300,
} as const;

export const WORKFLOW_BLOCK_MIN_HEIGHT = 140;
export const WORKFLOW_BLOCK_MAX_HEIGHT = 1200;

const COMMIT_SECTION_DEFAULT_HEIGHT = 156;
const CHANGES_PANEL_LAYOUT_STORAGE_KEY = "pi-desktop.changes-panel.layout.v1";

export type WorkflowSectionId = keyof typeof WORKFLOW_BLOCK_DEFAULT_HEIGHTS;
export type ChangesPanelLayout = {
	expanded: Record<WorkflowSectionId, boolean>;
	heights: Record<"commit" | WorkflowSectionId, number>;
};

export const DEFAULT_CHANGES_PANEL_LAYOUT: ChangesPanelLayout = {
	expanded: {
		branchCompare: false,
		history: false,
		pullRequest: false,
	},
	heights: {
		commit: COMMIT_SECTION_DEFAULT_HEIGHT,
		...WORKFLOW_BLOCK_DEFAULT_HEIGHTS,
	},
};

export const clampSectionHeight = (height: number, min: number, max: number) => Math.min(max, Math.max(min, height));

const readStoredNumber = (value: unknown, fallback: number, min: number, max: number) =>
	typeof value === "number" && Number.isFinite(value) ? clampSectionHeight(value, min, max) : fallback;

export const readChangesPanelLayout = (): ChangesPanelLayout => {
	if (typeof window === "undefined") {
		return DEFAULT_CHANGES_PANEL_LAYOUT;
	}
	try {
		const parsed = JSON.parse(window.localStorage.getItem(CHANGES_PANEL_LAYOUT_STORAGE_KEY) ?? "{}");
		const maybeLayout = parsed && typeof parsed === "object" ? (parsed as Partial<ChangesPanelLayout>) : {};
		return {
			expanded: {
				branchCompare: maybeLayout.expanded?.branchCompare === true,
				history: maybeLayout.expanded?.history === true,
				pullRequest: maybeLayout.expanded?.pullRequest === true,
			},
			heights: {
				commit: readStoredNumber(
					maybeLayout.heights?.commit,
					DEFAULT_CHANGES_PANEL_LAYOUT.heights.commit,
					COMMIT_SECTION_MIN_HEIGHT,
					COMMIT_SECTION_MAX_HEIGHT,
				),
				branchCompare: readStoredNumber(
					maybeLayout.heights?.branchCompare,
					WORKFLOW_BLOCK_DEFAULT_HEIGHTS.branchCompare,
					WORKFLOW_BLOCK_MIN_HEIGHT,
					WORKFLOW_BLOCK_MAX_HEIGHT,
				),
				history: readStoredNumber(
					maybeLayout.heights?.history,
					WORKFLOW_BLOCK_DEFAULT_HEIGHTS.history,
					WORKFLOW_BLOCK_MIN_HEIGHT,
					WORKFLOW_BLOCK_MAX_HEIGHT,
				),
				pullRequest: readStoredNumber(
					maybeLayout.heights?.pullRequest,
					WORKFLOW_BLOCK_DEFAULT_HEIGHTS.pullRequest,
					WORKFLOW_BLOCK_MIN_HEIGHT,
					WORKFLOW_BLOCK_MAX_HEIGHT,
				),
			},
		};
	} catch {
		return DEFAULT_CHANGES_PANEL_LAYOUT;
	}
};

export const writeChangesPanelLayout = (layout: ChangesPanelLayout) => {
	if (typeof window === "undefined") {
		return;
	}
	window.localStorage.setItem(CHANGES_PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
};
