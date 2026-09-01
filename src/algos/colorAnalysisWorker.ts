import type { ColorAnalysisResult } from "./colorAnalysis";

type WorkerResponse = {
  id: number;
  result?: ColorAnalysisResult;
  error?: string;
};

let nextId = 0;
const pending = new Map<number, { resolve: (result: ColorAnalysisResult) => void; reject: (error: Error) => void }>();
const worker = new Worker(new URL("../workers/colorAnalysis.worker.ts", import.meta.url), { type: "module" });

worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
  const request = pending.get(event.data.id);
  if (!request) return;
  pending.delete(event.data.id);
  if (event.data.error) {
    request.reject(new Error(event.data.error));
  } else if (event.data.result) {
    request.resolve(event.data.result);
  } else {
    request.reject(new Error("Color analysis worker returned no result."));
  }
});

export async function analyzeColorBlob(blob: Blob, options?: { maxSize?: number; quantizeStep?: number; topN?: number }): Promise<ColorAnalysisResult> {
  const bitmap = await createImageBitmap(blob);
  const id = nextId++;
  return new Promise<ColorAnalysisResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({
      id,
      bitmap,
      maxSize: options?.maxSize ?? 512,
      quantizeStep: options?.quantizeStep ?? 32,
      topN: options?.topN ?? 1000,
    }, [bitmap]);
  });
}
