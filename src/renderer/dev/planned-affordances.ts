/**
 * Registry of UI surfaces that are intentionally present but not yet wired.
 * Visible during pre-release development so the team can see roadmap coverage.
 */
export const SHOW_PLANNED_AFFORDANCES = true;

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
	| "chat.archive";

export interface PlannedAffordanceDefinition {
	id: PlannedAffordanceId;
	label: string;
	note?: string;
}

export const PLANNED_AFFORDANCES: Record<PlannedAffordanceId, PlannedAffordanceDefinition> = {
	"sidebar.new-chat": { id: "sidebar.new-chat", label: "New chat", note: "Top-level quick start" },
	"sidebar.search": { id: "sidebar.search", label: "Search" },
	"sidebar.plugins": { id: "sidebar.plugins", label: "Plugins" },
	"sidebar.automations": { id: "sidebar.automations", label: "Automations" },
	"sidebar.chrome.back": { id: "sidebar.chrome.back", label: "Back" },
	"sidebar.chrome.forward": { id: "sidebar.chrome.forward", label: "Forward" },
	"sidebar.chrome.collapsed-new-chat": { id: "sidebar.chrome.collapsed-new-chat", label: "New chat" },
	"sidebar.chrome.chat-menu": { id: "sidebar.chrome.chat-menu", label: "Chat menu" },
	"start.suggestion": { id: "start.suggestion", label: "Suggested prompt" },
	"workspace.expand": { id: "workspace.expand", label: "Expand panel" },
	"workspace.fullscreen": { id: "workspace.fullscreen", label: "Full screen panel" },
	"filter.organize-by-project": { id: "filter.organize-by-project", label: "By project" },
	"filter.recent-projects": { id: "filter.recent-projects", label: "Recent projects" },
	"filter.chronological-list": { id: "filter.chronological-list", label: "Chronological list" },
	"filter.move": { id: "filter.move", label: "Move" },
	"filter.sort-created": { id: "filter.sort-created", label: "Created" },
	"filter.sort-updated": { id: "filter.sort-updated", label: "Updated" },
	"chat.archive": { id: "chat.archive", label: "Archive chat" },
};

export function formatPlannedTooltip(definition: PlannedAffordanceDefinition): string {
	return definition.note ? `${definition.label} · planned · ${definition.note}` : `${definition.label} · planned`;
}
