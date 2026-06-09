import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeGitCQuotedPath } from "../../src/shared/git-cquoted-path";
import {
	removeSafeUntrackedDiscardTarget,
	removeSafeUntrackedDiscardTargets,
} from "../../src/shared/git-discard-path-safety";

describe("git path helpers", () => {
	let tempDir = "";

	afterEach(async () => {
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
			tempDir = "";
		}
	});

	const createWorktree = async () => {
		tempDir = await mkdtemp(join(tmpdir(), "pi-git-path-helpers-"));
		const worktree = join(tempDir, "worktree");
		await mkdir(worktree);
		return worktree;
	};

	it("decodes git C-quoted path escapes", () => {
		expect(decodeGitCQuotedPath("plain.txt")).toBe("plain.txt");
		expect(decodeGitCQuotedPath('"space name.txt"')).toBe("space name.txt");
		expect(decodeGitCQuotedPath('"line\\nquote\\"tab\\tbackslash\\\\.txt"')).toBe('line\nquote"tab\tbackslash\\.txt');
		expect(decodeGitCQuotedPath('"octal\\040bell\\007.txt"')).toBe("octal bell\u0007.txt");
		expect(decodeGitCQuotedPath('"caf\\303\\251.txt"')).toBe("café.txt");
		expect(decodeGitCQuotedPath('"alarm\\aback\\bform\\freturn\\rvertical\\v.txt"')).toBe(
			"alarm\u0007back\bform\freturn\rvertical\v.txt",
		);
		expect(decodeGitCQuotedPath('"unknown\\x.txt"')).toBe("unknownx.txt");
	});

	it("allows safe untracked discard targets inside the worktree", async () => {
		const worktree = await createWorktree();
		await mkdir(join(worktree, "src"));
		await writeFile(join(worktree, "src", "temp.txt"), "temp\n", "utf8");
		const removePath = vi.fn(async () => undefined);

		await removeSafeUntrackedDiscardTarget(worktree, "src/temp.txt", removePath);

		expect(removePath).toHaveBeenCalledWith("src/temp.txt");
	});

	it("rejects symlink targets and parent traversal outside the worktree", async () => {
		const worktree = await createWorktree();
		const outside = join(tempDir, "outside");
		await mkdir(outside);
		await symlink(outside, join(worktree, "link-out"));

		await expect(removeSafeUntrackedDiscardTarget(worktree, "../outside/file.txt", vi.fn())).rejects.toThrow(
			/outside the worktree/,
		);
		await expect(removeSafeUntrackedDiscardTarget(worktree, "link-out/file.txt", vi.fn())).rejects.toThrow(
			/outside the worktree/,
		);
	});

	it("validates bulk discard targets before and after the optional pre-remove hook", async () => {
		const worktree = await createWorktree();
		await mkdir(join(worktree, "src"));
		const beforeRemove = vi.fn(async () => undefined);
		const removePaths = vi.fn(async () => undefined);

		await removeSafeUntrackedDiscardTargets(worktree, ["src/a.txt", "src/b.txt"], removePaths, beforeRemove);

		expect(beforeRemove).toHaveBeenCalledTimes(1);
		expect(removePaths).toHaveBeenCalledWith(["src/a.txt", "src/b.txt"]);
	});

	it("supports bulk discard without a pre-remove hook and rejects the worktree root", async () => {
		const worktree = await createWorktree();
		await mkdir(join(worktree, "src"));
		const removePaths = vi.fn(async () => undefined);

		await removeSafeUntrackedDiscardTargets(worktree, ["src/a.txt"], removePaths);
		await expect(removeSafeUntrackedDiscardTarget(worktree, ".", vi.fn())).rejects.toThrow(/outside the worktree/);

		expect(removePaths).toHaveBeenCalledWith(["src/a.txt"]);
	});

	it("rejects discard targets inside nested git repositories", async () => {
		const worktree = await createWorktree();
		await mkdir(join(worktree, "nested", ".git"), { recursive: true });
		await writeFile(join(worktree, "nested", "file.txt"), "nested\n", "utf8");

		await expect(removeSafeUntrackedDiscardTarget(worktree, "nested", vi.fn())).rejects.toThrow(/nested git/);
		await expect(removeSafeUntrackedDiscardTarget(worktree, "nested/file.txt", vi.fn())).rejects.toThrow(
			/nested git/,
		);
	});

	it("rejects discard targets that contain nested git repositories below them", async () => {
		const worktree = await createWorktree();
		await mkdir(join(worktree, "vendor", "pkg", ".git"), { recursive: true });
		await writeFile(join(worktree, "vendor", "pkg", "file.txt"), "nested\n", "utf8");

		await expect(removeSafeUntrackedDiscardTarget(worktree, "vendor", vi.fn())).rejects.toThrow(/nested git/);
	});
});
