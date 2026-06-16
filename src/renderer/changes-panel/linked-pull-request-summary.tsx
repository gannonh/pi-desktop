import { ExternalLink, GitPullRequest } from "lucide-react";
import type { SourceControlPullRequestInfo } from "../../shared/source-control/types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
	buildPullRequestOpenLabel,
	formatPullRequestNumber,
	getPullRequestStateDisplay,
} from "./pull-request-state-display";

type LinkedPullRequestSummaryProps = {
	pullRequest: SourceControlPullRequestInfo;
	onOpenInBrowser: () => void;
	onCopyLink: () => void;
};

export function LinkedPullRequestHeaderLink({
	pullRequest,
	onOpenInBrowser,
}: {
	pullRequest: SourceControlPullRequestInfo;
	onOpenInBrowser: () => void;
}) {
	const stateDisplay = getPullRequestStateDisplay(pullRequest);
	const numberLabel = formatPullRequestNumber(pullRequest.number);

	return (
		<button
			type="button"
			className="changes-panel__linked-pr-header"
			data-testid="changes-panel-linked-pr-header"
			onClick={onOpenInBrowser}
			aria-label={buildPullRequestOpenLabel(pullRequest)}
			title={pullRequest.url}
		>
			<GitPullRequest aria-hidden className="changes-panel__linked-pr-header-icon" />
			<span className="changes-panel__linked-pr-header-kicker">Pull request</span>
			<span className="changes-panel__linked-pr-header-number">{numberLabel}</span>
			<Badge variant={stateDisplay.variant}>{stateDisplay.label}</Badge>
			<span className="changes-panel__linked-pr-header-title">{pullRequest.title}</span>
			<ExternalLink aria-hidden className="changes-panel__linked-pr-header-open-icon" />
		</button>
	);
}

export function LinkedPullRequestSummary({ pullRequest, onOpenInBrowser, onCopyLink }: LinkedPullRequestSummaryProps) {
	const stateDisplay = getPullRequestStateDisplay(pullRequest);
	const numberLabel = formatPullRequestNumber(pullRequest.number);

	return (
		<div className="changes-panel__linked-pr" data-testid="linked-pull-request">
			<div className="changes-panel__linked-pr-heading">
				<span className="changes-panel__linked-pr-kicker">Linked pull request</span>
				<span className="changes-panel__linked-pr-number">{numberLabel}</span>
				<Badge variant={stateDisplay.variant}>{stateDisplay.label}</Badge>
				<span className="changes-panel__linked-pr-title">{pullRequest.title}</span>
			</div>
			<div className="changes-panel__linked-pr-actions">
				<Button type="button" variant="secondary" size="sm" onClick={onOpenInBrowser}>
					<ExternalLink aria-hidden />
					Open in Browser
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={onCopyLink}>
					Copy PR Link
				</Button>
			</div>
		</div>
	);
}
