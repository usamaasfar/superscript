import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";

export function useAutoUpdate(): void {
  useEffect(() => {
    check().then((update) => {
      if (update) update.downloadAndInstall().then(() => relaunch());
    });
  }, []);
}
