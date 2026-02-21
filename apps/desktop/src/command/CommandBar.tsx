import { Command } from "cmdk";
import { getFileStem } from "~/utils/file";

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
            const displayName = getFileStem(path);
            const isCanvas = path.toLowerCase().endsWith(".excalidraw");

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
                {isCanvas && <span className="opacity-50 ml-2 text-[10px] uppercase tracking-wider">Canvas</span>}
              </Command.Item>
            );
          })}
        </Command.List>
      </Command>
    </div>
  );
}
