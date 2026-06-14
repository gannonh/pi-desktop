/**
 * Registry of UI surfaces that are intentionally present but not yet wired.
 * Visible during pre-release development so the team can see roadmap coverage.
 */
/** Visible in local dev; off in production builds. Override with VITE_SHOW_PLANNED_AFFORDANCES=true. */
export const SHOW_PLANNED_AFFORDANCES = import.meta.env.VITE_SHOW_PLANNED_AFFORDANCES === "true" || import.meta.env.DEV;

export type PlannedAffordanceId =
	| "sidebar.new-chat"
	| "sidebar.search"
	| "sidebar.plugins"
	| "sidebar.automations"
	| "sidebar.chrome.back"
	| "sidebar.chrome.forward"
	| "sidebar.chrome.collapsed-new-chat"
	| "sidebar.chrome.chat-menu"
	| "start.suggestion"
	| "workspace.expand"
	| "workspace.fullscreen"
	| "filter.organize-by-project"
	| "filter.recent-projects"
	| "filter.chronological-list"
	| "filter.move"
	| "filter.sort-created"
	| "filter.sort-updated"
	| "chat.archive"
	| "composer.voice";

export interface PlannedAffordanceDefinition {
	label: string;
	note?: string;
}

export const PLANNED_AFFORDANCES: Record<PlannedAffordanceId, PlannedAffordanceDefinition> = {
	"sidebar.new-chat": { label: "New chat", note: "Top-level quick start" },
	"sidebar.search": { label: "Search" },
	"sidebar.plugins": { label: "Plugins" },
	"sidebar.automations": { label: "Automations" },
	"sidebar.chrome.back": { label: "Back" },
	"sidebar.chrome.forward": { label: "Forward" },
	"sidebar.chrome.collapsed-new-chat": { label: "New chat" },
	"sidebar.chrome.chat-menu": { label: "Chat menu" },
	"start.suggestion": { label: "Suggested prompt" },
	"workspace.expand": { label: "Expand panel" },
	"workspace.fullscreen": { label: "Full screen panel" },
	"filter.organize-by-project": { label: "By project" },
	"filter.recent-projects": { label: "Recent projects" },
	"filter.chronological-list": { label: "Chronological list" },
	"filter.move": { label: "Move" },
	"filter.sort-created": { label: "Created" },
	"filter.sort-updated": { label: "Updated" },
	"chat.archive": { label: "Archive chat" },
	"composer.voice": { label: "Voice input" },
};

export function formatPlannedTooltip(definition: PlannedAffordanceDefinition): string {
	return definition.note ? `${definition.label} · planned · ${definition.note}` : `${definition.label} · planned`;
}
