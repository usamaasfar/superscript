import { getCurrentWindow } from "@tauri-apps/api/window";
import { type Dispatch, type SetStateAction, useEffect } from "react";

interface UseWindowGuardsOptions {
  deletePage: () => Promise<void>;
  newPage: () => Promise<void>;
  setCmdkOpen: Dispatch<SetStateAction<boolean>>;
}

export function useWindowGuards({ deletePage, newPage, setCmdkOpen }: UseWindowGuardsOptions): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typingInInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const dir = localStorage.getItem("rootDir");
        if (dir) newPage();
      }
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const win = getCurrentWindow();
        win.isFullscreen().then((fs) => win.setFullscreen(!fs));
      }
      if (e.metaKey && e.key === "Backspace" && !e.repeat && !typingInInput) {
        e.preventDefault();
        void deletePage();
      }
      if (e.key === "Escape") {
        setCmdkOpen(false);
      }
      // Prevent webview zoom via keyboard (Cmd/Ctrl +/-/=)
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "-" || e.key === "+")) {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deletePage, newPage, setCmdkOpen]);

  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Allow context menu inside the editor for text editing
      if (target.closest(".ProseMirror")) return;
      e.preventDefault();
    }
    // Prevent pinch-to-zoom
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    }
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("wheel", onWheel);
    };
  }, []);
}
