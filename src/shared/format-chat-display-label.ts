const skillInvocationPattern = /[<‹]skill\s+name="([^"]+)"/i;
const skillCompactPattern = /^\[skill\]\s*([^\s:\]]+)/i;

export const formatChatDisplayLabel = (title: string): string => {
	const trimmed = title.trim();
	if (!trimmed || /^Skill:\s/.test(trimmed)) {
		return title;
	}

	const skillMatch = trimmed.match(skillInvocationPattern);
	if (skillMatch?.[1]) {
		return `Skill: ${skillMatch[1]}`;
	}

	const compactMatch = trimmed.match(skillCompactPattern);
	if (compactMatch?.[1]) {
		return `Skill: ${compactMatch[1]}`;
	}

	return title;
};
