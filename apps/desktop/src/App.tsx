import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommandBar } from "~/command/CommandBar";
import { Editor } from "~/editor/Editor";
import { useAppearance } from "~/hooks/useAppearance";
import { useAutoUpdate } from "~/hooks/useAutoUpdate";
import { useAutoSave } from "~/hooks/useAutoSave";
import { useFileSystem } from "~/hooks/useFileSystem";
import { useRename } from "~/hooks/useRename";
import { useTitleVisibility } from "~/hooks/useTitleVisibility";
import { getFileStem } from "~/utils/file";

function App() {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<string>("");
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
    bumpEditorKey();
  }, [bumpEditorKey]);

  useAppearance();
  useAutoUpdate();

  const { files, loadDir, pickFolder } = useFileSystem({
    cmdkOpen,
    onFolderLoaded: resetEditor,
  });

  const { handleChange, flushSave } = useAutoSave({
    activePath,
    loadDir,
    setActivePath,
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
      const content = await readTextFile(path);
      setActivePath(path);
      setActiveContent(content);
      bumpEditorKey();
    },
    [flushSave, bumpEditorKey],
  );

  const newPage = useCallback(async () => {
    await flushSave();
    setActivePath(null);
    setActiveContent("");
    bumpEditorKey();
  }, [flushSave, bumpEditorKey]);

  // Tauri event listeners for new note and folder change
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
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const dir = localStorage.getItem("rootDir");
        if (dir) newPage();
      }
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const win = getCurrentWindow();
        win.isFullscreen().then((fs) => win.setFullscreen(!fs));
      }
      if (e.key === "Escape") {
        if (cmdkOpen) {
          setCmdkOpen(false);
        } else {
          const win = getCurrentWindow();
          win.isFullscreen().then((fs) => {
            if (fs) win.setFullscreen(false);
          });
        }
      }
      // Prevent webview zoom via keyboard (Cmd/Ctrl +/-/=)
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "-" || e.key === "+")) {
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newPage, cmdkOpen]);

  // Prevent context menu on app shell (native apps don't show browser context menus)
  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      // Allow context menu inside the editor for text editing
      if (target.closest(".ProseMirror")) return;
      e.preventDefault();
    }
    // Prevent pinch-to-zoom
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    }
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("wheel", onWheel);
    };
  }, []);

  const activeFileName = activePath ? getFileStem(activePath) : "Untitled";
  const titleValue = isRenaming ? renameValue : activeFileName;
  const titleSwitching = useTitleVisibility(activePath);
  const handleTopbarPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    void getCurrentWindow().startDragging();
  }, []);

  return (
    <div className="app">
      <div className="app-topbar">
        <div className="app-topbar-drag" data-tauri-drag-region="" onPointerDown={handleTopbarPointerDown} />
        <div className={`app-title-wrap${!activePath ? " is-untitled" : ""}${titleSwitching ? " is-switching" : ""}`}>
          <input
            ref={renameInputRef}
            className={`app-title-input${isRenaming ? " is-editing" : ""}`}
            value={titleValue}
            size={Math.max(1, titleValue.length)}
            readOnly={!isRenaming}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
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
      <Editor key={editorKey} initialMarkdown={activeContent} onChange={handleChange} />
      {cmdkOpen && <CommandBar files={files} onSelect={openFile} onClose={() => setCmdkOpen(false)} />}
    </div>
  );
}

export default App;
