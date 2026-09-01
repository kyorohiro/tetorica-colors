import fs from "node:fs";

const source = fs.readFileSync("docs/issues/illustration-markers.md", "utf8");
const markers = [];
const seen = new Set();

for (const line of source.split(/\r?\n/)) {
  const match = line.trim().match(/^([a-z0-9]+)\s+([0-9a-f]{6})$/i);
  if (!match) continue;
  const [, code, hex] = match;
  const key = `${code.toUpperCase()}-${hex.toUpperCase()}`;
  if (seen.has(key)) continue;
  seen.add(key);
  markers.push({ code: code.toUpperCase(), hex: `#${hex.toUpperCase()}` });
}

const output = `export type IllustrationMarker = { code: string; hex: string };\n\nexport const ILLUSTRATION_MARKERS: IllustrationMarker[] = ${JSON.stringify(markers, null, 2)} as const;\n`;
fs.mkdirSync("src/data", { recursive: true });
fs.writeFileSync("src/data/illustrationMarkers.ts", output);
console.log(`generated ${markers.length} illustration marker references`);
