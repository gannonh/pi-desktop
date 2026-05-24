import type {
	AppVersionResult,
	ChatBranchInput,
	ChatCloneInput,
	ChatCreateInput,
	ChatForkInput,
	ChatRenameInput,
	ChatSelectionInput,
	ChatStandaloneCreateInput,
	ChatStandaloneSelectionInput,
	ClipboardWriteTextInput,
	ClipboardWriteTextResult,
	PiSessionAbortInput,
	PiSessionActionResult,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionGetSettingsInput,
	PiSessionHistoryInput,
	PiSessionHistoryResult,
	PiSessionQueueResult,
	PiSessionRemoveQueuedMessageInput,
	PiSessionSetDefaultModelInput,
	PiSessionSetDefaultThinkingLevelInput,
	PiSessionSetModelInput,
	PiSessionSetThinkingLevelInput,
	PiSessionSettingsResult,
	PiSessionStartInput,
	PiSessionStartResult,
	PiSessionSubmitInput,
	PiSessionUpdateQueuedMessageInput,
	ProjectIdInput,
	ProjectPinnedInput,
	ProjectRenameInput,
	ProjectStateViewResult,
	WorkspaceFilesPathInput,
	WorkspaceFilesWriteInput,
	WorkspaceListDirectoryResult,
	WorkspaceReadFileResult,
	WorkspaceWriteFileResult,
} from "./ipc";
import type { PiSessionGetDefaultSettingsInput } from "./pi-session";

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
		createStandalone: (input: ChatStandaloneCreateInput) => Promise<ProjectStateViewResult>;
		select: (input: ChatSelectionInput) => Promise<ProjectStateViewResult>;
		rename: (input: ChatRenameInput) => Promise<ProjectStateViewResult>;
		selectStandalone: (input: ChatStandaloneSelectionInput) => Promise<ProjectStateViewResult>;
		fork: (input: ChatForkInput) => Promise<ProjectStateViewResult>;
		clone: (input: ChatCloneInput) => Promise<ProjectStateViewResult>;
		branch: (input: ChatBranchInput) => Promise<ProjectStateViewResult>;
	};
	workspaceFiles: {
		listDirectory: (input: WorkspaceFilesPathInput) => Promise<WorkspaceListDirectoryResult>;
		readFile: (input: WorkspaceFilesPathInput) => Promise<WorkspaceReadFileResult>;
		writeFile: (input: WorkspaceFilesWriteInput) => Promise<WorkspaceWriteFileResult>;
	};
	clipboard: {
		writeText: (input: ClipboardWriteTextInput) => Promise<ClipboardWriteTextResult>;
	};
	piSession: {
		start: (input: PiSessionStartInput) => Promise<PiSessionStartResult>;
		submit: (input: PiSessionSubmitInput) => Promise<PiSessionActionResult>;
		abort: (input: PiSessionAbortInput) => Promise<PiSessionActionResult>;
		history: (input: PiSessionHistoryInput) => Promise<PiSessionHistoryResult>;
		dispose: (input: PiSessionDisposeInput) => Promise<PiSessionActionResult>;
		getSettings: (input: PiSessionGetSettingsInput) => Promise<PiSessionSettingsResult>;
		getDefaultSettings: (input?: PiSessionGetDefaultSettingsInput) => Promise<PiSessionSettingsResult>;
		setModel: (input: PiSessionSetModelInput) => Promise<PiSessionSettingsResult>;
		setThinkingLevel: (input: PiSessionSetThinkingLevelInput) => Promise<PiSessionSettingsResult>;
		setDefaultModel: (input: PiSessionSetDefaultModelInput) => Promise<PiSessionSettingsResult>;
		setDefaultThinkingLevel: (input: PiSessionSetDefaultThinkingLevelInput) => Promise<PiSessionSettingsResult>;
		updateQueuedMessage: (input: PiSessionUpdateQueuedMessageInput) => Promise<PiSessionQueueResult>;
		removeQueuedMessage: (input: PiSessionRemoveQueuedMessageInput) => Promise<PiSessionQueueResult>;
		onEvent: (listener: (event: PiSessionEvent) => void) => () => void;
	};
}
