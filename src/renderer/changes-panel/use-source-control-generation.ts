import { useCallback, useRef, useState } from "react";
import type { IpcResult } from "../../shared/result";

type GenerationState = "idle" | "loading" | "success" | "error";

const createRequestId = (): string => {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `generation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const useSourceControlGeneration = <T>({
	run,
	onSuccess,
}: {
	run: (requestId: string) => Promise<IpcResult<T>>;
	onSuccess: (data: T) => void;
}) => {
	const [state, setState] = useState<GenerationState>("idle");
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const activeRequestIdRef = useRef<string | null>(null);
	const generationRef = useRef(0);

	const clearFeedback = useCallback(() => {
		setError(null);
		setSuccessMessage(null);
	}, []);

	const cancel = useCallback(async () => {
		const requestId = activeRequestIdRef.current;
		generationRef.current += 1;
		activeRequestIdRef.current = null;
		setState("idle");
		setError(null);
		setSuccessMessage(null);
		if (requestId) {
			await window.piDesktop.sourceControl.cancelGeneration({ requestId });
		}
	}, []);

	const generate = useCallback(async () => {
		const generation = generationRef.current + 1;
		generationRef.current = generation;
		const requestId = createRequestId();
		activeRequestIdRef.current = requestId;
		setState("loading");
		setError(null);
		setSuccessMessage(null);

		const result = await run(requestId);
		if (generation !== generationRef.current || activeRequestIdRef.current !== requestId) {
			return;
		}

		activeRequestIdRef.current = null;

		if (!result.ok) {
			if (result.error.code === "source_control.generation_cancelled") {
				setState("idle");
				return;
			}
			setState("error");
			setError(result.error.message);
			return;
		}

		onSuccess(result.data);
		setState("success");
		setSuccessMessage("Draft generated");
	}, [onSuccess, run]);

	return {
		state,
		error,
		successMessage,
		isGenerating: state === "loading",
		generate,
		cancel,
		clearFeedback,
	};
};
