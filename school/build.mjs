// Assembles the Trading School page from school/src/*. Used by deploy/build.mjs, or standalone:
//   node school/build.mjs --esbuild <path-to-esbuild> [--out file] [--dev]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(path.join(here, "src", p), "utf8");

export async function buildSchool(esbuild, { minify = true } = {}) {
  const parts = ["util.js", "gen.js", "chart.js", "items.js", ...readdirSync(path.join(here, "src/content")).filter((f) => f.endsWith(".js")).sort().map((f) => "content/" + f), "app.js"];
  let js = parts.map((p) => `/* ── ${p} ── */\n${src(p)}`).join("\n");
  let css = src("style.css");
  if (minify) {
    js = (await esbuild.transform(js, { minify: true, target: "es2020", legalComments: "none" })).code;
    css = (await esbuild.transform(css, { loader: "css", minify: true })).code;
  }
  return src("shell.html").replace("/*CSS*/", () => css).replace("/*JS*/", () => js.replace(/<\/script/gi, "<\\/script"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = process.argv.slice(2), get = (k) => { const i = a.indexOf("--" + k); return i >= 0 ? a[i + 1] : undefined; };
  const esbuild = createRequire(import.meta.url)(get("esbuild") ?? "esbuild");
  const html = await buildSchool(esbuild, { minify: !a.includes("--dev") });
  const out = get("out") ?? path.join(here, "dist/school.html");
  const { mkdirSync } = await import("node:fs"); mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log(`school → ${out} (${(html.length / 1024).toFixed(0)}KB)`);
}
