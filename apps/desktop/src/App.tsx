import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useRef, useState } from "react";
import { CommandBar } from "~/command/CommandBar";
import { Editor } from "~/editor/Editor";
import { useAppearance } from "~/hooks/useAppearance";
import { useAutoSave } from "~/hooks/useAutoSave";
import { useAutoUpdate } from "~/hooks/useAutoUpdate";
import { useFileSystem } from "~/hooks/useFileSystem";
import { useMenuEvents } from "~/hooks/useMenuEvents";
import { useNoteNavigation } from "~/hooks/useNoteNavigation";
import { useRename } from "~/hooks/useRename";
import { useTitleVisibility } from "~/hooks/useTitleVisibility";
import { useWindowGuards } from "~/hooks/useWindowGuards";
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
    files,
    loadDir,
    setActivePath,
  });

  const { isRenaming, renameValue, setRenameValue, renameInputRef, startRename, submitRename, resetRename } = useRename({
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
  });

  const { deletePage, openFile, newPage } = useNoteNavigation({
    activePath,
    files,
    flushSave,
    loadDir,
    setActivePath,
    setActiveContent,
    bumpEditorKey,
  });

  useMenuEvents({ pickFolder, newPage, deletePage });
  useWindowGuards({ deletePage, newPage, setCmdkOpen });

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
