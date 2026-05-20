import { ArrowUp, ChevronDown, GitBranch, Laptop, Mic, MoreHorizontal, Paperclip, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ComposerContext } from "../chat/chat-view-model";
import { createComposerState } from "../chat/composer-state";
import { formatQueueStatusLabel } from "../chat/composer-view-model";
import type { PiSessionDelivery, PiSessionQueuedMessage, PiSessionQueuedMessageId } from "../../shared/pi-session";

interface ComposerProps {
	context: ComposerContext;
	layout?: "center" | "bottom";
	running?: boolean;
	abortable?: boolean;
	queuedMessages?: PiSessionQueuedMessage[];
	pendingDelivery?: PiSessionDelivery;
	onSubmit?: (prompt: string, delivery?: PiSessionDelivery) => Promise<boolean> | boolean;
	onAbort?: () => void;
	onSelectProject?: (projectId: string) => void;
	onSelectModel?: (provider: string, modelId: string) => void;
	onSelectThinkingLevel?: (level: string) => void;
	onToggleQueuedDelivery?: (messageId: PiSessionQueuedMessageId) => void;
	onRemoveQueuedMessage?: (messageId: PiSessionQueuedMessageId) => void;
	onEditQueuedMessage?: (message: PiSessionQueuedMessage) => void;
	draftText?: string;
	onDraftApplied?: () => void;
}

type ComposerMenu = "project" | "mode" | "model" | null;

const defaultInputHint = "Ask Pi anything. @ to use skills or mention files";
const runningSteerHint = "Steering message — queued at the next turn";
const runningFollowUpHint = "Follow-up message — Option+Enter to queue as follow-up";

const previewText = (text: string) => (text.length > 72 ? `${text.slice(0, 72)}…` : text);

export function Composer({
	context,
	layout = "center",
	running = false,
	abortable = running,
	queuedMessages = [],
	pendingDelivery = "steer",
	onSubmit,
	onAbort,
	onSelectProject,
	onSelectModel,
	onSelectThinkingLevel,
	onToggleQueuedDelivery,
	onRemoveQueuedMessage,
	onEditQueuedMessage,
	draftText = "",
	onDraftApplied,
}: ComposerProps) {
	const statusId = useId();
	const formRef = useRef<HTMLFormElement>(null);
	const [text, setText] = useState("");
	const [openMenu, setOpenMenu] = useState<ComposerMenu>(null);
	const [openQueueMenuId, setOpenQueueMenuId] = useState<string | null>(null);
	const state = createComposerState({
		text,
		runtimeAvailable: context.runtimeAvailable,
		disabledReason: context.disabledReason,
		running,
	});

	const placeholder = running
		? pendingDelivery === "followUp"
			? runningFollowUpHint
			: runningSteerHint
		: defaultInputHint;
	const queueStatusLabel = formatQueueStatusLabel(queuedMessages);
	const visibleQueuedMessages = queuedMessages.slice(0, 3);

	useEffect(() => {
		if (!draftText) {
			return;
		}
		setText(draftText);
		onDraftApplied?.();
	}, [draftText, onDraftApplied]);

	useEffect(() => {
		const handlePointerDown = (event: MouseEvent) => {
			if (!formRef.current?.contains(event.target as Node)) {
				setOpenMenu(null);
				setOpenQueueMenuId(null);
			}
		};
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, []);

	const submitPrompt = async (delivery?: PiSessionDelivery) => {
		const prompt = text.trim();
		if (!prompt || state.sendDisabled) {
			return;
		}
		const submitted = await onSubmit?.(prompt, delivery);
		if (submitted) {
			setText("");
		}
	};

	const showAbortOnly = running && abortable && !state.showSendWhileRunning;

	return (
		<div className="composer-stack">
			{visibleQueuedMessages.length > 0 ? (
				<ul className="composer__queue" aria-label="Queued messages">
					{visibleQueuedMessages.map((message) => {
						const queueKey = `${message.id.queue}:${message.id.index}`;
						const toggleLabel = message.delivery === "steer" ? "Follow-up" : "Steer";
						return (
							<li key={queueKey} className="composer__queue-row">
								<span className="composer__queue-preview">{previewText(message.text)}</span>
								<button
									className="composer__queue-toggle"
									type="button"
									onClick={() => onToggleQueuedDelivery?.(message.id)}
								>
									{toggleLabel}
								</button>
								<div className="composer__queue-actions">
									<button
										className="composer__queue-overflow"
										type="button"
										aria-label="Queued message actions"
										aria-expanded={openQueueMenuId === queueKey}
										onClick={() => setOpenQueueMenuId((current) => (current === queueKey ? null : queueKey))}
									>
										<MoreHorizontal className="composer__icon" />
									</button>
									{openQueueMenuId === queueKey ? (
										<span className="composer__queue-menu" role="menu">
											<button
												type="button"
												role="menuitem"
												className="composer__queue-menu-item"
												onClick={() => {
													onEditQueuedMessage?.(message);
													setOpenQueueMenuId(null);
												}}
											>
												Edit
											</button>
											<button
												type="button"
												role="menuitem"
												className="composer__queue-menu-item"
												onClick={() => {
													onRemoveQueuedMessage?.(message.id);
													setOpenQueueMenuId(null);
												}}
											>
												Delete
											</button>
										</span>
									) : null}
									<button
										className="composer__queue-delete"
										type="button"
										aria-label="Delete queued message"
										onClick={() => onRemoveQueuedMessage?.(message.id)}
									>
										<X className="composer__icon" />
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			) : null}
			<form
				ref={formRef}
				className={["composer", `composer--${layout}`].join(" ")}
				aria-label="Pi composer"
				aria-describedby={state.statusLabel ? statusId : undefined}
				onSubmit={async (event) => {
					event.preventDefault();
					if (state.showSendWhileRunning) {
						await submitPrompt(pendingDelivery === "followUp" ? "followUp" : "steer");
						return;
					}
					if (!running && !state.sendDisabled) {
						await submitPrompt("prompt");
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
							onKeyDown={(event) => {
								if (event.key === "Enter" && event.altKey && running) {
									event.preventDefault();
									void submitPrompt("followUp");
								}
							}}
							placeholder={placeholder}
							rows={1}
						/>
					</div>
					<div className="composer__action-row">
						<button className="composer__icon-button" type="button" aria-label="Add context" disabled>
							<Paperclip className="composer__icon" />
						</button>
						<span className="composer__action-spacer" />
						<ComposerControl
							label={context.modelLabel}
							menu="model"
							openMenu={openMenu}
							onToggle={setOpenMenu}
							items={context.modelOptions.map((option) => ({
								key: `${option.provider}:${option.id}`,
								label: option.label,
								onSelect: () => onSelectModel?.(option.provider, option.id),
							}))}
						/>
						<button className="composer__icon-button" type="button" aria-label="Voice input" disabled>
							<Mic className="composer__icon" />
						</button>
						{showAbortOnly ? (
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
								disabled={state.sendDisabled && !state.showSendWhileRunning}
								aria-label="Send message"
							>
								<ArrowUp className="composer__icon" />
							</button>
						)}
						{running && abortable && state.showSendWhileRunning ? (
							<button
								className="composer__send-button composer__send-button--abort composer__send-button--secondary"
								type="button"
								aria-label="Abort run"
								onClick={onAbort}
							>
								<span className="composer__abort-mark" />
							</button>
						) : null}
					</div>
				</div>
				<div className="composer__control-row">
					{context.showProjectMenu ? (
						<ComposerControl
							label={context.projectSelectorLabel}
							menu="project"
							openMenu={openMenu}
							icon={<Sparkles className="composer__control-icon" />}
							onToggle={setOpenMenu}
							items={context.projectOptions.map((option) => ({
								key: option.projectId,
								label: option.label,
								onSelect: () => onSelectProject?.(option.projectId),
							}))}
						/>
					) : null}
					<ComposerControl
						label={context.thinkingLabel}
						menu="mode"
						openMenu={openMenu}
						icon={<Laptop className="composer__control-icon" />}
						onToggle={setOpenMenu}
						headerLabel="Work locally"
						items={context.thinkingOptions.map((option) => ({
							key: option.level,
							label: option.label,
							onSelect: () => onSelectThinkingLevel?.(option.level),
						}))}
					/>
					{context.branchLabel ? (
						<span className="composer__branch-label">
							<GitBranch className="composer__control-icon" />
							{context.branchLabel}
						</span>
					) : null}
					{queueStatusLabel ? <span className="composer__queue-status">{queueStatusLabel}</span> : null}
					{running ? (
						<span className="composer__helper-copy">Option+Enter queues a follow-up while Pi is running.</span>
					) : null}
					{state.statusLabel ? (
						<span id={statusId} className="composer__disabled-reason">
							{state.statusLabel}
						</span>
					) : null}
				</div>
			</form>
		</div>
	);
}

interface ComposerControlItem {
	key: string;
	label: string;
	onSelect: () => void;
}

interface ComposerControlProps {
	label: string;
	menu: Exclude<ComposerMenu, null>;
	openMenu: ComposerMenu;
	icon?: ReactNode;
	headerLabel?: string;
	items: ComposerControlItem[];
	onToggle: (menu: ComposerMenu) => void;
}

function ComposerControl({ label, menu, openMenu, icon, headerLabel, items, onToggle }: ComposerControlProps) {
	const menuId = useId();
	const open = openMenu === menu;

	return (
		<span className="composer__control-wrap">
			<button
				className="composer__control"
				type="button"
				aria-controls={menuId}
				aria-expanded={open}
				aria-haspopup="menu"
				onClick={() => onToggle(open ? null : menu)}
			>
				{icon}
				<span className="composer__control-label">{label}</span>
				<ChevronDown className="composer__control-icon" />
			</button>
			{open ? (
				<span className="composer__local-menu" id={menuId} role="menu">
					{headerLabel ? <span className="composer__local-menu-header">{headerLabel}</span> : null}
					{items.map((item) => (
						<button
							key={item.key}
							type="button"
							role="menuitem"
							className="composer__local-menu-item"
							onClick={() => {
								item.onSelect();
								onToggle(null);
							}}
						>
							{item.label}
						</button>
					))}
				</span>
			) : null}
		</span>
	);
}
