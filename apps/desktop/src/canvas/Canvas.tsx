import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";


import "@excalidraw/excalidraw/index.css";
import { useCallback, useMemo } from "react";

interface CanvasProps {
  initialData: string;
  onChange: (data: string) => void;
}

export function Canvas({ initialData, onChange }: CanvasProps) {
  const initialContent = useMemo(() => {
    if (!initialData) return null;
    try {
      return JSON.parse(initialData);
    } catch {
      return null;
    }
  }, [initialData]);

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      const content = serializeAsJSON(elements, appState, files, "local");
      onChange(content);
    },
    [onChange]
  );

  return (
    <div className="h-full w-full">
      <Excalidraw
        initialData={{
          ...initialContent,
          appState: {
            ...initialContent?.appState,
            zenModeEnabled: true,
            viewBackgroundColor: "#ffffff",
          },
          scrollToContent: true,
        }}
        onChange={handleChange}
      />
    </div>
  );
}
