export const SIDEBAR_WIDTH_DEFAULT = 298;
export const SIDEBAR_WIDTH_MIN = 220;
export const SIDEBAR_WIDTH_MAX = 440;

export const WORKSPACE_WIDTH_MIN = 320;
export const WORKSPACE_WIDTH_MAX = 960;
export const WORKSPACE_WIDTH_RATIO = 0.38;

export const clampSidebarWidth = (width: number) =>
	Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, width));

export const clampWorkspaceWidth = (width: number) =>
	Math.min(WORKSPACE_WIDTH_MAX, Math.max(WORKSPACE_WIDTH_MIN, width));

export const resolveDefaultWorkspaceWidth = (viewportWidth = 1440) =>
	clampWorkspaceWidth(Math.round(viewportWidth * WORKSPACE_WIDTH_RATIO));
