// Assembles the Trading School page from school/src/*. Used by deploy/build.mjs, or standalone:
//   node school/build.mjs --esbuild <path-to-esbuild> [--out file] [--dev]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(path.join(here, "src", p), "utf8");

export async function buildSchool(esbuild, { minify = true, practice = false, vault = false, invertix = false, orderflow = false, lumen = false } = {}) {
  const list = (d, f = () => true) => readdirSync(path.join(here, "src", d)).filter((f2) => f2.endsWith(".js") && f(f2)).sort().map((f2) => d + "/" + f2);
  // The vault and the INVERTIX page are their own pages: the shared engine and helpers plus ONLY their own content (never the school's lessons).
  const shared = ["content/00-core.js", "content/00-glossary.js", "content/08-helpers.js"];
  const engine = ["util.js", "gen.js", "gen2.js", "chart.js", "items.js"], tail = ["tracks.js", "path.js", "pace.js", "gex.js", "app.js", "track.js"];
  const vis = "content/12-orderflow-visuals.js";
  // Each strategy page is its own page: the shared engine and helpers, the footprint visuals, and ONLY its own lessons (never the school's lessons).
  // The practice page is built around orderflow: the Orderflow lessons' drills and the footprint reading scenes.
  const parts = orderflow
    ? [...engine, ...shared, vis, "content/12-orderflow.js", ...list("orderflow"), ...tail]
    : lumen
      ? [...engine, ...shared, vis, "content/13-lumen.js", ...list("lumen"), ...tail]
      : vault
        ? [...engine, ...shared, vis, ...list("vault"), ...tail]
        : invertix
          ? [...engine, ...shared, vis, "content/11-invertix.js", ...list("invertix"), ...tail]
          : practice
            ? [...engine, ...shared, vis, "content/12-orderflow.js", ...list("orderflow"), "content/14-practice-orderflow.js", "content/15-practice-drills.js", "content/16-practice-sim.js", ...list("data"), "lab.js", ...tail]
            // the school leaves every strategy and Orderflow out: each has its own gated page
            : [...engine, ...list("content", (f2) => f2 !== "11-invertix.js" && f2 !== "13-lumen.js" && !f2.startsWith("12-orderflow") && !f2.startsWith("14-practice") && !f2.startsWith("15-practice") && !f2.startsWith("16-practice")), ...tail];
  let js = parts.map((p) => `/* ── ${p} ── */\n${src(p)}`).join("\n");
  let css = src("style.css");
  if (minify) {
    js = (await esbuild.transform(js, { minify: true, target: "es2020", legalComments: "none" })).code;
    css = (await esbuild.transform(css, { loader: "css", minify: true })).code;
  }
  let html = src("shell.html").replace("/*CSS*/", () => css).replace("/*JS*/", () => js.replace(/<\/script/gi, "<\\/script"));
  if (vault) html = vaultShell(html);
  if (invertix) html = invertixShell(html);
  if (orderflow) html = orderflowShell(html);
  if (lumen) html = lumenShell(html);
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
  sub('<span class="pill"><span class="dot"></span>Practice · no real money</span>', '<span class="pill vault-pill"><span class="dot"></span>ECHO x ORBIT · the vault</span>');
  sub('<div class="hud" style="margin-bottom:8px">Trading School</div>', '<div class="hud" style="margin-bottom:8px">The Vault · ECHO x ORBIT</div>');
  sub('Learn to trade, <span class="f">A to Z.</span>', 'You are <span class="f">inside.</span>');
  sub("Each module teaches one idea, makes you apply it on a real chart, and then tests you. You move on by proving it, not by clicking through.", "Two strategies live in this room, Echo and Orbit, taught as one course with one routine. Five modules, every one with a test, and a certificate at the end. Nothing here is shown outside it.");
  return html.replace("<script>", "<script>window.VAULT=1;</script><script>");
}

/** The INVERTIX page: the school shell with its own words. */
export function invertixShell(html) {
  const sub = (a, b2) => { if (!html.includes(a)) throw new Error("invertix shell text not found: " + a.slice(0, 40)); html = html.replace(a, b2); };
  sub("<title>Trading School · FLOWHUB</title>", "<title>INVERTIX · FLOWHUB</title>");
  sub('<span class="pill"><span class="dot"></span>Practice · no real money</span>', '<span class="pill"><span class="dot"></span>INVERTIX · practice, no real money</span>');
  sub('<div class="hud" style="margin-bottom:8px">Trading School</div>', '<div class="hud" style="margin-bottom:8px">INVERTIX</div>');
  sub('Learn to trade, <span class="f">A to Z.</span>', 'Learn <span class="f">INVERTIX.</span>');
  sub("Each module teaches one idea, makes you apply it on a real chart, and then tests you. You move on by proving it, not by clicking through.", "Three short modules, about 30 minutes: the news fade, how to read the rush in the order flow, and how to size and run a news day. Each one teaches one idea, has you apply it, and then tests you.");
  return html.replace("<script>", "<script>window.INV=1;</script><script>");
}

/** The Orderflow page: the school shell with its own words. */
export function orderflowShell(html) {
  const sub = (a, b2) => { if (!html.includes(a)) throw new Error("orderflow shell text not found: " + a.slice(0, 40)); html = html.replace(a, b2); };
  sub("<title>Trading School · FLOWHUB</title>", "<title>Orderflow · FLOWHUB</title>");
  sub('<span class="pill"><span class="dot"></span>Practice · no real money</span>', '<span class="pill"><span class="dot"></span>Orderflow · practice, no real money</span>');
  sub('<div class="hud" style="margin-bottom:8px">Trading School</div>', '<div class="hud" style="margin-bottom:8px">Orderflow</div>');
  sub('Learn to trade, <span class="f">A to Z.</span>', 'Learn <span class="f">Orderflow.</span>');
  sub("Each module teaches one idea, makes you apply it on a real chart, and then tests you. You move on by proving it, not by clicking through.", "Twelve modules take you from plain-word price ideas to the tape, the footprint and volume, and then to how orderflow sits beside ECHO, ORBIT and INVERTIX. Each one teaches one idea, has you apply it, and then tests you. Pass every test and all three strategies open. You move on by proving it, not by clicking through.");
  sub("One concept, built from the one before it, with a worked example on a live chart.", "One concept, built from the one before it, with a worked example you can step through.");
  sub("Do it yourself on the chart with drawing tools. Tasks count when you get them right on the first check.", "Do it yourself: three tasks with fresh numbers. Tasks count when you get them right on the first check.");
  return html.replace("<script>", "<script>window.OFL=1;</script><script>");
}

/** The LUMEN page: the school shell with its own words. */
export function lumenShell(html) {
  const sub = (a, b2) => { if (!html.includes(a)) throw new Error("lumen shell text not found: " + a.slice(0, 40)); html = html.replace(a, b2); };
  sub("<title>Trading School · FLOWHUB</title>", "<title>LUMEN · FLOWHUB</title>");
  sub('<span class="pill"><span class="dot"></span>Practice · no real money</span>', '<span class="pill"><span class="dot"></span>LUMEN · practice, no real money</span>');
  sub('<div class="hud" style="margin-bottom:8px">Trading School</div>', '<div class="hud" style="margin-bottom:8px">LUMEN</div>');
  sub('Learn to trade, <span class="f">A to Z.</span>', 'Learn <span class="f">LUMEN.</span>');
  sub("Each module teaches one idea, makes you apply it on a real chart, and then tests you. You move on by proving it, not by clicking through.", "Five modules: LUMEN in plain words, then the 30-second order-flow check at its three moments (the zone tap, the break candle, and after you are in), then how to act on it. Each one teaches one idea, has you apply it, and then tests you.");
  return html.replace("<script>", "<script>window.LUMEN=1;</script><script>");
}
