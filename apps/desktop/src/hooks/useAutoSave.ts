import { rename as renameFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useRef } from "react";
import { getFileStem, getParentDir, stemFromContent, uniqueFilePath } from "~/utils/file";

interface UseAutoSaveOptions {
  activePath: string | null;
  files: string[];
  loadDir: (dir: string) => Promise<string[]>;
  setActivePath: (path: string) => void;
}

interface UseAutoSaveResult {
  handleChange: (markdown: string) => void;
  flushSave: () => Promise<void>;
}

export function useAutoSave({ activePath, files, loadDir, setActivePath }: UseAutoSaveOptions): UseAutoSaveResult {
  // Keep a ref in sync with activePath so handleChange always sees the latest value
  const activePathRef = useRef<string | null>(null);
  activePathRef.current = activePath;

  // Keep a ref in sync with files for collision-free naming
  const filesRef = useRef<string[]>([]);
  filesRef.current = files;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ path: string | null; content: string } | null>(null);
  const flushPromiseRef = useRef<Promise<void> | null>(null);

  const persistSave = useCallback(
    async (save: { path: string | null; content: string }) => {
      if (save.path) {
        // If the file is named "Untitled", rename it to match the first line of content.
        if (getFileStem(save.path).toLowerCase() === "untitled") {
          const newStem = stemFromContent(save.content);
          if (newStem) {
            const dir = getParentDir(save.path);
            if (dir) {
              const newPath = uniqueFilePath(dir, newStem, filesRef.current);
              // Update the in-memory path before awaiting I/O so any handleChange
              // calls during the rename/write sequence use the new path.
              activePathRef.current = newPath;
              setActivePath(newPath);
              await renameFile(save.path, newPath);
              await writeTextFile(newPath, save.content);
              await loadDir(dir);
              return;
            }
          }
        }
        await writeTextFile(save.path, save.content);
        return;
      }

      if (!save.content.trim()) return;

      const dir = localStorage.getItem("rootDir");
      if (!dir) return;

      // Name the file after the first line of content; fall back to a timestamp.
      const stem = stemFromContent(save.content) ?? `untitled-${Date.now()}`;
      const path = uniqueFilePath(dir, stem, filesRef.current);
      await writeTextFile(path, save.content);
      activePathRef.current = path;
      setActivePath(path);
      await loadDir(dir);
    },
    [loadDir, setActivePath],
  );

  const flushSave = useCallback(async () => {
    if (flushPromiseRef.current) {
      await flushPromiseRef.current;
      return;
    }

    const run = (async () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (pendingSaveRef.current) {
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        await persistSave(pending);
      }
    })();

    flushPromiseRef.current = run;
    try {
      await run;
    } finally {
      flushPromiseRef.current = null;
    }
  }, [persistSave]);

  const handleChange = useCallback(
    (markdown: string) => {
      pendingSaveRef.current = { path: activePathRef.current, content: markdown };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        saveTimerRef.current = null;
        if (pendingSaveRef.current) {
          const pending = pendingSaveRef.current;
          pendingSaveRef.current = null;
          try {
            await persistSave(pending);
          } catch {
            // Ignore background autosave errors.
          }
        }
      }, 800);
    },
    [persistSave],
  );

  return { handleChange, flushSave };
}
