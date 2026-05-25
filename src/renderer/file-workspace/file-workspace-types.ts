export type FileViewMode = "preview" | "source" | "split";

export type FileEditorTab = {
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
	tabs: FileEditorTab[];
	activeTabId: string | null;
	saveStatus: "idle" | "saving" | "error";
	saveMessage?: string;
};
