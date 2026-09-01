import { execFileSync } from "node:child_process";
import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const outputDir = "release";
const archivePath = `../${outputDir}/tetorica-colors-${packageJson.version}-itch.zip`;

fs.mkdirSync(outputDir, { recursive: true });
fs.rmSync(archivePath.slice(3), { force: true });
execFileSync("zip", ["-r", archivePath, ".", "-x", "*.DS_Store"], {
  cwd: "dist",
  stdio: "inherit",
});

console.log(`created ${archivePath.slice(3)}`);
