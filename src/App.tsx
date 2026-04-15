import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RouteProvider } from "@/providers/route-provider";

export default function App() {
	return (
		<BrowserRouter>
			<RouteProvider>
				<Routes>
					<Route path="/" element={null} />
					<Route path="*" />
				</Routes>
			</RouteProvider>
		</BrowserRouter>
	);
}
