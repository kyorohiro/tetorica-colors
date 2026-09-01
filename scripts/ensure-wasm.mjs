import fs from "node:fs";

const files = [
  "src/wasm/pkg/color_analysis_wasm.js",
  "src/wasm/pkg/color_analysis_wasm_bg.wasm",
];

const missing = files.filter((file) => !fs.existsSync(file));
if (missing.length > 0) {
  throw new Error(`Missing prebuilt color-analysis WASM: ${missing.join(", ")}. Run npm run build:wasm.`);
}

console.log("using prebuilt color-analysis WASM");
