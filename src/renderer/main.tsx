import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";
import { App } from "./App";
import { createHttpPiDesktopApi } from "./app-api/http-client";
import { createUnavailablePiDesktopApi } from "./app-api/unavailable-api";
import "./styles.css";

if (!Object.hasOwn(window, "piDesktop")) {
	const appServerUrl = import.meta.env.VITE_PI_DESKTOP_APP_SERVER_URL;
	window.piDesktop =
		typeof appServerUrl === "string" && appServerUrl.trim().length > 0
			? createHttpPiDesktopApi({ baseUrl: appServerUrl })
			: createUnavailablePiDesktopApi("No app transport configured.");
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
