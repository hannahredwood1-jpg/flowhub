// Builds the Railway deployment:
//   dist/server.js     single-file Bun server (paste into the Railway Function; must stay < 96KB)
//   dist/assets.sql    upsert of the gzipped browser bundle + CSS into the "AppAsset" table
// Usage: node deploy/build.mjs --esbuild <path> --tailwind <path> --postcss <path> --node-path <dir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchool } from "../school/build.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const req = createRequire(import.meta.url);
const esbuild = req(args.esbuild ?? "esbuild");
const tailwind = req(args.tailwind ?? "tailwindcss");
const postcss = req(args.postcss ?? "postcss");
const dist = path.join(root, "deploy/dist");
mkdirSync(dist, { recursive: true });

// 1) Server
const server = await esbuild.build({
  entryPoints: [path.join(root, "deploy/server.ts")],
  bundle: true, write: false, format: "esm", platform: "node", target: "esnext", minifySyntax: false, minifyIdentifiers: false, legalComments: "none",
  external: ["hono", "hono/*", "zod", "bun"],
  logLevel: "warning",
});
let serverJs = server.outputFiles[0].text.replace(/from"zod"/g, 'from"zod@3"').replace(/from "zod"/g, 'from "zod@3"');
serverJs = `// FLOWHUB server — built by deploy/build.mjs from deploy/server.ts. Do not edit here.\n${serverJs}`;
writeFileSync(path.join(dist, "server.js"), serverJs);

// 2) Browser bundle
const client = await esbuild.build({
  entryPoints: [path.join(root, "deploy/client.tsx")],
  // React is loaded from esm.sh via an import map in the page shell (keeps our own bundle small)
  bundle: true, minify: true, write: false, format: "esm", target: "es2020", jsx: "automatic",
  external: ["react", "react/jsx-runtime", "react-dom", "react-dom/client"],
  alias: { "@": path.join(root, "src") },
  nodePaths: args["node-path"] ? [args["node-path"]] : [],
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none", logLevel: "warning",
});
const js = client.outputFiles[0].text;

// 3) CSS (Tailwind v4 @theme → v3 config, same approach as preview/build.mjs)
let src = readFileSync(path.join(root, "src/app/globals.css"), "utf8").replace('@import "tailwindcss";', "");
const start = src.indexOf("@theme {");
let depth = 0, end = start;
for (let i = src.indexOf("{", start); i < src.length; i++) {
  if (src[i] === "{") depth++;
  if (src[i] === "}" && --depth === 0) { end = i + 1; break; }
}
const body = src.slice(src.indexOf("{", start) + 1, end - 1);
const kfRe = /@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g;
const keyframes = body.match(kfRe) ?? [];
const decls = [...body.replace(kfRe, "").matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]);
src = src.slice(0, start) + src.slice(end);
const colors = {}, animation = {}, ff = {};
for (const [k, v] of decls) {
  if (k.startsWith("color-")) colors[k.slice(6)] = v;
  if (k.startsWith("animate-")) animation[k.slice(8)] = v;
  if (k.startsWith("font-")) ff[k.slice(5)] = [`var(--${k})`];
}
const cssIn = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n:root{${decls.map(([k, v]) => `--${k}:${v};`).join("")}}\n${keyframes.join("\n")}\n${src}`;
const css = (await postcss([tailwind({ content: [{ raw: js, extension: "js" }], theme: { extend: { colors, animation, fontFamily: ff } } })]).process(cssIn, { from: undefined })).css;

// 4) Trading School (new, built from school/src) + Classic school (the earlier page, re-skinned) 
const school = await buildSchool(esbuild);
const skin = (await esbuild.transform(readFileSync(path.join(root, "school/skin.css"), "utf8"), { loader: "css", minify: true })).code;
let classicSrc = readFileSync(path.join(root, "school/classic.html"), "utf8");
{ // minify the inline script + style for the deployed copy
  const s0 = classicSrc.indexOf("<script>") + 8, s1 = classicSrc.lastIndexOf("</script>");
  const js = (await esbuild.transform(classicSrc.slice(s0, s1), { minify: true, target: "es2020", legalComments: "none" })).code;
  classicSrc = classicSrc.slice(0, s0) + js + classicSrc.slice(s1);
  const c0 = classicSrc.indexOf("<style>") + 7, c1 = classicSrc.indexOf("</style>");
  const css = (await esbuild.transform(classicSrc.slice(c0, c1), { loader: "css", minify: true })).code;
  classicSrc = classicSrc.slice(0, c0) + css + classicSrc.slice(c1);
}
const cut = classicSrc.indexOf('<div class="app">');
const fontLink = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">';
const classic = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex"><meta name="theme-color" content="#030405">
${fontLink}
${classicSrc.slice(0, cut)}<style>body{margin:0}</style><style>${skin}</style>
</head><body>
${classicSrc.slice(cut).replace('<div class="app">', '<div class="app"><div style="margin:0 0 12px;padding:10px 14px;border:1px solid var(--line2);border-radius:8px;background:var(--panel);font-size:13.5px;color:var(--ink2)">This is the <b style="color:var(--ink)">Classic school</b>: the earlier lessons, replays, terminology and ECHO X ORBIT. The new course is the <a href="/school" style="color:var(--ice)">Trading School</a>.</div>')}</body></html>`;
mkdirSync(path.join(root, "public"), { recursive: true });
writeFileSync(path.join(root, "public/school.html"), school);
writeFileSync(path.join(root, "public/classic.html"), classic);

// 5) Assets SQL
const b64 = (s) => gzipSync(Buffer.from(s), { level: 9 }).toString("base64");
const row = (p, type, content) => `('${p}', '${type}', '${b64(content)}', now())`;
writeFileSync(path.join(dist, "assets.sql"),
  `insert into "AppAsset" (path, "contentType", body, "updatedAt") values\n${row("app.js", "text/javascript; charset=utf-8", js)},\n${row("app.css", "text/css; charset=utf-8", css)},\n${row("school.html", "text/html; charset=utf-8", school)},\n${row("classic.html", "text/html; charset=utf-8", classic)}\n` +
  `on conflict (path) do update set "contentType" = excluded."contentType", body = excluded.body, "updatedAt" = now();\n`);

console.log(`server.js ${(serverJs.length / 1024).toFixed(1)}KB (limit 96KB) · app.js ${(js.length / 1024).toFixed(0)}KB · app.css ${(css.length / 1024).toFixed(0)}KB · school ${(school.length / 1024).toFixed(0)}KB · assets.sql ${(readFileSync(path.join(dist, "assets.sql")).length / 1024).toFixed(0)}KB`);

// 6) Repo deploy bundle: deploy/app/ is what Railway runs (root directory = deploy/app)
const appDir = path.join(root, "deploy/app");
mkdirSync(path.join(appDir, "assets"), { recursive: true });
writeFileSync(path.join(appDir, "server.js"), serverJs.replace(/from ?"zod@3"/g, 'from "zod"'));
writeFileSync(path.join(appDir, "assets/app.js.gz"), gzipSync(Buffer.from(js), { level: 9 }));
writeFileSync(path.join(appDir, "assets/app.css.gz"), gzipSync(Buffer.from(css), { level: 9 }));
writeFileSync(path.join(appDir, "assets/school.html.gz"), gzipSync(Buffer.from(school), { level: 9 }));
writeFileSync(path.join(appDir, "assets/classic.html.gz"), gzipSync(Buffer.from(classic), { level: 9 }));
// Practice page (self-contained document; <!--FH_NAV--> is filled in by the server)
let practice = readFileSync(path.join(root, "practice/practice.html"), "utf8");
{
  const s0 = practice.indexOf("<script>") + 8, s1 = practice.lastIndexOf("</script>");
  const pjs = (await esbuild.transform(practice.slice(s0, s1), { minify: true, target: "es2020", legalComments: "none" })).code;
  practice = practice.slice(0, s0) + pjs + practice.slice(s1);
  const c0 = practice.indexOf("<style>") + 7, c1 = practice.indexOf("</style>");
  const pcss = (await esbuild.transform(practice.slice(c0, c1), { loader: "css", minify: true })).code;
  practice = practice.slice(0, c0) + pcss + practice.slice(c1);
  practice = practice.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*">/, fontLink).replace("</head>", `<style>${skin}</style></head>`);
}
writeFileSync(path.join(appDir, "assets/practice.html.gz"), gzipSync(Buffer.from(practice), { level: 9 }));
console.log(`practice ${(practice.length / 1024).toFixed(0)}KB`);
writeFileSync(path.join(appDir, "package.json"), JSON.stringify({
  name: "flowhub", private: true, type: "module",
  scripts: { start: "bun server.js" },
  dependencies: { hono: "^4.9.0", zod: "^3.25.0" },
}, null, 2) + "\n");
console.log("deploy/app ready (push to GitHub to deploy)");
