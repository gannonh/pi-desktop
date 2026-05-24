import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";
import { App } from "./App";
import { createHttpPiDesktopApi } from "./app-api/http-client";
import { createUnavailablePiDesktopApi } from "./app-api/unavailable-api";
import "./markdown/prism-global";
import "./styles.css";

if (!Object.hasOwn(window, "piDesktop")) {
	const useSameOriginBridge = import.meta.env.VITE_PI_DESKTOP_USE_SAME_ORIGIN_BRIDGE === "1";
	const appServerUrl = import.meta.env.VITE_PI_DESKTOP_APP_SERVER_URL?.trim() ?? "";
	const bridgeBaseUrl = useSameOriginBridge ? "" : appServerUrl;
	window.piDesktop =
		useSameOriginBridge || bridgeBaseUrl.length > 0
			? createHttpPiDesktopApi({ baseUrl: bridgeBaseUrl })
			: createUnavailablePiDesktopApi("No app transport configured. Start the preview with `pnpm dev:web`.");
}

const root = document.getElementById("root");

if (!root) {
	throw new Error("Renderer root element was not found");
}

createRoot(root).render(
	<StrictMode>
		<App />
		{process.env.NODE_ENV === "development" && <Agentation />}
	</StrictMode>,
);
