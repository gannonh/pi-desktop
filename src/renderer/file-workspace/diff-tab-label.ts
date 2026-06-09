import type { GitDiffContext, GitDiffKind } from "../../shared/source-control/types";

const DIFF_KIND_LABELS: Record<GitDiffKind, string> = {
	unstaged: "Unstaged",
	staged: "Staged",
	untracked: "Untracked",
	branch: "Branch compare",
	commit: "Commit",
};

export const diffKindLabel = (kind: GitDiffKind): string => DIFF_KIND_LABELS[kind];

export const formatDiffTabLabel = (input: {
	relativePath: string;
	diffKind: GitDiffKind;
	diffContext?: GitDiffContext;
}): string => {
	const basename = input.relativePath.split("/").at(-1) ?? input.relativePath;
	const kindLabel = diffKindLabel(input.diffKind);
	if (input.diffContext?.compareRefs) {
		const { base, head } = input.diffContext.compareRefs;
		return `${basename} • ${base}...${head}`;
	}
	if (input.diffContext?.commitRef) {
		const shortRef =
			input.diffContext.commitRef.length > 12
				? input.diffContext.commitRef.slice(0, 7)
				: input.diffContext.commitRef;
		return `${basename} • ${shortRef}`;
	}
	return `${basename} • ${kindLabel}`;
};

export const formatDiffMetadata = (input: {
	relativePath: string;
	diffKind: GitDiffKind;
	diffContext?: GitDiffContext;
}): { title: string; subtitle: string } => {
	const title = input.relativePath.split("/").join(" › ");
	const kindLabel = diffKindLabel(input.diffKind);
	if (input.diffContext?.compareRefs) {
		const { base, head } = input.diffContext.compareRefs;
		return { title, subtitle: `${kindLabel} • ${base}...${head}` };
	}
	if (input.diffContext?.commitRef) {
		return { title, subtitle: `${kindLabel} • ${input.diffContext.commitRef}` };
	}
	return { title, subtitle: kindLabel };
};
