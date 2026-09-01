import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const crateDir = "crates/color-analysis-wasm";
const outputDir = "src/wasm/pkg";

fs.mkdirSync(outputDir, { recursive: true });
execFileSync("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown"], {
  cwd: crateDir,
  stdio: "inherit",
});
execFileSync("wasm-bindgen", [
  "--target", "web",
  "--out-dir", path.resolve(outputDir),
  "--out-name", "color_analysis_wasm",
  "target/wasm32-unknown-unknown/release/tetorica_colors_wasm.wasm",
], { cwd: crateDir, stdio: "inherit" });
