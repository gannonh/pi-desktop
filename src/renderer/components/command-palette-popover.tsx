import { CircleHelp, FileOutput, Settings, SquarePen, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { CommandPaletteEntry, CommandPaletteEntryGroup } from "../chat/command-palette-registry";
import { getNextCommandPaletteEntryId } from "../chat/command-palette-state";
import { Badge } from "./ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "./ui/popover";

interface CommandPalettePopoverProps {
	open: boolean;
	query: string;
	groups: CommandPaletteEntryGroup[];
	activeEntryId?: string;
	onActiveEntryIdChange: (entryId: string) => void;
	onSelectEntry: (entry: CommandPaletteEntry) => void;
	onDismiss: () => void;
}

const iconByName: Record<string, LucideIcon> = {
	CircleHelp,
	FileOutput,
	Settings,
	SquarePen,
};

export function CommandPalettePopover({
	open,
	query,
	groups,
	activeEntryId,
	onActiveEntryIdChange,
	onSelectEntry,
	onDismiss,
}: CommandPalettePopoverProps) {
	const entries = useMemo(() => groups.flatMap((group) => group.entries), [groups]);
	const [internalActiveEntryId, setInternalActiveEntryId] = useState(activeEntryId ?? entries[0]?.id ?? "");

	useEffect(() => {
		setInternalActiveEntryId(activeEntryId ?? entries[0]?.id ?? "");
	}, [activeEntryId, entries]);

	const setActiveEntryId = (entryId: string) => {
		setInternalActiveEntryId(entryId);
		onActiveEntryIdChange(entryId);
	};

	const moveActiveEntry = (delta: number) => {
		const nextEntryId = getNextCommandPaletteEntryId(entries, internalActiveEntryId, delta);
		if (nextEntryId !== undefined) {
			setActiveEntryId(nextEntryId);
		}
	};

	const selectActiveEntry = () => {
		const selectedEntry = entries.find((entry) => entry.id === internalActiveEntryId) ?? entries[0];
		if (selectedEntry) {
			onSelectEntry(selectedEntry);
		}
	};

	const handleCommandKeyDown = (event: KeyboardEvent) => {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				moveActiveEntry(1);
				return;
			case "ArrowUp":
				event.preventDefault();
				moveActiveEntry(-1);
				return;
			case "Enter":
				event.preventDefault();
				selectActiveEntry();
				return;
			case "Escape":
				event.preventDefault();
				onDismiss();
				return;
			default:
				return;
		}
	};

	return (
		<Popover open={open}>
			<PopoverAnchor asChild>
				<span className="composer__command-anchor" aria-hidden="true" />
			</PopoverAnchor>
			<PopoverContent
				align="start"
				side="top"
				sideOffset={12}
				className="composer__command-popover"
				onOpenAutoFocus={(event) => event.preventDefault()}
				onCloseAutoFocus={(event) => event.preventDefault()}
			>
				<Command shouldFilter={false} className="composer__command" aria-label="Command palette">
					<CommandList
						role="listbox"
						aria-label="Command palette"
						className="composer__command-list"
						onKeyDown={handleCommandKeyDown}
					>
						<CommandEmpty>No commands found.</CommandEmpty>
						{groups.map((group) => (
							<CommandGroup key={group.section.id} heading={group.section.label}>
								{group.entries.map((entry) => {
									const Icon = iconByName[entry.icon] ?? CircleHelp;
									const active = entry.id === internalActiveEntryId;
									return (
										<CommandItem
											key={entry.id}
											value={entry.id}
											aria-selected={active}
											data-active={active || undefined}
											className="composer__command-item"
											onMouseEnter={() => setActiveEntryId(entry.id)}
											onSelect={() => onSelectEntry(entry)}
										>
											<Icon className="composer__command-icon" />
											<span className="composer__command-copy">
												<span className="composer__command-title">
													{highlightMatch(entry.title, query)}
												</span>
												<span className="composer__command-description">{entry.description}</span>
											</span>
											{entry.scopeTag ? <Badge variant="secondary">{entry.scopeTag}</Badge> : null}
										</CommandItem>
									);
								})}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

function highlightMatch(text: string, query: string) {
	const normalizedQuery = query.trim();
	if (!normalizedQuery) {
		return text;
	}
	const matchIndex = text.toLowerCase().indexOf(normalizedQuery.toLowerCase());
	if (matchIndex === -1) {
		return text;
	}
	const before = text.slice(0, matchIndex);
	const match = text.slice(matchIndex, matchIndex + normalizedQuery.length);
	const after = text.slice(matchIndex + normalizedQuery.length);
	return (
		<>
			{before}
			<mark>{match}</mark>
			{after}
		</>
	);
}
