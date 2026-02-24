import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useRef } from "react";
import { generateNameFromContent } from "~/utils/file";

interface UseAutoSaveOptions {
  activePath: string | null;
  loadDir: (dir: string) => Promise<string[]>;
  setActivePath: (path: string) => void;
}

interface UseAutoSaveResult {
  handleChange: (markdown: string) => void;
  flushSave: () => Promise<void>;
}

export function useAutoSave({ activePath, loadDir, setActivePath }: UseAutoSaveOptions): UseAutoSaveResult {
  // Keep a ref in sync with activePath so handleChange always sees the latest value
  const activePathRef = useRef<string | null>(null);
  activePathRef.current = activePath;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ path: string | null; content: string } | null>(null);
  const flushPromiseRef = useRef<Promise<void> | null>(null);

  const persistSave = useCallback(
    async (save: { path: string | null; content: string }) => {
      // If we already have a path (file is saved/named), just save the content
      if (save.path) {
        await writeTextFile(save.path, save.content);
        return;
      }

      // If no path (untitled/unsaved), we try to name it from content
      if (!save.content.trim()) return;

      const dir = localStorage.getItem("rootDir");
      if (!dir) return;

      // Try to generate a name from content
      const name = generateNameFromContent(save.content);

      // If valid name derived from content
      if (name) {
        let candidatePath = `${dir}/${name}.md`;

        // Check for collisions
        // loadDir returns full paths
        const existingFiles = await loadDir(dir);

        if (existingFiles.includes(candidatePath)) {
          let counter = 1;
          while (existingFiles.includes(`${dir}/${name} (${counter}).md`)) {
            counter++;
          }
          candidatePath = `${dir}/${name} (${counter}).md`;
        }

        await writeTextFile(candidatePath, save.content);
        setActivePath(candidatePath);
        await loadDir(dir);
        return;
      }

      // If no valid name could be generated (e.g. content is empty or invalid),
      // we do NOT save. The file remains "Untitled" and unsaved.
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
