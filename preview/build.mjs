// Bundles preview/entry.tsx (the real components + sample data) into ONE self-contained HTML page.
// CSS is precompiled from src/app/globals.css so the page has no Tailwind runtime dependency.
//
// Usage: node preview/build.mjs --esbuild <path> --tailwind <path-to-tailwindcss> --postcss <path> --node-path <dir> --out <file>
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const req = createRequire(import.meta.url);
const esbuild = req(args.esbuild ?? "esbuild");
const tailwind = req(args.tailwind ?? "tailwindcss");
const postcss = req(args.postcss ?? "postcss");
const out = args.out ?? path.join(root, "preview/index.html");

// 1) JS bundle
const result = await esbuild.build({
  entryPoints: [path.join(root, "preview/entry.tsx")],
  bundle: true, minify: true, write: false, format: "iife", target: "es2020",
  jsx: "automatic", loader: { ".json": "json" },
  alias: { "@": path.join(root, "src") },
  nodePaths: args["node-path"] ? [args["node-path"]] : [],
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
const js = result.outputFiles[0].text;

// 2) Translate the Tailwind v4 @theme block into a config + :root vars, then compile
let src = readFileSync(path.join(root, "src/app/globals.css"), "utf8").replace('@import "tailwindcss";', "");
const start = src.indexOf("@theme {");
let depth = 0, end = start;
for (let i = src.indexOf("{", start); i < src.length; i++) {
  if (src[i] === "{") depth++;
  if (src[i] === "}" && --depth === 0) { end = i + 1; break; }
}
const themeBody = src.slice(src.indexOf("{", start) + 1, end - 1);
const keyframes = themeBody.match(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) ?? [];
const decls = [...themeBody.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "").matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]);
src = src.slice(0, start) + src.slice(end);

const colors = {}, animation = {}, fontFamily = {};
for (const [k, v] of decls) {
  if (k.startsWith("color-")) colors[k.slice(6)] = v;
  if (k.startsWith("animate-")) animation[k.slice(8)] = v;
  if (k.startsWith("font-")) fontFamily[k.slice(5)] = `var(--${k})`;
}
const input = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n:root{${decls.map(([k, v]) => `--${k}:${v};`).join("")}}\n${keyframes.join("\n")}\n${src}`;
const config = {
  content: [{ raw: js, extension: "js" }],
  theme: { extend: { colors, animation, fontFamily: { display: [fontFamily.display], hud: [fontFamily.hud], sans: [fontFamily.sans], mono: [fontFamily.mono] } } },
};
const css = (await postcss([tailwind(config)]).process(input, { from: undefined })).css;

// 3) Page
writeFileSync(out, `<title>FLOWHUB Preview</title>
<meta name="description" content="Clickable preview of FLOWHUB: Discord login, member dashboard and coach portal with sample data.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,100..125,700..900;1,100..125,700..900&family=Orbitron:wght@500;700&family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>:root{color-scheme:dark;--font-archivo:"Archivo";--font-orbitron:"Orbitron";--font-rajdhani:"Rajdhani";--font-jetbrains:"JetBrains Mono"}html,body{background:#030405;color:#e6ebf2}#boot{font:12px/1.4 monospace;letter-spacing:.2em;color:#56667e;padding:40px 16px;text-align:center}</style>
<style>${css}</style>
<div id="root"><div id="boot">FLOWHUB // BOOTING</div></div>
<script>${js.replace(/<\/script/gi, "<\\/script")}</script>
`);
console.log(`wrote ${out} — ${Math.round(js.length / 1024)}KB js, ${Math.round(css.length / 1024)}KB css`);
