import type {
	AppVersionResult,
	ChatBranchInput,
	ChatCloneInput,
	ChatCreateInput,
	ChatForkInput,
	ChatRenameInput,
	ChatSelectionInput,
	ChatStandaloneSelectionInput,
	PiSessionAbortInput,
	PiSessionActionResult,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionHistoryInput,
	PiSessionHistoryResult,
	PiSessionStartInput,
	PiSessionStartResult,
	PiSessionSubmitInput,
	ProjectIdInput,
	ProjectPinnedInput,
	ProjectRenameInput,
	ProjectStateViewResult,
} from "./ipc";

export interface PiDesktopApi {
	app: {
		getVersion: () => Promise<AppVersionResult>;
	};
	project: {
		getState: () => Promise<ProjectStateViewResult>;
		createFromScratch: () => Promise<ProjectStateViewResult>;
		addExistingFolder: () => Promise<ProjectStateViewResult>;
		select: (input: ProjectIdInput) => Promise<ProjectStateViewResult>;
		rename: (input: ProjectRenameInput) => Promise<ProjectStateViewResult>;
		remove: (input: ProjectIdInput) => Promise<ProjectStateViewResult>;
		openInFinder: (input: ProjectIdInput) => Promise<ProjectStateViewResult>;
		locateFolder: (input: ProjectIdInput) => Promise<ProjectStateViewResult>;
		setPinned: (input: ProjectPinnedInput) => Promise<ProjectStateViewResult>;
		checkAvailability: (input: ProjectIdInput) => Promise<ProjectStateViewResult>;
	};
	chat: {
		create: (input: ChatCreateInput) => Promise<ProjectStateViewResult>;
		select: (input: ChatSelectionInput) => Promise<ProjectStateViewResult>;
		rename: (input: ChatRenameInput) => Promise<ProjectStateViewResult>;
		selectStandalone: (input: ChatStandaloneSelectionInput) => Promise<ProjectStateViewResult>;
		fork: (input: ChatForkInput) => Promise<ProjectStateViewResult>;
		clone: (input: ChatCloneInput) => Promise<ProjectStateViewResult>;
		branch: (input: ChatBranchInput) => Promise<ProjectStateViewResult>;
	};
	piSession: {
		start: (input: PiSessionStartInput) => Promise<PiSessionStartResult>;
		submit: (input: PiSessionSubmitInput) => Promise<PiSessionActionResult>;
		abort: (input: PiSessionAbortInput) => Promise<PiSessionActionResult>;
		history: (input: PiSessionHistoryInput) => Promise<PiSessionHistoryResult>;
		dispose: (input: PiSessionDisposeInput) => Promise<PiSessionActionResult>;
		onEvent: (listener: (event: PiSessionEvent) => void) => () => void;
	};
}
