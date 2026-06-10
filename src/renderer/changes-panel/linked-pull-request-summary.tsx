import { ExternalLink } from "lucide-react";
import type { SourceControlPullRequestInfo } from "../../shared/source-control/types";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getPullRequestStateDisplay } from "./pull-request-state-display";

type LinkedPullRequestSummaryProps = {
	pullRequest: SourceControlPullRequestInfo;
	onOpenInBrowser: () => void;
	onCopyLink: () => void;
};

export function LinkedPullRequestSummary({
	pullRequest,
	onOpenInBrowser,
	onCopyLink,
}: LinkedPullRequestSummaryProps) {
	const stateDisplay = getPullRequestStateDisplay(pullRequest.state);

	return (
		<div className="changes-panel__linked-pr" data-testid="linked-pull-request">
			<div className="changes-panel__linked-pr-heading">
				<Badge variant={stateDisplay.variant}>{stateDisplay.label}</Badge>
				<span className="changes-panel__linked-pr-title">{pullRequest.title}</span>
				{pullRequest.number ? (
					<span className="changes-panel__linked-pr-number">#{pullRequest.number}</span>
				) : null}
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
