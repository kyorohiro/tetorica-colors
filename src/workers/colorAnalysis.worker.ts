import init, { analyze_rgba } from "../wasm/pkg/color_analysis_wasm";
import { ILLUSTRATION_MARKERS } from "../data/illustrationMarkers";
import type { ColorAnalysisResult, ColorCount } from "../algos/colorAnalysis";

type AnalyzeRequest = {
  id: number;
  bitmap: ImageBitmap;
  maxSize: number;
  quantizeStep: number;
  topN: number;
};

let wasmReady: Promise<void> | undefined;

type OkLab = { l: number; a: number; b: number };

function toOkLab(r: number, g: number, b: number): OkLab {
  const linear = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.4122214708 * linear[0]! + 0.5363325363 * linear[1]! + 0.0514459929 * linear[2]!;
  const m = 0.2119034982 * linear[0]! + 0.6806995451 * linear[1]! + 0.1073969566 * linear[2]!;
  const s = 0.0883024619 * linear[0]! + 0.2817188376 * linear[1]! + 0.6299787005 * linear[2]!;
  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);
  return {
    l: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
  };
}

const markerLabs = ILLUSTRATION_MARKERS.map((marker, order) => ({
  ...marker,
  order,
  lab: toOkLab(
    Number.parseInt(marker.hex.slice(1, 3), 16),
    Number.parseInt(marker.hex.slice(3, 5), 16),
    Number.parseInt(marker.hex.slice(5, 7), 16),
  ),
}));

function addMarkerMatches(color: ColorCount): ColorCount {
  const lab = toOkLab(color.r, color.g, color.b);
  const matches = markerLabs.map((marker) => {
    const distance = Math.hypot(lab.l - marker.lab.l, lab.a - marker.lab.a, lab.b - marker.lab.b);
    return { code: marker.code, hex: marker.hex, distance, approximate: distance > 0.06 };
  }).sort((left, right) => left.distance - right.distance).slice(0, 3);
  return { ...color, markerMatches: matches };
}

function addMatches(result: ColorAnalysisResult): ColorAnalysisResult {
  return {
    ...result,
    colors: result.colors.map(addMarkerMatches),
    colors01: result.colors01.map(addMarkerMatches),
  };
}

function colorFromMarker(marker: typeof markerLabs[number], count: number, totalPixels: number): ColorCount {
  const r = Number.parseInt(marker.hex.slice(1, 3), 16);
  const g = Number.parseInt(marker.hex.slice(3, 5), 16);
  const b = Number.parseInt(marker.hex.slice(5, 7), 16);
  const r01 = r / 255;
  const g01 = g / 255;
  const b01 = b / 255;
  const max = Math.max(r01, g01, b01);
  const min = Math.min(r01, g01, b01);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r01) hue = 60 * (((g01 - b01) / delta + 6) % 6);
    else if (max === g01) hue = 60 * ((b01 - r01) / delta + 2);
    else hue = 60 * ((r01 - g01) / delta + 4);
  }
  const lightness = (max + min) / 2;
  return {
    r, g, b, hex: marker.hex, count, ratio: count / totalPixels,
    hue, hue_angle: hue, lightness,
    hsl_saturation: delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)),
    hsv_saturation: max === 0 ? 0 : delta / max,
    value: max,
    markerOrder: marker.order,
    markerMatches: [{ code: marker.code, hex: marker.hex, distance: 0, approximate: false }],
  };
}

function findNearestMarker(lab: OkLab): number {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  markerLabs.forEach((marker, index) => {
    const distance = Math.hypot(lab.l - marker.lab.l, lab.a - marker.lab.a, lab.b - marker.lab.b);
    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  });
  return nearestIndex;
}

function analyzeMarkerColors(data: Uint8ClampedArray, totalPixels: number): ColorCount[] {
  const colorToMarker = new Map<number, number>();
  const markerCounts = new Uint32Array(markerLabs.length);

  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3]! < 16) continue;
    // Quantizing makes matching fast while preserving small color regions in the image.
    const r = data[offset]! >> 3;
    const g = data[offset + 1]! >> 3;
    const b = data[offset + 2]! >> 3;
    const key = (r << 10) | (g << 5) | b;
    let markerIndex = colorToMarker.get(key);
    if (markerIndex === undefined) {
      markerIndex = findNearestMarker(toOkLab(r * 8 + 4, g * 8 + 4, b * 8 + 4));
      colorToMarker.set(key, markerIndex);
    }
    markerCounts[markerIndex]! += 1;
  }

  return markerLabs
    .map((marker, index) => colorFromMarker(marker, markerCounts[index]!, totalPixels))
    .filter((color) => color.count > 0)
    .sort((left, right) => right.count - left.count);
}

function ensureWasm(): Promise<void> {
  wasmReady ??= init().then(() => undefined);
  return wasmReady;
}

self.addEventListener("message", async (event: MessageEvent<AnalyzeRequest>) => {
  const { id, bitmap, maxSize, quantizeStep, topN } = event.data;
  try {
    await ensureWasm();
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Failed to create analysis canvas.");

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const imageData = context.getImageData(0, 0, width, height);
    const baseResult = JSON.parse(analyze_rgba(new Uint8Array(imageData.data), width, height, quantizeStep, topN)) as ColorAnalysisResult;
    const result = {
      ...addMatches(baseResult),
      markerColors: analyzeMarkerColors(imageData.data, width * height),
    };
    self.postMessage({ id, result });
  } catch (error) {
    bitmap.close();
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});
