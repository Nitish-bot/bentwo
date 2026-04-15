import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/index.css";
import App from "@/App.tsx";
import { ThemeProvider } from "@/providers/theme-provider.tsx";

// biome-ignore lint/style/noNonNullAssertion: root exists in html
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ThemeProvider>
			<App />
		</ThemeProvider>
	</StrictMode>,
);
