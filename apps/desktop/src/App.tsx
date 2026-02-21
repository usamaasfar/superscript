import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readTextFile, stat, writeTextFile } from "@tauri-apps/plugin-fs";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import "./editor/editor.css";
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

function newFilePath(dir: string) {
  return `${dir}/${dayjs().format("YYYY-MM-DD HH.mm")}.md`;
}

function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<string>("");
  const [cmdkOpen, setCmdkOpen] = useState(false);

  // Keep a ref in sync with activePath so handleChange always sees the latest value
  const activePathRef = useRef<string | null>(null);
  activePathRef.current = activePath;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ path: string; content: string } | null>(null);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (pendingSaveRef.current) {
      const { path, content } = pendingSaveRef.current;
      pendingSaveRef.current = null;
      await writeTextFile(path, content);
    }
  }, []);

  const loadDir = useCallback(async (dir: string) => {
    const entries = await readDir(dir);
    const mdEntries = entries.filter((e) => e.isFile && e.name.endsWith(".md"));

    const withMtime = await Promise.all(
      mdEntries.map(async (e) => {
        const path = `${dir}/${e.name}`;
        const info = await stat(path);
        return { path, mtime: info.mtime?.getTime() ?? 0 };
      }),
    );

    const mdFiles = withMtime
      .sort((a, b) => b.mtime - a.mtime)
      .map((e) => e.path);

    setFiles(mdFiles);
    return mdFiles;
  }, []);

  const openFile = useCallback(
    async (path: string) => {
      await flushSave();
      const content = await readTextFile(path);
      setActivePath(path);
      setActiveContent(content);
    },
    [flushSave],
  );

  const newPage = useCallback(
    async (dir: string) => {
      await flushSave();
      const path = newFilePath(dir);
      await writeTextFile(path, "");
      const mdFiles = await loadDir(dir);
      setActivePath(path);
      setActiveContent("");
      return mdFiles;
    },
    [flushSave, loadDir],
  );

  const pickFolder = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected) return;
    const dir = selected as string;
    localStorage.setItem("rootDir", dir);
    const mdFiles = await loadDir(dir);
    if (mdFiles.length > 0) {
      await openFile(mdFiles[0]);
    } else {
      await newPage(dir);
    }
  }, [loadDir, openFile, newPage]);

  // On mount: restore saved folder or prompt for one
  useEffect(() => {
    const dir = localStorage.getItem("rootDir");
    if (dir) {
      loadDir(dir).then(async (mdFiles) => {
        if (mdFiles.length > 0) {
          await openFile(mdFiles[0]);
        } else {
          await newPage(dir);
        }
      });
    } else {
      pickFolder();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (dir) newPage(dir);
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
        if (dir) newPage(dir);
      }
      if (e.key === "Escape") {
        setCmdkOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newPage]);

  // Use a ref so the callback always captures the latest activePath without re-creating
  const handleChange = useCallback((markdown: string) => {
    const path = activePathRef.current;
    if (!path) return;
    pendingSaveRef.current = { path, content: markdown };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (pendingSaveRef.current) {
        const { path: p, content } = pendingSaveRef.current;
        pendingSaveRef.current = null;
        await writeTextFile(p, content);
      }
    }, 800);
  }, []);

  return (
    <div className="app">
      <Editor key={activePath ?? "__empty__"} initialMarkdown={activeContent} onChange={handleChange} />
      {cmdkOpen && <CommandBar files={files} onSelect={openFile} onClose={() => setCmdkOpen(false)} />}
    </div>
  );
}

export default App;
