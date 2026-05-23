import type { PiDesktopApi } from "../../shared/preload-api";
import { err } from "../../shared/result";

export const createUnavailablePiDesktopApi = (message: string): PiDesktopApi => {
	const unavailable = async () => err("app_transport.unavailable", message);

	return {
		app: {
			getVersion: unavailable,
		},
		project: {
			getState: unavailable,
			createFromScratch: unavailable,
			addExistingFolder: unavailable,
			select: unavailable,
			rename: unavailable,
			remove: unavailable,
			openInFinder: unavailable,
			locateFolder: unavailable,
			setPinned: unavailable,
			checkAvailability: unavailable,
		},
		chat: {
			create: unavailable,
			createStandalone: unavailable,
			select: unavailable,
			rename: unavailable,
			selectStandalone: unavailable,
			fork: unavailable,
			clone: unavailable,
			branch: unavailable,
		},
		workspaceFiles: {
			listDirectory: unavailable,
			readFile: unavailable,
			writeFile: unavailable,
		},
		piSession: {
			start: unavailable,
			submit: unavailable,
			abort: unavailable,
			history: unavailable,
			dispose: unavailable,
			getSettings: unavailable,
			getDefaultSettings: unavailable,
			setModel: unavailable,
			setThinkingLevel: unavailable,
			setDefaultModel: unavailable,
			setDefaultThinkingLevel: unavailable,
			updateQueuedMessage: unavailable,
			removeQueuedMessage: unavailable,
			onEvent: () => () => {},
		},
	};
};
