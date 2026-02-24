import { rename as renameFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { generateNameFromContent, getFileStem, getParentDir } from "~/utils/file";

/**
 * useRename Workflow & Edge Cases:
 *
 * +---------------------------+
 * | User submits rename input |
 * +-------------+-------------+
 *               |
 *               v
 * +-------------------------------+
 * | Is input "Untitled"? (Case-I) |
 * +-------------+-----------------+
 *               |
 *       +-------+-------+
 *       |               |
 *      YES              NO (User explicitly typed a name)
 *       |               |
 *       v               v
 * +-----------+   +-----------------------+
 * | Has Content?|   | Does file exist?      |
 * +-----+-----+   +-----------+-----------+
 *       |                     |
 *   +---+---+           +-----+-----+
 *   |       |           |           |
 *  YES      NO         YES          NO
 *   |       |           |           |
 *   v       v           v           v
 * +---+   +---+       +---+       +---+
 * | A |   | B |       | C |       | D |
 * +---+   +---+       +---+       +---+
 *
 * A: Generate name from content.
 *    - IF collision: Auto-resolve by appending (n).
 *      Example: "Day Log" -> "Day Log (1).md"
 *    - Save/Rename.
 *
 * B: Content is empty/invalid.
 *    - Action: Block/Revert. Do nothing.
 *
 * C: Collision with existing file.
 *    - Action: Block. Prevent overwrite.
 *
 * D: Unique name.
 *    - Action: Save/Rename.
 */

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
    // Sanitize input
    let nextBase = renameValue.replace(/[\\/]/g, "").trim();
    if (!nextBase) {
      resetRename();
      return;
    }

    let isGenerated = false;

    // CASE A/B: User input is "Untitled"
    if (nextBase.toLowerCase() === "untitled") {
      const generated = generateNameFromContent(activeContent);
      if (!generated) {
        // Case B: Content empty -> Block
        resetRename();
        return;
      }
      // Case A: Use generated name
      nextBase = generated;
      isGenerated = true;
    }

    const nextName = nextBase.toLowerCase().endsWith(".md") ? nextBase : `${nextBase}.md`;

    // Helper to find a unique path by appending (n) for generated names
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
      // Create new file
      const dir = localStorage.getItem("rootDir");
      if (!dir) {
        resetRename();
        return;
      }

      let nextPath = `${dir}/${nextName}`;

      if (files.includes(nextPath)) {
        if (isGenerated) {
          // Case A (Collision): Auto-resolve
          nextPath = getUniquePath(dir, nextBase);
        } else {
          // Case C: Explicit name collision -> Block
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
        // Keep editing state
      }
      return;
    }

    // Rename existing file
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

    if (files.includes(nextPath)) {
      if (isGenerated) {
        // Case A (Collision): Auto-resolve
        nextPath = getUniquePath(dir, nextBase);
      } else {
        // Case C: Explicit name collision -> Block
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
      // Keep editing state
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
