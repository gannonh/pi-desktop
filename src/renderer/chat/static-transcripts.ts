export interface StaticTranscriptCard {
	title: string;
	subtitle: string;
	actionLabel: string;
}

export interface StaticTranscript {
	workedLabel: string;
	assistantSummary: string[];
	cards: StaticTranscriptCard[];
	userFollowUp: string;
	followUpWorkedLabel: string;
	followUpSummary: string[];
}

const transcripts: Record<string, StaticTranscript> = {
	"chat:milestone-01": {
		workedLabel: "Worked for 7m 10s",
		assistantSummary: [
			"Resolved the new open review threads.",
			"Pushed f1eef6ac: fix(projects): address follow-up review comments",
			"Verification: pnpm check passed locally and in the pre-push hook.",
		],
		cards: [
			{
				title: "SKILL.md",
				subtitle: "Document · MD",
				actionLabel: "Open",
			},
			{
				title: "11 files changed",
				subtitle: "+357 -163",
				actionLabel: "Review",
			},
		],
		userFollowUp: "land the pr",
		followUpWorkedLabel: "Worked for 55s",
		followUpSummary: [
			"Landed PR #2.",
			"Merged: feat: add Milestone 1 sidebar shell",
			"Checks: check and CodeRabbit passed",
		],
	},
};

export const getStaticTranscript = (chatId: string): StaticTranscript | undefined => transcripts[chatId];
