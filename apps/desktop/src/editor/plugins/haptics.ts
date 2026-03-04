import { WebHaptics } from "web-haptics";

let hapticsEnabled = localStorage.getItem("haptics") === "on";

const haptics = new WebHaptics();

export function setHapticsEnabled(enabled: boolean) {
  hapticsEnabled = enabled;
}

export function triggerTypingHaptic() {
  if (!hapticsEnabled) return;
  haptics.trigger([{ duration: 40 }]);
}

export function triggerDeleteHaptic() {
  if (!hapticsEnabled) return;
  haptics.trigger([{ duration: 1000 }], { intensity: 1 });
}
