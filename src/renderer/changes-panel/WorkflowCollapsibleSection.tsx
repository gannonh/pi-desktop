import { ChevronDown, ChevronRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { SectionResizeHandle } from "./SectionResizeHandle";
import { WORKFLOW_BLOCK_MAX_HEIGHT, WORKFLOW_BLOCK_MIN_HEIGHT } from "./changes-panel-layout";

export function WorkflowCollapsibleSection({
	title,
	testId,
	expanded,
	height,
	onToggle,
	setHeight,
	children,
}: {
	title: string;
	testId: string;
	expanded: boolean;
	height: number;
	onToggle: () => void;
	setHeight: (updater: (current: number) => number) => void;
	children: ReactNode;
}) {
	return (
		<section
			className="changes-panel__workflow-section"
			data-testid={testId}
			style={{ "--changes-panel-workflow-block-height": `${height}px` } as CSSProperties}
		>
			{expanded ? (
				<SectionResizeHandle
					label={`Resize ${title} from top edge`}
					height={height}
					setHeight={setHeight}
					minHeight={WORKFLOW_BLOCK_MIN_HEIGHT}
					maxHeight={WORKFLOW_BLOCK_MAX_HEIGHT}
					growDirection="up"
					className="changes-panel__workflow-resize-handle changes-panel__workflow-resize-handle--top"
				/>
			) : null}
			<button
				type="button"
				className="changes-panel__section-header changes-panel__workflow-section-header"
				aria-expanded={expanded}
				onClick={onToggle}
			>
				{expanded ? (
					<ChevronDown aria-hidden className="changes-panel__section-chevron-icon" />
				) : (
					<ChevronRight aria-hidden className="changes-panel__section-chevron-icon" />
				)}
				<span>{title}</span>
			</button>
			{expanded ? (
				<>
					<div className="changes-panel__workflow-block-content">{children}</div>
					<SectionResizeHandle
						label={`Resize ${title} from bottom edge`}
						height={height}
						setHeight={setHeight}
						minHeight={WORKFLOW_BLOCK_MIN_HEIGHT}
						maxHeight={WORKFLOW_BLOCK_MAX_HEIGHT}
						growDirection="down"
						className="changes-panel__workflow-resize-handle changes-panel__workflow-resize-handle--bottom"
					/>
				</>
			) : null}
		</section>
	);
}
