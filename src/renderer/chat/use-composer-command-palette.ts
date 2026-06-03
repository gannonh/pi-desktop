import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { buildCommandPaletteEntries, type CommandPaletteDeps } from "./build-command-palette-entries";
import { groupCommandPaletteEntries, type CommandPaletteEntry } from "./command-palette-registry";
import {
	filterCommandPaletteEntries,
	getCommandPaletteKeyAction,
	getCommandPaletteTrigger,
	getNextCommandPaletteEntryId,
} from "./command-palette-state";

interface UseComposerCommandPaletteOptions {
	text: string;
	selectionStart: number;
	setText: Dispatch<SetStateAction<string>>;
	setSelectionStart: (selectionStart: number) => void;
	setTextareaSelection: (selectionStart: number) => void;
	focusTextarea: () => void;
	commandPaletteDeps?: CommandPaletteDeps;
	onShowPaletteNotice?: (message: string) => void;
}

export function useComposerCommandPalette({
	text,
	selectionStart,
	setText,
	setSelectionStart,
	setTextareaSelection,
	focusTextarea,
	commandPaletteDeps,
	onShowPaletteNotice,
}: UseComposerCommandPaletteOptions) {
	const [activeEntryId, setActiveEntryId] = useState("");
	const [dismissedForText, setDismissedForText] = useState("");
	const entries = useMemo(() => buildCommandPaletteEntries(commandPaletteDeps), [commandPaletteDeps]);
	const trigger = getCommandPaletteTrigger(text, selectionStart);
	const open = trigger.open && dismissedForText !== text;
	const filteredEntries = useMemo(() => filterCommandPaletteEntries(entries, trigger.query), [entries, trigger.query]);
	const groups = useMemo(() => groupCommandPaletteEntries(filteredEntries), [filteredEntries]);
	const visibleEntries = useMemo(() => groups.flatMap((group) => group.entries), [groups]);

	useEffect(() => {
		if (!open) {
			setActiveEntryId("");
			return;
		}
		if (!visibleEntries.some((entry) => entry.id === activeEntryId)) {
			setActiveEntryId(visibleEntries[0]?.id ?? "");
		}
	}, [activeEntryId, open, visibleEntries]);

	const noteTextChanged = useCallback(
		(nextText: string, nextSelectionStart: number) => {
			setText(nextText);
			setSelectionStart(nextSelectionStart);
			setDismissedForText("");
		},
		[setText, setSelectionStart],
	);

	const dismiss = useCallback(() => {
		setDismissedForText(text);
	}, [text]);

	const replaceTrigger = useCallback(
		(prompt: string) => {
			const nextText = `${text.slice(0, trigger.start)}${prompt}${text.slice(trigger.end)}`;
			const nextSelectionStart = trigger.start + prompt.length;
			setText(nextText);
			setSelectionStart(nextSelectionStart);
			setTextareaSelection(nextSelectionStart);
			setDismissedForText(nextText);
			focusTextarea();
		},
		[focusTextarea, setText, setSelectionStart, setTextareaSelection, text, trigger.end, trigger.start],
	);

	const selectEntry = useCallback(
		(entry: CommandPaletteEntry) => {
			const action = entry.handler();
			if (action.type === "insertPrompt") {
				onShowPaletteNotice?.("");
				replaceTrigger(action.prompt);
				return;
			}
			if (action.type === "showNotice") {
				onShowPaletteNotice?.(action.message);
			} else {
				onShowPaletteNotice?.("");
			}
			dismiss();
			focusTextarea();
		},
		[dismiss, focusTextarea, onShowPaletteNotice, replaceTrigger],
	);

	const moveActiveEntry = useCallback(
		(delta: number) => {
			const nextEntryId = getNextCommandPaletteEntryId(visibleEntries, activeEntryId, delta);
			if (nextEntryId !== undefined) {
				setActiveEntryId(nextEntryId);
			}
		},
		[activeEntryId, visibleEntries],
	);

	const selectActiveEntry = useCallback(() => {
		const selectedEntry = visibleEntries.find((entry) => entry.id === activeEntryId) ?? visibleEntries[0];
		if (selectedEntry) {
			selectEntry(selectedEntry);
		}
	}, [activeEntryId, selectEntry, visibleEntries]);

	const handleNavigationKey = useCallback(
		(key: string) => {
			if (!open) {
				return false;
			}

			const action = getCommandPaletteKeyAction(key);
			if (action === undefined) {
				return false;
			}

			if (visibleEntries.length === 0) {
				if (action === "dismiss") {
					dismiss();
					return true;
				}
				return false;
			}

			switch (action) {
				case "next":
					moveActiveEntry(1);
					break;
				case "previous":
					moveActiveEntry(-1);
					break;
				case "select":
					selectActiveEntry();
					break;
				case "dismiss":
					dismiss();
					break;
			}

			return true;
		},
		[dismiss, moveActiveEntry, open, selectActiveEntry, visibleEntries.length],
	);

	return {
		open,
		trigger,
		groups,
		activeEntryId,
		setActiveEntryId,
		selectEntry,
		dismiss,
		noteTextChanged,
		handleNavigationKey,
	};
}
