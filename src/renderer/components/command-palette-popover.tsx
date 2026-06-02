import { CircleHelp, FileOutput, Settings, SquarePen, type LucideIcon } from "lucide-react";
import { useMemo, type KeyboardEvent } from "react";
import type {
	CommandPaletteEntry,
	CommandPaletteEntryGroup,
	CommandPaletteIconName,
} from "../chat/command-palette-registry";
import { getCommandPaletteKeyAction, getNextCommandPaletteEntryId } from "../chat/command-palette-state";
import { Badge } from "./ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "./ui/popover";

interface CommandPalettePopoverProps {
	open: boolean;
	query: string;
	groups: CommandPaletteEntryGroup[];
	activeEntryId: string;
	onActiveEntryIdChange: (entryId: string) => void;
	onSelectEntry: (entry: CommandPaletteEntry) => void;
	onDismiss: () => void;
}

const iconByName: Record<CommandPaletteIconName, LucideIcon> = {
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
	const selectedEntry = entries.find((entry) => entry.id === activeEntryId) ?? entries[0];
	const selectedEntryId = selectedEntry?.id ?? "";

	const moveActiveEntry = (delta: number) => {
		const nextEntryId = getNextCommandPaletteEntryId(entries, selectedEntryId, delta);
		if (nextEntryId !== undefined) {
			onActiveEntryIdChange(nextEntryId);
		}
	};

	const selectActiveEntry = () => {
		if (selectedEntry) {
			onSelectEntry(selectedEntry);
		}
	};

	const handleCommandKeyDown = (event: KeyboardEvent) => {
		const action = getCommandPaletteKeyAction(event.key);
		if (action === undefined) {
			return;
		}

		event.preventDefault();
		switch (action) {
			case "next":
				moveActiveEntry(1);
				return;
			case "previous":
				moveActiveEntry(-1);
				return;
			case "select":
				selectActiveEntry();
				return;
			case "dismiss":
				onDismiss();
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
									const Icon = iconByName[entry.icon];
									const active = entry.id === selectedEntryId;
									return (
										<CommandItem
											key={entry.id}
											value={entry.id}
											aria-selected={active}
											data-active={active || undefined}
											className="composer__command-item"
											onMouseEnter={() => onActiveEntryIdChange(entry.id)}
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
