import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/fx.css";
import { startApp } from "./ui/app.ts";

startApp(document.getElementById("app")!);

// Offline support (production only; the dev server must never be cached). sw.js is written by vite.config.ts.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => console.warn("No offline mode:", e));
  });
}
