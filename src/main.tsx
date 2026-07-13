import { createRoot } from "react-dom/client";
import "./style.css";
import { App } from "./App";

// No <StrictMode>: react-pageflip does direct DOM manipulation through a
// ref, and StrictMode's dev-only double mount/unmount cycle leaves it
// with a stale/duplicate internal PageFlip instance.
createRoot(document.getElementById("root")!).render(<App />);
