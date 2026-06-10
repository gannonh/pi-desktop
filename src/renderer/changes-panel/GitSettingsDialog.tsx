import { useEffect, useState } from "react";
import type { ProjectStateViewResult } from "../../shared/ipc";
import { DEFAULT_BASE_REF } from "../../shared/project-state";
import { Button } from "../components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../components/ui/dialog";

type GitSettingsDialogProps = {
	open: boolean;
	projectId: string | null;
	initialDefaultBaseRef: string;
	onOpenChange: (open: boolean) => void;
	onSaved?: (result: ProjectStateViewResult) => void;
};

export function GitSettingsDialog({
	open,
	projectId,
	initialDefaultBaseRef,
	onOpenChange,
	onSaved,
}: GitSettingsDialogProps) {
	const [defaultBaseRef, setDefaultBaseRef] = useState(initialDefaultBaseRef);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (open) {
			setDefaultBaseRef(initialDefaultBaseRef);
			setError(null);
		}
	}, [initialDefaultBaseRef, open]);

	const save = async () => {
		if (!projectId) {
			return;
		}

		const trimmed = defaultBaseRef.trim();
		if (!trimmed) {
			setError("Default base ref is required.");
			return;
		}
		if (trimmed.startsWith("-")) {
			setError("Git ref must not start with '-'.");
			return;
		}

		setIsSaving(true);
		setError(null);
		try {
			const result = await window.piDesktop.project.setGitSettings({
				projectId,
				defaultBaseRef: trimmed,
			});
			if (!result.ok) {
				setError(result.error.message);
				return;
			}
			onSaved?.(result);
			onOpenChange(false);
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : "Unable to save git settings.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !isSaving && onOpenChange(nextOpen)}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Git settings</DialogTitle>
					<DialogDescription>
						Set the default base branch for branch compare, rebase, and pull request generation in this project.
					</DialogDescription>
				</DialogHeader>
				<form
					className="changes-panel__git-settings-form"
					onSubmit={(event) => {
						event.preventDefault();
						void save();
					}}
				>
					<label className="changes-panel__git-settings-field">
						<span>Default base ref</span>
						<input
							value={defaultBaseRef}
							onChange={(event) => setDefaultBaseRef(event.target.value)}
							placeholder={DEFAULT_BASE_REF}
							aria-label="Default base ref"
							disabled={isSaving}
						/>
					</label>
					{error ? <p className="changes-panel__error">{error}</p> : null}
					<DialogFooter>
						<Button type="button" variant="ghost" disabled={isSaving} onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving || !projectId}>
							{isSaving ? "Saving…" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
