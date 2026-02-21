import { Command } from "cmdk";
import "./CommandBar.css";

interface Props {
  files: string[];
  onSelect: (path: string) => void;
  onClose: () => void;
}

export function CommandBar({ files, onSelect, onClose }: Props) {
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <Command className="cmdk-palette" onClick={(e) => e.stopPropagation()}>
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
