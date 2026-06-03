import {
	ArrowUp,
	ChevronDown,
	GitBranch,
	Laptop,
	LoaderCircle,
	Mic,
	MoreHorizontal,
	Paperclip,
	Sparkles,
	X,
} from "lucide-react";
import { ComposerModelSelector } from "./composer-model-selector";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Attachment } from "../attachments/attachment-types";
import { COMPOSER_ACCEPTED_FILE_TYPES } from "../attachments/attachment-types";
import { buildPromptFromAttachments } from "../attachments/convert-attachments";
import type { ComposerContext } from "../chat/chat-view-model";
import type { CommandPaletteDeps } from "../chat/build-command-palette-entries";
import { processFilesForComposer, removeAttachment } from "../chat/composer-attachments-state";
import { useComposerCommandPalette } from "../chat/use-composer-command-palette";
import { createComposerState } from "../chat/composer-state";
import { resolveComposerEnterAction } from "../chat/composer-enter-key";
import { useAutoResizeTextarea } from "../chat/use-auto-resize-textarea";
import {
	formatQueuedMessageDeliveryLabel,
	formatQueuedMessageSwitchLabel,
	formatQueueStatusLabel,
} from "../chat/composer-view-model";
import type {
	PiSessionDelivery,
	PiSessionImageContent,
	PiSessionQueuedMessage,
	PiSessionQueuedMessageId,
} from "../../shared/pi-session";
import { ComposerAttachmentTiles } from "./composer-attachment-tiles";
import { CommandPalettePopover } from "./command-palette-popover";

interface ComposerProps {
	context: ComposerContext;
	layout?: "center" | "bottom";
	running?: boolean;
	abortable?: boolean;
	queuedMessages?: PiSessionQueuedMessage[];
	pendingDelivery?: PiSessionDelivery;
	onSubmit?: (
		prompt: string,
		delivery?: PiSessionDelivery,
		images?: PiSessionImageContent[],
	) => Promise<boolean> | boolean;
	onAbort?: () => void;
	onSelectProject?: (projectId: string) => void;
	onSelectModel?: (provider: string, modelId: string) => void;
	onSelectThinkingLevel?: (level: string) => void;
	onToggleQueuedDelivery?: (messageId: PiSessionQueuedMessageId) => void;
	onRemoveQueuedMessage?: (messageId: PiSessionQueuedMessageId) => void;
	onEditQueuedMessage?: (message: PiSessionQueuedMessage) => void;
	draftText?: string;
	onDraftApplied?: () => void;
	focusKey?: string;
	commandPaletteDeps?: CommandPaletteDeps;
}

type ComposerMenu = "project" | "mode" | "model" | null;

const defaultInputHint = "Ask Pi anything. / opens commands. @ mentions are planned";
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
	focusKey,
	commandPaletteDeps: commandPaletteDepsFromHost,
}: ComposerProps) {
	const statusId = useId();
	const composerStackRef = useRef<HTMLDivElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const pendingTextareaSelectionRef = useRef<number | null>(null);
	const [text, setText] = useState("");
	const [selectionStart, setSelectionStart] = useState(0);
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const [processingFiles, setProcessingFiles] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [attachmentError, setAttachmentError] = useState("");
	const [paletteNotice, setPaletteNotice] = useState("");
	const { ref: textareaRef } = useAutoResizeTextarea(text);
	const [openMenu, setOpenMenu] = useState<ComposerMenu>(null);
	const [openQueueMenuId, setOpenQueueMenuId] = useState<string | null>(null);
	const state = createComposerState({
		text,
		attachmentCount: attachments.length,
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

	const focusTextarea = useCallback(() => {
		textareaRef.current?.focus({ preventScroll: true });
	}, [textareaRef]);
	const setTextareaSelection = useCallback((nextSelectionStart: number) => {
		pendingTextareaSelectionRef.current = nextSelectionStart;
	}, []);
	const configPaletteDeps = useMemo(
		() => ({
			onOpenModelPicker: () => {
				setPaletteNotice("");
				setOpenMenu("model");
			},
			onShowPaletteNotice: (message: string) => {
				setPaletteNotice(message);
			},
		}),
		[],
	);
	const commandPaletteDeps = useMemo(
		() => ({
			...commandPaletteDepsFromHost,
			config: configPaletteDeps,
		}),
		[commandPaletteDepsFromHost, configPaletteDeps],
	);
	const commandPalette = useComposerCommandPalette({
		text,
		selectionStart,
		setText,
		setSelectionStart,
		setTextareaSelection,
		focusTextarea,
		commandPaletteDeps,
		onShowPaletteNotice: setPaletteNotice,
	});

	useLayoutEffect(() => {
		const nextSelectionStart = pendingTextareaSelectionRef.current;
		if (nextSelectionStart === null) {
			return;
		}
		pendingTextareaSelectionRef.current = null;
		textareaRef.current?.setSelectionRange(nextSelectionStart, nextSelectionStart);
	});

	useEffect(() => {
		if (!focusKey) {
			return;
		}
		focusTextarea();
	}, [focusKey, focusTextarea]);

	useEffect(() => {
		if (!draftText) {
			return;
		}
		setText(draftText);
		setSelectionStart(draftText.length);
		onDraftApplied?.();
		focusTextarea();
	}, [draftText, onDraftApplied, focusTextarea]);

	useEffect(() => {
		const handlePointerDown = (event: MouseEvent) => {
			if (!composerStackRef.current?.contains(event.target as Node)) {
				setOpenMenu(null);
				setOpenQueueMenuId(null);
			}
		};
		document.addEventListener("pointerdown", handlePointerDown);
		return () => document.removeEventListener("pointerdown", handlePointerDown);
	}, []);

	const addFiles = async (files: File[]) => {
		if (files.length === 0 || processingFiles) {
			return;
		}
		setAttachmentError("");
		setProcessingFiles(true);
		try {
			const result = await processFilesForComposer(files, attachments);
			if (result.error) {
				setAttachmentError(result.error);
				return;
			}
			setAttachments(result.attachments);
		} catch (error) {
			setAttachmentError(error instanceof Error ? error.message : "Failed to process attachments.");
		} finally {
			setProcessingFiles(false);
		}
	};

	const submitPrompt = async (delivery?: PiSessionDelivery) => {
		if (state.sendDisabled || processingFiles) {
			return;
		}
		try {
			const { prompt, images } = await buildPromptFromAttachments(text, attachments);
			if (!prompt && !images?.length) {
				return;
			}
			const submitted = await onSubmit?.(prompt, delivery, images);
			if (submitted) {
				setText("");
				setSelectionStart(0);
				setAttachments([]);
				setAttachmentError("");
				setPaletteNotice("");
				focusTextarea();
			}
		} catch (error) {
			setAttachmentError(error instanceof Error ? error.message : "Failed to send message.");
		}
	};

	const showAbortOnly = running && abortable && !state.showSendWhileRunning;

	return (
		<div className="composer-stack" ref={composerStackRef}>
			{visibleQueuedMessages.length > 0 ? (
				<ul className="composer__queue" aria-label="Queued messages">
					{visibleQueuedMessages.map((message) => {
						const queueKey = `${message.id.queue}:${message.id.index}`;
						const deliveryLabel = formatQueuedMessageDeliveryLabel(message.delivery);
						const switchLabel = formatQueuedMessageSwitchLabel(message.delivery);
						return (
							<li key={queueKey} className="composer__queue-row">
								<span className="composer__queue-delivery">{deliveryLabel}</span>
								<span className="composer__queue-preview">{previewText(message.text)}</span>
								<button
									className="composer__queue-toggle"
									type="button"
									aria-label={switchLabel}
									onClick={() => onToggleQueuedDelivery?.(message.id)}
								>
									{switchLabel}
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
				onDragOver={(event) => {
					event.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={(event) => {
					event.preventDefault();
					const rect = event.currentTarget.getBoundingClientRect();
					const { clientX, clientY } = event;
					if (clientX <= rect.left || clientX >= rect.right || clientY <= rect.top || clientY >= rect.bottom) {
						setIsDragging(false);
					}
				}}
				onDrop={(event) => {
					event.preventDefault();
					setIsDragging(false);
					void addFiles(Array.from(event.dataTransfer?.files ?? []));
				}}
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
				<div
					className={["composer__input-panel", isDragging ? "composer__input-panel--dragging" : ""]
						.filter(Boolean)
						.join(" ")}
				>
					<CommandPalettePopover
						open={commandPalette.open}
						query={commandPalette.trigger.query}
						groups={commandPalette.groups}
						activeEntryId={commandPalette.activeEntryId}
						onActiveEntryIdChange={commandPalette.setActiveEntryId}
						onSelectEntry={commandPalette.selectEntry}
						onDismiss={commandPalette.dismiss}
					/>
					{isDragging ? <div className="composer__drop-overlay">Drop files here</div> : null}
					<ComposerAttachmentTiles
						attachments={attachments}
						onRemove={(id) => setAttachments((current) => removeAttachment(current, id))}
					/>
					<div className="composer__message-row">
						<textarea
							ref={textareaRef}
							className="composer__textarea"
							aria-label="Message Pi"
							value={text}
							onChange={(event) => {
								setPaletteNotice("");
								commandPalette.noteTextChanged(
									event.target.value,
									event.target.selectionStart ?? event.target.value.length,
								);
							}}
							onSelect={(event) => setSelectionStart(event.currentTarget.selectionStart ?? text.length)}
							onClick={(event) => setSelectionStart(event.currentTarget.selectionStart ?? text.length)}
							onPaste={(event) => {
								const items = event.clipboardData?.items;
								if (!items) {
									return;
								}
								const imageFiles: File[] = [];
								for (const item of items) {
									if (item.type.startsWith("image/")) {
										const file = item.getAsFile();
										if (file) {
											imageFiles.push(file);
										}
									}
								}
								if (imageFiles.length === 0) {
									return;
								}
								event.preventDefault();
								void addFiles(imageFiles);
							}}
							onKeyDown={(event) => {
								if (commandPalette.handleNavigationKey(event.key)) {
									event.preventDefault();
									return;
								}
								const action = resolveComposerEnterAction({
									key: event.key,
									shiftKey: event.shiftKey,
									altKey: event.altKey,
									running,
									showSendWhileRunning: state.showSendWhileRunning,
									sendDisabled: state.sendDisabled,
								});
								if (action === "none" || action === "newline") {
									return;
								}
								event.preventDefault();
								if (action === "followUp") {
									void submitPrompt("followUp");
									return;
								}
								if (state.showSendWhileRunning) {
									void submitPrompt(pendingDelivery === "followUp" ? "followUp" : "steer");
									return;
								}
								void submitPrompt("prompt");
							}}
							placeholder={placeholder}
							rows={1}
						/>
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept={COMPOSER_ACCEPTED_FILE_TYPES}
						multiple
						className="composer__file-input"
						onChange={(event) => {
							void addFiles(Array.from(event.target.files ?? []));
							event.target.value = "";
						}}
					/>
					<div className="composer__action-row">
						<button
							className="composer__icon-button"
							type="button"
							aria-label="Add attachments"
							disabled={processingFiles || !context.runtimeAvailable}
							onClick={() => fileInputRef.current?.click()}
						>
							{processingFiles ? (
								<LoaderCircle className="composer__icon composer__icon--spin" />
							) : (
								<Paperclip className="composer__icon" />
							)}
						</button>
						<span className="composer__action-spacer" />
						<ComposerModelSelector
							label={context.modelLabel}
							open={openMenu === "model"}
							modelOptions={context.modelOptions}
							selectedModelProvider={context.selectedModelProvider}
							selectedModelId={context.selectedModelId}
							onToggle={(nextOpen) => setOpenMenu(nextOpen ? "model" : null)}
							onSelectModel={onSelectModel}
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
					{attachmentError ? (
						<span className="composer__disabled-reason" role="alert">
							{attachmentError}
						</span>
					) : null}
					{paletteNotice ? (
						<span className="composer__disabled-reason" role="status">
							{paletteNotice}
						</span>
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
