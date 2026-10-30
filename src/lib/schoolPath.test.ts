import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanAnswers, cleanModes, isProvable, proofFast, proofNeeded } from "./schoolPath";
import { SCHOOL_MODULE_IDS, SCHOOL_NO_PROOF, SCHOOL_PROVABLE_IDS } from "./school";

test("Understanding GEX Levels can never be proved, and INVERTIX is not part of the fundamentals at all", () => {
  for (const id of ["m50", "m43", "m44", "m45", "m46", "m47", "m16"]) assert.equal(isProvable(id), false, id);
  assert.equal(SCHOOL_PROVABLE_IDS.length + SCHOOL_NO_PROOF.length, SCHOOL_MODULE_IDS.length);
  assert.ok(isProvable("m37") && isProvable("m24"));
});

test("modes: only provable, unpassed, unused modules can be 'prove'", () => {
  const raw = { m37: "prove", m02: "prove", m38: "prove", m50: "prove", m43: "prove", bogus: "prove", m19: "nonsense" };
  const out = cleanModes(raw, new Set(["m02"]), new Set(["m38"]));
  assert.equal(out.m37, "prove");
  assert.equal(out.m02, "learn"); // already passed
  assert.equal(out.m38, "learn"); // proof attempt already used
  assert.equal(out.m19, "learn");
  assert.equal("m50" in out, false);
  assert.equal("m43" in out, false);
  assert.equal("bogus" in out, false);
  assert.equal(Object.keys(out).length, SCHOOL_PROVABLE_IDS.length);
  assert.equal(Object.keys(cleanModes(null, new Set(), new Set())).length, SCHOOL_PROVABLE_IDS.length);
});

test("answers are limited to known choices", () => {
  assert.deepEqual(cleanAnswers({ start: "traded", prop: "yes", junk: 1 }), { start: "traded", prop: "yes" });
  assert.deepEqual(cleanAnswers({ start: "<script>", prop: 5 }), { start: "", prop: "" });
});

test("proof pass mark is 80% and fast passes are flagged", () => {
  assert.equal(proofNeeded(25), 20);
  assert.equal(proofNeeded(20), 16);
  assert.equal(proofFast(60, 25), true); // 2.4 seconds a question
  assert.equal(proofFast(600, 25), false);
  assert.equal(proofFast(0, 25), false); // no timing sent
});

test("the school page uses the same list of modules that can't be proved", () => {
  const js = readFileSync(new URL("../../school/src/path.js", import.meta.url), "utf8");
  const m = /const NO_PROOF=\[([^\]]*)\]/.exec(js);
  assert.ok(m, "NO_PROOF list not found in path.js");
  const ids = [...m![1].matchAll(/'(m\d+)'/g)].map((x) => x[1]).sort();
  assert.deepEqual(ids, [...SCHOOL_NO_PROOF].sort());
});
