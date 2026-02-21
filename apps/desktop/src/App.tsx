import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readTextFile, rename as renameFile, stat, writeTextFile } from "@tauri-apps/plugin-fs";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommandBar } from "./CommandBar";
import { Editor } from "./editor/Editor";

const fonts: Record<string, string> = {
  default: "Georgia, serif",
  classical: "Baskerville, 'Baskerville Old Face', Georgia, serif",
  modern: "'JetBrains Mono', Menlo, ui-monospace, monospace",
};

const sizes: Record<string, string> = {
  small: "0.9375rem",
  default: "1.0625rem",
  large: "1.25rem",
};

function setVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

function setTheme(value: string) {
  if (value === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", value);
  }
}

// Apply persisted preferences on startup
const savedFont = fonts[localStorage.getItem("font") ?? "default"] ?? fonts.default;
const savedSize = sizes[localStorage.getItem("size") ?? "default"] ?? sizes.default;
setVar("--font", savedFont);
setVar("--font-size", savedSize);
setTheme(localStorage.getItem("appearance") ?? "system");

let lastFileTimestamp = 0;

function nextFileTimestamp() {
  const now = Date.now();
  lastFileTimestamp = now > lastFileTimestamp ? now : lastFileTimestamp + 1;
  return lastFileTimestamp;
}

function newFilePath(dir: string) {
  return `${dir}/${dayjs(nextFileTimestamp()).format("YYYY-MM-DD HH.mm.ss.SSS")}.md`;
}

function getParentDir(path: string) {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : "";
}

function getFileName(path: string) {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}

function getFileStem(path: string) {
  const fileName = getFileName(path);
  return fileName.toLowerCase().endsWith(".md") ? fileName.slice(0, -3) : fileName;
}

function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<string>("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [cmdkOpen, setCmdkOpen] = useState(false);

  // Keep a ref in sync with activePath so handleChange always sees the latest value
  const activePathRef = useRef<string | null>(null);
  activePathRef.current = activePath;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ path: string | null; content: string } | null>(null);
  const flushPromiseRef = useRef<Promise<void> | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

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

  const persistSave = useCallback(
    async (save: { path: string | null; content: string }) => {
      if (save.path) {
        await writeTextFile(save.path, save.content);
        return;
      }

      if (!save.content.trim()) return;

      const dir = localStorage.getItem("rootDir");
      if (!dir) return;

      const path = newFilePath(dir);
      await writeTextFile(path, save.content);
      setActiveContent(save.content);
      setActivePath(path);
      await loadDir(dir);
    },
    [loadDir],
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

  const openFile = useCallback(
    async (path: string) => {
      await flushSave();
      const content = await readTextFile(path);
      setActivePath(path);
      setActiveContent(content);
    },
    [flushSave],
  );

  const newPage = useCallback(async () => {
    await flushSave();
    setActivePath(null);
    setActiveContent("");
  }, [flushSave]);

  const loadFolder = useCallback(
    async (dir: string) => {
      await loadDir(dir);
      setActivePath(null);
      setActiveContent("");
    },
    [loadDir],
  );

  const pickFolder = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;
    const dir = selected as string;
    localStorage.setItem("rootDir", dir);
    await loadFolder(dir);
  }, [loadFolder]);

  const resetRename = useCallback(() => {
    setIsRenaming(false);
    setRenameValue("");
  }, []);

  const startRename = useCallback(() => {
    if (!activePath) return;
    setRenameValue(getFileStem(activePath));
    setIsRenaming(true);
  }, [activePath]);

  const submitRename = useCallback(async () => {
    if (!activePath) {
      resetRename();
      return;
    }

    const nextBase = renameValue.replace(/[\\/]/g, "").trim();
    if (!nextBase) {
      resetRename();
      return;
    }

    const nextName = nextBase.toLowerCase().endsWith(".md") ? nextBase : `${nextBase}.md`;
    const dir = getParentDir(activePath);
    if (!dir) {
      resetRename();
      return;
    }

    const nextPath = `${dir}/${nextName}`;
    if (nextPath === activePath) {
      resetRename();
      return;
    }

    // Tauri fs.rename replaces existing files, so block collisions to avoid data loss.
    if (files.includes(nextPath)) {
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
  }, [activePath, files, flushSave, loadDir, renameValue, resetRename]);

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

  useEffect(() => {
    if (!isRenaming) return;
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [isRenaming]);

  // Tauri event listeners
  useEffect(() => {
    const unlistenFont = listen<string>("font_change", (e) => {
      const font = fonts[e.payload];
      if (font) {
        setVar("--font", font);
        localStorage.setItem("font", e.payload);
      }
    });
    const unlistenAppearance = listen<string>("appearance_change", (e) => {
      setTheme(e.payload);
      localStorage.setItem("appearance", e.payload);
    });
    const unlistenSize = listen<string>("size_change", (e) => {
      const size = sizes[e.payload];
      if (size) {
        setVar("--font-size", size);
        localStorage.setItem("size", e.payload);
      }
    });
    const unlistenChangeFolder = listen("change_folder", () => pickFolder());
    const unlistenNewPage = listen("new_note", () => {
      const dir = localStorage.getItem("rootDir");
      if (dir) newPage();
    });

    return () => {
      unlistenFont.then((f) => f());
      unlistenAppearance.then((f) => f());
      unlistenSize.then((f) => f());
      unlistenChangeFolder.then((f) => f());
      unlistenNewPage.then((f) => f());
    };
  }, [pickFolder, newPage]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const dir = localStorage.getItem("rootDir");
        if (dir) newPage();
      }
      if (e.key === "Escape") {
        setCmdkOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newPage]);

  // Refresh file ordering when opening Cmd+K so list reflects latest mtimes.
  useEffect(() => {
    if (!cmdkOpen) return;
    const dir = localStorage.getItem("rootDir");
    if (!dir) return;
    void loadDir(dir).catch(() => {});
  }, [cmdkOpen, loadDir]);

  // Use a ref so the callback always captures the latest activePath without re-creating
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

  const activeFileName = activePath ? getFileStem(activePath) : "Untitled";
  const titleValue = isRenaming ? renameValue : activeFileName;
  const handleTopbarPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    void getCurrentWindow().startDragging();
  }, []);

  return (
    <div className="app">
      <div className="app-topbar">
        <div className="app-topbar-drag" data-tauri-drag-region="" onPointerDown={handleTopbarPointerDown} />
        <div className="app-title-wrap">
          <input
            ref={renameInputRef}
            className={`app-title-input${isRenaming ? " is-editing" : ""}`}
            value={titleValue}
            size={Math.max(1, titleValue.length)}
            readOnly={!isRenaming}
            disabled={!activePath}
            onDoubleClick={startRename}
            onChange={(e) => {
              if (isRenaming) setRenameValue(e.target.value);
            }}
            onBlur={() => {
              if (isRenaming) void submitRename();
            }}
            onKeyDown={(e) => {
              if (!isRenaming) return;
              if (e.key === "Enter") {
                e.preventDefault();
                void submitRename();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                resetRename();
              }
            }}
            title={activePath ? "Double-click to rename" : "Untitled"}
          />
        </div>
      </div>
      <Editor key={activePath ?? "__empty__"} initialMarkdown={activeContent} onChange={handleChange} />
      {cmdkOpen && <CommandBar files={files} onSelect={openFile} onClose={() => setCmdkOpen(false)} />}
    </div>
  );
}

export default App;
