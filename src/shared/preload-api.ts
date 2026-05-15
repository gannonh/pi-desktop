import type {
	AppVersionResult,
	ChatCreateInput,
	ChatSelectionInput,
	PiSessionAbortInput,
	PiSessionActionResult,
	PiSessionDisposeInput,
	PiSessionEvent,
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
	};
	piSession: {
		start: (input: PiSessionStartInput) => Promise<PiSessionStartResult>;
		submit: (input: PiSessionSubmitInput) => Promise<PiSessionActionResult>;
		abort: (input: PiSessionAbortInput) => Promise<PiSessionActionResult>;
		dispose: (input: PiSessionDisposeInput) => Promise<PiSessionActionResult>;
		onEvent: (listener: (event: PiSessionEvent) => void) => () => void;
	};
}
