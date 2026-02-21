import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import "./App.css";
import "./editor/editor.css";
import { Editor } from "./editor/Editor";

const fonts: Record<string, string> = {
  default: "Georgia, serif",
  classical: "Baskerville, 'Baskerville Old Face', Georgia, serif",
  modern: "'JetBrains Mono', Menlo, ui-monospace, monospace",
};

const sizes: Record<string, string> = {
  small: "0.9375rem",
  default: "1.0625rem",
  large: "1.25rem",
};

function setVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

// Apply persisted preferences on startup
const savedFont = fonts[localStorage.getItem("font") ?? "default"] ?? fonts.default;
const savedSize = sizes[localStorage.getItem("size") ?? "default"] ?? sizes.default;
setVar("--font", savedFont);
setVar("--font-size", savedSize);

function App() {
  useEffect(() => {
    const unlistenFont = listen<string>("font_change", (e) => {
      const font = fonts[e.payload];
      if (font) {
        setVar("--font", font);
        localStorage.setItem("font", e.payload);
      }
    });

    const unlistenSize = listen<string>("size_change", (e) => {
      const size = sizes[e.payload];
      if (size) {
        setVar("--font-size", size);
        localStorage.setItem("size", e.payload);
      }
    });

    return () => {
      unlistenFont.then((f) => f());
      unlistenSize.then((f) => f());
    };
  }, []);

  return (
    <div className="app">
      <Editor />
    </div>
  );
}

export default App;
