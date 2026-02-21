import { useEffect, useRef, useState } from "react";

const FLASH_DURATION = 1200;

/**
 * Returns true briefly when activePath changes, so the title flashes
 * visible on file switch, then hides again.
 */
export function useTitleVisibility(activePath: string | null): boolean {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRef = useRef(activePath);

  useEffect(() => {
    if (prevRef.current === activePath) return;
    prevRef.current = activePath;

    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), FLASH_DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activePath]);

  return visible;
}
