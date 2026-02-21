import { Command } from "cmdk";
import { useRef } from "react";

interface Props {
  files: string[];
  onSelect: (path: string) => void;
  onDelete?: (path: string) => void;
  onClose: () => void;
}

export function CommandBar({ files, onSelect, onDelete, onClose }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey && e.key === "Backspace") || e.key === "Delete") {
      e.preventDefault();
      e.stopPropagation();

      const selectedItem = listRef.current?.querySelector("[data-selected=\"true\"]");
      if (selectedItem) {
        const path = selectedItem.getAttribute("data-path");
        if (path && onDelete) {
          onDelete(path);
        }
      }
    }
  };

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <Command className="cmdk-palette" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <Command.Input autoFocus placeholder="Find file…" />
        <Command.List ref={listRef}>
          <Command.Empty>No files found.</Command.Empty>
          {files.map((path) => {
            const name = path.split(/[\\/]/).pop() || path;
            const displayName = name.toLowerCase().endsWith(".md") ? name.slice(0, -3) : name;
            return (
              <Command.Item
                key={path}
                value={`${displayName} ${name}`}
                data-path={path}
                onSelect={() => {
                  onSelect(path);
                  onClose();
                }}
              >
                {displayName}
              </Command.Item>
            );
          })}
        </Command.List>
      </Command>
    </div>
  );
}
