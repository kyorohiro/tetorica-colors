import {
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useState,
} from "react";
import { ColorCount } from "../../natives/nativeScreenshot";
import { AppColorAnalysisMode, drawColorAnalysisChart, RedrawParams } from "../../algos/colorAnalysisDarw";
import { AppColorAnalysisToolbar } from "../toolbar/AppColorAnalysisToolbar";

type AppColorAnalysisHandle = {
  redraw: (props?: { colors: ColorCount[]; colors01: ColorCount[]; markerColors: ColorCount[] }) => void;
  setVisible: (visible: boolean) => void;
  getCanvas: () => HTMLCanvasElement | null;
};

const AppColorAnalysis = forwardRef<AppColorAnalysisHandle, {}>(function (_, ref) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const colorsRef = useRef<{ colors: ColorCount[]; colors01: ColorCount[]; markerColors: ColorCount[] }>({
    colors: [],
    colors01: [],
    markerColors: [],
  });

  const [colorAnalysisMode, setColorAnalysisMode] =
    useState<AppColorAnalysisMode>("hue-saturation");
  const [colorToolbarOpen, setColorToolbarOpen] = useState(true);
  const [markerMode, setMarkerMode] = useState(false);

  const setVisible = useCallback((visible: boolean) => {
    if (!rootRef.current) return;
    rootRef.current.style.display = visible ? "block" : "none";
  }, []);

  const redraw = useCallback((props?: Partial<RedrawParams>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const next: RedrawParams = {
      colors: props?.colors ?? colorsRef.current.colors,
      colors01: props?.colors01 ?? colorsRef.current.colors01,
      markerColors: props?.markerColors ?? colorsRef.current.markerColors,
      colorAnalysisMode: props?.colorAnalysisMode ?? colorAnalysisMode,
      markerMode: props?.markerMode ?? markerMode,
    };
    //console.log(">>next", next);
    colorsRef.current = {
      colors: next.colors,
      colors01: next.colors01,
      markerColors: next.markerColors,
    };

    drawColorAnalysisChart(canvas, next);
  }, [colorAnalysisMode, markerMode]);

  const handleClear = useCallback(() => {
    setVisible(false);
  }, [setVisible]);

  const setModeAndRedraw = useCallback(
    (mode: AppColorAnalysisMode) => {
      console.log(">> setModeAndRedraw", mode, colorsRef.current)
      setColorAnalysisMode(mode);
      redraw({ colorAnalysisMode: mode });
    },
    [redraw]
  );

  const setMarkerModeAndRedraw = useCallback((next: boolean) => {
    setMarkerMode(next);
    redraw({ markerMode: next });
  }, [redraw]);

  useImperativeHandle(
    ref,
    () => ({
      redraw: (props?: { colors: ColorCount[]; colors01: ColorCount[]; markerColors: ColorCount[] }) => {
        redraw({
          colors: props?.colors ?? [],
          colors01: props?.colors01 ?? [],
          markerColors: props?.markerColors ?? [],
        });
      },
      setVisible,
      getCanvas: () => canvasRef.current,
    }),
    [redraw, setVisible]
  );

  return (
    <>
      <div
        ref={rootRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 8,
          pointerEvents: "none",
          display: "none",
        }}
      >
        <canvas id="color-analysis" ref={canvasRef} className="w-full h-full" />
      </div>
      <AppColorAnalysisToolbar
        colorToolbarOpen={colorToolbarOpen}
        setColorToolbarOpen={(v: boolean) => setColorToolbarOpen(v)}
        colorAnalysisMode={colorAnalysisMode}
        setModeAndRedraw={(v: AppColorAnalysisMode) => setModeAndRedraw(v)}
        colorsRef={colorsRef}
        markerMode={markerMode}
        setMarkerMode={setMarkerModeAndRedraw}
        handleClear={() => handleClear()}
      />
    </>
  );
});

export { AppColorAnalysis };
export type { AppColorAnalysisHandle };
