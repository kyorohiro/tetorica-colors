import {
  forwardRef,
  RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { draw, resizeCanvas } from "../../algos/deskel";
import { useAppState, appState } from "../../state";
import {
  captureAndCrop,
  ColorCount,
} from "../../natives/nativeScreenshot";
import { showToast } from "../utils/toast";
import { useDialog } from "../utils/useDialog";
import {
  hasPermission,
  openPrivacySettings,
  requestScreenCapturePermission,
} from "../../natives/nativePermissionCheck";
import { getRectFromPoints } from "../../algos/utils";
import { getTaurPlatformInfo } from "../../natives/native";
import { AppBackgroundImageCanvasHandle } from "./AppBackgroundImageCanvas";
import { analyzeColorBlob } from "../../algos/colorAnalysisWorker";

import type {
  AppDeskelPoint,
  DeskelToolContext,
  DeskelToolHandler,
  MeasureMode,
  QuadMode,
  SelectionRect,
} from "./appDeskelImpl/DeskelToolHandler";
import { ColorHandler } from "./appDeskelImpl/ColorHandler";

const QUICK_SAMPLE_SIZE = 6;

type AppDeskelHandle = {
  redraw: (props?: { isResizeCanvas: boolean }) => void;
  setVisible: (visible: boolean) => void;
  getCanvas: () => HTMLCanvasElement | null;
};

const AppDeslel = forwardRef<
  AppDeskelHandle,
  {
    onColorAnalysis?: (
      colors: ColorCount[],
      colors01: ColorCount[],
      markerColors: ColorCount[],
    ) => Promise<void>;
    onBeforeCapture?: () => Promise<void>;
    appBackgroundImageCanvasRef: RefObject<AppBackgroundImageCanvasHandle | null>;
  }
>(function AppDeslel(props, ref) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startRef = useRef<AppDeskelPoint | null>(null);
  const currentRef = useRef<AppDeskelPoint | null>(null);
  const draggingRef = useRef(false);
  const [, setDragging] = useState(false);

  const measureMode: MeasureMode = "line";
  const quadMode: QuadMode = "off";
  const [isMac, setIsMac] = useState(false);

  const dialog = useDialog();
  const uAppState = useAppState();

  const colorHandlerRef = useRef(new ColorHandler());
  

  const setDraggingValue = useCallback((value: boolean) => {
    if (draggingRef.current === value) return;
    draggingRef.current = value;
    setDragging(value);
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const p = await getTaurPlatformInfo();
        if (mounted) {
          setIsMac(p === "macos");
        }
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleHelpMac = useCallback(async () => {
    const result = await dialog.showConfirmDialog({
      title: "Screen Capture Permission Help",
      body:
        "macOS requires Screen Recording permission to analyze colors from other apps. Tetorica Colors captures only the area you drag and never uploads your screen.\n\n" +
        "The itch.io build is not code-signed, so macOS can occasionally treat an updated download as a different app. If screen capture stops working after an update, grant permission again for the current Tetorica Colors app.\n\n" +
        "Go to Settings -> Privacy & Security -> Screen Recording & System Audio. Remove the old 'tetorica-colors' entry with '-' and add the current app again with '+'.\n\n" +
        "Open System Settings now?",
      cancelText: "Not now",
      okText: "Open System Settings",
    });
    if (result) {
      await openPrivacySettings();
    }
  }, [dialog]);

  const getSelectionRect = useCallback((): SelectionRect | null => {
    if (!startRef.current || !currentRef.current || !canvasRef.current) {
      return null;
    }

    const width = Math.abs(startRef.current.x - currentRef.current.x);
    const height = Math.abs(startRef.current.y - currentRef.current.y);

    if (width < 8 || height < 8) {
      return null;
    }

    return getRectFromPoints({
      start: startRef.current,
      current: currentRef.current,
    });
  }, []);

  const captureFromImage = useCallback(
    async (selectedRect: SelectionRect) => {
      const result = await props.appBackgroundImageCanvasRef.current?.getCropImage({
        x: selectedRect.x,
        y: selectedRect.y,
        width: selectedRect.width,
        height: selectedRect.height,
      });

      if (!result) {
        showToast("Failed to crop image.");
        return;
      }

      const arrayBuffer = await result.blob.arrayBuffer();
      const pngBuffer = new Uint8Array(arrayBuffer);

      appState.setCaptureImage({
        buffer: pngBuffer as any,
        sourceWidth: window.innerWidth,
        sourceHeight: window.innerHeight,
        cropX: selectedRect.x,
        cropY: selectedRect.y,
        cropWidth: selectedRect.width,
        cropHeight: selectedRect.height,
      });
    },
    [props.appBackgroundImageCanvasRef],
  );

  const captureFromScreen = useCallback(async (selectedRect: SelectionRect) => {
    const ret = await captureAndCrop({
      targetRect: selectedRect,
      hideWindow: true,
    });

    appState.setCaptureImage({
      buffer: ret.pngBuffer,
      sourceWidth: ret.viewWidth,
      sourceHeight: ret.viewHeight,
      cropX: ret.x,
      cropY: ret.y,
      cropWidth: ret.width,
      cropHeight: ret.height,
    });
  }, []);

  const analyzeFromImage = useCallback(
    async (selectedRect: SelectionRect, options?: { maxSize: number; quantizeStep: number; topN: number }) => {
      const cropResult = await props.appBackgroundImageCanvasRef.current?.getCropImage({
        x: selectedRect.x,
        y: selectedRect.y,
        width: selectedRect.width,
        height: selectedRect.height,
      });

      if (!cropResult) {
        showToast("Failed to analyze image.");
        return;
      }

      const ret = await analyzeColorBlob(cropResult.blob, options);
      await props.onColorAnalysis?.(ret.colors, ret.colors01, ret.markerColors);
    },
    [props.appBackgroundImageCanvasRef, props.onColorAnalysis],
  );

  const analyzeFromScreen = useCallback(async (selectedRect: SelectionRect, options?: { maxSize: number; quantizeStep: number; topN: number }) => {
    if (isMac && !(await hasPermission())) {
      const allowCapture = await dialog.showConfirmDialog({
        title: "Allow Screen Recording",
        body:
          "To analyze colors from other apps, Tetorica Colors needs macOS Screen Recording permission.\n\n" +
          "It captures only the area you drag for color analysis. Your screen is never uploaded.",
        cancelText: "Not now",
        okText: "Allow Screen Recording",
      });

      if (!allowCapture) {
        return;
      }

      await requestScreenCapturePermission();

      if (!(await hasPermission())) {
        showToast("Allow Screen Recording in System Settings, then try again.");
        await openPrivacySettings();
        return;
      }
    }

    await props.onBeforeCapture?.();
    const capture = await captureAndCrop({
      targetRect: selectedRect,
      hideWindow: true,
    });
    const ret = await analyzeColorBlob(new Blob([capture.pngBuffer], { type: "image/png" }), options);
    await props.onColorAnalysis?.(ret.colors, ret.colors01, ret.markerColors);
  }, [dialog, isMac, props.onBeforeCapture, props.onColorAnalysis]);

  const analyzeNearPoint = useCallback(async (point: AppDeskelPoint) => {
    const selectedRect = {
      x: Math.max(0, Math.min(window.innerWidth - QUICK_SAMPLE_SIZE, Math.round(point.x) - 3)),
      y: Math.max(0, Math.min(window.innerHeight - QUICK_SAMPLE_SIZE, Math.round(point.y) - 3)),
      width: QUICK_SAMPLE_SIZE,
      height: QUICK_SAMPLE_SIZE,
    };
    const options = { maxSize: QUICK_SAMPLE_SIZE, quantizeStep: 1, topN: QUICK_SAMPLE_SIZE * QUICK_SAMPLE_SIZE };

    if (uAppState.target === "image") {
      await analyzeFromImage(selectedRect, options);
    } else {
      await analyzeFromScreen(selectedRect, options);
    }
  }, [analyzeFromImage, analyzeFromScreen, uAppState.target]);

  const setMeasureUnit = useCallback(
    (pixelsPerUnit: number, start: AppDeskelPoint, end: AppDeskelPoint) => {
      appState.setMeasureUnit(pixelsPerUnit);
      uAppState.measureUnitSet = {
        start: { ...start },
        end: { ...end },
      };
      showToast(`Measure unit set to ${pixelsPerUnit.toFixed(2)} pixels`);
    },
    [uAppState],
  );

  const getPoint = useCallback((e: PointerEvent): AppDeskelPoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const getCurrentHandler = useCallback((): DeskelToolHandler => {
    return colorHandlerRef.current;
  }, []);

  const createToolContext = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): DeskelToolContext => {
      return {
        canvas,
        ctx,
        state: {
          tool: uAppState.tool,
          target: uAppState.target as "image" | "screen",
          color: uAppState.color,
          measureUnit: uAppState.measureUnit,
          measureMode,
          quadMode,
        },
        startRef,
        currentRef,
        draggingRef,
        setDragging: setDraggingValue,
        getPoint,
        getSelectionRect,
        requestRedraw: () => {},
        setMeasureUnit,
        captureFromImage,
        captureFromScreen,
        analyzeFromImage,
        analyzeFromScreen,
        showToast,
      };
    },
    [
      uAppState.tool,
      uAppState.target,
      uAppState.color,
      uAppState.measureUnit,
      measureMode,
      quadMode,
      setDraggingValue,
      getPoint,
      getSelectionRect,
      setMeasureUnit,
      captureFromImage,
      captureFromScreen,
      analyzeFromImage,
      analyzeFromScreen,
    ],
  );

  const redraw = useCallback(
    (props?: { isResizeCanvas: boolean }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (props?.isResizeCanvas) {
        resizeCanvas({ canvas, ctx });
      }

      draw({ canvas, ctx });

      const toolCtx = createToolContext(canvas, ctx);
      toolCtx.requestRedraw = redraw;
      getCurrentHandler().redraw(toolCtx);
    },
    [createToolContext, getCurrentHandler],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.touchAction = "none";

    const onPointerDown = (e: PointerEvent) => {
      const handler = getCurrentHandler();
      const ctx = createToolContext(canvas, canvas.getContext("2d")!);
      ctx.requestRedraw = redraw;

      handler.onPointerDown(ctx, e);
      canvas.setPointerCapture?.(e.pointerId);
      redraw();
    };

    const onPointerMove = (e: PointerEvent) => {
      const handler = getCurrentHandler();
      const ctx = createToolContext(canvas, canvas.getContext("2d")!);
      ctx.requestRedraw = redraw;

      handler.onPointerMove(ctx, e);
      redraw();
    };

    const onPointerUp = async (e: PointerEvent) => {
      const handler = getCurrentHandler();
      const ctx = createToolContext(canvas, canvas.getContext("2d")!);
      ctx.requestRedraw = redraw;

      try {
        await handler.onPointerUp(ctx, e);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          showToast(err.message);
        } else {
          showToast(String(err));
        }
      }
      redraw();
    };

    const onPointerCancel = async (e: PointerEvent) => {
      const handler = getCurrentHandler();
      const ctx = createToolContext(canvas, canvas.getContext("2d")!);
      ctx.requestRedraw = redraw;

      try {
        await handler.onPointerCancel(ctx, e);
      } catch (err) {
        console.error(err);
      }
      redraw();
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    const onDoubleClick = (e: MouseEvent) => {
      void analyzeNearPoint(getPoint(e as PointerEvent)).catch((err) => {
        console.error(err);
        showToast(err instanceof Error ? err.message : String(err));
      });
    };
    canvas.addEventListener("dblclick", onDoubleClick);

    redraw({ isResizeCanvas: true });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("dblclick", onDoubleClick);
    };
  }, [analyzeNearPoint, createToolContext, getCurrentHandler, getPoint, redraw]);

  useEffect(() => {
    const handleResize = () => {
      redraw({ isResizeCanvas: true });
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [redraw]);

  useImperativeHandle(
    ref,
    () => ({
      redraw,
      setVisible: (visible: boolean) => {
        if (!rootRef.current) return;
        rootRef.current.style.display = visible ? "block" : "none";
      },
      getCanvas: () => canvasRef.current,
    }),
    [redraw],
  );

  return (
    <>
      <div ref={rootRef}>
        <canvas key="deskel-default" id="deskel" ref={canvasRef} />
      </div>

      <div
        className={`fixed top-4 right-4 z-9999 items-center gap-2 ${
          isMac
            ? "flex"
            : "hidden"
        }`}
      >
        <button
          className="rounded-lg bg-black/60 px-3 py-2 text-xs text-white transition-opacity duration-200 opacity-80"
          onClick={() => {
            void handleHelpMac();
          }}
          title="Screen capture help"
          aria-label="Screen capture help"
        >
          ?
        </button>
      </div>

    </>
  );
});

export { AppDeslel };
export type { AppDeskelHandle, AppDeskelPoint };
