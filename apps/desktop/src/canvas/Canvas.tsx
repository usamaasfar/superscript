import { Excalidraw, getSceneVersion, serializeAsJSON } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useRef } from "react";

interface CanvasProps {
  initialData: string; // JSON string from .excalidraw file; "" for blank canvas
  onChange: (json: string) => void;
  theme?: "light" | "dark";
}

export function Canvas({ initialData, onChange, theme }: CanvasProps) {
  const lastVersionRef = useRef<number>(-1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  const parsed = initialData ? JSON.parse(initialData) : null;

  const handleChange = useCallback(
    (
      elements: Parameters<typeof serializeAsJSON>[0],
      appState: Parameters<typeof serializeAsJSON>[1],
      files: Parameters<typeof serializeAsJSON>[2],
    ) => {
      const version = getSceneVersion(elements);
      if (version === lastVersionRef.current) return;
      lastVersionRef.current = version;
      onChange(serializeAsJSON(elements, appState, files, "local"));
    },
    [onChange],
  );

  return (
    <div className="canvas-mount">
      <Excalidraw
        initialData={parsed}
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        onChange={handleChange}
        theme={theme}
      />
    </div>
  );
}
