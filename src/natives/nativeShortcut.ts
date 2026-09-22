import { showToast } from "../comps/utils/toast";
import { toggleClickCursorThrough } from "./nativeWindow";
import { getTaurPlatformInfo } from "./native";
import { register } from "@tauri-apps/plugin-global-shortcut";

const TOGGLE_CLICK_SHORTCUT = "Ctrl+Shift+J";
const registrations = new Map<string, Promise<void>>();

function registerShortcut(shortcut: string): Promise<void> {
  let registration = registrations.get(shortcut);
  registration ??= register(shortcut, async (event) => {
    if (event.state !== "Pressed") return;
    try {
      await toggleClickCursorThrough();
    } catch (error) {
      console.error("Failed to toggle click-through", error);
      showToast("Could not change click-through. Please try again.");
    }
  }).catch((error) => {
    registrations.delete(shortcut);
    throw error;
  });
  registrations.set(shortcut, registration);
  return registration;
}

async function setupShortcuts(): Promise<void> {
  await registerShortcut("Control+Shift+J");
  // An unavailable optional shortcut must not disable Control+Shift+J.
  try {
    if (await getTaurPlatformInfo() === "macos") {
      await registerShortcut("Command+Shift+J");
    }
  } catch (error) {
    console.warn("Could not register Command+Shift+J", error);
  }
}

export { TOGGLE_CLICK_SHORTCUT, setupShortcuts };
