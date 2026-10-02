// Renders the logo component (fully built, variant "flat") to a standalone SVG file.
// Usage: node scripts/export-svg.mjs <out.svg>
import { build } from "esbuild";
import { createRequire } from "node:module";
import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve(process.argv[2]);
const temp = `${out}.render.cjs`;
await build({
  stdin: { contents: `const React = require("react"); const { renderToStaticMarkup } = require("react-dom/server"); const { Logo } = require("./src/brand/Logo.tsx"); module.exports = renderToStaticMarkup(React.createElement(Logo, { size: 1000, variant: "flat" }));`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, platform: "node", format: "cjs", jsx: "automatic", outfile: temp, logLevel: "error",
});
const markup = createRequire(import.meta.url)(temp);
rmSync(temp);
writeFileSync(out, `<?xml version="1.0" encoding="UTF-8"?>\n${markup.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ')}\n`);
console.log(out);
