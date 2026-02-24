import { rename as renameFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { getFileStem, getParentDir, uniqueFilePath } from "~/utils/file";

interface UseRenameOptions {
  activePath: string | null;
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
    const nextBase = renameValue.replace(/[\\/]/g, "").trim();
    if (!nextBase) {
      resetRename();
      return;
    }

    const nextName = nextBase.toLowerCase().endsWith(".md") ? nextBase : `${nextBase}.md`;

    if (!activePath) {
      // No active file — create a new empty file with the given name.
      const dir = localStorage.getItem("rootDir");
      if (!dir) {
        resetRename();
        return;
      }
      const stem = nextName.slice(0, -3);
      const nextPath = uniqueFilePath(dir, stem, files);
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

    const stem = nextName.slice(0, -3);
    // Same path as current — no-op (exact match only; case changes are allowed).
    if (`${dir}/${nextName}` === activePath) {
      resetRename();
      return;
    }

    // Find a collision-free path (exclude the current file so it doesn't block itself).
    // Always delegate to uniqueFilePath so the collision check is case-insensitive
    // (consistent with macOS APFS) and the suffix logic lives in one place.
    const otherFiles = files.filter((f) => f !== activePath);
    const nextPath = uniqueFilePath(dir, stem, otherFiles);

    // Guard: resolved to same as current — no-op.
    if (nextPath === activePath) {
      resetRename();
      return;
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
  }, [activePath, files, flushSave, loadDir, renameValue, resetRename, setActivePath, setActiveContent, setEditorKey]);

  useEffect(() => {
    if (!isRenaming) return;
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [isRenaming]);

  return { isRenaming, renameValue, setRenameValue, renameInputRef, startRename, submitRename, resetRename };
}
