import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { type CaretStyle, setCaretStyle } from "~/editor/plugins/caret";

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

function setTheme(value: string) {
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (value === "system") {
    document.documentElement.removeAttribute("data-theme");
    if (meta) meta.setAttribute("content", "light dark");
  } else {
    document.documentElement.setAttribute("data-theme", value);
    if (meta) meta.setAttribute("content", value);
  }
}

// Apply persisted preferences on startup (runs at module load time, before React mounts)
const savedFont = fonts[localStorage.getItem("font") ?? "default"] ?? fonts.default;
const savedSize = sizes[localStorage.getItem("size") ?? "default"] ?? sizes.default;
setVar("--font", savedFont);
setVar("--font-size", savedSize);
setTheme(localStorage.getItem("appearance") ?? "system");

export function useAppearance(): void {
  useEffect(() => {
    const unlistenFont = listen<string>("font_change", (e) => {
      const font = fonts[e.payload];
      if (font) {
        setVar("--font", font);
        localStorage.setItem("font", e.payload);
      }
    });
    const unlistenAppearance = listen<string>("appearance_change", (e) => {
      setTheme(e.payload);
      localStorage.setItem("appearance", e.payload);
    });
    const unlistenSize = listen<string>("size_change", (e) => {
      const size = sizes[e.payload];
      if (size) {
        setVar("--font-size", size);
        localStorage.setItem("size", e.payload);
      }
    });
    const unlistenCursor = listen<string>("cursor_change", (e) => {
      setCaretStyle(e.payload as CaretStyle);
      localStorage.setItem("cursor", e.payload);
    });

    return () => {
      unlistenFont.then((f) => f());
      unlistenAppearance.then((f) => f());
      unlistenSize.then((f) => f());
      unlistenCursor.then((f) => f());
    };
  }, []);
}
