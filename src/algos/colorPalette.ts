
import { ColorCount } from "../natives/nativeScreenshot";
import { showToast } from "../comps/utils/toast";
import { createSwatchesFile } from "procreate-swatches";
import { isTauri } from "../natives/native";
import { UseDialogReturn } from "../comps/utils/useDialog";
import { makeFilenameWithTimestamp, saveFileWithFallback } from "./utils";

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "").trim();
  const value =
    normalized.length === 3
      ? normalized.split("").map((c) => c + c).join("")
      : normalized;

  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  return [r, g, b];
}


async function exportProcreateSwatches(
  paletteName: string,
  colors: ColorCount[]
) {
  const swatchColors = colors.map((color) => {
    const rgb = hexToRgb(color.hex);
    return [rgb, "rgb"] as const;
  });

  const data = (await createSwatchesFile(
    paletteName,
    swatchColors,
    "uint8array"
  )) as Uint8Array;

  await saveFileWithFallback({
    title: "Save Procreate Palette",
    filename: makeFilenameWithTimestamp(paletteName || "palette", "swatches"),
    data,
    filters: [
      { name: "Procreate Swatches", extensions: ["swatches"] },
    ],
    mimeType: "application/octet-stream",
    showToast,
  });
}

async function exportPalettePng(colors: ColorCount[]) {
  const size = 1024;
  const padding = 32;
  const cols = Math.ceil(Math.sqrt(colors.length));
  const cell = Math.floor((size - padding * 2) / cols);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  colors.forEach((color, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * cell;
    const y = padding + row * cell;

    ctx.fillStyle = color.hex;
    ctx.fillRect(x, y, cell, cell);
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) {
        resolve(b);
      } else {
        reject(new Error("Failed to create PNG blob"));
      }
    }, "image/png");
  });

  await saveFileWithFallback({
    title: "Save Palette PNG",
    filename: makeFilenameWithTimestamp("palette", "png"),
    data: blob,
    filters: [{ name: "PNG Image", extensions: ["png"] }],
    mimeType: "image/png",
    showToast,
  });
}

function csvEscape(value: string | number) {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}


async function exportPaletteCsv(colors: ColorCount[]) {
  const lines = [
    ["index", "marker_code", "hex", "ratio", "hue_angle", "hsv_saturation"]
      .map(csvEscape)
      .join(","),
    ...colors.map((color, index) =>
      [
        index + 1,
        color.markerMatches?.[0]?.code ?? "",
        color.hex,
        color.ratio,
        color.hue_angle,
        color.hsv_saturation,
      ]
        .map(csvEscape)
        .join(",")
    ),
  ];

  const csvText = lines.join("\n");

  await saveFileWithFallback({
    title: "Save Palette CSV",
    filename: makeFilenameWithTimestamp("palette", "csv"),
    data: csvText,
    filters: [{ name: "CSV", extensions: ["csv"] }],
    mimeType: "text/csv",
    showToast,
  });
}

const handleExport = async (params:{
    dialog: UseDialogReturn,
    colors: ColorCount[],
    colors01: ColorCount[],
    markerColors: ColorCount[],
}) => {
    console.log("> handleExport");


    const selectedColorType = await params.dialog.showSelectDialog({
      title: "Export Palette",
      message: "Choose a palette source.",
      options: isTauri() ? [
        {
          value: "color-count",
          label: "Color (Count)",
          description: "Export colors based on appearance frequency.",
        },
        {
          value: "color-clustering",
          label: "Color (Clustering)",
          description: "Export colors based on clustering results.",
        },
        {
          value: "illustration-markers",
          label: "Illustration markers",
          description: "Export the marker colors selected from the image.",
        },
      ] : [
        {
          value: "color-count",
          label: "Color (Count)",
          description: "Export colors based on appearance frequency.",
        },
        {
          value: "illustration-markers",
          label: "Illustration markers",
          description: "Export the marker colors selected from the image.",
        },
      ],
      cancelText: "Cancel",
    });

    if (selectedColorType === null) {
      console.log("> canceled: color type");
      return;
    }

    const selectedFormat = await params.dialog.showSelectDialog({
      title: "Export Format",
      message: "Choose a format.",
      options: [
        {
          value: "procreate-swatches",
          label: "Procreate (.swatches)",
          description: "Export colors as a Procreate palette file.",
        },
        {
          value: "png",
          label: "PNG",
          description: "Export colors as a palette image.",
        },
        {
          value: "csv",
          label: "CSV",
          description: "Export colors as a CSV file.",
        },
      ],
      cancelText: "Cancel",
    });

    if (selectedFormat === null) {
      console.log("> canceled: format");
      return;
    }

    const exportColors =
      selectedColorType === "illustration-markers"
        ? params.markerColors
        : selectedColorType === "color-count"
        ? params.colors
        : params.colors01;

    if (!exportColors || exportColors.length === 0) {
      console.log("> no colors to export");
      return;
    }

    try {
      switch (selectedFormat) {
        case "procreate-swatches":
          await exportProcreateSwatches(
            selectedColorType === "illustration-markers"
              ? "Illustration Markers"
              : "Tetorica Colors Palette",
            exportColors,
          );
          break;
        case "png":
          await exportPalettePng(exportColors);
          break;
        case "csv":
          await exportPaletteCsv(exportColors);
          break;
        default:
          console.log("> unknown format:", selectedFormat);
          break;
      }
    } catch (e) {
      console.error("> export failed", e);
      showToast(`> export failed: ${e}`);
    }
  };

export {
    exportPaletteCsv, createSwatchesFile, exportPalettePng,exportProcreateSwatches, hexToRgb,
    handleExport
}
