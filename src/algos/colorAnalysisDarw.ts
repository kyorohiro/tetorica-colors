import { ColorCount } from "../natives/nativeScreenshot";

type AppColorAnalysisMode = "hue-saturation" | "hue-lightness";

const CHART_SIZE = 320;
const OPTION_SIZE = 22 * 6 + 10;
const OPTION_OFFSET_X = OPTION_SIZE / 2;
const OPTION_OFFSET_Y = OPTION_SIZE / 2;
const MAX_RADIUS = 145;

type RedrawParams = {
  colors: ColorCount[];
  colors01: ColorCount[];
  colorAnalysisMode: AppColorAnalysisMode;
  markerMode: boolean;
};


function drawGuide(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number
) {
  ctx.strokeStyle = "rgba(20,20,20, 0.36)";
  ctx.lineWidth = 3;
  for (const ratio of [0.25, 0.5, 0.75, 1.0]) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, MAX_RADIUS * ratio, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  for (const ratio of [0.25, 0.5, 0.75, 1.0]) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, MAX_RADIUS * ratio, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, MAX_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
}

function drawColorDots(
  ctx: CanvasRenderingContext2D,
  colors: ColorCount[],
  centerX: number,
  centerY: number,
  mode: AppColorAnalysisMode
) {
  for (const color of colors) {
    const angleDeg = color.hue_angle - 90;
    const angleRad = (angleDeg * Math.PI) / 180;

    const source =
      mode === "hue-lightness" ? color.lightness : color.hsv_saturation;

    const radius = Math.max(0, Math.min(1, source)) * MAX_RADIUS;
    const x = centerX + Math.cos(angleRad) * radius;
    const y = centerY + Math.sin(angleRad) * radius;

    const minR = 1;
    const maxR = 12;
    const ratioScale = 40;
    const t0 = Math.min(1, Math.max(0, color.ratio * ratioScale));
    const t = t0 * t0 * (3 - 2 * t0);
    const dotRadius = minR + (maxR - minR) * t;

    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = color.hex;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,1.0)";
  ctx.fill();
}

function drawRightLegend(ctx: CanvasRenderingContext2D, colors: ColorCount[], markerMode: boolean) {
  const legendColors = colors.slice(0, markerMode ? 8 : 30);
  const legendX = CHART_SIZE + OPTION_OFFSET_X;
  const legendItemHeight = 26;
  const legendBoxSize = 14;
  const legendPaddingY = 10;
  const legendWidth = 150;
  const legendHeight = markerMode
    ? legendColors.length * legendItemHeight + legendPaddingY * 2
    : (legendColors.length / 2) * legendItemHeight + legendPaddingY * 2;
  const legendY = 12;

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

  legendColors.forEach((color, index) => {
    const itemY = legendY + legendPaddingY + (markerMode ? index : index % 10) * legendItemHeight;
    const chipX = legendX + 8 + (markerMode ? 0 : Math.floor(index / 10) * 22);

    ctx.fillStyle = color.hex;
    ctx.fillRect(chipX, itemY + 2, legendBoxSize, legendBoxSize);

    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(chipX, itemY + 2, legendBoxSize, legendBoxSize);

    if (markerMode && color.markerMatches?.[0]) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "11px sans-serif";
      ctx.fillText(color.markerMatches[0].code, chipX + 22, itemY + 14);
    }
  });
}

function drawBottomLegend(
  ctx: CanvasRenderingContext2D,
  colors01: ColorCount[]
) {
  const legendColors = colors01.slice(0, 30);
  const legendBoxSize = 14;
  const legendGapX = 8;
  const legendGapY = 8;
  const legendPaddingX = 10;
  const legendPaddingY = 10;
  const legendCols = 10;
  const legendRows = Math.ceil(legendColors.length / legendCols);

  const legendWidth =
    legendPaddingX * 2 +
    legendCols * legendBoxSize +
    (legendCols - 1) * legendGapX;

  const legendHeight =
    legendPaddingY * 2 +
    legendRows * legendBoxSize +
    (legendRows - 1) * legendGapY;

  const legendX = 12;
  const legendY = CHART_SIZE + OPTION_OFFSET_Y;

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

  legendColors.forEach((color, index) => {
    const col = index % legendCols;
    const row = Math.floor(index / legendCols);
    const chipX =
      legendX + legendPaddingX + col * (legendBoxSize + legendGapX);
    const chipY =
      legendY + legendPaddingY + row * (legendBoxSize + legendGapY);

    ctx.fillStyle = color.hex;
    ctx.fillRect(chipX, chipY, legendBoxSize, legendBoxSize);

    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(chipX, chipY, legendBoxSize, legendBoxSize);
  });
}

function drawColorAnalysisChart(
  canvas: HTMLCanvasElement,
  params: RedrawParams
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = CHART_SIZE;
  const height = CHART_SIZE;
  const centerX = width / 2 + OPTION_OFFSET_X;
  const centerY = height / 2 + OPTION_OFFSET_Y;

  const canvasWidth = width + OPTION_SIZE;
  const canvasHeight = height + OPTION_SIZE;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "rgba(20,20,20,0.35)";
  ctx.fillRect(OPTION_OFFSET_X, OPTION_OFFSET_Y, width, height);

  drawGuide(ctx, centerX, centerY);
  drawColorDots(
    ctx,
    params.colors,
    centerX,
    centerY,
    params.colorAnalysisMode
  );
  drawRightLegend(ctx, params.colors, params.markerMode);

  if (params.colors01.length > 0) {
    drawBottomLegend(ctx, params.colors01);
  }
}

export {
    drawColorAnalysisChart
}

export type {
    AppColorAnalysisMode, RedrawParams
}
