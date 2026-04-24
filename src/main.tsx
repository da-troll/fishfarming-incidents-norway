import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// No StrictMode: it double-invokes effects in dev, which re-triggers the slow
// paginated API loader and can visually reset partially-loaded rows.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
