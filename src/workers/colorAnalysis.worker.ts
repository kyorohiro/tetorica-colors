import init, { analyze_rgba } from "../wasm/pkg/color_analysis_wasm";

type AnalyzeRequest = {
  id: number;
  bitmap: ImageBitmap;
  maxSize: number;
  quantizeStep: number;
  topN: number;
};

let wasmReady: Promise<void> | undefined;

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
    const result = JSON.parse(analyze_rgba(new Uint8Array(imageData.data), width, height, quantizeStep, topN));
    self.postMessage({ id, result });
  } catch (error) {
    bitmap.close();
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});
