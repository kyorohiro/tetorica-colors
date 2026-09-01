import { invoke } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { getTaurPlatformInfo } from "./native";
//import { waitNextFrame } from "./utils";

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
export type { ColorCount } from "../algos/colorAnalysis";

type TargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScreenCaptureImage = {
  path: string;

  // 表示用: window / canvas 内の CSS px 座標
  viewWidth: number;
  viewHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;

  // デバッグ用: Rust に渡した実キャプチャ座標
  captureX: number;
  captureY: number;
  captureWidth: number;
  captureHeight: number;
};

export type ScreenCaptureImageBuffer = {
  pngBuffer: ArrayBuffer;
  viewWidth: number;
  viewHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  captureX: number;
  captureY: number;
  captureWidth: number;
  captureHeight: number;
};
function getDefaultTargetRect(): TargetRect {
  return {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function calcScreenCaptureViewRect(params: {
  targetRect?: TargetRect | null;
}): {
  viewWidth: number;
  viewHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const target = params.targetRect ?? getDefaultTargetRect();

  return {
    viewWidth: window.innerWidth,
    viewHeight: window.innerHeight,
    x: target.x,
    y: target.y,
    width: target.width,
    height: target.height,
  };
}

// targetRect : window/canvas 内の CSS px 座標
export async function calcCaptureAndCropParams(params: {
  targetRect?: TargetRect | null;
}): Promise<{ x: number; y: number; width: number; height: number }> {
  console.log("> calcCaptureAndCropParams", params);

  const appWindow = getCurrentWindow();
  const innerPos = await appWindow.innerPosition();
  const innerSize = await appWindow.innerSize();
  const outerPos = await appWindow.outerPosition();
  const outerSize = await appWindow.outerSize();

  let scale = await appWindow.scaleFactor();
  const scaleFactor = scale;
  const os = await getTaurPlatformInfo();
  const isWindows = os === "windows";
  const isMac = os === "macos";

  const customTitleBar = document.getElementById("custom-title-bar");

  // CSS px 基準
  let titlebarHeightCss = 0;
  if (customTitleBar) {
    titlebarHeightCss = customTitleBar.getBoundingClientRect().height;
  }

  // capture 用の補正値
  let titlebarHeightForCapture = titlebarHeightCss;

  if (isWindows) {
    // 現状の実測ルールを維持
    titlebarHeightForCapture = titlebarHeightCss * scale;
    scale = 1.0;
  }

  if (isMac) {
    const latestOuterPos = await appWindow.outerPosition();
    const latestInnerPos = await appWindow.innerPosition();

    if (latestOuterPos.y === latestInnerPos.y) {
      titlebarHeightForCapture = 28 * scale;
    }
  }

  console.log("> capture window info", {
    innerPos,
    innerSize,
    outerPos,
    outerSize,
    scale,
    scaleFactor,
    os,
    titlebarHeightCss,
    titlebarHeightForCapture,
  });

  const target = params.targetRect ?? null;
  const targetX = target ? target.x * scaleFactor : 0;
  const targetY = target ? target.y * scaleFactor : 0;
  const targetWidth = target ? target.width * scaleFactor : innerSize.width;
  const targetHeight = target
    ? target.height * scaleFactor
    : innerSize.height - titlebarHeightForCapture;

  const captureX = Math.round((innerPos.x + targetX) / scale);
  const captureY = Math.round((innerPos.y + titlebarHeightForCapture + targetY) / scale);
  const captureWidth = Math.round(targetWidth / scale);
  const captureHeight = Math.round(targetHeight / scale);

  console.log("> capture rect", {
    target,
    captureX,
    captureY,
    captureWidth,
    captureHeight,
  });

  return {
    x: captureX,
    y: captureY,
    width: captureWidth,
    height: captureHeight,
  };
}

export async function captureAndCrop(params: {
  targetRect?: TargetRect | null;
  hideWindow?: boolean;
}): Promise<ScreenCaptureImageBuffer> {
  const captureRect = await calcCaptureAndCropParams({
    targetRect: params.targetRect,
  });

  const viewRect = calcScreenCaptureViewRect({
    targetRect: params.targetRect,
  });

  const toolbar = document.getElementById("toolbar");
  const appWindow = getCurrentWindow();

  try {
    if (params.hideWindow) {
      await appWindow.hide();

      for (let i = 0; i < 10; i++) {
        const visible = await appWindow.isVisible();
        if (!visible) break;
        await new Promise((r) => setTimeout(r, 16));
      }

      //await sleep(25);
      await sleep(300);
    }

    const pngBuffer = await invoke<ArrayBuffer>("capture_and_crop_bytes", {
      x: captureRect.x,
      y: captureRect.y,
      width: captureRect.width,
      height: captureRect.height,
    });

    return {
      pngBuffer,
      viewWidth: viewRect.viewWidth,
      viewHeight: viewRect.viewHeight,
      x: viewRect.x,
      y: viewRect.y,
      width: viewRect.width,
      height: viewRect.height,
      captureX: captureRect.x,
      captureY: captureRect.y,
      captureWidth: captureRect.width,
      captureHeight: captureRect.height,
    };
  } catch (e) {
    if (typeof e === "string") {
      throw new Error(e);
    } else if (e instanceof Error) {
      throw e;
    } else {
      throw new Error(JSON.stringify(e));
    }
  } finally {
    if (toolbar) {
      toolbar.style.display = "";
    }
    if (params.hideWindow) {
      await appWindow.show();
    }
  }
}
