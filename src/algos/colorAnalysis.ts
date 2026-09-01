export type IllustrationMarkerMatch = {
  code: string;
  hex: string;
  distance: number;
  approximate: boolean;
};

export type ColorCount = {
  r: number;
  g: number;
  b: number;
  hex: string;
  count: number;
  ratio: number;
  hue: number;
  hue_angle: number;
  hsl_saturation: number;
  lightness: number;
  hsv_saturation: number;
  value: number;
  markerOrder?: number;
  markerMatches?: IllustrationMarkerMatch[];
};

export type ColorAnalysisResult = {
  width: number;
  height: number;
  total_pixels: number;
  colors: ColorCount[];
  colors01: ColorCount[];
  markerColors: ColorCount[];
};
