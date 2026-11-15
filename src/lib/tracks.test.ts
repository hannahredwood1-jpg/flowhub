import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fundamentalsComplete, INVERTIX_MODULES, invertixOpen, nextModule, ORDERFLOW_MODULES, orderflowComplete, orderflowOpen, passedIn, trackTotal, vaultStrategiesOpen } from "./tracks";
import { SCHOOL_MODULES } from "./school";

const all = (ids: readonly { id: string }[]) => ({ v2: { m: Object.fromEntries(ids.map((m) => [m.id, { p: 1 }])) } });

test("the INVERTIX module list matches the INVERTIX content", () => {
  const src = readFileSync(new URL("../../school/src/content/11-invertix.js", import.meta.url), "utf8");
  const found = [...src.matchAll(/(?:MODS\.push|quick)\(\{id:'(m\d+)',[^]*?\bt:'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]);
  assert.deepEqual(found.sort(), INVERTIX_MODULES.map((m) => [m.id, m.title]).sort());
});

test("fundamentals are 27 modules and INVERTIX is 8", () => {
  assert.equal(trackTotal("fundamentals"), 27);
  assert.equal(trackTotal("invertix"), 8);
  assert.ok(!SCHOOL_MODULES.some((m) => (m.id as string) === "m16" || INVERTIX_MODULES.some((i) => (i.id as string) === (m.id as string))));
});

test("the Orderflow module list matches the Orderflow content", () => {
  const src = readFileSync(new URL("../../school/src/content/12-orderflow.js", import.meta.url), "utf8");
  const found = [...src.matchAll(/quick\(\{id:'(f\d+)',[^]*?\bt:'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]);
  assert.deepEqual(found.sort(), ORDERFLOW_MODULES.map((m) => [m.id, m.title]).sort());
  assert.equal(trackTotal("orderflow"), 10);
});

test("Orderflow opens with the fundamentals certificate", () => {
  assert.equal(fundamentalsComplete(null), false);
  assert.equal(orderflowOpen(null), false);
  assert.equal(orderflowOpen(all(SCHOOL_MODULES.slice(0, 26))), false);
  assert.equal(orderflowOpen(all(SCHOOL_MODULES)), true);
});

test("every strategy opens only with the Orderflow certificate (or earlier progress in that strategy)", () => {
  assert.equal(orderflowComplete(null), false);
  assert.equal(orderflowComplete(all(ORDERFLOW_MODULES.slice(0, 9))), false);
  assert.equal(orderflowComplete(all(ORDERFLOW_MODULES)), true);
  // finishing the fundamentals alone no longer opens INVERTIX or the vault
  assert.equal(invertixOpen(null, null), false);
  assert.equal(vaultStrategiesOpen(null, null), false);
  assert.equal(invertixOpen(all(ORDERFLOW_MODULES.slice(0, 9)), null), false);
  assert.equal(vaultStrategiesOpen(all(ORDERFLOW_MODULES.slice(0, 9)), null), false);
  assert.equal(invertixOpen(all(ORDERFLOW_MODULES), null), true);
  assert.equal(vaultStrategiesOpen(all(ORDERFLOW_MODULES), null), true);
  assert.equal(invertixOpen(null, { v2: { m: { m43: { p: 1 } } } }), true); // grandfathered
  assert.equal(vaultStrategiesOpen(null, { v2: { m: { x01: { p: 1 } } } }), true); // grandfathered
  assert.equal(passedIn({ v2: { m: { m43: { p: 1 }, m44: { p: 0 }, bogus: { p: 1 } } } }, new Set(["m43", "m44"])), 1);
});

test("next module picks the first one not passed", () => {
  assert.deepEqual(nextModule("invertix", { v2: { m: { m43: { p: 1 } } } }), { n: 2, title: "INVERTIX: The Key Level" });
  assert.equal(nextModule("fundamentals", null).n, 1);
});
