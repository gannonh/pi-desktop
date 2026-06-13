import { Badge } from "./ui/badge";

export interface SessionScopeHeaderProps {
	title: string;
	path?: string | null;
	resumeLabel?: string;
	metadataLabel?: string;
	variant: "bar" | "centered";
	titleId?: string;
	/** Omit session metadata — for fixed-height workspace chrome. */
	compact?: boolean;
}

export function SessionScopeHeader({
	title,
	path,
	resumeLabel,
	metadataLabel,
	variant,
	titleId,
	compact = false,
}: SessionScopeHeaderProps) {
	const showMetadata = !compact && Boolean(resumeLabel && metadataLabel);
	const showPath = Boolean(path);

	if (variant === "centered") {
		return (
			<div className="chat-shell__start-heading">
				<h1 id={titleId} className="chat-shell__title">
					{title}
				</h1>
				{showMetadata ? (
					<section
						className="chat-shell__session-labels chat-shell__session-labels--centered"
						aria-label="Session metadata"
					>
						<span className="chat-shell__resume-label">{resumeLabel}</span>
						<span className="chat-shell__metadata-label">{metadataLabel}</span>
					</section>
				) : null}
			</div>
		);
	}

	return (
		<>
			{(title || showMetadata) && (
				<div className="app-shell__main-header-copy">
					{title ? (
						<h1 id={titleId} className="app-shell__chat-title app-chrome-title" title={title}>
							{title}
						</h1>
					) : null}
					{showMetadata ? (
						<section className="app-shell__session-labels" aria-label="Session metadata">
							<span className="app-shell__resume-label">{resumeLabel}</span>
							<span className="app-shell__metadata-label">{metadataLabel}</span>
						</section>
					) : null}
				</div>
			)}
			{showPath ? (
				<Badge className="app-shell__path-badge" variant="outline" title={path ?? undefined}>
					{path}
				</Badge>
			) : null}
		</>
	);
}
