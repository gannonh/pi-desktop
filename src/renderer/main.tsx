import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installDevPreviewApi } from "./dev-preview-api";
import "./styles.css";

if (window.location.protocol === "http:" || window.location.protocol === "https:") {
	installDevPreviewApi();
}

const root = document.getElementById("root");

if (!root) {
	throw new Error("Renderer root element was not found");
}

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
