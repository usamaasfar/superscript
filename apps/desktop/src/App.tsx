import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "~/canvas/Canvas";
import { CommandBar } from "~/command/CommandBar";
import { Editor } from "~/editor/Editor";
import { useAppearance } from "~/hooks/useAppearance";
import { useAutoSave } from "~/hooks/useAutoSave";
import { useFileSystem } from "~/hooks/useFileSystem";
import { useRename } from "~/hooks/useRename";
import { getFileStem } from "~/utils/file";

type PageType = "markdown" | "canvas";

function getPageType(path: string | null): PageType {
  if (path?.toLowerCase().endsWith(".excalidraw")) return "canvas";
  return "markdown";
}

function getCurrentTheme(): "light" | "dark" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light") return "light";
  if (attr === "dark") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function App() {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<string>("");
  const [pageType, setPageType] = useState<PageType>("markdown");
  const [cmdkOpen, setCmdkOpen] = useState(false);

  const editorKeyRef = useRef(0);
  const [editorKey, setEditorKey] = useState(0);

  const bumpEditorKey = useCallback(() => {
    editorKeyRef.current += 1;
    setEditorKey(editorKeyRef.current);
  }, []);

  const resetEditor = useCallback(() => {
    setActivePath(null);
    setActiveContent("");
    setPageType("markdown");
    bumpEditorKey();
  }, [bumpEditorKey]);

  useAppearance();

  const { files, loadDir, pickFolder } = useFileSystem({
    cmdkOpen,
    onFolderLoaded: resetEditor,
  });

  const { handleChange, flushSave } = useAutoSave({
    activePath,
    pageType,
    loadDir,
    setActivePath,
  });

  const { isRenaming, renameValue, setRenameValue, renameInputRef, startRename, submitRename, resetRename } = useRename(
    {
      activePath,
      pageType,
      files,
      flushSave,
      loadDir,
      setActivePath,
      setActiveContent,
      setEditorKey: (updater) => {
        const next = updater(editorKeyRef.current);
        editorKeyRef.current = next;
        setEditorKey(next);
      },
    },
  );

  const openFile = useCallback(
    async (path: string) => {
      await flushSave();
      const content = await readTextFile(path);
      setActivePath(path);
      setActiveContent(content);
      setPageType(getPageType(path));
      bumpEditorKey();
    },
    [flushSave, bumpEditorKey],
  );

  const newPage = useCallback(async () => {
    await flushSave();
    setActivePath(null);
    setActiveContent("");
    setPageType("markdown");
    bumpEditorKey();
  }, [flushSave, bumpEditorKey]);

  const newCanvas = useCallback(async () => {
    await flushSave();
    setActivePath(null);
    setActiveContent("");
    setPageType("canvas");
    bumpEditorKey();
  }, [flushSave, bumpEditorKey]);

  // Tauri event listeners for new note, new canvas, and folder change
  useEffect(() => {
    const unlistenChangeFolder = listen("change_folder", () => pickFolder());
    const unlistenNewPage = listen("new_note", () => {
      const dir = localStorage.getItem("rootDir");
      if (dir) newPage();
    });
    const unlistenNewCanvas = listen("new_canvas", () => {
      const dir = localStorage.getItem("rootDir");
      if (dir) newCanvas();
    });

    return () => {
      unlistenChangeFolder.then((f) => f());
      unlistenNewPage.then((f) => f());
      unlistenNewCanvas.then((f) => f());
    };
  }, [pickFolder, newPage, newCanvas]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
      // Cmd+Shift+P → new markdown page
      if (e.key === "P" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        const dir = localStorage.getItem("rootDir");
        if (dir) newPage();
      }
      // Cmd+N → new markdown page (kept as alias)
      if (e.key === "n" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        const dir = localStorage.getItem("rootDir");
        if (dir) newPage();
      }
      // Cmd+Shift+C → new canvas
      if (e.key === "C" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        const dir = localStorage.getItem("rootDir");
        if (dir) newCanvas();
      }
      if (e.key === "Escape") {
        setCmdkOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newPage, newCanvas]);

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
            title="Double-click to rename"
          />
        </div>
      </div>
      {pageType === "canvas" ? (
        <Canvas key={editorKey} initialData={activeContent} onChange={handleChange} theme={getCurrentTheme()} />
      ) : (
        <Editor key={editorKey} initialMarkdown={activeContent} onChange={handleChange} />
      )}
      {cmdkOpen && <CommandBar files={files} onSelect={openFile} onClose={() => setCmdkOpen(false)} />}
    </div>
  );
}

export default App;
