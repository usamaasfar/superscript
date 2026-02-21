import { open } from "@tauri-apps/plugin-dialog";
import { readDir, stat } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useState } from "react";

interface UseFileSystemOptions {
  cmdkOpen: boolean;
  onFolderLoaded: () => void;
}

interface UseFileSystemResult {
  files: string[];
  loadDir: (dir: string) => Promise<string[]>;
  loadFolder: (dir: string) => Promise<void>;
  pickFolder: () => Promise<void>;
}

export function useFileSystem({ cmdkOpen, onFolderLoaded }: UseFileSystemOptions): UseFileSystemResult {
  const [files, setFiles] = useState<string[]>([]);

  const loadDir = useCallback(async (dir: string) => {
    const entries = await readDir(dir);
    const withMtime = await Promise.all(
      entries
        .filter((e) => e.isFile && e.name.toLowerCase().endsWith(".md"))
        .map(async (e) => {
          const path = `${dir}/${e.name}`;
          try {
            const info = await stat(path);
            return { path, mtime: info.mtime?.getTime() ?? 0 };
          } catch {
            return null;
          }
        }),
    );

    const mdFiles = withMtime
      .filter((entry): entry is { path: string; mtime: number } => entry !== null)
      .sort((a, b) => b.mtime - a.mtime)
      .map((entry) => entry.path);

    setFiles(mdFiles);
    return mdFiles;
  }, []);

  const loadFolder = useCallback(
    async (dir: string) => {
      await loadDir(dir);
      onFolderLoaded();
    },
    [loadDir, onFolderLoaded],
  );

  const pickFolder = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;
    const dir = selected as string;
    localStorage.setItem("rootDir", dir);
    await loadFolder(dir);
  }, [loadFolder]);

  // On mount: restore saved folder or prompt for one
  useEffect(() => {
    const initialize = async () => {
      const dir = localStorage.getItem("rootDir");
      if (dir) {
        try {
          await loadFolder(dir);
        } catch {
          localStorage.removeItem("rootDir");
          await pickFolder();
        }
      } else {
        await pickFolder();
      }
    };
    void initialize();
  }, [loadFolder, pickFolder]);

  // Refresh file ordering when Cmd+K opens so list reflects latest mtimes
  useEffect(() => {
    if (!cmdkOpen) return;
    const dir = localStorage.getItem("rootDir");
    if (!dir) return;
    void loadDir(dir).catch(() => {});
  }, [cmdkOpen, loadDir]);

  return { files, loadDir, loadFolder, pickFolder };
}
