import { Download, BrushCleaning } from "lucide-react";
import { handleExport } from "../../algos/colorPalette";
import { SubToolbar, toolbarButtonClass } from "../../parts/AppDeskelToolbarParts";
import { AppColorAnalysisMode } from "../../algos/colorAnalysisDarw";
import { useDialog } from "../utils/useDialog";
import { ColorCount } from "../../natives/nativeScreenshot";

const AppColorAnalysisToolbar = (props: {
  colorToolbarOpen: boolean,
  setColorToolbarOpen: (v: boolean) => void,
  colorAnalysisMode: AppColorAnalysisMode,
  setModeAndRedraw: (v: AppColorAnalysisMode) => void,
  colorsRef: React.RefObject<{
    colors: ColorCount[];
    colors01: ColorCount[];
    markerColors: ColorCount[];
  }>,
  markerMode: boolean,
  setMarkerMode: (value: boolean) => void,
  handleClear: () => void
}) => {
  const dialog = useDialog();
  const compactButtonClass = (active = false) => `${toolbarButtonClass(active)} text-[11px]`;

  return (
    <>
      <SubToolbar open={props.colorToolbarOpen} onToggle={() => props.setColorToolbarOpen(!props.colorToolbarOpen)} hidden={false}>
        <div className="m-0.5 flex items-center rounded-2xl border border-slate-700 bg-slate-900 p-1">
          <button
            className={`rounded-xl px-2 py-1.5 text-[11px] transition-colors ${
              props.colorAnalysisMode === "hue-saturation"
                ? "bg-emerald-700 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
            onClick={() => props.setModeAndRedraw("hue-saturation")}
            aria-pressed={props.colorAnalysisMode === "hue-saturation"}
          >
            Saturation
          </button>
          <button
            className={`rounded-xl px-2 py-1.5 text-[11px] transition-colors ${
              props.colorAnalysisMode === "hue-lightness"
                ? "bg-emerald-700 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
            onClick={() => props.setModeAndRedraw("hue-lightness")}
            aria-pressed={props.colorAnalysisMode === "hue-lightness"}
          >
            Lightness
          </button>
        </div>

        <button
          className={`m-0.5 flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] transition-colors ${
            props.markerMode
              ? "border-amber-400 bg-amber-400/15 text-amber-100"
              : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
          onClick={() => props.setMarkerMode(!props.markerMode)}
          role="switch"
          aria-checked={props.markerMode}
          title="Show illustration marker matches"
        >
          Markers
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${props.markerMode ? "bg-amber-400 text-slate-950" : "bg-slate-700 text-slate-300"}`}>
            {props.markerMode ? "ON" : "OFF"}
          </span>
        </button>

        <button
          className={compactButtonClass(false)}
          onClick={() =>
            handleExport({
              dialog,
              colors: props.colorsRef.current.colors,
              colors01: props.colorsRef.current.colors01,
              markerColors: props.colorsRef.current.markerColors,
            })
          }
          title="Export"
          aria-label="Export"
        >
          <Download className="w-4 h-4" />
          Export
        </button>

        <button
          className={compactButtonClass(false)}
          onClick={props.handleClear}
          title="Clear"
          aria-label="Clear"
        >
          <BrushCleaning className="w-4 h-4" />
          Clear
        </button>

      </SubToolbar>

    </>
  );
};

export { AppColorAnalysisToolbar };
