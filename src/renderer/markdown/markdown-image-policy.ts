const markdownImagePattern = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

const escapeSvgText = (value: string): string =>
	value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const isUnsupportedLocalImageSource = (source: string): boolean => {
	const trimmed = source.trim();
	if (!trimmed) {
		return false;
	}

	return !/^(?:https?:|data:|blob:)/i.test(trimmed);
};

export const unsupportedLocalImageSources = (markdown: string): string[] => {
	const sources = new Set<string>();
	for (const match of markdown.matchAll(markdownImagePattern)) {
		const source = match[1]?.trim();
		if (source && isUnsupportedLocalImageSource(source)) {
			sources.add(source);
		}
	}
	return [...sources];
};

export const unsupportedLocalImagePreviewDataUri = (source: string): string => {
	const safeSource = escapeSvgText(source);
	const label = `Local image preview unavailable: ${safeSource}`;
	const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" width="720" height="160" viewBox="0 0 720 160" role="img" aria-label="${label}">
			<rect width="720" height="160" rx="12" fill="#242424" />
			<rect x="16" y="16" width="688" height="128" rx="10" fill="none" stroke="rgba(255,255,255,0.22)" stroke-dasharray="8 8" />
			<text x="40" y="72" fill="#f5f5f5" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="18" font-weight="600">Local image preview unavailable</text>
			<text x="40" y="106" fill="#b5b5b5" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" font-size="14">${safeSource}</text>
		</svg>`;

	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const markdownImagePreviewHandler = async (source: string): Promise<string> => {
	if (isUnsupportedLocalImageSource(source)) {
		return unsupportedLocalImagePreviewDataUri(source);
	}
	return source;
};
