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
import { getFileStem, isExcalidrawFile } from "~/utils/file";

function App() {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<string>("");
  const [draftType, setDraftType] = useState<"markdown" | "excalidraw">("markdown");
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
    setDraftType("markdown");
    bumpEditorKey();
  }, [bumpEditorKey]);

  useAppearance();

  const { files, loadDir, pickFolder } = useFileSystem({
    cmdkOpen,
    onFolderLoaded: resetEditor,
  });

  const isCanvasMode = activePath
    ? isExcalidrawFile(activePath)
    : draftType === "excalidraw";

  const { handleChange, flushSave } = useAutoSave({
    activePath,
    loadDir,
    setActivePath,
    draftExtension: isCanvasMode ? "excalidraw" : "md",
  });

  const { isRenaming, renameValue, setRenameValue, renameInputRef, startRename, submitRename, resetRename } = useRename(
    {
      activePath,
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
      try {
        const content = await readTextFile(path);
        setActivePath(path);
        setActiveContent(content);
        // draftType is irrelevant when activePath is set, but good to reset or ignore
        bumpEditorKey();
      } catch (err) {
        console.error("Failed to open file", err);
      }
    },
    [flushSave, bumpEditorKey],
  );

  const newPage = useCallback(async () => {
    await flushSave();
    setActivePath(null);
    setActiveContent("");
    setDraftType("markdown");
    bumpEditorKey();
  }, [flushSave, bumpEditorKey]);

  const newCanvas = useCallback(async () => {
    await flushSave();
    setActivePath(null);
    setActiveContent("");
    setDraftType("excalidraw");
    bumpEditorKey();
  }, [flushSave, bumpEditorKey]);

  // Tauri event listeners
  useEffect(() => {
    const unlistenChangeFolder = listen("change_folder", () => pickFolder());
    const unlistenNewPage = listen("new_note", () => {
      const dir = localStorage.getItem("rootDir");
      if (dir) newPage();
    });

    return () => {
      unlistenChangeFolder.then((f) => f());
      unlistenNewPage.then((f) => f());
    };
  }, [pickFolder, newPage]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const hasModifier = e.metaKey || e.ctrlKey;

      if (e.key === "k" && hasModifier) {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }

      // Cmd+N -> New Page (Legacy/Menu)
      if (e.key === "n" && hasModifier) {
        e.preventDefault();
        const dir = localStorage.getItem("rootDir");
        if (dir) newPage();
      }

      // Cmd+P -> New Page
      if (e.key === "p" && hasModifier) {
        e.preventDefault();
        const dir = localStorage.getItem("rootDir");
        if (dir) newPage();
      }

      // Cmd+C -> New Canvas
      // Only trigger if no text is selected to avoid breaking Copy
      if (e.key === "c" && hasModifier) {
        const selection = window.getSelection();
        if (!selection || selection.toString().length === 0) {
           e.preventDefault();
           const dir = localStorage.getItem("rootDir");
           if (dir) newCanvas();
        }
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

      {isCanvasMode ? (
        <Canvas key={editorKey} initialData={activeContent} onChange={handleChange} />
      ) : (
        <Editor key={editorKey} initialMarkdown={activeContent} onChange={handleChange} />
      )}

      {cmdkOpen && <CommandBar files={files} onSelect={openFile} onClose={() => setCmdkOpen(false)} />}
    </div>
  );
}

export default App;
