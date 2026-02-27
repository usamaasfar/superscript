import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

interface UseMenuEventsOptions {
  pickFolder: () => Promise<void>;
  newPage: () => Promise<void>;
  deletePage: () => Promise<void>;
}

export function useMenuEvents({ pickFolder, newPage, deletePage }: UseMenuEventsOptions): void {
  useEffect(() => {
    const unlistenChangeFolder = listen("change_folder", () => pickFolder());
    const unlistenNewPage = listen("new_note", () => {
      const dir = localStorage.getItem("rootDir");
      if (dir) newPage();
    });
    const unlistenDeletePage = listen("delete_page", () => deletePage());
    return () => {
      unlistenChangeFolder.then((f) => f());
      unlistenNewPage.then((f) => f());
      unlistenDeletePage.then((f) => f());
    };
  }, [pickFolder, newPage, deletePage]);
}
