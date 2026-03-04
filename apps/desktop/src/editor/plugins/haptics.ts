import { WebHaptics } from "web-haptics";

let hapticsEnabled = localStorage.getItem("haptics") === "on";

const haptics = new WebHaptics({ debug: true });

export function setHapticsEnabled(enabled: boolean) {
  hapticsEnabled = enabled;
}

export function triggerHaptic() {
  if (!hapticsEnabled) return;
  haptics.trigger([{ duration: 40 }]);
}
