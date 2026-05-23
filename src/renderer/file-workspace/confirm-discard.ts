export const confirmDiscardUnsavedChanges = (titles: string[]): boolean => {
	if (titles.length === 0) {
		return true;
	}
	return window.confirm(`Discard unsaved changes in ${titles.join(", ")}?`);
};
