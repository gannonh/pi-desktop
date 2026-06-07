import type { GitStagingArea, GitStatusEntry } from "../../shared/source-control/types";
import { normalizeRelativePath } from "./path-utils";
import { splitPathSegments } from "./path-tree";
import { compareGitStatusEntries } from "./source-control-status-sort";

export type SourceControlTreeArea = Extract<GitStagingArea, "unstaged" | "staged" | "untracked">;

export type SourceControlTreeEntry = {
	path: string;
};

export type SourceControlTreeFileNode<
	Entry extends SourceControlTreeEntry = GitStatusEntry,
	Area extends string = SourceControlTreeArea,
> = {
	type: "file";
	key: string;
	name: string;
	path: string;
	entry: Entry;
	area: Area;
	depth: number;
};

export type SourceControlTreeDirectoryNode<
	Entry extends SourceControlTreeEntry = GitStatusEntry,
	Area extends string = SourceControlTreeArea,
> = {
	type: "directory";
	key: string;
	name: string;
	path: string;
	area: Area;
	depth: number;
	fileCount: number;
	children: SourceControlTreeNode<Entry, Area>[];
};

export type SourceControlTreeNode<
	Entry extends SourceControlTreeEntry = GitStatusEntry,
	Area extends string = SourceControlTreeArea,
> = SourceControlTreeFileNode<Entry, Area> | SourceControlTreeDirectoryNode<Entry, Area>;

type MutableDirectoryNode<Entry extends SourceControlTreeEntry, Area extends string> = Omit<
	SourceControlTreeDirectoryNode<Entry, Area>,
	"children"
> & {
	children: SourceControlTreeNode<Entry, Area>[];
	directoryChildren: Map<string, MutableDirectoryNode<Entry, Area>>;
};

const compareTreeEntriesByPath = (left: SourceControlTreeEntry, right: SourceControlTreeEntry): number =>
	left.path.localeCompare(right.path, undefined, { numeric: true });

const makeDirectoryNode = <Entry extends SourceControlTreeEntry, Area extends string>(
	area: Area,
	path: string,
	name: string,
	depth: number,
): MutableDirectoryNode<Entry, Area> => ({
	type: "directory",
	key: `dir::${area}::${path}`,
	name,
	path,
	area,
	depth,
	fileCount: 0,
	children: [],
	directoryChildren: new Map(),
});

const finalizeDirectoryNode = <Entry extends SourceControlTreeEntry, Area extends string>(
	node: MutableDirectoryNode<Entry, Area>,
	compareEntries: (left: Entry, right: Entry) => number,
): SourceControlTreeDirectoryNode<Entry, Area> => {
	const directories: SourceControlTreeDirectoryNode<Entry, Area>[] = [];
	const files: SourceControlTreeFileNode<Entry, Area>[] = [];

	for (const child of node.children) {
		if (child.type === "directory") {
			directories.push(finalizeDirectoryNode(child as MutableDirectoryNode<Entry, Area>, compareEntries));
		} else {
			files.push(child);
		}
	}

	directories.sort((left, right) => left.name.localeCompare(right.name));
	files.sort((left, right) => compareEntries(left.entry, right.entry));
	const fileCount = files.length + directories.reduce((count, directory) => count + directory.fileCount, 0);

	return {
		type: "directory",
		key: node.key,
		name: node.name,
		path: node.path,
		area: node.area,
		depth: node.depth,
		fileCount,
		children: [...directories, ...files],
	};
};

export const buildSourceControlTree = <
	Entry extends SourceControlTreeEntry = GitStatusEntry,
	Area extends string = SourceControlTreeArea,
>(
	area: Area,
	entries: Entry[],
	compareEntries: (left: Entry, right: Entry) => number = compareTreeEntriesByPath,
): SourceControlTreeNode<Entry, Area>[] => {
	const root = makeDirectoryNode<Entry, Area>(area, "", "", -1);

	for (const entry of entries) {
		const normalizedPath = normalizeRelativePath(entry.path);
		const segments = splitPathSegments(normalizedPath);
		if (segments.length === 0) {
			continue;
		}

		let parent = root;
		for (let index = 0; index < segments.length - 1; index += 1) {
			const name = segments[index];
			const segmentPath = segments.slice(0, index + 1).join("/");
			let directory = parent.directoryChildren.get(name);
			if (!directory) {
				directory = makeDirectoryNode<Entry, Area>(area, segmentPath, name, index);
				parent.directoryChildren.set(name, directory);
				parent.children.push(directory);
			}
			parent = directory;
		}

		const fileName = segments[segments.length - 1];
		if (!fileName) {
			continue;
		}
		parent.children.push({
			type: "file",
			key: `${area}::${entry.path}`,
			name: fileName,
			path: normalizedPath,
			entry,
			area,
			depth: segments.length - 1,
		});
	}

	return finalizeDirectoryNode(root, compareEntries).children;
};

export const buildGitStatusSourceControlTree = (
	area: SourceControlTreeArea,
	entries: GitStatusEntry[],
): SourceControlTreeNode<GitStatusEntry, SourceControlTreeArea>[] =>
	buildSourceControlTree(area, entries, compareGitStatusEntries);

export const flattenSourceControlTree = <Entry extends SourceControlTreeEntry, Area extends string>(
	nodes: SourceControlTreeNode<Entry, Area>[],
	collapsedDirectoryKeys: ReadonlySet<string>,
): SourceControlTreeNode<Entry, Area>[] => {
	const result: SourceControlTreeNode<Entry, Area>[] = [];

	const visit = (node: SourceControlTreeNode<Entry, Area>): void => {
		result.push(node);
		if (node.type === "directory" && !collapsedDirectoryKeys.has(node.key)) {
			for (const child of node.children) {
				visit(child);
			}
		}
	};

	for (const node of nodes) {
		visit(node);
	}

	return result;
};

export const compactSourceControlTree = <Entry extends SourceControlTreeEntry, Area extends string>(
	nodes: SourceControlTreeNode<Entry, Area>[],
): SourceControlTreeNode<Entry, Area>[] => {
	const compactNode = (
		node: SourceControlTreeNode<Entry, Area>,
		depth: number,
	): SourceControlTreeNode<Entry, Area> => {
		if (node.type === "file") {
			return { ...node, depth };
		}

		const names = [node.name];
		let compacted = node;
		while (compacted.children.length === 1 && compacted.children[0]?.type === "directory") {
			compacted = compacted.children[0];
			names.push(compacted.name);
		}

		return {
			...compacted,
			name: names.join("/"),
			depth,
			children: compacted.children.map((child) => compactNode(child, depth + 1)),
		};
	};

	return nodes.map((node) => compactNode(node, 0));
};
