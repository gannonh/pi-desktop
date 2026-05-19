import { useEffect, useRef, useState } from "react";

interface SidebarInlineRenameFieldProps {
	value: string;
	label: string;
	className?: string;
	onCommit: (value: string) => void;
	onCancel: () => void;
}

export function SidebarInlineRenameField({
	value,
	label,
	className,
	onCommit,
	onCancel,
}: SidebarInlineRenameFieldProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [draft, setDraft] = useState(value);
	const finishedRef = useRef(false);

	useEffect(() => {
		const input = inputRef.current;
		if (!input) {
			return;
		}

		input.focus();
		input.select();
	}, []);

	const finish = (nextValue?: string) => {
		if (finishedRef.current) {
			return;
		}

		finishedRef.current = true;
		const trimmed = (nextValue ?? draft).trim();
		if (!trimmed || trimmed === value) {
			onCancel();
			return;
		}

		onCommit(trimmed);
	};

	return (
		<input
			ref={inputRef}
			className={className}
			type="text"
			value={draft}
			aria-label={label}
			onChange={(event) => setDraft(event.target.value)}
			onClick={(event) => event.stopPropagation()}
			onMouseDown={(event) => event.stopPropagation()}
			onKeyDown={(event) => {
				event.stopPropagation();
				if (event.key === "Enter") {
					event.preventDefault();
					finish();
				}

				if (event.key === "Escape") {
					event.preventDefault();
					finishedRef.current = true;
					onCancel();
				}
			}}
			onBlur={() => finish()}
		/>
	);
}
