import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fundamentalsComplete, INVERTIX_MODULES, invertixOpen, nextModule, passedIn, trackTotal } from "./tracks";
import { SCHOOL_MODULES } from "./school";

const all = (ids: readonly { id: string }[]) => ({ v2: { m: Object.fromEntries(ids.map((m) => [m.id, { p: 1 }])) } });

test("the INVERTIX module list matches the INVERTIX content", () => {
  const src = readFileSync(new URL("../../school/src/content/11-invertix.js", import.meta.url), "utf8");
  const found = [...src.matchAll(/(?:MODS\.push|quick)\(\{id:'(m\d+)',[^]*?\bt:'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], m[2].replace(/\\'/g, "'")]);
  assert.deepEqual(found.sort(), INVERTIX_MODULES.map((m) => [m.id, m.title]).sort());
});

test("fundamentals are 27 modules and INVERTIX is 5", () => {
  assert.equal(trackTotal("fundamentals"), 27);
  assert.equal(trackTotal("invertix"), 5);
  assert.ok(!SCHOOL_MODULES.some((m) => (m.id as string) === "m16" || INVERTIX_MODULES.some((i) => (i.id as string) === (m.id as string))));
});

test("INVERTIX opens with the fundamentals certificate, or for someone already partway through it", () => {
  assert.equal(fundamentalsComplete(null), false);
  assert.equal(invertixOpen(null, null), false);
  assert.equal(invertixOpen(all(SCHOOL_MODULES.slice(0, 26)), null), false);
  assert.equal(invertixOpen(all(SCHOOL_MODULES), null), true);
  assert.equal(invertixOpen(null, { v2: { m: { m43: { p: 1 } } } }), true); // grandfathered
  assert.equal(passedIn({ v2: { m: { m43: { p: 1 }, m44: { p: 0 }, bogus: { p: 1 } } } }, new Set(["m43", "m44"])), 1);
});

test("next module picks the first one not passed", () => {
  assert.deepEqual(nextModule("invertix", { v2: { m: { m43: { p: 1 } } } }), { n: 2, title: "INVERTIX: The Key Level" });
  assert.equal(nextModule("fundamentals", null).n, 1);
});
