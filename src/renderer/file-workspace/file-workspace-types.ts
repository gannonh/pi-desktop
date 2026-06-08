import type { GitDiffKind, GitDiffPayload } from "../../shared/source-control/types";

export type FileViewMode = "preview" | "source" | "split";

export type FileEditorTab = {
	kind: "file";
	id: string;
	relativePath: string;
	title: string;
	dirty: boolean;
	savedContent: string | null;
	buffer: string;
	status: "idle" | "loading" | "loaded" | "error";
	errorMessage?: string;
	viewMode: FileViewMode;
	readOnly: boolean;
	loadKind?: "text" | "binary" | "too_large" | "not_found" | "unsupported";
};

export type FileDiffTab = {
	kind: "diff";
	id: string;
	relativePath: string;
	title: string;
	dirty: false;
	savedContent: string;
	buffer: string;
	status: "loaded";
	viewMode: "source";
	readOnly: true;
	diffKind: GitDiffKind;
	diff: GitDiffPayload;
};

export type FileWorkspaceTab = FileEditorTab | FileDiffTab;

export type FileWorkspaceState = {
	expandedPaths: string[];
	selectedPath: string | null;
	loadingPaths: string[];
	directoryEntries: Record<
		string,
		| { status: "loading" }
		| { status: "loaded"; entries: { name: string; relativePath: string; kind: "file" | "directory" }[] }
		| { status: "error"; message: string }
	>;
	tabs: FileWorkspaceTab[];
	activeTabId: string | null;
	saveStatus: "idle" | "saving" | "error";
	saveMessage?: string;
};
