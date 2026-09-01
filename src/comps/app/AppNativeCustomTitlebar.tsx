import { getCurrentWindow } from "@tauri-apps/api/window"
import { useLayoutEffect } from "react";

const appWindow = getCurrentWindow()

export function CustomTitlebar() {
  useLayoutEffect(() => {
    // ブラウザが画面を描画する直前に実行される
    const el = document.getElementById("custom-title-bar");
    if (el) {
      const h = el.getBoundingClientRect().height;
      console.log("=====> h=", h);
      
      // ここで Tauri の座標と一緒にログを出せば、正しい値が出るはずです
      (async () => {
        console.log({
          titlebarHeight: h,
          pos: await appWindow.innerPosition(),
          opos: await appWindow.outerPosition(),
        });
      })();
    }
  }, []); //
  return (
    <div
      id="custom-title-bar"
      data-tauri-drag-region
      className="select-non flex h-10 items-center justify-between border-b border-slate-700 bg-slate-900/95 px-2 text-slate-100 select-none"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 px-2 text-sm font-medium">
        <span data-tauri-drag-region id="custom-title-bar-value" className="select-non text-slate-300">Tetorica Colors</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => appWindow.minimize()}
          className="grid h-8 w-8 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
          aria-label="Minimize"
          title="Minimize"
        >
          ─
        </button>

        <button
          type="button"
          onClick={() => appWindow.toggleMaximize()}
          className="grid h-8 w-8 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
          aria-label="Maximize"
          title="Maximize"
        >
          □
        </button>

        <button
          type="button"
          onClick={() => appWindow.close()}
          className="grid h-8 w-8 place-items-center rounded-md text-slate-300 hover:bg-red-600 hover:text-white"
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
