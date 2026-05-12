# Milestone 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable macOS Electron foundation for `pi-desktop` with React 19, shadcn/ui, Tailwind v4, typed IPC, CI, Husky, Vitest coverage, Playwright Electron smoke tests, and unsigned local packaging.

**Architecture:** Electron main owns app lifecycle, windows, native dialogs, and IPC handlers. Preload exposes one narrow typed `window.piDesktop` bridge. Renderer owns the static React shell, and shared modules own IPC schemas, result types, and static demo workspace state.

**Tech Stack:** Electron Forge, Vite, TypeScript, React 19, Tailwind CSS v4, shadcn/ui latest, Node 24.x, pnpm 11.1.1, Biome, Vitest with V8 coverage, Playwright Electron, GitHub Actions, Husky.

---

## Source References

- Product spec: `docs/superpowers/specs/2026-05-12-milestone-0-foundation-design.md`
- Roadmap PRD: `docs/superpowers/specs/2026-05-12-pi-desktop-prd-roadmap-design.md`
- Agent guidance: `AGENTS.md`
- Electron Forge Vite template docs: `https://www.electronforge.io/templates/vite-+-typescript`
- shadcn Tailwind v4 docs: `https://ui.shadcn.com/docs/tailwind-v4`
- Vitest coverage docs: `https://main.vitest.dev/guide/coverage`
- Playwright Electron API docs: `https://playwright.help/docs/api/class-electron`

## File Structure

Create these files:

- `.github/workflows/check.yml`: GitHub Actions check workflow.
- `.husky/pre-push`: local pre-push hook that mirrors CI.
- `.node-version`: Node version for version managers.
- `.nvmrc`: Node version for nvm-compatible tools.
- `.npmrc`: pnpm/Electron packaging settings.
- `README.md`: setup, run, check, and packaging commands.
- `biome.json`: formatter and lint config.
- `components.json`: shadcn component config.
- `forge.config.ts`: Electron Forge config.
- `index.html`: renderer HTML entry for Electron Forge Vite.
- `package.json`: project metadata, scripts, engines, and package manager.
- `playwright.config.ts`: Electron smoke test config.
- `postcss.config.mjs`: Tailwind v4 PostCSS entry if shadcn CLI creates it; keep only if required by generated setup.
- `scripts/check-node-version.mjs`: Node 24 guard.
- `src/main/forge-env.d.ts`: Vite plugin globals for Electron main.
- `src/main/index.ts`: Electron main process and window bootstrap.
- `src/preload/index.ts`: typed bridge exposed with `contextBridge`.
- `src/renderer/App.tsx`: static shell composition.
- `src/renderer/components/app-shell.tsx`: desktop layout.
- `src/renderer/components/ui/badge.tsx`: shadcn-generated UI component.
- `src/renderer/components/ui/button.tsx`: shadcn-generated UI component.
- `src/renderer/components/ui/card.tsx`: shadcn-generated UI component.
- `src/renderer/components/ui/scroll-area.tsx`: shadcn-generated UI component.
- `src/renderer/components/ui/separator.tsx`: shadcn-generated UI component.
- `src/renderer/global.d.ts`: `window.piDesktop` global typing.
- `src/renderer/lib/utils.ts`: shadcn utility.
- `src/renderer/main.tsx`: React renderer entry.
- `src/renderer/shell/shell-state.ts`: pure demo state transformation helpers.
- `src/renderer/styles.css`: Tailwind v4 theme and shell globals.
- `src/shared/demo-workspace.ts`: static demo workspace data.
- `src/shared/ipc.ts`: IPC channels, schemas, and types.
- `src/shared/preload-api.ts`: public preload API type.
- `src/shared/result.ts`: typed result helpers.
- `tests/shared/ipc.test.ts`: IPC schema tests.
- `tests/shared/shell-state.test.ts`: shell state tests.
- `tests/shared/workspace-state.test.ts`: demo workspace tests.
- `tests/smoke/app.spec.ts`: Playwright Electron smoke test.
- `tsconfig.json`: strict TypeScript config.
- `vite.main.config.ts`: Vite config for main process.
- `vite.preload.config.ts`: Vite config for preload.
- `vite.renderer.config.ts`: Vite config for renderer.
- `vitest.config.ts`: Vitest config and coverage thresholds.

Modify these files:

- `.gitignore`: include `.env`, output folders, coverage, Playwright artifacts, logs, and OS/editor noise.
- `AGENTS.md`: only if implementation discovers a setup detail that belongs there; prefer `README.md` for commands.

Do not create:

- `.env.example`: no Milestone 0 code needs signing or release variables.
- Pi SDK adapter files: Milestone 2 owns real Pi runtime integration.
- release/signing workflow files: CD is deferred.

## Task 1: Runtime and Package Baseline

**Files:**
- Create: `package.json`
- Create: `.nvmrc`
- Create: `.node-version`
- Create: `.npmrc`
- Create: `scripts/check-node-version.mjs`
- Create: `tsconfig.json`
- Create: `biome.json`

- [ ] **Step 1: Write the Node guard before installing dependencies**

Create `scripts/check-node-version.mjs`:

```js
const major = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);

if (major !== 24) {
	console.error(`pi-desktop requires Node 24.x. Current version: ${process.version}`);
	process.exit(1);
}
```

- [ ] **Step 2: Add Node version files**

Create `.nvmrc`:

```text
24
```

Create `.node-version`:

```text
24
```

- [ ] **Step 3: Add pnpm/Electron package manager settings**

Create `.npmrc`:

```ini
engine-strict=true
node-linker=hoisted
```

- [ ] **Step 4: Create initial package metadata and scripts**

Create `package.json`:

```json
{
	"name": "pi-desktop",
	"version": "0.0.0",
	"description": "Open-source desktop command center for the Pi coding agent CLI.",
	"private": true,
	"type": "module",
	"main": ".vite/build/main.js",
	"productName": "pi-desktop",
	"packageManager": "pnpm@11.1.1",
	"engines": {
		"node": ">=24 <25"
	},
	"scripts": {
		"preinstall": "node ./scripts/check-node-version.mjs",
		"dev": "electron-forge start",
		"build": "electron-forge package",
		"package": "electron-forge package",
		"make": "electron-forge make",
		"format": "biome format --write .",
		"format:check": "biome format .",
		"lint": "biome lint .",
		"typecheck": "tsc --noEmit",
		"test": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:smoke": "pnpm build && playwright test --config playwright.config.ts",
		"check": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:coverage && pnpm test:smoke",
		"prepare": "husky"
	}
}
```

- [ ] **Step 5: Add strict TypeScript config**

Create `tsconfig.json`:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"useDefineForClassFields": true,
		"lib": ["ES2023", "DOM", "DOM.Iterable"],
		"allowJs": false,
		"skipLibCheck": true,
		"esModuleInterop": true,
		"allowSyntheticDefaultImports": true,
		"strict": true,
		"forceConsistentCasingInFileNames": true,
		"module": "ESNext",
		"moduleResolution": "Bundler",
		"resolveJsonModule": true,
		"isolatedModules": true,
		"noEmit": true,
		"jsx": "react-jsx",
		"types": ["node", "vitest/globals"],
		"baseUrl": ".",
		"paths": {
			"@/*": ["src/*"]
		}
	},
	"include": [
		"src",
		"tests",
		"scripts",
		"forge.config.ts",
		"playwright.config.ts",
		"vite.main.config.ts",
		"vite.preload.config.ts",
		"vite.renderer.config.ts",
		"vitest.config.ts"
	]
}
```

- [ ] **Step 6: Add formatter and linter config**

Create `biome.json`:

```json
{
	"$schema": "https://biomejs.dev/schemas/2.3.5/schema.json",
	"formatter": {
		"enabled": true,
		"formatWithErrors": false,
		"indentStyle": "tab",
		"indentWidth": 3,
		"lineWidth": 120
	},
	"linter": {
		"enabled": true,
		"rules": {
			"recommended": true,
			"style": {
				"useConst": "error",
				"useNodejsImportProtocol": "error"
			},
			"suspicious": {
				"noExplicitAny": "error"
			}
		}
	},
	"files": {
		"includes": [
			"src/**/*.ts",
			"src/**/*.tsx",
			"tests/**/*.ts",
			"scripts/**/*.mjs",
			"*.config.ts",
			"!node_modules",
			"!out",
			"!dist",
			"!coverage",
			"!test-results",
			"!playwright-report"
		]
	}
}
```

- [ ] **Step 7: Verify the Node guard**

Run:

```bash
node scripts/check-node-version.mjs
```

Expected on Node 24:

```text
```

Expected on any other Node major:

```text
pi-desktop requires Node 24.x. Current version: v<current>
```

If the command fails because the local shell is not on Node 24, switch the shell to Node 24 before continuing. Do not remove the guard.

- [ ] **Step 8: Install baseline dependencies**

Run:

```bash
corepack enable
corepack prepare pnpm@11.1.1 --activate
pnpm add react@latest react-dom@latest zod@latest
pnpm add -D @biomejs/biome@latest @electron-forge/cli@latest @electron-forge/maker-zip@latest @electron-forge/plugin-vite@latest @playwright/test@latest @tailwindcss/vite@latest @types/node@latest @types/react@latest @types/react-dom@latest @vitejs/plugin-react@latest @vitest/coverage-v8@latest electron@latest husky@latest tailwindcss@latest typescript@latest vite@latest vitest@latest
```

Expected:

```text
Done
```

The exact pnpm success text may include install timing and package counts.

- [ ] **Step 9: Commit runtime baseline**

Run:

```bash
git add package.json pnpm-lock.yaml .nvmrc .node-version .npmrc scripts/check-node-version.mjs tsconfig.json biome.json
git commit -m "chore: add node pnpm project baseline"
```

## Task 2: Electron Forge and Vite Skeleton

**Files:**
- Create: `forge.config.ts`
- Create: `vite.main.config.ts`
- Create: `vite.preload.config.ts`
- Create: `vite.renderer.config.ts`
- Create: `index.html`
- Create: `src/main/forge-env.d.ts`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles.css`

- [ ] **Step 1: Add Electron Forge config**

Create `forge.config.ts`:

```ts
import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerZIP } from "@electron-forge/maker-zip";
import { VitePlugin } from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
	packagerConfig: {
		asar: true,
		name: "pi-desktop",
		executableName: "pi-desktop",
	},
	rebuildConfig: {},
	makers: [new MakerZIP({}, ["darwin"])],
	plugins: [
		new VitePlugin({
			build: [
				{
					entry: "src/main/index.ts",
					config: "vite.main.config.ts",
					target: "main",
				},
				{
					entry: "src/preload/index.ts",
					config: "vite.preload.config.ts",
					target: "preload",
				},
			],
			renderer: [
				{
					name: "main_window",
					config: "vite.renderer.config.ts",
				},
			],
		}),
	],
};

export default config;
```

- [ ] **Step 2: Add Vite configs**

Create `vite.main.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		target: "node24",
	},
});
```

Create `vite.preload.config.ts`:

```ts
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		target: "node24",
	},
});
```

Create `vite.renderer.config.ts`:

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
});
```

- [ ] **Step 3: Add renderer HTML entry**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>pi-desktop</title>
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/src/renderer/main.tsx"></script>
	</body>
</html>
```

- [ ] **Step 4: Add Forge environment globals**

Create `src/main/forge-env.d.ts`:

```ts
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
```

- [ ] **Step 5: Add minimal main process**

Create `src/main/index.ts`:

```ts
import { app, BrowserWindow } from "electron";
import path from "node:path";

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 1280,
		height: 820,
		minWidth: 960,
		minHeight: 640,
		title: "pi-desktop",
		backgroundColor: "#0a0a0a",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
		return;
	}

	void mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
};

app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
```

- [ ] **Step 6: Add minimal preload**

Create `src/preload/index.ts`:

```ts
import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("piDesktop", {
	ready: true,
});
```

- [ ] **Step 7: Add minimal renderer**

Create `src/renderer/App.tsx`:

```tsx
export function App() {
	return (
		<main data-testid="app-shell">
			<h1>pi-desktop</h1>
			<p>Milestone 0 foundation</p>
		</main>
	);
}
```

Create `src/renderer/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
	throw new Error("Renderer root element was not found");
}

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
```

Create `src/renderer/styles.css`:

```css
@import "tailwindcss";

:root {
	color-scheme: dark;
	font-family:
		Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	background: #0a0a0a;
	color: #f5f5f5;
}

* {
	box-sizing: border-box;
}

body {
	margin: 0;
	min-width: 320px;
	min-height: 100vh;
	background: #0a0a0a;
}
```

- [ ] **Step 8: Verify typecheck catches no scaffold errors**

Run:

```bash
pnpm typecheck
```

Expected:

```text
```

- [ ] **Step 9: Verify the app starts locally**

Run:

```bash
pnpm dev
```

Expected:

```text
vite
```

The Electron window should open and show `pi-desktop` and `Milestone 0 foundation`. Stop the dev process after visual verification.

- [ ] **Step 10: Commit Electron skeleton**

Run:

```bash
git add forge.config.ts vite.main.config.ts vite.preload.config.ts vite.renderer.config.ts index.html src/main src/preload src/renderer package.json pnpm-lock.yaml
git commit -m "chore: scaffold electron vite app"
```

## Task 3: Shared IPC and State Contracts

**Files:**
- Create: `src/shared/result.ts`
- Create: `src/shared/workspace-state.ts`
- Create: `src/shared/demo-workspace.ts`
- Create: `src/shared/ipc.ts`
- Create: `src/shared/preload-api.ts`
- Create: `tests/shared/workspace-state.test.ts`
- Create: `tests/shared/ipc.test.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Write tests for the workspace state contract**

Create `tests/shared/workspace-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDemoWorkspaceState } from "../../src/shared/demo-workspace";
import { WorkspaceStateSchema } from "../../src/shared/workspace-state";

describe("createDemoWorkspaceState", () => {
	it("returns valid demo data for the Milestone 0 shell", () => {
		const state = createDemoWorkspaceState();

		expect(WorkspaceStateSchema.parse(state)).toEqual(state);
		expect(state.activeWorkspace.name).toBe("pi-desktop");
		expect(state.sessions).toHaveLength(2);
		expect(state.panels.map((panel) => panel.kind)).toEqual(["files", "diffs", "terminal"]);
	});
});
```

- [ ] **Step 2: Write tests for IPC schemas**

Create `tests/shared/ipc.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	AppVersionResultSchema,
	IpcChannels,
	SelectFolderResultSchema,
	WorkspaceStateResultSchema,
} from "../../src/shared/ipc";

describe("IPC contracts", () => {
	it("uses stable channel names", () => {
		expect(IpcChannels).toEqual({
			appGetVersion: "app:getVersion",
			workspaceGetInitialState: "workspace:getInitialState",
			workspaceSelectFolder: "workspace:selectFolder",
		});
	});

	it("validates successful app version results", () => {
		const result = AppVersionResultSchema.parse({
			ok: true,
			data: {
				name: "pi-desktop",
				version: "0.0.0",
			},
		});

		expect(result.ok).toBe(true);
	});

	it("validates cancelled folder selection results", () => {
		const result = SelectFolderResultSchema.parse({
			ok: true,
			data: {
				status: "cancelled",
			},
		});

		expect(result.data.status).toBe("cancelled");
	});

	it("rejects malformed workspace state results", () => {
		expect(() =>
			WorkspaceStateResultSchema.parse({
				ok: true,
				data: {
					activeWorkspace: null,
				},
			}),
		).toThrow();
	});
});
```

- [ ] **Step 3: Run tests to verify they fail before implementation**

Run:

```bash
pnpm test tests/shared/workspace-state.test.ts tests/shared/ipc.test.ts
```

Expected:

```text
FAIL
Cannot find module '../../src/shared/demo-workspace'
```

- [ ] **Step 4: Add Vitest config with V8 coverage thresholds**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["tests/shared/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/shared/**/*.ts", "src/renderer/shell/**/*.ts"],
			exclude: ["**/*.test.ts", "**/*.config.ts", "tests/**", "src/**/*.d.ts"],
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
	},
});
```

- [ ] **Step 5: Implement typed result helpers**

Create `src/shared/result.ts`:

```ts
import { z } from "zod";

export const IpcErrorSchema = z.object({
	code: z.string().min(1),
	message: z.string().min(1),
});

export type IpcError = z.infer<typeof IpcErrorSchema>;

export const createIpcError = (code: string, message: string): IpcError => ({
	code,
	message,
});

export type IpcResult<TData> =
	| {
			ok: true;
			data: TData;
	  }
	| {
			ok: false;
			error: IpcError;
	  };

export const ok = <TData>(data: TData): IpcResult<TData> => ({
	ok: true,
	data,
});

export const err = (code: string, message: string): IpcResult<never> => ({
	ok: false,
	error: createIpcError(code, message),
});

export const createResultSchema = <TSchema extends z.ZodTypeAny>(dataSchema: TSchema) =>
	z.discriminatedUnion("ok", [
		z.object({
			ok: z.literal(true),
			data: dataSchema,
		}),
		z.object({
			ok: z.literal(false),
			error: IpcErrorSchema,
		}),
	]);
```

- [ ] **Step 6: Implement workspace state types**

Create `src/shared/workspace-state.ts`:

```ts
import { z } from "zod";

export const WorkspaceSummarySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	path: z.string().min(1),
});

export const SessionSummarySchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	status: z.enum(["idle", "running", "failed"]),
	lastUpdatedLabel: z.string().min(1),
});

export const PanelSummarySchema = z.object({
	id: z.string().min(1),
	kind: z.enum(["files", "diffs", "terminal"]),
	title: z.string().min(1),
	summary: z.string().min(1),
});

export const WorkspaceStateSchema = z.object({
	activeWorkspace: WorkspaceSummarySchema,
	sessions: z.array(SessionSummarySchema),
	panels: z.array(PanelSummarySchema),
});

export type WorkspaceSummary = z.infer<typeof WorkspaceSummarySchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type PanelSummary = z.infer<typeof PanelSummarySchema>;
export type WorkspaceState = z.infer<typeof WorkspaceStateSchema>;
```

- [ ] **Step 7: Implement demo workspace data**

Create `src/shared/demo-workspace.ts`:

```ts
import type { WorkspaceState } from "./workspace-state";

export const createDemoWorkspaceState = (): WorkspaceState => ({
	activeWorkspace: {
		id: "workspace-pi-desktop",
		name: "pi-desktop",
		path: "/Volumes/EVO/dev/pi-desktop",
	},
	sessions: [
		{
			id: "session-foundation",
			title: "Milestone 0 foundation",
			status: "idle",
			lastUpdatedLabel: "Ready",
		},
		{
			id: "session-roadmap",
			title: "Roadmap planning",
			status: "idle",
			lastUpdatedLabel: "Recent",
		},
	],
	panels: [
		{
			id: "panel-files",
			kind: "files",
			title: "Files",
			summary: "Project files will appear here in Milestone 1.",
		},
		{
			id: "panel-diffs",
			kind: "diffs",
			title: "Diffs",
			summary: "Agent changes will appear here in Milestone 3.",
		},
		{
			id: "panel-terminal",
			kind: "terminal",
			title: "Terminal",
			summary: "Command output will appear here in Milestone 3.",
		},
	],
});
```

- [ ] **Step 8: Implement IPC contracts**

Create `src/shared/ipc.ts`:

```ts
import { z } from "zod";
import { createResultSchema, type IpcResult } from "./result";
import { WorkspaceStateSchema, type WorkspaceState } from "./workspace-state";

export const IpcChannels = {
	appGetVersion: "app:getVersion",
	workspaceGetInitialState: "workspace:getInitialState",
	workspaceSelectFolder: "workspace:selectFolder",
} as const;

export const AppVersionSchema = z.object({
	name: z.string().min(1),
	version: z.string().min(1),
});

export const SelectFolderResponseSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("selected"),
		path: z.string().min(1),
	}),
	z.object({
		status: z.literal("cancelled"),
	}),
]);

export const AppVersionResultSchema = createResultSchema(AppVersionSchema);
export const WorkspaceStateResultSchema = createResultSchema(WorkspaceStateSchema);
export const SelectFolderResultSchema = createResultSchema(SelectFolderResponseSchema);

export type AppVersion = z.infer<typeof AppVersionSchema>;
export type SelectFolderResponse = z.infer<typeof SelectFolderResponseSchema>;
export type AppVersionResult = IpcResult<AppVersion>;
export type WorkspaceStateResult = IpcResult<WorkspaceState>;
export type SelectFolderResult = IpcResult<SelectFolderResponse>;
```

- [ ] **Step 9: Implement public preload API type**

Create `src/shared/preload-api.ts`:

```ts
import type { AppVersionResult, SelectFolderResult, WorkspaceStateResult } from "./ipc";

export interface PiDesktopApi {
	app: {
		getVersion: () => Promise<AppVersionResult>;
	};
	workspace: {
		getInitialState: () => Promise<WorkspaceStateResult>;
		selectFolder: () => Promise<SelectFolderResult>;
	};
}
```

- [ ] **Step 10: Run shared tests**

Run:

```bash
pnpm test tests/shared/workspace-state.test.ts tests/shared/ipc.test.ts
```

Expected:

```text
PASS
```

- [ ] **Step 11: Commit shared contracts**

Run:

```bash
git add src/shared tests/shared vitest.config.ts package.json pnpm-lock.yaml
git commit -m "feat: add typed ipc contracts"
```

## Task 4: Main and Preload IPC Wiring

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Create: `src/renderer/global.d.ts`

- [ ] **Step 1: Update main process with IPC handlers**

Replace `src/main/index.ts` with:

```ts
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { createDemoWorkspaceState } from "../shared/demo-workspace";
import { IpcChannels } from "../shared/ipc";
import { err, ok } from "../shared/result";

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 1280,
		height: 820,
		minWidth: 960,
		minHeight: 640,
		title: "pi-desktop",
		backgroundColor: "#0a0a0a",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
		return;
	}

	void mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
};

const registerIpcHandlers = () => {
	ipcMain.handle(IpcChannels.appGetVersion, () =>
		ok({
			name: app.getName(),
			version: app.getVersion(),
		}),
	);

	ipcMain.handle(IpcChannels.workspaceGetInitialState, () => ok(createDemoWorkspaceState()));

	ipcMain.handle(IpcChannels.workspaceSelectFolder, async () => {
		const result = await dialog.showOpenDialog({
			properties: ["openDirectory"],
			title: "Open Project Folder",
		});

		if (result.canceled) {
			return ok({
				status: "cancelled" as const,
			});
		}

		const selectedPath = result.filePaths[0];

		if (!selectedPath) {
			return err("workspace.no_selection", "Folder picker returned no selected path.");
		}

		return ok({
			status: "selected" as const,
			path: selectedPath,
		});
	});
};

app.whenReady().then(() => {
	registerIpcHandlers();
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
```

- [ ] **Step 2: Update preload with typed bridge**

Replace `src/preload/index.ts` with:

```ts
import { contextBridge, ipcRenderer } from "electron";
import { IpcChannels, SelectFolderResultSchema, WorkspaceStateResultSchema, AppVersionResultSchema } from "../shared/ipc";
import type { PiDesktopApi } from "../shared/preload-api";

const api: PiDesktopApi = {
	app: {
		getVersion: async () => AppVersionResultSchema.parse(await ipcRenderer.invoke(IpcChannels.appGetVersion)),
	},
	workspace: {
		getInitialState: async () =>
			WorkspaceStateResultSchema.parse(await ipcRenderer.invoke(IpcChannels.workspaceGetInitialState)),
		selectFolder: async () => SelectFolderResultSchema.parse(await ipcRenderer.invoke(IpcChannels.workspaceSelectFolder)),
	},
};

contextBridge.exposeInMainWorld("piDesktop", api);
```

- [ ] **Step 3: Add renderer global type**

Create `src/renderer/global.d.ts`:

```ts
import type { PiDesktopApi } from "../shared/preload-api";

declare global {
	interface Window {
		piDesktop: PiDesktopApi;
	}
}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected:

```text
```

- [ ] **Step 5: Run shared tests**

Run:

```bash
pnpm test
```

Expected:

```text
PASS
```

- [ ] **Step 6: Commit IPC wiring**

Run:

```bash
git add src/main/index.ts src/preload/index.ts src/renderer/global.d.ts
git commit -m "feat: wire typed electron ipc"
```

## Task 5: shadcn, Tailwind, and Static Shell

**Files:**
- Create: `components.json`
- Create: `src/renderer/lib/utils.ts`
- Create: `src/renderer/components/ui/button.tsx`
- Create: `src/renderer/components/ui/card.tsx`
- Create: `src/renderer/components/ui/badge.tsx`
- Create: `src/renderer/components/ui/separator.tsx`
- Create: `src/renderer/components/ui/scroll-area.tsx`
- Create: `src/renderer/shell/shell-state.ts`
- Create: `src/renderer/components/app-shell.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles.css`
- Create: `tests/shared/shell-state.test.ts`

- [ ] **Step 1: Write shell state tests**

Create `tests/shared/shell-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDemoWorkspaceState } from "../../src/shared/demo-workspace";
import { createShellSections } from "../../src/renderer/shell/shell-state";

describe("createShellSections", () => {
	it("creates stable labels for the static Milestone 0 shell", () => {
		const sections = createShellSections(createDemoWorkspaceState());

		expect(sections.workspaceLabel).toBe("pi-desktop");
		expect(sections.sessionLabels).toEqual(["Milestone 0 foundation", "Roadmap planning"]);
		expect(sections.panelLabels).toEqual(["Files", "Diffs", "Terminal"]);
	});
});
```

- [ ] **Step 2: Run shell state test to verify it fails**

Run:

```bash
pnpm test tests/shared/shell-state.test.ts
```

Expected:

```text
FAIL
Cannot find module '../../src/renderer/shell/shell-state'
```

- [ ] **Step 3: Initialize shadcn config**

Run:

```bash
pnpm dlx shadcn@latest init --yes --base-color neutral --style new-york
```

Expected:

```text
Success
```

If the CLI creates a `components.json` with aliases that do not match this plan, edit it in the next step.

- [ ] **Step 4: Normalize shadcn config**

Ensure `components.json` has this content:

```json
{
	"$schema": "https://ui.shadcn.com/schema.json",
	"style": "new-york",
	"rsc": false,
	"tsx": true,
	"tailwind": {
		"config": "",
		"css": "src/renderer/styles.css",
		"baseColor": "neutral",
		"cssVariables": true,
		"prefix": ""
	},
	"aliases": {
		"components": "@/renderer/components",
		"utils": "@/renderer/lib/utils",
		"ui": "@/renderer/components/ui",
		"lib": "@/renderer/lib",
		"hooks": "@/renderer/hooks"
	},
	"iconLibrary": "lucide"
}
```

- [ ] **Step 5: Add initial shadcn components**

Run:

```bash
pnpm dlx shadcn@latest add button card badge separator scroll-area
```

Expected:

```text
Success
```

- [ ] **Step 6: Install shadcn runtime dependencies if the CLI did not add them**

Run:

```bash
pnpm add @radix-ui/react-scroll-area@latest @radix-ui/react-separator@latest @radix-ui/react-slot@latest class-variance-authority@latest clsx@latest lucide-react@latest tailwind-merge@latest
```

Expected:

```text
Done
```

- [ ] **Step 7: Add shell state helper**

Create `src/renderer/shell/shell-state.ts`:

```ts
import type { WorkspaceState } from "../../shared/workspace-state";

export interface ShellSections {
	workspaceLabel: string;
	workspacePath: string;
	sessionLabels: string[];
	panelLabels: string[];
}

export const createShellSections = (state: WorkspaceState): ShellSections => ({
	workspaceLabel: state.activeWorkspace.name,
	workspacePath: state.activeWorkspace.path,
	sessionLabels: state.sessions.map((session) => session.title),
	panelLabels: state.panels.map((panel) => panel.title),
});
```

- [ ] **Step 8: Add static app shell component**

Create `src/renderer/components/app-shell.tsx`:

```tsx
import { Badge } from "@/renderer/components/ui/badge";
import { Button } from "@/renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/renderer/components/ui/card";
import { ScrollArea } from "@/renderer/components/ui/scroll-area";
import { Separator } from "@/renderer/components/ui/separator";
import type { WorkspaceState } from "@/shared/workspace-state";
import { FolderOpen, PanelRight, Play, Terminal } from "lucide-react";
import { createShellSections } from "../shell/shell-state";

interface AppShellProps {
	state: WorkspaceState;
	versionLabel: string;
	onSelectWorkspace: () => void;
}

export function AppShell({ state, versionLabel, onSelectWorkspace }: AppShellProps) {
	const sections = createShellSections(state);

	return (
		<div className="grid h-screen min-h-[640px] grid-cols-[260px_minmax(420px,1fr)_320px] bg-background text-foreground">
			<aside className="flex min-w-0 flex-col border-r border-border bg-muted/20">
				<div className="flex h-14 items-center gap-2 px-4">
					<div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">pi</div>
					<div className="min-w-0">
						<div className="truncate text-sm font-medium">pi-desktop</div>
						<div className="truncate text-xs text-muted-foreground">{versionLabel}</div>
					</div>
				</div>
				<Separator />
				<div className="space-y-3 p-3">
					<Button className="w-full justify-start gap-2" variant="secondary" onClick={onSelectWorkspace}>
						<FolderOpen className="size-4" />
						Open folder
					</Button>
					<Card>
						<CardHeader className="p-3">
							<CardTitle className="text-sm">{sections.workspaceLabel}</CardTitle>
						</CardHeader>
						<CardContent className="px-3 pb-3 pt-0">
							<p className="truncate text-xs text-muted-foreground">{sections.workspacePath}</p>
						</CardContent>
					</Card>
				</div>
				<ScrollArea className="min-h-0 flex-1 px-3 pb-3">
					<div className="space-y-2">
						<div className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sessions</div>
						{state.sessions.map((session) => (
							<button
								className="w-full rounded-md border border-transparent px-3 py-2 text-left text-sm hover:border-border hover:bg-muted"
								key={session.id}
								type="button"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="truncate">{session.title}</span>
									<Badge variant={session.status === "failed" ? "destructive" : "secondary"}>{session.status}</Badge>
								</div>
								<div className="mt-1 text-xs text-muted-foreground">{session.lastUpdatedLabel}</div>
							</button>
						))}
					</div>
				</ScrollArea>
			</aside>

			<main className="flex min-w-0 flex-col">
				<header className="flex h-14 items-center justify-between border-b border-border px-5">
					<div className="min-w-0">
						<h1 className="truncate text-sm font-semibold">Milestone 0 foundation</h1>
						<p className="truncate text-xs text-muted-foreground">Static shell for future Pi sessions</p>
					</div>
					<Badge variant="outline">macOS local</Badge>
				</header>
				<section className="flex min-h-0 flex-1 flex-col justify-between p-5">
					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<Play className="size-4" />
									Ready for Pi runtime adapter
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2 text-sm text-muted-foreground">
								<p>Milestone 0 proves the app shell, typed IPC, tooling, checks, and smoke test.</p>
								<p>Real agent sessions begin in Milestone 2.</p>
							</CardContent>
						</Card>
					</div>
					<div className="rounded-lg border border-border bg-card p-3">
						<div className="text-xs text-muted-foreground">Composer surface</div>
						<div className="mt-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
							Ask Pi to work in this project
						</div>
					</div>
				</section>
			</main>

			<aside className="flex min-w-0 flex-col border-l border-border bg-muted/10">
				<div className="flex h-14 items-center gap-2 border-b border-border px-4">
					<PanelRight className="size-4" />
					<div className="text-sm font-medium">Details</div>
				</div>
				<ScrollArea className="min-h-0 flex-1 p-4">
					<div className="space-y-3">
						{state.panels.map((panel) => (
							<Card key={panel.id}>
								<CardHeader className="p-3">
									<CardTitle className="flex items-center gap-2 text-sm">
										{panel.kind === "terminal" ? <Terminal className="size-4" /> : null}
										{panel.title}
									</CardTitle>
								</CardHeader>
								<CardContent className="px-3 pb-3 pt-0 text-xs text-muted-foreground">{panel.summary}</CardContent>
							</Card>
						))}
					</div>
				</ScrollArea>
				<div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Runtime: not connected</div>
			</aside>
		</div>
	);
}
```

- [ ] **Step 9: Wire App to preload API and demo fallback**

Replace `src/renderer/App.tsx` with:

```tsx
import { useEffect, useState } from "react";
import { AppShell } from "./components/app-shell";
import { createDemoWorkspaceState } from "../shared/demo-workspace";
import type { WorkspaceState } from "../shared/workspace-state";

export function App() {
	const [state, setState] = useState<WorkspaceState>(() => createDemoWorkspaceState());
	const [versionLabel, setVersionLabel] = useState("0.0.0");

	useEffect(() => {
		let mounted = true;

		const loadInitialState = async () => {
			const [versionResult, workspaceResult] = await Promise.all([
				window.piDesktop.app.getVersion(),
				window.piDesktop.workspace.getInitialState(),
			]);

			if (!mounted) {
				return;
			}

			if (versionResult.ok) {
				setVersionLabel(versionResult.data.version);
			}

			if (workspaceResult.ok) {
				setState(workspaceResult.data);
			}
		};

		void loadInitialState();

		return () => {
			mounted = false;
		};
	}, []);

	const selectWorkspace = async () => {
		const result = await window.piDesktop.workspace.selectFolder();

		if (!result.ok || result.data.status === "cancelled") {
			return;
		}

		setState((current) => ({
			activeWorkspace: {
				id: current.activeWorkspace.id,
				name: result.data.path.split("/").filter(Boolean).at(-1) ?? result.data.path,
				path: result.data.path,
			},
			sessions: current.sessions,
			panels: current.panels,
		}));
	};

	return <AppShell state={state} versionLabel={versionLabel} onSelectWorkspace={selectWorkspace} />;
}
```

- [ ] **Step 10: Replace renderer CSS with Tailwind theme**

Replace `src/renderer/styles.css` with:

```css
@import "tailwindcss";

@theme {
	--color-background: oklch(0.145 0 0);
	--color-foreground: oklch(0.985 0 0);
	--color-card: oklch(0.18 0 0);
	--color-card-foreground: oklch(0.985 0 0);
	--color-popover: oklch(0.18 0 0);
	--color-popover-foreground: oklch(0.985 0 0);
	--color-primary: oklch(0.922 0 0);
	--color-primary-foreground: oklch(0.205 0 0);
	--color-secondary: oklch(0.269 0 0);
	--color-secondary-foreground: oklch(0.985 0 0);
	--color-muted: oklch(0.269 0 0);
	--color-muted-foreground: oklch(0.708 0 0);
	--color-accent: oklch(0.269 0 0);
	--color-accent-foreground: oklch(0.985 0 0);
	--color-destructive: oklch(0.704 0.191 22.216);
	--color-border: oklch(1 0 0 / 10%);
	--color-input: oklch(1 0 0 / 15%);
	--color-ring: oklch(0.556 0 0);
	--radius: 0.5rem;
}

* {
	box-sizing: border-box;
}

html,
body,
#root {
	margin: 0;
	min-width: 320px;
	min-height: 100vh;
	background: var(--color-background);
	color: var(--color-foreground);
	font-family:
		Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button {
	font: inherit;
}
```

- [ ] **Step 11: Run shell test**

Run:

```bash
pnpm test tests/shared/shell-state.test.ts
```

Expected:

```text
PASS
```

- [ ] **Step 12: Run renderer typecheck**

Run:

```bash
pnpm typecheck
```

Expected:

```text
```

- [ ] **Step 13: Commit shell UI**

Run:

```bash
git add components.json src/renderer package.json pnpm-lock.yaml tests/shared/shell-state.test.ts
git commit -m "feat: add static desktop shell"
```

## Task 6: Playwright Electron Smoke Test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/smoke/app.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Add Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "tests/smoke",
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	workers: 1,
	reporter: "line",
	use: {
		trace: "retain-on-failure",
	},
});
```

- [ ] **Step 2: Add smoke test**

Create `tests/smoke/app.spec.ts`:

```ts
import { expect, test, _electron as electron } from "@playwright/test";

test("renders the Milestone 0 app shell", async () => {
	const app = await electron.launch({
		args: ["."],
	});

	try {
		const window = await app.firstWindow();

		await expect(window.getByTestId("app-shell")).toBeVisible();
		await expect(window.getByText("pi-desktop").first()).toBeVisible();
		await expect(window.getByText("Milestone 0 foundation")).toBeVisible();
		await expect(window.getByText("Runtime: not connected")).toBeVisible();
	} finally {
		await app.close();
	}
});
```

- [ ] **Step 3: Ensure AppShell has the smoke test id**

If `src/renderer/components/app-shell.tsx` does not already set `data-testid="app-shell"` on the root shell element, change the root `<div>` to:

```tsx
<div
	data-testid="app-shell"
	className="grid h-screen min-h-[640px] grid-cols-[260px_minmax(420px,1fr)_320px] bg-background text-foreground"
>
```

- [ ] **Step 4: Run smoke test**

Run:

```bash
pnpm test:smoke
```

Expected:

```text
1 passed
```

- [ ] **Step 5: Commit smoke test**

Run:

```bash
git add playwright.config.ts tests/smoke src/renderer/components/app-shell.tsx package.json
git commit -m "test: add electron smoke coverage"
```

## Task 7: CI, Husky, and Repo Hygiene

**Files:**
- Create: `.github/workflows/check.yml`
- Create: `.husky/pre-push`
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Expand `.gitignore`**

Replace `.gitignore` with:

```gitignore
.DS_Store
.superpowers/

# local secrets
.env
.env.*
!.env.example

# dependencies
node_modules/

# build outputs
.vite/
dist/
out/

# test outputs
coverage/
test-results/
playwright-report/

# logs
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*
```

- [ ] **Step 2: Add GitHub Actions workflow**

Create `.github/workflows/check.yml`:

```yaml
name: Check

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  check:
    runs-on: macos-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24.x
          cache: pnpm

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run checks
        run: pnpm check
```

- [ ] **Step 3: Add Husky pre-push hook**

Run:

```bash
pnpm exec husky init
```

Replace `.husky/pre-push` with:

```sh
pnpm check
```

If Husky creates `.husky/pre-commit`, remove it with:

```bash
rm .husky/pre-commit
```

- [ ] **Step 4: Verify `.env` is ignored**

Run:

```bash
git check-ignore .env
```

Expected:

```text
.env
```

- [ ] **Step 5: Commit CI and repo hygiene**

Run:

```bash
git add .github/workflows/check.yml .husky/pre-push .gitignore package.json pnpm-lock.yaml
git commit -m "ci: add check workflow and pre-push gate"
```

## Task 8: README and Final Check Pass

**Files:**
- Create: `README.md`
- Modify: files surfaced by final checks only when the failure is caused by Milestone 0 changes.

- [ ] **Step 1: Add README**

Create `README.md`:

```md
# pi-desktop

`pi-desktop` is an open-source macOS desktop command center for the Pi coding agent CLI.

Product context and roadmap live in [docs/superpowers/specs/2026-05-12-pi-desktop-prd-roadmap-design.md](docs/superpowers/specs/2026-05-12-pi-desktop-prd-roadmap-design.md).

## Prerequisites

- macOS
- Node.js 24.x
- pnpm 11.1.1

Use Corepack to activate the pinned pnpm version:

```bash
corepack enable
corepack prepare pnpm@11.1.1 --activate
```

## Install

```bash
pnpm install
```

## Develop

```bash
pnpm dev
```

## Check

```bash
pnpm check
```

`pnpm check` runs formatting, linting, typechecking, unit tests, coverage, and the Electron smoke test.

## Package Locally

```bash
pnpm package
```

Milestone 0 produces an unsigned local macOS package. Signing, notarization, CD, and release publishing are deferred.
```

- [ ] **Step 2: Run format**

Run:

```bash
pnpm format
```

Expected:

```text
Formatted
```

Biome may report file counts instead of exactly `Formatted`.

- [ ] **Step 3: Run full check**

Run:

```bash
pnpm check
```

Expected:

```text
PASS
```

The command must complete with exit code 0. It may print separate success output for Biome, TypeScript, Vitest, coverage, Electron Forge, and Playwright.

- [ ] **Step 4: Run unsigned package command**

Run:

```bash
pnpm package
```

Expected:

```text
✔
```

Electron Forge may print detailed packaging output. The command must complete with exit code 0 and create an `out/` artifact.

- [ ] **Step 5: Commit README and final check fixes**

Run:

```bash
git add README.md
git status --short
```

If `pnpm format` changed tracked project files, add only those project files. Do not add `.env`, `out/`, `coverage/`, `test-results/`, or `playwright-report/`.

Then run:

```bash
git commit -m "docs: add foundation setup guide"
```

## Task 9: Final Stabilization

**Files:**
- Modify only files required to fix failures from `pnpm check`, `pnpm package`, or `git status`.

- [ ] **Step 1: Verify clean ignored state**

Run:

```bash
git status --short --ignored
```

Expected tracked changes:

```text
```

Ignored files may include:

```text
!! .DS_Store
!! .env
!! node_modules/
!! out/
!! coverage/
```

- [ ] **Step 2: Run final check**

Run:

```bash
pnpm check
```

Expected:

```text
PASS
```

- [ ] **Step 3: Inspect commit history**

Run:

```bash
git log --oneline --decorate -8
```

Expected:

```text
<latest> docs: add foundation setup guide
<previous> ci: add check workflow and pre-push gate
<previous> test: add electron smoke coverage
<previous> feat: add static desktop shell
<previous> feat: wire typed electron ipc
<previous> feat: add typed ipc contracts
<previous> chore: scaffold electron vite app
<previous> chore: add node pnpm project baseline
```

- [ ] **Step 4: Report completion evidence**

In the final implementation report, include:

- Final `pnpm check` result.
- Final `pnpm package` result.
- Whether `git status --short --ignored` shows only ignored local artifacts.
- The latest commit hash.
- Any environment issue, especially if Node 24 was not available locally.

## Plan Self-Review

Spec coverage:

- Electron, Vite, TypeScript scaffold: Tasks 1 and 2.
- UI stack decision and shadcn/Tailwind setup: Task 5.
- App window and shell layout: Tasks 2 and 5.
- Local development commands: Task 1 and README in Task 8.
- Lint, typecheck, test, coverage, smoke, and check commands: Tasks 1, 3, 6, and 8.
- `.gitignore` and `.env` hygiene: Task 7.
- Initial typed IPC conventions: Tasks 3 and 4.
- Basic macOS packaging skeleton: Tasks 1, 2, and 8.
- CI and Husky pre-push checks: Task 7.
- Playwright Electron smoke test: Task 6.

Completeness scan:

- No incomplete sections, deferred code blocks, or missing implementation details.

Type consistency:

- `PiDesktopApi`, `IpcChannels`, `WorkspaceState`, `createDemoWorkspaceState`, and `createShellSections` names are consistent across tasks.
