import { Box, ChevronDown, ExternalLink } from "lucide-react";
import type { StaticTranscript } from "../chat/static-transcripts";

interface ChatTranscriptProps {
	title: string;
	transcript: StaticTranscript;
}

export function ChatTranscript({ title, transcript }: ChatTranscriptProps) {
	return (
		<div className="chat-transcript" aria-label={`${title} transcript`}>
			<div className="chat-transcript__entry">
				<button className="chat-transcript__worked" type="button" disabled>
					{transcript.workedLabel}
					<ChevronDown className="chat-transcript__icon" />
				</button>
				<div className="chat-transcript__assistant">
					{transcript.assistantSummary.map((line) => (
						<p key={line}>{line}</p>
					))}
				</div>
				<div className="chat-transcript__cards">
					{transcript.cards.map((card) => (
						<div className="chat-transcript__card" key={card.title}>
							<div className="chat-transcript__card-icon">
								<Box className="chat-transcript__icon" />
							</div>
							<div className="chat-transcript__card-copy">
								<div className="chat-transcript__card-title">{card.title}</div>
								<div className="chat-transcript__card-subtitle">{card.subtitle}</div>
							</div>
							<button className="chat-transcript__card-action" type="button" disabled>
								{card.actionLabel}
								<ExternalLink className="chat-transcript__icon" />
							</button>
						</div>
					))}
				</div>
			</div>
			<div className="chat-transcript__user-bubble">{transcript.userFollowUp}</div>
			<div className="chat-transcript__entry">
				<button className="chat-transcript__worked" type="button" disabled>
					{transcript.followUpWorkedLabel}
					<ChevronDown className="chat-transcript__icon" />
				</button>
				<div className="chat-transcript__assistant">
					{transcript.followUpSummary.map((line) => (
						<p key={line}>{line}</p>
					))}
				</div>
			</div>
		</div>
	);
}
