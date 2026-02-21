import { Command } from "cmdk";
import { useMemo, useState } from "react";

interface Props {
  files: string[];
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onClose: () => void;
}

export function CommandBar({ files, onSelect, onDelete, onClose }: Props) {
  const [selected, setSelected] = useState("");

  const valueToPath = useMemo(() => {
    const map = new Map<string, string>();
    for (const path of files) {
      const name = path.split(/[\\/]/).pop() || path;
      const displayName = name.toLowerCase().endsWith(".md") ? name.slice(0, -3) : name;
      // cmdk normalises values to lowercase
      map.set(`${displayName} ${name}`.toLowerCase(), path);
    }
    return map;
  }, [files]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Backspace" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const path = valueToPath.get(selected);
      if (path) onDelete(path);
    }
  }

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <Command
        className="cmdk-palette"
        value={selected}
        onValueChange={setSelected}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <Command.Input autoFocus placeholder="Find file…" />
        <Command.List>
          <Command.Empty>No files found.</Command.Empty>
          {files.map((path) => {
            const name = path.split(/[\\/]/).pop() || path;
            const displayName = name.toLowerCase().endsWith(".md") ? name.slice(0, -3) : name;
            return (
              <Command.Item
                key={path}
                value={`${displayName} ${name}`}
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
