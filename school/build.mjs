// Assembles the Trading School page from school/src/*. Used by deploy/build.mjs, or standalone:
//   node school/build.mjs --esbuild <path-to-esbuild> [--out file] [--dev]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(path.join(here, "src", p), "utf8");

export async function buildSchool(esbuild, { minify = true, practice = false, vault = false } = {}) {
  const list = (d, f = () => true) => readdirSync(path.join(here, "src", d)).filter((f2) => f2.endsWith(".js") && f(f2)).sort().map((f2) => d + "/" + f2);
  // The vault is its own page: the shared engine and helpers plus ONLY the vault's own content (never the school's lessons).
  const shared = ["content/00-core.js", "content/00-glossary.js", "content/08-helpers.js"];
  const parts = vault
    ? ["util.js", "gen.js", "gen2.js", "chart.js", "items.js", ...shared, ...list("vault", (f2) => f2 !== "orderflow-pack.js"), "path.js", "pace.js", "gex.js", "app.js", "track.js"]
    : ["util.js", "gen.js", "gen2.js", "chart.js", "items.js", ...list("content"), ...(practice ? [...list("data"), "indicators.js", "lab.js"] : []), "path.js", "pace.js", "gex.js", "app.js", "track.js"];
  let js = parts.map((p) => `/* ── ${p} ── */\n${src(p)}`).join("\n");
  let css = src("style.css");
  if (minify) {
    js = (await esbuild.transform(js, { minify: true, target: "es2020", legalComments: "none" })).code;
    css = (await esbuild.transform(css, { loader: "css", minify: true })).code;
  }
  let html = src("shell.html").replace("/*CSS*/", () => css).replace("/*JS*/", () => js.replace(/<\/script/gi, "<\\/script"));
  if (vault) html = vaultShell(html);
  return html;
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

/** The vault page: the school shell with the vault's own words. */
export function vaultShell(html) {
  const sub = (a, b2) => { if (!html.includes(a)) throw new Error("vault shell text not found: " + a.slice(0, 40)); html = html.replace(a, b2); };
  sub("<title>Trading School · FLOWHUB</title>", "<title>The Vault · FLOWHUB</title>");
  sub('<span class="pill"><span class="dot"></span>Practice · no real money</span>', '<span class="pill vault-pill"><span class="dot"></span>ECHO X ORBIT · the vault</span>');
  sub('<div class="hud" style="margin-bottom:8px">Trading School</div>', '<div class="hud" style="margin-bottom:8px">The Vault · ECHO X ORBIT</div>');
  sub('Learn to trade, <span class="f">A to Z.</span>', 'You are <span class="f">inside.</span>');
  sub("Each module teaches one idea, makes you apply it on a real chart, and then tests you. You move on by proving it, not by clicking through.", "Everything about ECHO X ORBIT lives in this room: the model, the trade, the practice charts and the exams. Nothing here is shown outside it.");
  return html.replace("<script>", "<script>window.VAULT=1;</script><script>");
}
