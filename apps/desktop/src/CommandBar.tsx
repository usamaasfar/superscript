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
            const name = path.split("/").pop()!;
            return (
              <Command.Item
                key={path}
                value={name}
                onSelect={() => {
                  onSelect(path);
                  onClose();
                }}
              >
                {name}
              </Command.Item>
            );
          })}
        </Command.List>
      </Command>
    </div>
  );
}
