import { readTextFile, remove as removeFile } from "@tauri-apps/plugin-fs";
import { useCallback } from "react";
import { getParentDir } from "~/utils/file";

interface UseNoteNavigationOptions {
  activePath: string | null;
  files: string[];
  flushSave: () => Promise<void>;
  loadDir: (dir: string) => Promise<string[]>;
  setActivePath: (path: string | null) => void;
  setActiveContent: (content: string) => void;
  bumpEditorKey: () => void;
}

interface UseNoteNavigationResult {
  deletePage: () => Promise<void>;
  openFile: (path: string) => Promise<void>;
  newPage: () => Promise<void>;
}

function resetScrollPosition() {
  requestAnimationFrame(() => {
    const appShell = document.querySelector<HTMLElement>(".app");
    if (appShell) {
      appShell.scrollTop = 0;
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  });
}

export function useNoteNavigation({
  activePath,
  files,
  flushSave,
  loadDir,
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
      resetScrollPosition();
    },
    [flushSave, setActivePath, setActiveContent, bumpEditorKey],
  );

  const newPage = useCallback(async () => {
    await flushSave();
    setActivePath(null);
    setActiveContent("");
    bumpEditorKey();
    resetScrollPosition();
  }, [flushSave, setActivePath, setActiveContent, bumpEditorKey]);

  const deletePage = useCallback(async () => {
    if (!activePath) return;

    const dir = getParentDir(activePath);
    if (!dir) return;

    await flushSave();

    const currentIndex = files.indexOf(activePath);
    await removeFile(activePath);

    const nextFiles = await loadDir(dir);
    const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex, nextFiles.length - 1);
    const nextPath = nextFiles[nextIndex];

    if (!nextPath) {
      setActivePath(null);
      setActiveContent("");
      bumpEditorKey();
      resetScrollPosition();
      return;
    }

    const content = await readTextFile(nextPath);
    setActivePath(nextPath);
    setActiveContent(content);
    bumpEditorKey();
    resetScrollPosition();
  }, [activePath, files, flushSave, loadDir, setActivePath, setActiveContent, bumpEditorKey]);

  return { deletePage, openFile, newPage };
}
