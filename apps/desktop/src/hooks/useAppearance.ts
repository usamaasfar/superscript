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

const widths: Record<string, string> = {
  narrow: "680px",
  wide: "1000px",
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
const savedWidth = widths[localStorage.getItem("width") ?? "narrow"] ?? widths.narrow;
setVar("--font", savedFont);
setVar("--font-size", savedSize);
setVar("--editor-max-width", savedWidth);
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
    const unlistenWidth = listen<string>("width_change", (e) => {
      const width = widths[e.payload];
      if (width) {
        setVar("--editor-max-width", width);
        localStorage.setItem("width", e.payload);
      }
    });

    return () => {
      unlistenFont.then((f) => f());
      unlistenAppearance.then((f) => f());
      unlistenSize.then((f) => f());
      unlistenCursor.then((f) => f());
      unlistenWidth.then((f) => f());
    };
  }, []);
}
