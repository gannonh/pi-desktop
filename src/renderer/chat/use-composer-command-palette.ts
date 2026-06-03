import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { buildCommandPaletteEntries } from "./build-command-palette-entries";
import type { CommandPaletteAction, CommandPaletteEntry } from "./command-palette-registry";
import { groupCommandPaletteEntries } from "./command-palette-registry";
import type { SessionCommandPaletteActions } from "./session-command-palette";
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
	sessionCommandPaletteActions?: SessionCommandPaletteActions;
	onOpenModelPicker?: () => void;
	onShowPaletteNotice?: (message: string) => void;
	onClearPaletteNotice?: () => void;
}

export function useComposerCommandPalette({
	text,
	selectionStart,
	setText,
	setSelectionStart,
	setTextareaSelection,
	focusTextarea,
	sessionCommandPaletteActions,
	onOpenModelPicker,
	onShowPaletteNotice,
	onClearPaletteNotice,
}: UseComposerCommandPaletteOptions) {
	const [activeEntryId, setActiveEntryId] = useState("");
	const [dismissedForText, setDismissedForText] = useState("");
	const entries = useMemo(
		() => buildCommandPaletteEntries(sessionCommandPaletteActions),
		[sessionCommandPaletteActions],
	);
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
			onClearPaletteNotice?.();
		},
		[onClearPaletteNotice, setText, setSelectionStart],
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

	const applyPaletteAction = useCallback(
		(action: CommandPaletteAction) => {
			switch (action.type) {
				case "insertPrompt":
					replaceTrigger(action.prompt);
					return;
				case "openModelPicker":
					onOpenModelPicker?.();
					setDismissedForText(text);
					focusTextarea();
					return;
				case "notice":
					onShowPaletteNotice?.(action.message);
					setDismissedForText(text);
					focusTextarea();
					return;
				case "handled":
					setDismissedForText(text);
					focusTextarea();
					return;
			}
		},
		[focusTextarea, onOpenModelPicker, onShowPaletteNotice, replaceTrigger, text],
	);

	const selectEntry = useCallback(
		(entry: CommandPaletteEntry) => {
			applyPaletteAction(entry.handler());
		},
		[applyPaletteAction],
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
					onClearPaletteNotice?.();
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
					onClearPaletteNotice?.();
					dismiss();
					break;
			}

			return true;
		},
		[dismiss, moveActiveEntry, onClearPaletteNotice, open, selectActiveEntry, visibleEntries.length],
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
