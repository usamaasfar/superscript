import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

interface UseMenuEventsOptions {
  pickFolder: () => Promise<void>;
  newPage: () => Promise<void>;
}

export function useMenuEvents({ pickFolder, newPage }: UseMenuEventsOptions): void {
  useEffect(() => {
    const unlistenChangeFolder = listen("change_folder", () => pickFolder());
    const unlistenNewPage = listen("new_note", () => {
      const dir = localStorage.getItem("rootDir");
      if (dir) newPage();
    });
    return () => {
      unlistenChangeFolder.then((f) => f());
      unlistenNewPage.then((f) => f());
    };
  }, [pickFolder, newPage]);
}
