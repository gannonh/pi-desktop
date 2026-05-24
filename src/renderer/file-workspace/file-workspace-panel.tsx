import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
	type PointerEvent as ReactPointerEvent,
} from "react";
import type { ProjectRecord } from "../../shared/project-state";
import { FileEmptyStates } from "./file-empty-states";
import { FileExplorer } from "./file-explorer";
import { FileViewer } from "./file-viewer";

const MIN_EXPLORER_WIDTH = 176;
const MIN_VIEWER_WIDTH = 280;
const KEYBOARD_RESIZE_STEP = 24;
const DEFAULT_EXPLORER_WIDTH = 306;

interface FileWorkspacePanelProps {
	project: ProjectRecord | null;
}

const clampExplorerWidth = (width: number, workspaceWidth: number) => {
	const maxWidth = Math.max(MIN_EXPLORER_WIDTH, workspaceWidth - MIN_VIEWER_WIDTH);
	return Math.min(Math.max(width, MIN_EXPLORER_WIDTH), maxWidth);
};

export function FileWorkspacePanel({ project }: FileWorkspacePanelProps) {
	const [explorerWidth, setExplorerWidth] = useState<number | null>(null);
	const workspaceRef = useRef<HTMLDivElement>(null);
	const explorerRef = useRef<HTMLDivElement | null>(null);
	const dragCleanupRef = useRef<(() => void) | null>(null);
	const blocked = <FileEmptyStates project={project} />;
	const workspaceStyle =
		explorerWidth === null ? undefined : ({ "--file-explorer-width": `${explorerWidth}px` } as CSSProperties);

	useEffect(() => () => dragCleanupRef.current?.(), []);

	const resizeExplorer = (width: number) => {
		const workspaceWidth = workspaceRef.current?.getBoundingClientRect().width ?? 0;
		setExplorerWidth(clampExplorerWidth(width, workspaceWidth));
	};

	const startDividerDrag = (event: ReactPointerEvent<HTMLElement>) => {
		const workspace = workspaceRef.current;
		const explorer = explorerRef.current;

		if (!workspace || !explorer) {
			return;
		}

		event.preventDefault();
		try {
			event.currentTarget.setPointerCapture?.(event.pointerId);
		} catch {
			// Pointer capture is unavailable for synthetic events used by tests and browser probes.
		}

		const workspaceWidth = workspace.getBoundingClientRect().width;
		const startX = event.clientX;
		const visibleExplorer = explorer.querySelector<HTMLElement>(".file-explorer");
		const startWidth =
			explorer.getBoundingClientRect().width ||
			visibleExplorer?.getBoundingClientRect().width ||
			explorerWidth ||
			DEFAULT_EXPLORER_WIDTH;

		const onPointerMove = (moveEvent: PointerEvent) => {
			const nextWidth = startWidth + moveEvent.clientX - startX;
			setExplorerWidth(clampExplorerWidth(nextWidth, workspaceWidth));
		};

		const cleanupDrag = () => {
			document.body.classList.remove("file-workspace--resizing");
			document.removeEventListener("pointermove", onPointerMove);
			document.removeEventListener("pointerup", cleanupDrag);
			dragCleanupRef.current = null;
		};

		dragCleanupRef.current?.();
		dragCleanupRef.current = cleanupDrag;
		document.body.classList.add("file-workspace--resizing");
		document.addEventListener("pointermove", onPointerMove);
		document.addEventListener("pointerup", cleanupDrag, { once: true });
	};

	const resizeDividerWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
			return;
		}

		event.preventDefault();
		const currentWidth =
			explorerWidth ?? explorerRef.current?.getBoundingClientRect().width ?? DEFAULT_EXPLORER_WIDTH;
		const direction = event.key === "ArrowLeft" ? -1 : 1;
		resizeExplorer(currentWidth + direction * KEYBOARD_RESIZE_STEP);
	};

	return (
		<div ref={workspaceRef} className="file-workspace" data-testid="workspace-panel-files" style={workspaceStyle}>
			{project && project.availability.status === "available" ? (
				<>
					<div ref={explorerRef} className="file-workspace__explorer-pane">
						<FileExplorer />
					</div>
					<hr
						className="file-workspace__divider"
						aria-label="Resize file explorer"
						aria-orientation="vertical"
						aria-valuemin={MIN_EXPLORER_WIDTH}
						aria-valuenow={explorerWidth ?? undefined}
						tabIndex={0}
						onKeyDown={resizeDividerWithKeyboard}
						onPointerDown={startDividerDrag}
					/>
					<FileViewer />
				</>
			) : (
				blocked
			)}
		</div>
	);
}
