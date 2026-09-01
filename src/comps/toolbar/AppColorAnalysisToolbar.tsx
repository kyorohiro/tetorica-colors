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

  return (
    <>
      <SubToolbar open={props.colorToolbarOpen} onToggle={() => props.setColorToolbarOpen(!props.colorToolbarOpen)} hidden={false}>
        <button
          className={toolbarButtonClass(props.colorAnalysisMode === "hue-saturation")}
          onClick={() => props.setModeAndRedraw("hue-saturation")}
          title="Saturation"
          aria-label="Saturation"
        >
          Saturation
        </button>

        <button
          className={toolbarButtonClass(props.colorAnalysisMode === "hue-lightness")}
          onClick={() => props.setModeAndRedraw("hue-lightness")}
          title="Lightness"
          aria-label="Lightness"
        >
          Lightness
        </button>

        <button
          className={toolbarButtonClass(props.markerMode)}
          onClick={() => props.setMarkerMode(!props.markerMode)}
          title="Illustration markers"
          aria-label="Illustration markers"
        >
          Markers
        </button>

        <button
          className={toolbarButtonClass(false)}
          onClick={() =>
            handleExport({
              dialog,
              colors: props.colorsRef.current.colors,
              colors01: props.colorsRef.current.colors01,
            })
          }
          title="Export"
          aria-label="Export"
        >
          <Download className="w-4 h-4" />
          Export
        </button>

        <button
          className={toolbarButtonClass(false)}
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
