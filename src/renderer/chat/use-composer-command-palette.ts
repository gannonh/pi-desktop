import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { buildCommandPaletteEntries, type CommandPaletteEntryActions } from "./build-command-palette-entries";
import {
	groupCommandPaletteEntries,
	type CommandPaletteAction,
	type CommandPaletteEntry,
} from "./command-palette-registry";
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
	commandPaletteActions?: CommandPaletteEntryActions;
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
	commandPaletteActions,
	onOpenModelPicker,
	onShowPaletteNotice,
	onClearPaletteNotice,
}: UseComposerCommandPaletteOptions) {
	const [activeEntryId, setActiveEntryId] = useState("");
	const [dismissedForText, setDismissedForText] = useState("");
	const entries = useMemo(() => buildCommandPaletteEntries(commandPaletteActions), [commandPaletteActions]);
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

	const clearTrigger = useCallback(() => {
		const nextText = `${text.slice(0, trigger.start)}${text.slice(trigger.end)}`;
		const nextSelectionStart = trigger.start;
		setText(nextText);
		setSelectionStart(nextSelectionStart);
		setTextareaSelection(nextSelectionStart);
		setDismissedForText(nextText);
		focusTextarea();
	}, [focusTextarea, setText, setSelectionStart, setTextareaSelection, text, trigger.end, trigger.start]);

	const applyPaletteAction = useCallback(
		(action: CommandPaletteAction) => {
			switch (action.type) {
				case "insertPrompt":
					replaceTrigger(action.prompt);
					return;
				case "openModelPicker":
					onOpenModelPicker?.();
					clearTrigger();
					return;
				case "notice":
					onShowPaletteNotice?.(action.message);
					setDismissedForText(text);
					focusTextarea();
					return;
				case "handled":
					clearTrigger();
					return;
			}
		},
		[clearTrigger, focusTextarea, onOpenModelPicker, onShowPaletteNotice, replaceTrigger, text],
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
