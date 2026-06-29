// Vite/Vercel entry point. (In the Figma Make preview an entry is auto-generated;
// this file is what `vite build` uses for a real Vercel deployment.)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
