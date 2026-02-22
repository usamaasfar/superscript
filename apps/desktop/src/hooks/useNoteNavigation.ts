import { readTextFile } from "@tauri-apps/plugin-fs";
import { useCallback } from "react";

interface UseNoteNavigationOptions {
  flushSave: () => Promise<void>;
  setActivePath: (path: string | null) => void;
  setActiveContent: (content: string) => void;
  bumpEditorKey: () => void;
}

interface UseNoteNavigationResult {
  openFile: (path: string) => Promise<void>;
  newPage: () => Promise<void>;
}

export function useNoteNavigation({
  flushSave,
  setActivePath,
  setActiveContent,
  bumpEditorKey,
}: UseNoteNavigationOptions): UseNoteNavigationResult {
  const openFile = useCallback(
    async (path: string) => {
      await flushSave();
      const content = await readTextFile(path);
      setActivePath(path);
      setActiveContent(content);
      bumpEditorKey();
    },
    [flushSave, setActivePath, setActiveContent, bumpEditorKey],
  );

  const newPage = useCallback(async () => {
    await flushSave();
    setActivePath(null);
    setActiveContent("");
    bumpEditorKey();
  }, [flushSave, setActivePath, setActiveContent, bumpEditorKey]);

  return { openFile, newPage };
}
