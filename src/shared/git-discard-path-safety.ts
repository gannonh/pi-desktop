import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";

const isENOENT = (error: unknown): boolean =>
	error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";

const isInsideOrEqual = (rootPath: string, candidatePath: string): boolean => {
	const relativePath = path.relative(rootPath, candidatePath);
	return (
		relativePath === "" ||
		(relativePath !== ".." && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath))
	);
};

const assertRealPathInsideWorktree = async (
	realWorktreePath: string,
	candidatePath: string,
	originalFilePath: string,
): Promise<void> => {
	const realCandidatePath = path.resolve(await realpath(candidatePath));
	if (!isInsideOrEqual(realWorktreePath, realCandidatePath)) {
		throw new Error(`Path "${originalFilePath}" resolves outside the worktree`);
	}
};

const assertNearestExistingParentInsideWorktree = async (
	realWorktreePath: string,
	candidatePath: string,
	originalFilePath: string,
): Promise<void> => {
	let parentPath = path.dirname(candidatePath);
	while (parentPath !== path.dirname(parentPath)) {
		try {
			await assertRealPathInsideWorktree(realWorktreePath, parentPath, originalFilePath);
			return;
		} catch (error) {
			if (!isENOENT(error)) {
				throw error;
			}
			parentPath = path.dirname(parentPath);
		}
	}

	throw new Error(`Path "${originalFilePath}" resolves outside the worktree`);
};

const assertTargetIsWorktreeChild = (
	resolvedWorktreePath: string,
	resolvedTarget: string,
	originalFilePath: string,
): void => {
	const relativeTarget = path.relative(resolvedWorktreePath, resolvedTarget);
	if (
		relativeTarget === "" ||
		relativeTarget === "." ||
		relativeTarget === ".." ||
		relativeTarget.startsWith(`..${path.sep}`) ||
		path.isAbsolute(relativeTarget)
	) {
		throw new Error(`Path "${originalFilePath}" resolves outside the worktree`);
	}
};

const pathExists = async (candidatePath: string): Promise<boolean> => {
	try {
		await lstat(candidatePath);
		return true;
	} catch (error) {
		if (isENOENT(error)) {
			return false;
		}
		throw error;
	}
};

const assertTargetDoesNotContainNestedRepository = async (
	resolvedWorktreePath: string,
	resolvedTarget: string,
	originalFilePath: string,
): Promise<void> => {
	let currentPath = resolvedTarget;
	try {
		const targetStats = await lstat(resolvedTarget);
		if (!targetStats.isDirectory()) {
			currentPath = path.dirname(resolvedTarget);
		}
	} catch (error) {
		if (!isENOENT(error)) {
			throw error;
		}
		currentPath = path.dirname(resolvedTarget);
	}

	while (isInsideOrEqual(resolvedWorktreePath, currentPath) && currentPath !== resolvedWorktreePath) {
		if (await pathExists(path.join(currentPath, ".git"))) {
			throw new Error(`Path "${originalFilePath}" resolves inside a nested git repository`);
		}
		currentPath = path.dirname(currentPath);
	}

	let targetStats: Awaited<ReturnType<typeof lstat>> | undefined;
	try {
		targetStats = await lstat(resolvedTarget);
	} catch (error) {
		if (!isENOENT(error)) {
			throw error;
		}
	}
	if (targetStats?.isDirectory()) {
		await assertDirectoryDescendantsDoNotContainNestedRepository(resolvedTarget, originalFilePath);
	}
};

const assertDirectoryDescendantsDoNotContainNestedRepository = async (
	directoryPath: string,
	originalFilePath: string,
): Promise<void> => {
	const entries = await readdir(directoryPath, { withFileTypes: true });
	for (const entry of entries) {
		const entryPath = path.join(directoryPath, entry.name);
		if (entry.name === ".git" && entry.isDirectory()) {
			throw new Error(`Path "${originalFilePath}" contains a nested git repository`);
		}
		if (entry.isDirectory() && !entry.isSymbolicLink()) {
			await assertDirectoryDescendantsDoNotContainNestedRepository(entryPath, originalFilePath);
		}
	}
};

const validateUntrackedDiscardTarget = async (worktreePath: string, filePath: string): Promise<string> => {
	const resolvedWorktreePath = path.resolve(worktreePath);
	const resolvedTarget = path.resolve(worktreePath, filePath);
	assertTargetIsWorktreeChild(resolvedWorktreePath, resolvedTarget, filePath);
	await assertTargetDoesNotContainNestedRepository(resolvedWorktreePath, resolvedTarget, filePath);

	const realWorktreePath = path.resolve(await realpath(worktreePath));

	try {
		const targetStats = await lstat(resolvedTarget);
		const pathToValidate = targetStats.isSymbolicLink() ? path.dirname(resolvedTarget) : resolvedTarget;
		await assertRealPathInsideWorktree(realWorktreePath, pathToValidate, filePath);
	} catch (error) {
		if (!isENOENT(error)) {
			throw error;
		}
		await assertNearestExistingParentInsideWorktree(realWorktreePath, resolvedTarget, filePath);
	}

	return resolvedTarget;
};

export const removeSafeUntrackedDiscardTarget = async (
	worktreePath: string,
	filePath: string,
	removePath: (filePath: string) => Promise<void>,
): Promise<void> => {
	await validateUntrackedDiscardTarget(worktreePath, filePath);
	await removePath(filePath);
};

export const removeSafeUntrackedDiscardTargets = async (
	worktreePath: string,
	filePaths: readonly string[],
	removePaths: (filePaths: readonly string[]) => Promise<void>,
	beforeRemove?: () => Promise<void>,
): Promise<void> => {
	await Promise.all(filePaths.map((filePath) => validateUntrackedDiscardTarget(worktreePath, filePath)));
	await beforeRemove?.();
	await Promise.all(filePaths.map((filePath) => validateUntrackedDiscardTarget(worktreePath, filePath)));
	await removePaths(filePaths);
};
