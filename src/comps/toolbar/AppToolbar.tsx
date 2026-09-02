import { RefObject, useEffect, useState } from "react";
import { Image, Menu, MonitorUp, MousePointerClick, Pin, X } from "lucide-react";
import { appState, useAppState } from "../../state";
import { setAlwaysOnTop, setClickThrough } from "../../natives/nativeWindow";
import { isTauri } from "../../natives/native";
import { showToast } from "../utils/toast";
import { AppBackgroundImageCanvasHandle } from "../app/AppBackgroundImageCanvas";
import { AppColorAnalysisHandle } from "../app/AppColorAnalysis";
import { AppImportImageHandle } from "../app/AppImportImage";

export function AppToolbar(props: {
  onChangeState?: () => void;
  appBackgroundImageCanvasRef?: RefObject<AppBackgroundImageCanvasHandle | null>;
  appColorAnalysisRef?: RefObject<AppColorAnalysisHandle | null>;
  appImportImageRef?: RefObject<AppImportImageHandle | null>;
}) {
  const [open, setOpen] = useState(false);
  const state = useAppState();
  const tauriMode = isTauri();

  useEffect(() => {
    props.onChangeState?.();
  }, [state, props]);

  return (
    <div className="absolute left-3 top-3 z-[99999] text-white">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/65 px-3 py-2 text-xs shadow-lg backdrop-blur"
        title="Color lens menu"
      >
        <Menu size={15} />
        <span>Color Lens</span>
      </button>

      {open && (
        <div className="mt-2 w-52 rounded-xl border border-white/15 bg-slate-950/90 p-2 shadow-2xl backdrop-blur">
          <p className="px-2 pb-2 text-xs leading-5 text-slate-300">
            Drag to analyze an area. Double-click to sample a 6 x 6 pixel area.
          </p>

          <button
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-800"
            onClick={() => void props.appImportImageRef?.current?.handleImportImage()}
          >
            <Image size={14} /> Import image
          </button>
          <button
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-800"
            onClick={() => {
              setOpen(false);
              void props.appImportImageRef?.current?.handleImportWindowCapture();
            }}
          >
            <MonitorUp size={14} /> Import window capture
          </button>
          <button
            className="mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-slate-800"
            onClick={() => {
              void props.appBackgroundImageCanvasRef?.current?.clear();
              if (tauriMode) appState.setTarget("screen");
            }}
          >
            <X size={14} /> {tauriMode ? "Screen capture mode" : "Clear image"}
          </button>

          {tauriMode && (
            <>
              <label className="mb-1 flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-xs hover:bg-slate-800">
                <span className="flex items-center gap-2"><MousePointerClick size={14} /> Click through</span>
                <input type="checkbox" checked={state.clickThrough} onChange={(event) => void setClickThrough(event.target.checked).then(showToast)} />
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-xs hover:bg-slate-800">
                <span className="flex items-center gap-2"><Pin size={14} /> Always on top</span>
                <input type="checkbox" checked={state.alwaysOnTop} onChange={(event) => void setAlwaysOnTop(event.target.checked)} />
              </label>
            </>
          )}

          <button
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-300 hover:bg-slate-800"
            onClick={() => props.appColorAnalysisRef?.current?.setVisible(false)}
          >
            <X size={14} /> Close analysis
          </button>
        </div>
      )}
    </div>
  );
}
