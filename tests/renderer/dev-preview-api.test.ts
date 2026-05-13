import { afterEach, describe, expect, it } from "vitest";
import { installDevPreviewApi } from "../../src/renderer/dev-preview-api";

const installApi = () => {
	const previewWindow = {};
	vi.stubGlobal("window", previewWindow);
	installDevPreviewApi();
	return (previewWindow as Window & typeof globalThis).piDesktop;
};

describe("dev preview API", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns an error result when a project operation references an unknown project", async () => {
		const api = installApi();

		const result = await api.project.select({ projectId: "project:/missing" });

		expect(result).toEqual({
			ok: false,
			error: {
				code: "preview.project_not_found",
				message: "Project not found in preview data.",
			},
		});
	});

	it("creates a unique project id for each preview existing-folder add", async () => {
		const api = installApi();

		const first = await api.project.addExistingFolder();
		const second = await api.project.addExistingFolder();

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!second.ok) {
			return;
		}
		const piMonoProjects = second.data.projects.filter((project) => project.path.includes("/pi-mono"));
		expect(new Set(piMonoProjects.map((project) => project.id)).size).toBe(piMonoProjects.length);
	});
});
