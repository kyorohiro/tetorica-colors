import { ColorCount } from "../natives/nativeScreenshot";

type AppColorAnalysisMode = "hue-saturation" | "hue-lightness";

const CHART_SIZE = 320;
const OPTION_SIZE = 22 * 6 + 10;
const OPTION_OFFSET_X = OPTION_SIZE / 2;
const OPTION_OFFSET_Y = OPTION_SIZE / 2;
const MAX_RADIUS = 145;
const RIGHT_LEGEND_WIDTH = 150;
const RIGHT_LEGEND_PADDING = 12;

type RedrawParams = {
  colors: ColorCount[];
  colors01: ColorCount[];
  markerColors: ColorCount[];
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
  if (markerMode) {
    drawMarkerLegend(ctx, colors);
    return;
  }

  const legendColors = colors.slice(0, markerMode ? 20 : 30);
  const legendX = CHART_SIZE + OPTION_OFFSET_X;
  const legendItemHeight = 26;
  const legendBoxSize = 14;
  const legendPaddingY = 10;
  const legendWidth = RIGHT_LEGEND_WIDTH;
  const legendHeight = (legendColors.length / 2) * legendItemHeight + legendPaddingY * 2;
  const legendY = 12;

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

  legendColors.forEach((color, index) => {
    const itemY = legendY + legendPaddingY + (index % 10) * legendItemHeight;
    const chipX = legendX + 8 + Math.floor(index / 10) * 22;

    ctx.fillStyle = color.hex;
    ctx.fillRect(chipX, itemY + 2, legendBoxSize, legendBoxSize);

    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(chipX, itemY + 2, legendBoxSize, legendBoxSize);

  });
}

function drawMarkerLegend(ctx: CanvasRenderingContext2D, colors: ColorCount[]) {
  const legendX = CHART_SIZE + OPTION_OFFSET_X;
  const legendY = 12;
  const legendWidth = RIGHT_LEGEND_WIDTH;
  const legendHeight = CHART_SIZE;
  const labeledColors = colors.slice(0, 10);
  const catalogColors = [...colors].sort(
    (left, right) => (left.markerOrder ?? Number.MAX_SAFE_INTEGER) - (right.markerOrder ?? Number.MAX_SAFE_INTEGER),
  );
  const chipSize = 7;
  const chipGap = 1;
  const chipColumns = 18;
  const gridY = legendY + 150;

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "11px sans-serif";
  ctx.fillText(`Used markers: ${colors.length}`, legendX + 8, legendY + 15);

  labeledColors.forEach((color, index) => {
    const column = Math.floor(index / 5);
    const row = index % 5;
    const chipX = legendX + 8 + column * 72;
    const itemY = legendY + 25 + row * 22;
    ctx.fillStyle = color.hex;
    ctx.fillRect(chipX, itemY, 14, 14);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.strokeRect(chipX, itemY, 14, 14);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(color.markerMatches?.[0]?.code ?? "", chipX + 20, itemY + 11);
  });

  // Every used marker stays visible here, including colors used in only a small region.
  catalogColors.forEach((color, index) => {
    const column = index % chipColumns;
    const row = Math.floor(index / chipColumns);
    const chipX = legendX + 4 + column * (chipSize + chipGap);
    const chipY = gridY + row * (chipSize + chipGap);
    ctx.fillStyle = color.hex;
    ctx.fillRect(chipX, chipY, chipSize, chipSize);
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

  // The right legend starts after the chart, so it needs its own canvas width.
  const canvasWidth = width + OPTION_OFFSET_X + RIGHT_LEGEND_WIDTH + RIGHT_LEGEND_PADDING;
  const canvasHeight = height + OPTION_SIZE;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "rgba(20,20,20,0.35)";
  ctx.fillRect(OPTION_OFFSET_X, OPTION_OFFSET_Y, width, height);

  drawGuide(ctx, centerX, centerY);
  const chartColors = params.markerMode ? params.markerColors : params.colors;
  drawColorDots(
    ctx,
    chartColors,
    centerX,
    centerY,
    params.colorAnalysisMode
  );
  drawRightLegend(ctx, chartColors, params.markerMode);

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
