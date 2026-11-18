import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXO_MODULES, fundamentalsComplete, INVERTIX_MODULES, invertixOpen, LUMEN_MODULES, lumenOpen, nextModule, normalizeOrder, OPEN_FIRST, ORDERFLOW_MODULE_IDS, ORDERFLOW_MODULES, ORDERFLOW_OPTIONAL_IDS, ORDERFLOW_OPTIONAL_MODULES, orderflowComplete, withPasses, orderflowOpen, passedIn, trackTotal, vaultStrategiesOpen } from "./tracks";
import { SCHOOL_MODULES } from "./school";

const all = (ids: readonly { id: string }[]) => ({ v2: { m: Object.fromEntries(ids.map((m) => [m.id, { p: 1 }])) } });

test("the INVERTIX module list matches the INVERTIX content", () => {
  const src = readFileSync(new URL("../../school/src/content/11-invertix.js", import.meta.url), "utf8");
  const found = [...src.matchAll(/(?:MODS\.push|quick)\(\{id:'(n\d+)',[^]*?\bt:'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]);
  assert.deepEqual(found.sort(), INVERTIX_MODULES.map((m) => [m.id, m.title]).sort());
});

test("Foundations are 10 modules and INVERTIX is 3", () => {
  assert.equal(trackTotal("fundamentals"), 10);
  assert.equal(trackTotal("invertix"), 3);
  assert.ok(!SCHOOL_MODULES.some((m) => (m.id as string) === "m16" || INVERTIX_MODULES.some((i) => (i.id as string) === (m.id as string))));
});

test("the Orderflow module list matches the Orderflow content", () => {
  const src = readFileSync(new URL("../../school/src/content/12-orderflow.js", import.meta.url), "utf8");
  const found = [...src.matchAll(/quick\(\{id:'(f\d+)',[^]*?\bt:'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]);
  assert.deepEqual(found.sort(), [...ORDERFLOW_MODULES, ...ORDERFLOW_OPTIONAL_MODULES].map((m) => [m.id, m.title]).sort());
  assert.equal(trackTotal("orderflow"), 11);
});

test("a lesson added later (Volume Analysis) never holds back a student or the certificate", () => {
  assert.ok(ORDERFLOW_OPTIONAL_IDS.includes("f11") && !ORDERFLOW_MODULE_IDS.includes("f11"));
  assert.equal(orderflowComplete(all(ORDERFLOW_MODULES)), true); // the original 11 are still the whole certificate
  const m = normalizeOrder(ORDERFLOW_MODULE_IDS, { ...all(ORDERFLOW_MODULES).v2.m, f11: { p: 0, s: "000" } }, 0);
  assert.equal(Object.values(m).filter((x) => x?.p === 1).length, 11); // nothing is taken back
});

test("Orderflow opens with the Foundations certificate", () => {
  assert.equal(fundamentalsComplete(null), false);
  assert.equal(orderflowOpen(null), false);
  assert.equal(orderflowOpen(all(SCHOOL_MODULES.slice(0, 9))), false);
  assert.equal(orderflowOpen(all(SCHOOL_MODULES)), true);
});

test("every strategy opens only with the Orderflow certificate, with no exceptions", () => {
  assert.equal(orderflowComplete(null), false);
  assert.equal(orderflowComplete(all(ORDERFLOW_MODULES.slice(0, 10))), false);
  assert.equal(orderflowComplete(all(ORDERFLOW_MODULES)), true);
  // finishing the Foundations alone opens none of them, and neither does progress inside a strategy
  for (const open of [invertixOpen, lumenOpen, vaultStrategiesOpen]) {
    assert.equal(open(null), false);
    assert.equal(open(all(ORDERFLOW_MODULES.slice(0, 10))), false);
    assert.equal(open(all(ORDERFLOW_MODULES)), true);
  }
  assert.equal(passedIn({ v2: { m: { n01: { p: 1 }, n02: { p: 0 }, bogus: { p: 1 } } } }, new Set(["n01", "n02"])), 1);
});

test("the LUMEN module list matches the LUMEN content, and the strategy courses use fresh module ids", () => {
  const src = readFileSync(new URL("../../school/src/content/13-lumen.js", import.meta.url), "utf8");
  const found = [...src.matchAll(/quick\(\{id:'(l\d+)',[^]*?\bt:'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]);
  assert.deepEqual(found.sort(), LUMEN_MODULES.map((m) => [m.id, m.title]).sort());
  assert.equal(trackTotal("lumen"), 5);
  assert.equal(trackTotal("exo"), 5);
  assert.equal(trackTotal("invertix"), 3);
  // old module ids (m43..., x01...) are not reused, so an old pass can never count toward a rewritten course
  for (const id of [...INVERTIX_MODULES, ...LUMEN_MODULES, ...EXO_MODULES].map((m) => m.id as string)) assert.ok(!/^[mxb]\d+$/.test(id), id);
});

test("progress is kept in order: nobody skips ahead", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];
  // a later pass after a gap is set back; the chain after the gap goes with it
  const out = normalizeOrder(ids, { a: { p: 1 }, b: { p: 0 }, c: { p: 1 }, d: { p: 1 } });
  assert.equal(out.a?.p, 1);
  assert.equal(out.c?.p, 0);
  assert.equal(out.d?.p, 0);
  // the first `open` modules can be done in any order, and the first module after them is open too
  const o2 = normalizeOrder(ids, { b: { p: 1 }, d: { p: 1 }, e: { p: 1 } }, 3);
  assert.equal(o2.b?.p, 1);
  assert.equal(o2.d?.p, 1); // first module after the open ones
  assert.equal(o2.e?.p, 1);
  const o3 = normalizeOrder(ids, { b: { p: 1 }, e: { p: 1 } }, 3);
  assert.equal(o3.e?.p, 0); // d was never passed
  // a coach unlock is left alone
  const o4 = normalizeOrder(ids, { e: { p: 1 } }, 0, new Set(["e"]));
  assert.equal(o4.e?.p, 1);
  // the Foundations: the four basics are open, then module five onward is in order
  assert.equal(OPEN_FIRST.fundamentals, 4);
});

test("next module picks the first one not passed", () => {
  assert.deepEqual(nextModule("invertix", { v2: { m: { n01: { p: 1 } } } }), { n: 2, title: "Reading the Rush: The 60-Second Flow Check" });
  assert.equal(nextModule("fundamentals", null).n, 1);
});

test("saved progress is read whether it is an object, a JSON string, or a list of saves", () => {
  const v2 = { v2: { m: { m37: { p: 1 }, m02: { p: 1 } } } };
  for (const raw of [v2, JSON.stringify(v2), [JSON.stringify({ ch: [] }), JSON.stringify({ v2: { m: { m37: { p: 0 } } } }), JSON.stringify(v2)], [JSON.stringify(v2)]]) {
    assert.equal(passedIn(raw, new Set(["m37", "m02", "m19"])), 2);
  }
  assert.equal(passedIn(null, new Set(["m37"])), 0);
  assert.equal(passedIn("not json", new Set(["m37"])), 0);
});

test("a passing exam attempt on record counts as a pass even if the save lost it", () => {
  const s = withPasses([JSON.stringify({ v2: { m: { m37: { p: 1 } } } })], ["m02", "m39"]);
  assert.equal(passedIn(s, new Set(["m37", "m02", "m39", "m41"])), 3);
  assert.equal(passedIn(withPasses(null, undefined), new Set(["m37"])), 0);
});

/* ---- the learning path: Orderflow path (default) or Basic path ---- */
import { BASIC_MODULES, basicOrderSkip, passedOnPath, strategyOpen, trackModules as trackMods, trackTotalFor } from "./tracks";
const fundDone = { v2: { m: Object.fromEntries(trackMods("fundamentals").map((m) => [m.id, { p: 1 }])) } };
const ofDone = { v2: { m: Object.fromEntries(trackMods("orderflow").map((m) => [m.id, { p: 1 }])) } };
test("the strategies open after Foundations only on the Basic path, and always with the Orderflow certificate", () => {
  assert.equal(strategyOpen(null, fundDone, "basic"), true);
  assert.equal(strategyOpen(null, fundDone, "orderflow"), false);
  assert.equal(strategyOpen(null, null, "basic"), false);
  assert.equal(strategyOpen(ofDone, fundDone, "orderflow"), true);
  assert.equal(strategyOpen(ofDone, null, "orderflow"), true);
});
test("Basic path lessons exist in each strategy, and the totals and passes follow the path", () => {
  for (const t of ["invertix", "lumen", "exo"] as const) {
    const ids = trackMods(t).map((m) => m.id);
    for (const id of BASIC_MODULES[t]) assert.ok(ids.includes(id), `${t} has ${id}`);
    assert.equal(trackTotalFor(t, "basic"), BASIC_MODULES[t].length);
    assert.equal(trackTotalFor(t, "orderflow"), ids.length);
  }
  assert.equal(trackTotalFor("orderflow", "basic"), trackMods("orderflow").length);
  const st = { v2: { m: { n01: { p: 1 }, n02: { p: 1 }, n03: { p: 1 } } } };
  assert.equal(passedOnPath(st, "invertix", "basic"), 2);
  assert.equal(passedOnPath(st, "invertix", "orderflow"), 3);
});
test("a Basic lesson after a skipped lesson is exempt from the in-order rule", () => {
  assert.deepEqual([...basicOrderSkip("invertix")], ["n03"]);
  assert.deepEqual([...basicOrderSkip("lumen")], []);
  assert.deepEqual([...basicOrderSkip("orderflow")], []);
});
test("the school page keeps the same Basic lesson list as the server", () => {
  const src = readFileSync(new URL("../../school/src/tracks.js", import.meta.url), "utf8");
  const m = src.match(/const BASIC_IDS=(\{[^}]*\})/);
  assert.ok(m, "BASIC_IDS found");
  const page = JSON.parse(m![1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":'));
  assert.deepEqual(page, BASIC_MODULES);
});
