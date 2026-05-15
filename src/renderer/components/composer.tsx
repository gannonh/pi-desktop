import { ArrowUp, ChevronDown, GitBranch, Laptop, Mic, Paperclip, Sparkles } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { ComposerContext } from "../chat/chat-view-model";
import { createComposerState } from "../chat/composer-state";

interface ComposerProps {
	context: ComposerContext;
	layout?: "center" | "bottom";
	running?: boolean;
	onSubmit?: (prompt: string) => Promise<boolean> | boolean;
	onAbort?: () => void;
}

type ComposerMenu = "project" | "mode" | "model" | null;

const inputHint = "Ask Pi anything. @ to use skills or mention files";

export function Composer({ context, layout = "center", running = false, onSubmit, onAbort }: ComposerProps) {
	const statusId = useId();
	const [text, setText] = useState("");
	const [openMenu, setOpenMenu] = useState<ComposerMenu>(null);
	const state = createComposerState({
		text,
		runtimeAvailable: context.runtimeAvailable,
		disabledReason: context.disabledReason,
	});

	const toggleMenu = (menu: Exclude<ComposerMenu, null>) => {
		setOpenMenu((current) => (current === menu ? null : menu));
	};

	return (
		<form
			className={["composer", `composer--${layout}`].join(" ")}
			aria-label="Pi composer"
			aria-describedby={state.statusLabel ? statusId : undefined}
			onSubmit={async (event) => {
				event.preventDefault();
				const prompt = text.trim();
				if (!running && !state.sendDisabled && prompt) {
					const submitted = await onSubmit?.(prompt);
					if (submitted) {
						setText("");
					}
				}
			}}
		>
			<div className="composer__input-panel">
				<div className="composer__message-row">
					<textarea
						className="composer__textarea"
						aria-label="Message Pi"
						value={text}
						onChange={(event) => setText(event.target.value)}
						placeholder={inputHint}
						rows={1}
					/>
				</div>
				<div className="composer__action-row">
					<button className="composer__icon-button" type="button" aria-label="Add context" disabled>
						<Paperclip className="composer__icon" />
					</button>
					<span className="composer__action-spacer" />
					<ComposerControl label={context.modelLabel} menu="model" openMenu={openMenu} onToggle={toggleMenu} />
					<button className="composer__icon-button" type="button" aria-label="Voice input" disabled>
						<Mic className="composer__icon" />
					</button>
					{running ? (
						<button
							className="composer__send-button composer__send-button--abort"
							type="button"
							aria-label="Abort run"
							onClick={onAbort}
						>
							<span className="composer__abort-mark" />
						</button>
					) : (
						<button
							className="composer__send-button"
							type="submit"
							disabled={state.sendDisabled}
							aria-label="Send message"
						>
							<ArrowUp className="composer__icon" />
						</button>
					)}
				</div>
			</div>
			<div className="composer__control-row">
				<ComposerControl
					label={context.projectSelectorLabel}
					menu="project"
					openMenu={openMenu}
					icon={<Sparkles className="composer__control-icon" />}
					onToggle={toggleMenu}
				/>
				<ComposerControl
					label={context.modeLabel}
					menu="mode"
					openMenu={openMenu}
					icon={<Laptop className="composer__control-icon" />}
					onToggle={toggleMenu}
				/>
				{context.branchLabel ? (
					<span className="composer__branch-label">
						<GitBranch className="composer__control-icon" />
						{context.branchLabel}
					</span>
				) : null}
				{state.statusLabel ? (
					<span id={statusId} className="composer__disabled-reason">
						{state.statusLabel}
					</span>
				) : null}
			</div>
		</form>
	);
}

interface ComposerControlProps {
	label: string;
	menu: Exclude<ComposerMenu, null>;
	openMenu: ComposerMenu;
	icon?: ReactNode;
	onToggle: (menu: Exclude<ComposerMenu, null>) => void;
}

function ComposerControl({ label, menu, openMenu, icon, onToggle }: ComposerControlProps) {
	const open = openMenu === menu;

	return (
		<span className="composer__control-wrap">
			<button className="composer__control" type="button" aria-expanded={open} onClick={() => onToggle(menu)}>
				{icon}
				<span className="composer__control-label">{label}</span>
				<ChevronDown className="composer__control-icon" />
			</button>
			{open ? (
				<span className="composer__local-menu">
					<span className="composer__local-menu-item">{label}</span>
				</span>
			) : null}
		</span>
	);
}
