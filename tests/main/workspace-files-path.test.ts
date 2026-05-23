import { mkdir, mkdtemp, realpath, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listDirectory, readWorkspaceFile } from "../../src/main/workspace-files/workspace-files-service";
import {
	normalizeRelativePath,
	resolvePathWithinProjectRoot,
	WorkspacePathError,
} from "../../src/main/workspace-files/path-guard";

describe("workspace files path guard", () => {
	let tempRoot = "";

	afterEach(async () => {
		if (tempRoot) {
			const { rm } = await import("node:fs/promises");
			await rm(tempRoot, { recursive: true, force: true });
			tempRoot = "";
		}
	});

	const createProject = async () => {
		tempRoot = await mkdtemp(join(tmpdir(), "pi-desktop-workspace-"));
		await writeFile(join(tempRoot, "README.md"), "# hello\n", "utf8");
		await mkdir(join(tempRoot, "docs"), { recursive: true });
		await writeFile(join(tempRoot, "docs", "note.md"), "note\n", "utf8");
		return tempRoot;
	};

	it("normalizes empty relative path to project root", () => {
		expect(normalizeRelativePath("")).toBe("");
		expect(normalizeRelativePath("./")).toBe("");
	});

	it("rejects traversal segments", () => {
		expect(() => normalizeRelativePath("../secret.txt")).toThrow(WorkspacePathError);
	});

	it("resolves files within the project root", async () => {
		const projectRoot = await createProject();
		const resolved = await resolvePathWithinProjectRoot(projectRoot, "docs/note.md");
		expect(resolved).toBe(await realpath(join(projectRoot, "docs", "note.md")));
	});

	it("rejects symlink escape outside the project root", async () => {
		const projectRoot = await createProject();
		const outsideDir = await mkdtemp(join(tmpdir(), "pi-desktop-outside-"));
		await writeFile(join(outsideDir, "secret.txt"), "secret\n", "utf8");
		await symlink(outsideDir, join(projectRoot, "escape"), "dir");

		await expect(resolvePathWithinProjectRoot(projectRoot, "escape/secret.txt")).rejects.toThrow(WorkspacePathError);
	});

	it("rejects listing a file path", async () => {
		const projectRoot = await createProject();
		await expect(listDirectory(projectRoot, "README.md")).rejects.toThrow(WorkspacePathError);
	});

	it("rejects reading the project root as a file", async () => {
		const projectRoot = await createProject();
		await expect(readWorkspaceFile(projectRoot, "")).rejects.toThrow(WorkspacePathError);
	});

	it("skips node_modules and dot directories when listing", async () => {
		const projectRoot = await createProject();
		await mkdir(join(projectRoot, "node_modules", "pkg"), { recursive: true });
		await mkdir(join(projectRoot, ".git"), { recursive: true });

		const listing = await listDirectory(projectRoot, "");
		const names = listing.entries.map((entry) => entry.name);

		expect(names).toContain("README.md");
		expect(names).toContain("docs");
		expect(names).not.toContain("node_modules");
		expect(names).not.toContain(".git");
	});
});
