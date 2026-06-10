import { useState } from "react";
import { Button } from "../components/ui/button";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../components/ui/alert-dialog";
import type { CommitFailurePresentation } from "./commit-failure-recovery";

type CommitFailureRecoveryDialogProps = {
	open: boolean;
	presentation: CommitFailurePresentation;
	isRecovering: boolean;
	recoveryError: string | null;
	onDismiss: () => void;
	onRecover: () => void;
};

export function CommitFailureRecoveryDialog({
	open,
	presentation,
	isRecovering,
	recoveryError,
	onDismiss,
	onRecover,
}: CommitFailureRecoveryDialogProps) {
	const [detailsExpanded, setDetailsExpanded] = useState(false);

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !isRecovering) {
					onDismiss();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Commit failed</AlertDialogTitle>
					<AlertDialogDescription>{presentation.summary}</AlertDialogDescription>
				</AlertDialogHeader>
				{presentation.details ? (
					<details
						className="changes-panel__commit-failure-details"
						open={detailsExpanded}
						onToggle={(event) => setDetailsExpanded(event.currentTarget.open)}
					>
						<summary>Show git output</summary>
						<pre className="changes-panel__commit-failure-output">{presentation.details}</pre>
					</details>
				) : null}
				{recoveryError ? <p className="changes-panel__error">{recoveryError}</p> : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isRecovering}>Dismiss</AlertDialogCancel>
					<Button type="button" disabled={isRecovering} onClick={() => void onRecover()}>
						{isRecovering ? "Starting Pi recovery…" : "Recover with Pi"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
