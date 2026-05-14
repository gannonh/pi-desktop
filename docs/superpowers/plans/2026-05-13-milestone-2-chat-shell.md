# Milestone 2 Chat Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reviewable Milestone 2 chat shell, composer, static chat routes, and runtime-unavailable states before Pi runtime integration.

**Architecture:** Add a focused `src/renderer/chat/` boundary for chat route view models, composer state, and static transcript fixtures. Keep `ProjectMain` as the bridge from project availability to chat routes, and move visible chat UI into small renderer components. Keep runtime actions disconnected while preserving typed, renderer-local state for Milestone 3 prompt wiring.

**Tech Stack:** Electron, Vite, React 19, TypeScript, lucide-react, Vitest, Playwright Electron smoke tests, plain CSS in `src/renderer/styles.css`.

---

## File Structure

- Create `src/renderer/chat/chat-view-model.ts`: owns the chat shell route union and maps `ProjectStateView` into route props.
- Create `src/renderer/chat/static-transcripts.ts`: owns static transcript fixture content keyed by chat id.
- Create `src/renderer/chat/composer-state.ts`: owns pure send-disabled and runtime status logic for the composer.
- Create `src/renderer/components/chat-shell.tsx`: renders start routes and chat routes.
- Create `src/renderer/components/chat-start-state.tsx`: renders centered start title, composer, and prompt suggestions.
- Create `src/renderer/components/chat-transcript.tsx`: renders static metadata, messages, and file summary cards.
- Modify `src/renderer/components/composer.tsx`: replace the static stub with local textarea and selector state.
- Modify `src/renderer/components/project-main.tsx`: use `createChatShellRoute`, keep unavailable project recovery, and delegate valid chat routes to `ChatShell`.
- Modify `src/renderer/projects/project-view-model.ts`: keep sidebar view models only after chat route migration.
- Modify `src/renderer/styles.css`: add chat shell, transcript, and richer composer styles.
- Create `tests/renderer/chat-view-model.test.ts`: covers route selection and fixture routing.
- Create `tests/renderer/composer-state.test.ts`: covers composer send-disabled and status label logic.
- Modify `tests/renderer/project-view-model.test.ts`: remove main-surface assertions after the route model moves into `chat-view-model`.
- Modify `tests/smoke/app.spec.ts`: cover global start, project start, continued chat, empty chat, and composer alignment.

## Task 1: Chat Route View Model And Static Transcript Fixtures

**Files:**
- Create: `src/renderer/chat/chat-view-model.ts`
- Create: `src/renderer/chat/static-transcripts.ts`
- Create: `tests/renderer/chat-view-model.test.ts`

- [ ] **Step 1: Write the failing route tests**

Create `tests/renderer/chat-view-model.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { createChatShellRoute } from "../../src/renderer/chat/chat-view-model";
import type { ChatMetadata, ProjectStateView, ProjectWithChats } from "../../src/shared/project-state";

const emptyView: ProjectStateView = {
	projects: [],
	standaloneChats: [],
	selectedProjectId: null,
	selectedChatId: null,
	selectedProject: null,
	selectedChat: null,
};

const createProject = (overrides: Partial<ProjectWithChats> = {}): ProjectWithChats => ({
	id: "project:/Users/gannonhall/dev/pi-desktop",
	displayName: "pi-desktop",
	path: "/Users/gannonhall/dev/pi-desktop",
	createdAt: "2026-05-12T09:00:00.000Z",
	updatedAt: "2026-05-12T09:00:00.000Z",
	lastOpenedAt: "2026-05-12T09:00:00.000Z",
	pinned: false,
	availability: { status: "available" },
	chats: [],
	...overrides,
});

const createChat = (overrides: Partial<ChatMetadata> = {}): ChatMetadata => ({
	id: "chat:milestone-01",
	projectId: "project:/Users/gannonhall/dev/pi-desktop",
	title: "Execute milestone 01: project home sidebar refinements",
	status: "idle",
	updatedAt: "2026-05-12T10:00:00.000Z",
	...overrides,
});

describe("createChatShellRoute", () => {
	it("creates a global start route when no project is selected", () => {
		expect(createChatShellRoute(emptyView)).toEqual({
			kind: "global-start",
			title: "What should we work on?",
			composer: {
				projectSelectorLabel: "Work in a project",
				modeLabel: "Work locally",
				accessLabel: "Full access",
				modelLabel: "5.5 High",
				runtimeAvailable: false,
				disabledReason: "Pi runtime unavailable until Milestone 3.",
			},
			suggestions: [
				"Review my recent commits for correctness risks and maintainability concerns",
				"Unblock my most recent open PR",
				"Connect your favorite apps to Pi",
			],
		});
	});

	it("creates a project start route with selected project context", () => {
		const project = createProject();
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(createChatShellRoute(view)).toEqual({
			kind: "project-start",
			title: "What should we build in pi-desktop?",
			projectId: project.id,
			composer: {
				projectSelectorLabel: "pi-desktop",
				modeLabel: "Work locally",
				branchLabel: "main",
				accessLabel: "Full access",
				modelLabel: "5.5 High",
				runtimeAvailable: false,
				disabledReason: "Pi runtime unavailable until Milestone 3.",
			},
			suggestions: [
				"Review my recent commits for correctness risks and maintainability concerns",
				"Unblock my most recent open PR",
				"Connect your favorite apps to Pi",
			],
		});
	});

	it("creates an unavailable project route with the stored recovery copy", () => {
		const project = createProject({
			availability: { status: "unavailable", checkedAt: "2026-05-12T10:00:00.000Z", reason: "Permission denied" },
		});
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: null,
			selectedProject: project,
			selectedChat: null,
		};

		expect(createChatShellRoute(view)).toEqual({
			kind: "unavailable-project",
			title: "pi-desktop is unavailable",
			body: "Permission denied",
			projectId: project.id,
			projectSelectorLabel: "pi-desktop",
		});
	});

	it("creates a continued chat route when a static transcript fixture exists", () => {
		const chat = createChat();
		const project = createProject({ chats: [chat] });
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: chat.id,
			selectedProject: project,
			selectedChat: chat,
		};

		const route = createChatShellRoute(view);

		expect(route.kind).toBe("continued-chat");
		if (route.kind !== "continued-chat") {
			throw new Error("Expected a continued chat route");
		}
		expect(route.title).toBe("Execute milestone 01: project home sidebar refinements");
		expect(route.projectId).toBe(project.id);
		expect(route.chatId).toBe(chat.id);
		expect(route.composer.projectSelectorLabel).toBe("pi-desktop");
		expect(route.transcript.workedLabel).toBe("Worked for 7m 10s");
		expect(route.transcript.cards[0]).toEqual({
			title: "SKILL.md",
			subtitle: "Document · MD",
			actionLabel: "Open",
		});
	});

	it("creates an empty chat route when selected chat metadata has no fixture", () => {
		const chat = createChat({
			id: "chat:no-fixture",
			title: "Static metadata only",
		});
		const project = createProject({ chats: [chat] });
		const view: ProjectStateView = {
			projects: [project],
			standaloneChats: [],
			selectedProjectId: project.id,
			selectedChatId: chat.id,
			selectedProject: project,
			selectedChat: chat,
		};

		expect(createChatShellRoute(view)).toEqual({
			kind: "empty-chat",
			title: "Static metadata only",
			projectId: project.id,
			chatId: chat.id,
			composer: {
				projectSelectorLabel: "pi-desktop",
				modeLabel: "Work locally",
				branchLabel: "main",
				accessLabel: "Full access",
				modelLabel: "5.5 High",
				runtimeAvailable: false,
				disabledReason: "Pi runtime unavailable until Milestone 3.",
			},
		});
	});
});
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run:

```bash
pnpm test -- tests/renderer/chat-view-model.test.ts
```

Expected: FAIL because `src/renderer/chat/chat-view-model.ts` does not exist.

- [ ] **Step 3: Add static transcript fixtures**

Create `src/renderer/chat/static-transcripts.ts` with this content:

```ts
export interface StaticTranscriptCard {
	title: string;
	subtitle: string;
	actionLabel: string;
}

export interface StaticTranscript {
	workedLabel: string;
	assistantSummary: string[];
	cards: StaticTranscriptCard[];
	userFollowUp: string;
	followUpWorkedLabel: string;
	followUpSummary: string[];
}

const transcripts: Record<string, StaticTranscript> = {
	"chat:milestone-01": {
		workedLabel: "Worked for 7m 10s",
		assistantSummary: [
			"Resolved the new open review threads.",
			"Pushed f1eef6ac: fix(projects): address follow-up review comments",
			"Verification: pnpm check passed locally and in the pre-push hook.",
		],
		cards: [
			{
				title: "SKILL.md",
				subtitle: "Document · MD",
				actionLabel: "Open",
			},
			{
				title: "11 files changed",
				subtitle: "+357 -163",
				actionLabel: "Review",
			},
		],
		userFollowUp: "land the pr",
		followUpWorkedLabel: "Worked for 55s",
		followUpSummary: [
			"Landed PR #2.",
			"Merged: feat: add Milestone 1 sidebar shell",
			"Checks: check and CodeRabbit passed",
		],
	},
};

export const getStaticTranscript = (chatId: string): StaticTranscript | undefined => transcripts[chatId];
```

- [ ] **Step 4: Add the chat route view model**

Create `src/renderer/chat/chat-view-model.ts` with this content:

```ts
import type { ProjectStateView } from "../../shared/project-state";
import { getStaticTranscript, type StaticTranscript } from "./static-transcripts";

export interface ComposerContext {
	projectSelectorLabel: string;
	modeLabel: "Work locally";
	branchLabel?: string;
	accessLabel: "Full access";
	modelLabel: "5.5 High";
	runtimeAvailable: boolean;
	disabledReason: string;
}

export type ChatSuggestion =
	| "Review my recent commits for correctness risks and maintainability concerns"
	| "Unblock my most recent open PR"
	| "Connect your favorite apps to Pi";

export type ChatShellRoute =
	| {
			kind: "global-start";
			title: "What should we work on?";
			composer: ComposerContext;
			suggestions: ChatSuggestion[];
	  }
	| {
			kind: "project-start";
			title: string;
			projectId: string;
			composer: ComposerContext;
			suggestions: ChatSuggestion[];
	  }
	| {
			kind: "empty-chat";
			title: string;
			projectId: string;
			chatId: string;
			composer: ComposerContext;
	  }
	| {
			kind: "continued-chat";
			title: string;
			projectId: string;
			chatId: string;
			composer: ComposerContext;
			transcript: StaticTranscript;
	  }
	| {
			kind: "unavailable-project";
			title: string;
			body: string;
			projectId: string;
			projectSelectorLabel: string;
	  };

const runtimeUnavailableReason = "Pi runtime unavailable until Milestone 3.";

const suggestions: ChatSuggestion[] = [
	"Review my recent commits for correctness risks and maintainability concerns",
	"Unblock my most recent open PR",
	"Connect your favorite apps to Pi",
];

const createComposerContext = (projectSelectorLabel: string, projectSelected: boolean): ComposerContext => ({
	projectSelectorLabel,
	modeLabel: "Work locally",
	...(projectSelected ? { branchLabel: "main" } : {}),
	accessLabel: "Full access",
	modelLabel: "5.5 High",
	runtimeAvailable: false,
	disabledReason: runtimeUnavailableReason,
});

export const createChatShellRoute = (view: ProjectStateView): ChatShellRoute => {
	const selectedProject = view.selectedProject;

	if (!selectedProject) {
		return {
			kind: "global-start",
			title: "What should we work on?",
			composer: createComposerContext("Work in a project", false),
			suggestions,
		};
	}

	const projectSelectorLabel = selectedProject.displayName;

	if (selectedProject.availability.status !== "available") {
		return {
			kind: "unavailable-project",
			title: `${selectedProject.displayName} is unavailable`,
			body:
				selectedProject.availability.status === "unavailable"
					? selectedProject.availability.reason
					: "Locate the project folder or remove it from the sidebar.",
			projectId: selectedProject.id,
			projectSelectorLabel,
		};
	}

	const composer = createComposerContext(projectSelectorLabel, true);
	const selectedChat = view.selectedChat;

	if (!selectedChat) {
		return {
			kind: "project-start",
			title: `What should we build in ${selectedProject.displayName}?`,
			projectId: selectedProject.id,
			composer,
			suggestions,
		};
	}

	const transcript = getStaticTranscript(selectedChat.id);

	if (!transcript) {
		return {
			kind: "empty-chat",
			title: selectedChat.title,
			projectId: selectedProject.id,
			chatId: selectedChat.id,
			composer,
		};
	}

	return {
		kind: "continued-chat",
		title: selectedChat.title,
		projectId: selectedProject.id,
		chatId: selectedChat.id,
		composer,
		transcript,
	};
};
```

- [ ] **Step 5: Run the route tests to verify they pass**

Run:

```bash
pnpm test -- tests/renderer/chat-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the route model**

Run:

```bash
git add src/renderer/chat/chat-view-model.ts src/renderer/chat/static-transcripts.ts tests/renderer/chat-view-model.test.ts
git commit -m "feat(chat): add chat shell route model"
```

Expected: commit succeeds.

## Task 2: Composer State Helper

**Files:**
- Create: `src/renderer/chat/composer-state.ts`
- Create: `tests/renderer/composer-state.test.ts`

- [ ] **Step 1: Write the failing composer state tests**

Create `tests/renderer/composer-state.test.ts` with this content:

```ts
import { describe, expect, it } from "vitest";
import { createComposerState } from "../../src/renderer/chat/composer-state";

describe("createComposerState", () => {
	it("disables send when text is empty so empty prompts cannot be submitted", () => {
		expect(createComposerState({ text: "", runtimeAvailable: true })).toEqual({
			sendDisabled: true,
			statusLabel: "",
		});
	});

	it("enables send when text exists and runtime is available", () => {
		expect(createComposerState({ text: "Review this project", runtimeAvailable: true })).toEqual({
			sendDisabled: false,
			statusLabel: "",
		});
	});

	it("disables send and exposes the runtime status when runtime is unavailable", () => {
		expect(
			createComposerState({
				text: "Review this project",
				runtimeAvailable: false,
				disabledReason: "Pi runtime unavailable until Milestone 3.",
			}),
		).toEqual({
			sendDisabled: true,
			statusLabel: "Pi runtime unavailable until Milestone 3.",
		});
	});

	it("trims whitespace before deciding whether send is available", () => {
		expect(createComposerState({ text: "   ", runtimeAvailable: true })).toEqual({
			sendDisabled: true,
			statusLabel: "",
		});
	});
});
```

- [ ] **Step 2: Run the composer state tests to verify they fail**

Run:

```bash
pnpm test -- tests/renderer/composer-state.test.ts
```

Expected: FAIL because `src/renderer/chat/composer-state.ts` does not exist.

- [ ] **Step 3: Add the composer state helper**

Create `src/renderer/chat/composer-state.ts` with this content:

```ts
export interface ComposerStateInput {
	text: string;
	runtimeAvailable: boolean;
	disabledReason?: string;
}

export interface ComposerState {
	sendDisabled: boolean;
	statusLabel: string;
}

export const createComposerState = ({
	text,
	runtimeAvailable,
	disabledReason = "",
}: ComposerStateInput): ComposerState => {
	const hasText = text.trim().length > 0;

	return {
		sendDisabled: !hasText || !runtimeAvailable,
		statusLabel: runtimeAvailable ? "" : disabledReason,
	};
};
```

- [ ] **Step 4: Run the composer state tests to verify they pass**

Run:

```bash
pnpm test -- tests/renderer/composer-state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the composer state helper**

Run:

```bash
git add src/renderer/chat/composer-state.ts tests/renderer/composer-state.test.ts
git commit -m "feat(chat): add composer state helper"
```

Expected: commit succeeds.

## Task 3: Local-State Composer Component

**Files:**
- Modify: `src/renderer/components/composer.tsx`
- Test: `tests/renderer/composer-state.test.ts`

- [ ] **Step 1: Replace the composer component with local UI state**

Replace `src/renderer/components/composer.tsx` with this content:

```tsx
import {
	ArrowUp,
	ChevronDown,
	GitBranch,
	Laptop,
	Mic,
	Paperclip,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { ComposerContext } from "../chat/chat-view-model";
import { createComposerState } from "../chat/composer-state";

interface ComposerProps {
	context: ComposerContext;
	layout?: "center" | "bottom";
}

type ComposerMenu = "project" | "mode" | "access" | "model" | null;

const inputHint = "Ask Pi anything. @ to use skills or mention files";

export function Composer({ context, layout = "center" }: ComposerProps) {
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
			onSubmit={(event) => event.preventDefault()}
		>
			<div className="composer__input-row">
				<button className="composer__icon-button" type="button" aria-label="Add context" disabled>
					<Paperclip className="composer__icon" />
				</button>
				<textarea
					className="composer__textarea"
					aria-label="Message Pi"
					value={text}
					onChange={(event) => setText(event.target.value)}
					placeholder={inputHint}
					rows={1}
				/>
				<button className="composer__icon-button" type="button" aria-label="Voice input" disabled>
					<Mic className="composer__icon" />
				</button>
				<button className="composer__send-button" type="submit" disabled={state.sendDisabled} aria-label="Send message">
					<ArrowUp className="composer__icon" />
				</button>
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
				<span className="composer__control-spacer" />
				<ComposerControl
					label={context.accessLabel}
					menu="access"
					openMenu={openMenu}
					icon={<ShieldCheck className="composer__control-icon" />}
					onToggle={toggleMenu}
				/>
				<ComposerControl label={context.modelLabel} menu="model" openMenu={openMenu} onToggle={toggleMenu} />
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
			<button
				className="composer__control"
				type="button"
				aria-expanded={open}
				onClick={() => onToggle(menu)}
			>
				{icon}
				<span className="composer__control-label">{label}</span>
				<ChevronDown className="composer__control-icon" />
			</button>
			{open ? (
				<span className="composer__local-menu" role="menu">
					<span className="composer__local-menu-item" role="menuitem">
						{label}
					</span>
				</span>
			) : null}
		</span>
	);
}
```

- [ ] **Step 2: Run focused verification for composer code**

Run:

```bash
pnpm test -- tests/renderer/composer-state.test.ts && pnpm typecheck
```

Expected: both commands exit 0.

- [ ] **Step 3: Commit the composer component**

Run:

```bash
git add src/renderer/components/composer.tsx
git commit -m "feat(chat): add local composer controls"
```

Expected: commit succeeds.

## Task 4: Chat Shell Components And ProjectMain Integration

**Files:**
- Create: `src/renderer/components/chat-shell.tsx`
- Create: `src/renderer/components/chat-start-state.tsx`
- Create: `src/renderer/components/chat-transcript.tsx`
- Modify: `src/renderer/components/project-main.tsx`
- Test: `tests/renderer/chat-view-model.test.ts`

- [ ] **Step 1: Add the centered start state component**

Create `src/renderer/components/chat-start-state.tsx` with this content:

```tsx
import { GitPullRequest, Github, Workflow } from "lucide-react";
import type { ChatShellRoute } from "../chat/chat-view-model";
import { Composer } from "./composer";

type StartRoute = Extract<ChatShellRoute, { kind: "global-start" | "project-start" }>;

const suggestionIcons = [GitPullRequest, Github, Workflow] as const;

export function ChatStartState({ route }: { route: StartRoute }) {
	return (
		<section className="chat-shell chat-shell--start" aria-labelledby="chat-shell-title">
			<h1 id="chat-shell-title" className="chat-shell__title">
				{route.title}
			</h1>
			<Composer context={route.composer} layout="center" />
			<div className="chat-shell__suggestions" aria-label="Suggested prompts">
				{route.suggestions.map((suggestion, index) => {
					const Icon = suggestionIcons[index] ?? Workflow;
					return (
						<button className="chat-shell__suggestion" type="button" key={suggestion} disabled>
							<Icon className="chat-shell__suggestion-icon" />
							<span>{suggestion}</span>
						</button>
					);
				})}
			</div>
		</section>
	);
}
```

- [ ] **Step 2: Add the static transcript component**

Create `src/renderer/components/chat-transcript.tsx` with this content:

```tsx
import { Box, ChevronDown, ExternalLink } from "lucide-react";
import type { StaticTranscript } from "../chat/static-transcripts";

interface ChatTranscriptProps {
	title: string;
	transcript: StaticTranscript;
}

export function ChatTranscript({ title, transcript }: ChatTranscriptProps) {
	return (
		<div className="chat-transcript" aria-label={`${title} transcript`}>
			<div className="chat-transcript__entry">
				<button className="chat-transcript__worked" type="button" disabled>
					{transcript.workedLabel}
					<ChevronDown className="chat-transcript__icon" />
				</button>
				<div className="chat-transcript__assistant">
					{transcript.assistantSummary.map((line) => (
						<p key={line}>{line}</p>
					))}
				</div>
				<div className="chat-transcript__cards">
					{transcript.cards.map((card) => (
						<div className="chat-transcript__card" key={card.title}>
							<div className="chat-transcript__card-icon">
								<Box className="chat-transcript__icon" />
							</div>
							<div className="chat-transcript__card-copy">
								<div className="chat-transcript__card-title">{card.title}</div>
								<div className="chat-transcript__card-subtitle">{card.subtitle}</div>
							</div>
							<button className="chat-transcript__card-action" type="button" disabled>
								{card.actionLabel}
								<ExternalLink className="chat-transcript__icon" />
							</button>
						</div>
					))}
				</div>
			</div>
			<div className="chat-transcript__user-bubble">{transcript.userFollowUp}</div>
			<div className="chat-transcript__entry">
				<button className="chat-transcript__worked" type="button" disabled>
					{transcript.followUpWorkedLabel}
					<ChevronDown className="chat-transcript__icon" />
				</button>
				<div className="chat-transcript__assistant">
					{transcript.followUpSummary.map((line) => (
						<p key={line}>{line}</p>
					))}
				</div>
			</div>
		</div>
	);
}
```

- [ ] **Step 3: Add the chat shell component**

Create `src/renderer/components/chat-shell.tsx` with this content:

```tsx
import type { ChatShellRoute } from "../chat/chat-view-model";
import { ChatStartState } from "./chat-start-state";
import { ChatTranscript } from "./chat-transcript";
import { Composer } from "./composer";

interface ChatShellProps {
	route: Exclude<ChatShellRoute, { kind: "unavailable-project" }>;
}

export function ChatShell({ route }: ChatShellProps) {
	if (route.kind === "global-start" || route.kind === "project-start") {
		return <ChatStartState route={route} />;
	}

	return (
		<section className="chat-shell chat-shell--session" aria-labelledby="chat-shell-title">
			<header className="chat-shell__metadata">
				<h1 id="chat-shell-title" className="chat-shell__session-title">
					{route.title}
				</h1>
			</header>
			<div className="chat-shell__scroll">
				{route.kind === "continued-chat" ? (
					<ChatTranscript title={route.title} transcript={route.transcript} />
				) : (
					<div className="chat-shell__empty-chat" aria-label="Empty chat">
						No messages yet.
					</div>
				)}
			</div>
			<div className="chat-shell__bottom-composer">
				<Composer context={route.composer} layout="bottom" />
			</div>
		</section>
	);
}
```

- [ ] **Step 4: Integrate the chat shell in ProjectMain**

Replace `src/renderer/components/project-main.tsx` with this content:

```tsx
import { createChatShellRoute } from "../chat/chat-view-model";
import type { ProjectStateViewResult } from "@/shared/ipc";
import type { ProjectStateView } from "@/shared/project-state";
import { ChatShell } from "./chat-shell";

interface ProjectMainProps {
	state: ProjectStateView;
	statusMessage?: string;
	onProjectState: (result: ProjectStateViewResult) => void;
}

const toProjectStateError = (error: unknown): ProjectStateViewResult => ({
	ok: false,
	error: {
		code: "renderer:project-action-failed",
		message: error instanceof Error ? error.message : "Project action failed.",
	},
});

export function ProjectMain({ state, statusMessage, onProjectState }: ProjectMainProps) {
	const route = createChatShellRoute(state);

	const runProjectAction = async (action: () => Promise<ProjectStateViewResult>) => {
		try {
			onProjectState(await action());
		} catch (error) {
			onProjectState(toProjectStateError(error));
		}
	};

	const locateFolder = () => {
		if (route.kind !== "unavailable-project") {
			return Promise.resolve();
		}

		return runProjectAction(() =>
			window.piDesktop.project.locateFolder({
				projectId: route.projectId,
			}),
		);
	};

	const removeProject = () => {
		if (route.kind !== "unavailable-project") {
			return;
		}

		if (!window.confirm(`Remove ${route.projectSelectorLabel} from pi-desktop?`)) {
			return;
		}

		void runProjectAction(() =>
			window.piDesktop.project.remove({
				projectId: route.projectId,
			}),
		);
	};

	return (
		<main className="project-main">
			{statusMessage ? <div className="project-main__status-message">{statusMessage}</div> : null}

			{route.kind === "unavailable-project" ? (
				<section className="project-main__recovery" aria-labelledby="project-main-title">
					<div className="project-main__recovery-copy">
						<h1 id="project-main-title" className="project-main__title">
							{route.title}
						</h1>
						<p className="project-main__body">{route.body}</p>
					</div>
					<div className="project-main__recovery-actions">
						<button className="project-main__button" type="button" onClick={() => void locateFolder()}>
							Locate folder
						</button>
						<button
							className="project-main__button project-main__button--danger"
							type="button"
							onClick={removeProject}
						>
							Remove
						</button>
					</div>
				</section>
			) : (
				<ChatShell route={route} />
			)}
		</main>
	);
}
```

- [ ] **Step 5: Run focused verification**

Run:

```bash
pnpm test -- tests/renderer/chat-view-model.test.ts && pnpm typecheck
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit the chat shell components**

Run:

```bash
git add src/renderer/components/chat-shell.tsx src/renderer/components/chat-start-state.tsx src/renderer/components/chat-transcript.tsx src/renderer/components/project-main.tsx
git commit -m "feat(chat): render chat shell routes"
```

Expected: commit succeeds.

## Task 5: Project View Model Cleanup

**Files:**
- Modify: `src/renderer/projects/project-view-model.ts`
- Modify: `tests/renderer/project-view-model.test.ts`
- Test: `tests/renderer/project-view-model.test.ts`
- Test: `tests/renderer/chat-view-model.test.ts`

- [ ] **Step 1: Remove main-route assertions from the project view model tests**

Edit `tests/renderer/project-view-model.test.ts`:

```ts
import {
	createProjectSidebarRows,
	createStandaloneChatSidebarRows,
} from "../../src/renderer/projects/project-view-model";
```

Remove the tests named:

```ts
"creates global empty main copy so first launch asks for a project"
"creates project empty main copy so an empty selected project can start work"
"creates missing project copy so recovery actions have project context"
"creates unavailable project copy that surfaces the availability reason"
"creates selected chat copy and marks the active chat row"
```

Replace the selected-chat test with this sidebar-only test:

```ts
it("marks the active project chat row when a chat is selected", () => {
	const chat = createChat();
	const project = createProject({ chats: [chat] });
	const view: ProjectStateView = {
		projects: [project],
		standaloneChats: [],
		selectedProjectId: project.id,
		selectedChatId: chat.id,
		selectedProject: project,
		selectedChat: chat,
	};

	expect(createProjectSidebarRows(view, fixedNow)[0]?.children).toEqual([
		{
			kind: "chat",
			chatId: chat.id,
			label: "Project home",
			selected: true,
			status: "idle",
			updatedLabel: "2h",
			needsAttention: false,
		},
	]);
});
```

- [ ] **Step 2: Remove main-copy exports from the project view model**

In `src/renderer/projects/project-view-model.ts`, remove the `ProjectMainCopy` type and the `createProjectMainCopy` function. Keep these exports:

```ts
export type SidebarChatRow =
	| {
			kind: "chat";
			chatId: string;
			label: string;
			selected: boolean;
			status: ChatMetadata["status"];
			updatedLabel: string;
			needsAttention: boolean;
	  }
	| {
			kind: "empty";
			label: "No chats";
	  }
	| {
			kind: "show-more";
			label: "Show more";
			hiddenCount: number;
	  };
```

Leave `createProjectSidebarRows` and `createStandaloneChatSidebarRows` unchanged.

- [ ] **Step 3: Run route and sidebar model tests**

Run:

```bash
pnpm test -- tests/renderer/project-view-model.test.ts tests/renderer/chat-view-model.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit the view model cleanup**

Run:

```bash
git add src/renderer/projects/project-view-model.ts tests/renderer/project-view-model.test.ts
git commit -m "refactor(chat): move main route copy to chat view model"
```

Expected: commit succeeds.

## Task 6: Chat Shell And Composer Styling

**Files:**
- Modify: `src/renderer/styles.css`

- [ ] **Step 1: Replace the old main chat layout CSS**

In `src/renderer/styles.css`, replace the block from `.project-main__empty,` through `.project-main__body` with this content:

```css
.project-main__recovery {
	display: flex;
	min-height: 0;
	flex: 1;
	flex-direction: column;
	justify-content: center;
	gap: var(--app-gap);
	width: min(100%, var(--project-main-detail-width));
	margin: 0 auto;
	padding: var(--project-main-empty-padding);
}

.project-main__recovery-copy {
	display: grid;
	gap: 0.5rem;
}

.project-main__title {
	margin: 0;
	overflow-wrap: anywhere;
	text-align: left;
	font-size: var(--type-detail-title);
	font-weight: 600;
	line-height: 1.15;
}

.project-main__body {
	margin: 0;
	max-width: var(--project-main-body-width);
	overflow-wrap: anywhere;
	color: var(--color-muted-foreground);
	font-size: var(--type-composer);
	line-height: 1.5;
}
```

- [ ] **Step 2: Replace the old composer CSS**

In `src/renderer/styles.css`, replace the `.composer` block through `.composer__disabled-reason` with this content:

```css
.chat-shell {
	display: flex;
	min-height: 0;
	flex: 1;
	flex-direction: column;
}

.chat-shell--start {
	align-items: center;
	justify-content: center;
	gap: 2rem;
	padding: clamp(1rem, 5vh, 4rem) 1rem 2rem;
}

.chat-shell__title {
	margin: 0;
	max-width: min(100%, 48rem);
	overflow-wrap: anywhere;
	text-align: center;
	font-size: var(--type-empty-title);
	font-weight: 500;
	line-height: 1.15;
}

.chat-shell__suggestions {
	display: grid;
	width: min(100%, var(--composer-width));
}

.chat-shell__suggestion {
	display: flex;
	min-height: 2.5rem;
	align-items: center;
	gap: 0.625rem;
	border: 0;
	border-top: 1px solid var(--color-border);
	background: transparent;
	padding: 0.625rem 1rem;
	color: var(--color-muted-foreground);
	text-align: left;
	font-size: var(--type-body);
}

.chat-shell__suggestion:disabled {
	cursor: default;
	opacity: 1;
}

.chat-shell__suggestion-icon {
	width: 0.875rem;
	height: 0.875rem;
	flex: 0 0 auto;
}

.chat-shell--session {
	gap: 0;
	padding: 0;
}

.chat-shell__metadata {
	display: flex;
	min-height: 2.75rem;
	align-items: center;
	border-bottom: 1px solid var(--color-border);
	padding: 0 1.25rem;
}

.chat-shell__session-title {
	margin: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--type-body);
	font-weight: 500;
}

.chat-shell__scroll {
	display: flex;
	min-height: 0;
	flex: 1;
	justify-content: center;
	overflow: auto;
	padding: 1.5rem 1rem;
}

.chat-shell__empty-chat {
	align-self: center;
	color: var(--color-muted-foreground);
	font-size: var(--type-body);
}

.chat-shell__bottom-composer {
	display: flex;
	justify-content: center;
	padding: 0 1rem 1.5rem;
}

.chat-transcript {
	display: grid;
	width: min(100%, 46rem);
	align-content: start;
	gap: 1.5rem;
}

.chat-transcript__entry {
	display: grid;
	gap: 0.625rem;
}

.chat-transcript__worked {
	display: inline-flex;
	width: fit-content;
	align-items: center;
	gap: 0.25rem;
	border: 0;
	background: transparent;
	padding: 0;
	color: var(--color-muted-foreground);
	font-size: var(--type-body);
}

.chat-transcript__worked:disabled,
.chat-transcript__card-action:disabled {
	cursor: default;
	opacity: 1;
}

.chat-transcript__assistant {
	display: grid;
	gap: 0.375rem;
	border-top: 1px solid var(--color-border);
	padding-top: 1rem;
	font-size: var(--type-composer);
	line-height: 1.45;
}

.chat-transcript__assistant p {
	margin: 0;
	overflow-wrap: anywhere;
}

.chat-transcript__cards {
	display: grid;
	gap: 0.75rem;
}

.chat-transcript__card {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto;
	align-items: center;
	gap: 0.75rem;
	min-height: 4.5rem;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-panel);
	background: color-mix(in oklch, var(--color-card) 86%, transparent);
	padding: 0.75rem;
}

.chat-transcript__card-icon {
	display: inline-flex;
	width: 2.5rem;
	height: 2.5rem;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius-panel);
	background: var(--color-background);
	color: var(--color-muted-foreground);
}

.chat-transcript__card-copy {
	min-width: 0;
}

.chat-transcript__card-title,
.chat-transcript__card-subtitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chat-transcript__card-title {
	font-size: var(--type-composer);
}

.chat-transcript__card-subtitle {
	color: var(--color-muted-foreground);
	font-size: var(--type-body);
}

.chat-transcript__card-action {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-control);
	background: transparent;
	padding: 0.375rem 0.625rem;
	color: var(--color-foreground);
	font-size: var(--type-body);
}

.chat-transcript__user-bubble {
	justify-self: end;
	max-width: min(24rem, 80%);
	overflow-wrap: anywhere;
	border-radius: 1rem;
	background: var(--color-secondary);
	padding: 0.625rem 0.875rem;
	font-size: var(--type-body);
}

.chat-transcript__icon {
	width: 0.875rem;
	height: 0.875rem;
	flex: 0 0 auto;
}

.composer {
	position: relative;
	display: grid;
	width: min(100%, var(--composer-width));
	gap: var(--composer-gap);
	border: 1px solid transparent;
	border-radius: 1.5rem;
	background: #2b2b2b;
	padding: var(--composer-padding);
	box-shadow: 0 1rem 3rem rgb(0 0 0 / 20%);
}

.composer__input-row {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto auto;
	align-items: end;
	gap: 0.5rem;
	min-height: 3rem;
}

.composer__textarea {
	min-width: 0;
	max-height: 8rem;
	resize: none;
	border: 0;
	background: transparent;
	color: var(--color-foreground);
	font: inherit;
	font-size: var(--type-composer);
	line-height: 1.4;
	outline: none;
}

.composer__textarea::placeholder {
	color: color-mix(in oklch, var(--color-muted-foreground) 78%, transparent);
}

.composer__icon-button,
.composer__send-button {
	display: inline-flex;
	width: var(--composer-control-size);
	height: var(--composer-control-size);
	flex: 0 0 auto;
	align-items: center;
	justify-content: center;
	border: 1px solid transparent;
	border-radius: 999px;
	background: transparent;
	color: var(--color-muted-foreground);
}

.composer__send-button {
	background: var(--color-primary);
	color: var(--color-primary-foreground);
}

.composer__icon-button:disabled,
.composer__send-button:disabled {
	cursor: default;
	opacity: 0.55;
}

.composer__icon {
	width: 1rem;
	height: 1rem;
}

.composer__control-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem;
	min-width: 0;
}

.composer__control-wrap {
	position: relative;
	display: inline-flex;
}

.composer__control,
.composer__branch-label {
	display: inline-flex;
	max-width: 14rem;
	align-items: center;
	gap: 0.375rem;
	overflow: hidden;
	border: 0;
	border-radius: var(--radius-control);
	background: transparent;
	padding: 0.25rem 0.375rem;
	color: var(--color-muted-foreground);
	font-size: var(--type-label);
}

.composer__control:hover,
.composer__control[aria-expanded="true"] {
	background: var(--color-accent);
	color: var(--color-accent-foreground);
}

.composer__control-label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.composer__control-icon {
	width: 0.875rem;
	height: 0.875rem;
	flex: 0 0 auto;
}

.composer__control-spacer {
	flex: 1 1 auto;
	min-width: 0.5rem;
}

.composer__disabled-reason {
	flex-basis: 100%;
	overflow-wrap: anywhere;
	color: var(--color-muted-foreground);
	font-size: var(--type-caption);
}

.composer__local-menu {
	position: absolute;
	bottom: calc(100% + 0.375rem);
	left: 0;
	z-index: 5;
	min-width: 10rem;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-panel);
	background: var(--menu-popover-background);
	padding: 0.25rem;
	color: var(--menu-popover-color);
	box-shadow: 0 1rem 2rem rgb(0 0 0 / 28%);
}

.composer__local-menu-item {
	display: block;
	border-radius: var(--radius-control);
	padding: 0.375rem 0.5rem;
	font-size: var(--type-label);
}
```

- [ ] **Step 3: Add responsive CSS**

Append this content near the end of `src/renderer/styles.css`:

```css
@media (max-width: 720px) {
	.project-main {
		padding: 0.75rem;
	}

	.chat-shell--start {
		gap: 1.25rem;
		padding-inline: 0;
	}

	.chat-shell__scroll {
		padding-inline: 0;
	}

	.chat-shell__bottom-composer {
		padding-inline: 0;
		padding-bottom: 0.75rem;
	}

	.chat-transcript__card {
		grid-template-columns: auto minmax(0, 1fr);
	}

	.chat-transcript__card-action {
		grid-column: 1 / -1;
		justify-self: start;
	}

	.composer {
		border-radius: 1.25rem;
	}

	.composer__input-row {
		grid-template-columns: auto minmax(0, 1fr) auto;
	}

	.composer__input-row .composer__icon-button[aria-label="Voice input"] {
		display: none;
	}
}
```

- [ ] **Step 4: Run CSS-adjacent verification**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit the chat shell styles**

Run:

```bash
git add src/renderer/styles.css
git commit -m "feat(chat): style chat shell and composer"
```

Expected: commit succeeds.

## Task 7: Smoke Coverage For Start And Chat Routes

**Files:**
- Modify: `tests/smoke/app.spec.ts`

- [ ] **Step 1: Add smoke test helpers**

In `tests/smoke/app.spec.ts`, add this helper after `expectHeadingTargetToReachFirstAction`:

```ts
const expectComposerNearBottom = async (window: Page) => {
	const composerBox = await window.getByLabel("Pi composer").boundingBox();
	const viewportHeight = await window.evaluate(() => window.innerHeight);

	expect(composerBox).not.toBeNull();
	expect((composerBox?.y ?? 0) + (composerBox?.height ?? 0)).toBeGreaterThan(viewportHeight - 160);
};
```

- [ ] **Step 2: Update the boot smoke test for the Milestone 2 start composer**

In `tests/smoke/app.spec.ts`, rename the first test to:

```ts
test("renders the Milestone 2 global chat start state", async () => {
```

Inside that test, keep the existing sidebar assertions and add these assertions after the heading assertion:

```ts
await expect(window.getByLabel("Pi composer")).toBeVisible();
await expect(window.getByLabel("Message Pi")).toHaveAttribute(
	"placeholder",
	"Ask Pi anything. @ to use skills or mention files",
);
await expect(window.getByText("Work in a project")).toBeVisible();
await expect(window.getByText("Full access")).toBeVisible();
await expect(window.getByText("5.5 High")).toBeVisible();
await expect(window.getByText("Pi runtime unavailable until Milestone 3.")).toBeVisible();
```

- [ ] **Step 3: Add a selected project start-state smoke test**

Add this test to `tests/smoke/app.spec.ts`:

```ts
test("renders the selected project chat start state", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-existing-project-"));
	const projectId = createProjectId(projectPath);
	const now = "2026-05-12T12:00:00.000Z";
	const store: ProjectStore = {
		projects: [
			{
				id: projectId,
				displayName: "pi-desktop",
				path: projectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: now,
				pinned: false,
				availability: { status: "available", checkedAt: now },
			},
		],
		selectedProjectId: projectId,
		selectedChatId: null,
		chatsByProject: {
			[projectId]: [],
		},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await electron.launch({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		},
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByRole("heading", { name: "What should we build in pi-desktop?" })).toBeVisible();
		await expect(window.getByText("pi-desktop", { exact: true })).toBeVisible();
		await expect(window.getByText("main", { exact: true })).toBeVisible();
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});
```

- [ ] **Step 4: Add a continued chat route smoke test**

Add this test to `tests/smoke/app.spec.ts`:

```ts
test("renders a static continued chat route with the composer anchored to the bottom", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-existing-project-"));
	const projectId = createProjectId(projectPath);
	const now = "2026-05-12T12:00:00.000Z";
	const store: ProjectStore = {
		projects: [
			{
				id: projectId,
				displayName: "pi-desktop",
				path: projectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: now,
				pinned: false,
				availability: { status: "available", checkedAt: now },
			},
		],
		selectedProjectId: projectId,
		selectedChatId: "chat:milestone-01",
		chatsByProject: {
			[projectId]: [
				{
					id: "chat:milestone-01",
					projectId,
					title: "Execute milestone 01: project home sidebar refinements",
					status: "idle",
					updatedAt: now,
				},
			],
		},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await electron.launch({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		},
	});

	try {
		const window = await app.firstWindow();

		await expect(
			window.getByRole("heading", { name: "Execute milestone 01: project home sidebar refinements" }),
		).toBeVisible();
		await expect(window.getByText("Worked for 7m 10s")).toBeVisible();
		await expect(window.getByText("Resolved the new open review threads.")).toBeVisible();
		await expect(window.getByText("land the pr")).toBeVisible();
		await expectComposerNearBottom(window);
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});
```

- [ ] **Step 5: Add an empty chat route smoke test**

Add this test to `tests/smoke/app.spec.ts`:

```ts
test("renders an empty chat route with static metadata and bottom composer", async () => {
	const userDataDir = await mkdtemp(path.join(os.tmpdir(), "pi-desktop-smoke-"));
	const projectPath = await mkdtemp(path.join(os.tmpdir(), "pi-existing-project-"));
	const projectId = createProjectId(projectPath);
	const now = "2026-05-12T12:00:00.000Z";
	const store: ProjectStore = {
		projects: [
			{
				id: projectId,
				displayName: "pi-desktop",
				path: projectPath,
				createdAt: now,
				updatedAt: now,
				lastOpenedAt: now,
				pinned: false,
				availability: { status: "available", checkedAt: now },
			},
		],
		selectedProjectId: projectId,
		selectedChatId: "chat:no-fixture",
		chatsByProject: {
			[projectId]: [
				{
					id: "chat:no-fixture",
					projectId,
					title: "Static metadata only",
					status: "idle",
					updatedAt: now,
				},
			],
		},
	};
	await mkdir(userDataDir, { recursive: true });
	await writeFile(path.join(userDataDir, "project-store.json"), `${JSON.stringify(store, null, 2)}\n`, "utf8");
	const app = await electron.launch({
		args: ["."],
		env: {
			...process.env,
			PI_DESKTOP_USER_DATA_DIR: userDataDir,
		},
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByRole("heading", { name: "Static metadata only" })).toBeVisible();
		await expect(window.getByLabel("Empty chat")).toBeVisible();
		await expectComposerNearBottom(window);
	} finally {
		await app.close();
		await rm(userDataDir, { recursive: true, force: true });
		await rm(projectPath, { recursive: true, force: true });
	}
});
```

- [ ] **Step 6: Run smoke tests**

Run:

```bash
pnpm test:smoke
```

Expected: PASS.

- [ ] **Step 7: Commit smoke coverage**

Run:

```bash
git add tests/smoke/app.spec.ts
git commit -m "test(chat): cover chat shell smoke routes"
```

Expected: commit succeeds.

## Task 8: Final Verification

**Files:**
- Review all changed files from Tasks 1 through 7.

- [ ] **Step 1: Run the full project check**

Run:

```bash
pnpm check
```

Expected: PASS for formatting, linting, typechecking, unit tests, coverage, and Electron smoke tests.

- [ ] **Step 2: Inspect the final diff**

Run:

```bash
git status --short
git diff --stat HEAD
```

Expected: no unstaged implementation changes if every task was committed. If the working tree contains unrelated Milestone 1 doc moves, leave those files untouched.

- [ ] **Step 3: Manual review through the web preview**

Run:

```bash
pnpm dev:web
```

Open the printed local URL and review:

- Global start state.
- Project-scoped start state after selecting `pi-desktop`.
- Continued chat route after selecting `Execute milestone 01: project home sidebar refinements`.
- Empty chat route by selecting a chat id without a static transcript fixture.
- Narrow window at about 640px wide.

Expected: composer controls stay aligned, text stays inside controls, send is disabled with runtime unavailable, and the bottom composer remains anchored on chat routes.

## Self-Review Notes

- Spec coverage: Tasks 1, 4, and 7 cover global start, project start, empty chat, continued chat, static metadata, and route selection. Tasks 2 and 3 cover composer local state and disabled runtime behavior. Task 6 covers responsive sizing and alignment.
- Scope: The plan keeps runtime execution, prompt submission, provider auth, persisted transcripts, file attachments, and voice capture out of Milestone 2.
- Type consistency: `ComposerContext`, `ChatShellRoute`, `StaticTranscript`, and `createComposerState` are introduced before later tasks consume them.
