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
	PiSessionAttachInput,
	PiSessionPrepareInput,
	PiSessionDisposeInput,
	PiSessionEvent,
	PiSessionGetRuntimeCommandsInput,
	PiSessionGetSettingsInput,
	PiSessionHistoryInput,
	PiSessionHistoryResult,
	PiSessionQueueResult,
	PiSessionRemoveQueuedMessageInput,
	PiSessionSetDefaultModelInput,
	PiSessionSetDefaultThinkingLevelInput,
	PiSessionSetModelInput,
	PiSessionSetThinkingLevelInput,
	PiSessionRuntimeCommandsResult,
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
	SourceControlBulkPathsInput,
	SourceControlCheckIgnoredResult,
	SourceControlGetStatusResult,
	SourceControlMutationResult,
	SourceControlPathInput,
	SourceControlProjectInput,
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
	sourceControl: {
		getStatus: (input: SourceControlProjectInput) => Promise<SourceControlGetStatusResult>;
		checkIgnored: (input: SourceControlBulkPathsInput) => Promise<SourceControlCheckIgnoredResult>;
		stage: (input: SourceControlPathInput) => Promise<SourceControlMutationResult>;
		unstage: (input: SourceControlPathInput) => Promise<SourceControlMutationResult>;
		discard: (input: SourceControlPathInput) => Promise<SourceControlMutationResult>;
		bulkStage: (input: SourceControlBulkPathsInput) => Promise<SourceControlMutationResult>;
		bulkUnstage: (input: SourceControlBulkPathsInput) => Promise<SourceControlMutationResult>;
		bulkDiscard: (input: SourceControlBulkPathsInput) => Promise<SourceControlMutationResult>;
		initializeRepository: (input: SourceControlProjectInput) => Promise<SourceControlMutationResult>;
	};
	clipboard: {
		writeText: (input: ClipboardWriteTextInput) => Promise<ClipboardWriteTextResult>;
	};
	piSession: {
		start: (input: PiSessionStartInput) => Promise<PiSessionStartResult>;
		submit: (input: PiSessionSubmitInput) => Promise<PiSessionActionResult>;
		abort: (input: PiSessionAbortInput) => Promise<PiSessionActionResult>;
		history: (input: PiSessionHistoryInput) => Promise<PiSessionHistoryResult>;
		prepare: (input: PiSessionPrepareInput) => Promise<PiSessionStartResult>;
		attach: (input: PiSessionAttachInput) => Promise<PiSessionStartResult>;
		dispose: (input: PiSessionDisposeInput) => Promise<PiSessionActionResult>;
		getSettings: (input: PiSessionGetSettingsInput) => Promise<PiSessionSettingsResult>;
		getDefaultSettings: (input?: PiSessionGetDefaultSettingsInput) => Promise<PiSessionSettingsResult>;
		getCommands: (input: PiSessionGetRuntimeCommandsInput) => Promise<PiSessionRuntimeCommandsResult>;
		setModel: (input: PiSessionSetModelInput) => Promise<PiSessionSettingsResult>;
		setThinkingLevel: (input: PiSessionSetThinkingLevelInput) => Promise<PiSessionSettingsResult>;
		setDefaultModel: (input: PiSessionSetDefaultModelInput) => Promise<PiSessionSettingsResult>;
		setDefaultThinkingLevel: (input: PiSessionSetDefaultThinkingLevelInput) => Promise<PiSessionSettingsResult>;
		updateQueuedMessage: (input: PiSessionUpdateQueuedMessageInput) => Promise<PiSessionQueueResult>;
		removeQueuedMessage: (input: PiSessionRemoveQueuedMessageInput) => Promise<PiSessionQueueResult>;
		onEvent: (listener: (event: PiSessionEvent) => void) => () => void;
	};
}
