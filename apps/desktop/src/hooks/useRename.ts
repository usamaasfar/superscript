import { rename as renameFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { generateNameFromContent, getFileStem, getParentDir } from "~/utils/file";

interface UseRenameOptions {
  activePath: string | null;
  activeContent: string;
  files: string[];
  flushSave: () => Promise<void>;
  loadDir: (dir: string) => Promise<string[]>;
  setActivePath: (path: string | null) => void;
  setActiveContent: (content: string) => void;
  setEditorKey: (updater: (prev: number) => number) => void;
}

interface UseRenameResult {
  isRenaming: boolean;
  renameValue: string;
  setRenameValue: (value: string) => void;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  startRename: () => void;
  submitRename: () => Promise<void>;
  resetRename: () => void;
}

export function useRename({
  activePath,
  activeContent,
  files,
  flushSave,
  loadDir,
  setActivePath,
  setActiveContent,
  setEditorKey,
}: UseRenameOptions): UseRenameResult {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const resetRename = useCallback(() => {
    setIsRenaming(false);
    setRenameValue("");
  }, []);

  const startRename = useCallback(() => {
    setRenameValue(activePath ? getFileStem(activePath) : "Untitled");
    setIsRenaming(true);
  }, [activePath]);

  const submitRename = useCallback(async () => {
    // Correctly escape regex for backslash and forward slash
    let nextBase = renameValue.replace(/[\\/]/g, "").trim();
    if (!nextBase) {
      resetRename();
      return;
    }

    let isGenerated = false;
    // Handle "Untitled" restriction
    if (nextBase.toLowerCase() === "untitled") {
      const generated = generateNameFromContent(activeContent);
      if (!generated) {
        // Content is empty or invalid, disallow rename
        resetRename();
        return;
      }
      nextBase = generated;
      isGenerated = true;
    }

    const nextName = nextBase.toLowerCase().endsWith(".md") ? nextBase : `${nextBase}.md`;

    // Helper to find a unique path by appending (n)
    const getUniquePath = (dir: string, base: string) => {
      let candidateName = base.toLowerCase().endsWith(".md") ? base : `${base}.md`;
      let candidatePath = `${dir}/${candidateName}`;
      let counter = 1;
      while (files.includes(candidatePath)) {
        candidateName = `${base} (${counter}).md`;
        candidatePath = `${dir}/${candidateName}`;
        counter++;
      }
      return candidatePath;
    };

    if (!activePath) {
      // No active file — create a new empty file with the given name.
      const dir = localStorage.getItem("rootDir");
      if (!dir) {
        resetRename();
        return;
      }

      let nextPath = `${dir}/${nextName}`;

      if (files.includes(nextPath)) {
        if (isGenerated) {
          nextPath = getUniquePath(dir, nextBase);
        } else {
          // Explicit rename blocked on collision
          return;
        }
      }

      try {
        await writeTextFile(nextPath, "");
        setActivePath(nextPath);
        setActiveContent("");
        setEditorKey((k) => k + 1);
        await loadDir(dir);
        resetRename();
      } catch {
        // Keep editing state so user can adjust the name.
      }
      return;
    }

    const dir = getParentDir(activePath);
    if (!dir) {
      resetRename();
      return;
    }

    let nextPath = `${dir}/${nextName}`;
    if (nextPath === activePath) {
      resetRename();
      return;
    }

    // Tauri fs.rename replaces existing files, so block collisions to avoid data loss.
    if (files.includes(nextPath)) {
      if (isGenerated) {
        nextPath = getUniquePath(dir, nextBase);
      } else {
        // Explicit rename blocked on collision
        return;
      }
    }

    await flushSave();
    try {
      await renameFile(activePath, nextPath);
      setActivePath(nextPath);
      await loadDir(dir);
      resetRename();
    } catch {
      // Keep editing state so user can adjust the name.
    }
  }, [activePath, activeContent, files, flushSave, loadDir, renameValue, resetRename, setActivePath, setActiveContent, setEditorKey]);

  useEffect(() => {
    if (!isRenaming) return;
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [isRenaming]);

  return { isRenaming, renameValue, setRenameValue, renameInputRef, startRename, submitRename, resetRename };
}
