type DiscardConfirm = () => boolean;

let discardConfirm: DiscardConfirm | null = null;

export const registerFileWorkspaceDiscardConfirm = (confirm: DiscardConfirm | null): void => {
	discardConfirm = confirm;
};

/** Returns false when the user cancels discarding unsaved file tabs. */
export const confirmDiscardUnsavedFileWorkspaceChanges = (): boolean => discardConfirm?.() ?? true;
