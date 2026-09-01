
import { hexToRgba } from "./deskelCommon";
import { appState } from "../state";

function resizeCanvas(params: { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }): void {
  //console.log("> resizeCanvas", params);
  if (!params.ctx) {
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  params.canvas!.width = Math.floor(w * dpr);
  params.canvas!.height = Math.floor(h * dpr);
  params.canvas!.style.width = `${w}px`;
  params.canvas!.style.height = `${h}px`;

  params.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw({ canvas: params.canvas, ctx: params.ctx });
}

function drawGrid(params: { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, w: number, h: number }): void {
  if (!params.ctx) {
    return;
  }
  params.ctx.strokeStyle = hexToRgba(appState.getState().color, appState.getState().opacity);
  params.ctx.lineWidth = appState.getState().lineWidth;

  for (let x = 0; x <= params.w; x += appState.getState().grid) {
    params.ctx.beginPath();
    params.ctx.moveTo(x, 0);
    params.ctx.lineTo(x, params.h);
    params.ctx.stroke();
  }

  for (let y = 0; y <= params.h; y += appState.getState().grid) {
    params.ctx.beginPath();
    params.ctx.moveTo(0, y);
    params.ctx.lineTo(params.w, y);
    params.ctx.stroke();
  }
}

function drawCross(params: { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, w: number, h: number }): void {
  if (!params.ctx) {
    return;
  }
  params.ctx.strokeStyle = hexToRgba(appState.getState().color, Math.min(1, appState.getState().opacity + 0.15));
  params.ctx.lineWidth = Math.max(2, appState.getState().lineWidth + 1);

  params.ctx.beginPath();
  params.ctx.moveTo(params.w / 2, 0);
  params.ctx.lineTo(params.w / 2, params.h);
  params.ctx.stroke();

  params.ctx.beginPath();
  params.ctx.moveTo(0, params.h / 2);
  params.ctx.lineTo(params.w, params.h / 2);
  params.ctx.stroke();
}



function draw(params: { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }): void {
  if (!params.ctx) {
    return;
  }
  const w = window.innerWidth;
  const h = window.innerHeight;

  // tetorica-colors is a color lens: only the active selection rectangle is drawn.
  params.ctx.clearRect(0, 0, w, h);
}

export {
  resizeCanvas,
  draw,
  drawCross,
  drawGrid,
  //
}
