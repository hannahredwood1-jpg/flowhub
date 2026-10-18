import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { VAULT_MODULES, hashCode, makeCode, normalizeCode, vaultPassed } from "./vault";

test("vault module list matches the vault content", () => {
  const dir = new URL("../../school/src/vault/", import.meta.url);
  const src = readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "orderflow-pack.js").map((f) => readFileSync(new URL(f, dir), "utf8")).join("\n");
  const clean = (t: string) => t.replace(/\\'/g, "'");
  const found = [
    ...[...src.matchAll(/(?:chartMod|quick)\(\{id:'([xo]\d+)',[^]*?\bt:'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], clean(m[2])]),
    ...[...src.matchAll(/\['(o\d+)','((?:[^'\\]|\\.)*)',\[/g)].map((m) => [m[1], clean(m[2])]),
  ];
  assert.deepEqual([...found].sort(), VAULT_MODULES.map((m) => [m.id, m.title]).sort());
});

test("codes: format, look-alikes and hashing", () => {
  const c = makeCode(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  assert.match(c, /^FH-[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
  assert.equal(normalizeCode("fh-7k3qm x9t2p"), "7K3QMX9T2P");
  assert.equal(normalizeCode("FH-O1LIO-00000"), "0111000000");
  assert.equal(hashCode("FH-7K3QM-X9T2P", "p"), hashCode("7k3qmx9t2p", "p"));
  assert.notEqual(hashCode("FH-7K3QM-X9T2P", "p"), hashCode("FH-7K3QM-X9T2Q", "p"));
});

test("vault progress counts passed modules", () => {
  assert.equal(vaultPassed({ v2: { m: { x01: { p: 1 }, x02: { p: 0 }, x03: { p: 1 }, zz: { p: 1 } } } }), 2);
  assert.equal(vaultPassed(null), 0);
});
