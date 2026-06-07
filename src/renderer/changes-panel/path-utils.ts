export const normalizeRelativePath = (relativePath: string): string =>
	relativePath.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
