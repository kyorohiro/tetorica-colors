import { appState } from "../state";
import { TOGGLE_CLICK_SHORTCUT } from "./nativeShortcut";
//import { showToolbar, hideToolbarSoon } from "./toolbar";
import { getAppWindow } from "./native";

//const win = getCurrentWindow();

 async function updateWindowTitle(): Promise<string> {
  console.log("> updateWindowTitle", appState.getState().clickThrough);
  const title = appState.getState().clickThrough
    ? `Back to normal: ${TOGGLE_CLICK_SHORTCUT}`
    : "Tetorica Colors";
  console.log(title);

  const win = await getAppWindow();
  if(!win) {
    return "";
  }
  win.setTitle(title);
  const customTitleBar = document.getElementById("custom-title-bar-value")
  if (customTitleBar != null) {
    customTitleBar.textContent = title;
  }
  return title;
}

async function setAlwaysOnTop(value: boolean): Promise<void> {
  console.log(">  setAlwaysOnTop ", value);
  const win = await getAppWindow();
  if(!win) {
    return;
  }
  appState.setAlwaysOnTop(value);
  await win.setAlwaysOnTop(value);

  const btn = document.getElementById("togglePin") as HTMLButtonElement | null;
  if (btn) {
    btn.textContent = `pin: ${value ? "on" : "off"}`;
  }
}

async function toggleAlwaysOnTop(): Promise<void> {
  console.log("> toggleAlwaysOnTop", appState.getState().alwaysOnTop);
  await setAlwaysOnTop(!appState.getState().alwaysOnTop);
}

async function setClickThrough(value: boolean): Promise<string> {
  console.log(">  setClickThrough ", value)
  const win = await getAppWindow();
  if(!win) {
    return ""; 
  }
  appState.setClickThrough(value);
  await win.setIgnoreCursorEvents(value);
  if(value) {
    await setAlwaysOnTop(value);
  }

  const btn = document.getElementById("toggleClickCursor") as HTMLButtonElement | null;
  if (btn) {
    btn.textContent = `click: ${value ? "on" : "off"}`;
  }
  //if(value) {
  //  hideToolbarSoon();
  //} else {
  //  showToolbar();
  //}
  return await updateWindowTitle();
}

async function toggleClickCursorThrough(): Promise<void> {
  console.log("> toggleClickCursorThrough ", appState.getState().clickThrough)
  await setClickThrough(!appState.getState().clickThrough);
}
export {
    updateWindowTitle,
    toggleAlwaysOnTop,
    setClickThrough,
    toggleClickCursorThrough,
    setAlwaysOnTop    
}
