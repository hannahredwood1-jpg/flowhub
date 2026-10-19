import { test } from "node:test";
import assert from "node:assert/strict";
import { bsGamma, computeGex, estimateBasis, exportLine, EXPORT_LEGEND, parseOption, type ChainOption } from "./gex";

const asOf = new Date("2026-10-19T12:30:00Z"); // 8:30 AM ET
// A made-up chain around 29,500: heavy call open interest at 29,700, heavy put open interest at 29,300.
function chain(): ChainOption[] {
  const out: ChainOption[] = [];
  for (let k = 28500; k <= 30500; k += 100) {
    const dist = Math.abs(k - 29500) / 1000;
    const callOi = Math.round((k === 29700 ? 9000 : 2500) * Math.exp(-dist) * (k >= 29500 ? 1.2 : 0.5));
    const putOi = Math.round((k === 29300 ? 9000 : 2500) * Math.exp(-dist) * (k <= 29500 ? 1.2 : 0.5));
    for (const [d, exp] of [["261019", "2026-10-19"], ["261023", "2026-10-23"], ["261120", "2026-11-20"]]) {
      out.push({ sym: `NDXP${d}C${String(k * 1000).padStart(8, "0")}`, oi: callOi, iv: 0.2 });
      out.push({ sym: `NDXP${d}P${String(k * 1000).padStart(8, "0")}`, oi: putOi, iv: 0.2 });
      void exp;
    }
  }
  return out;
}

test("option symbols parse", () => {
  const p = parseOption({ sym: "NDXP261019C29500000", oi: 10, iv: 0.18 })!;
  assert.deepEqual([p.type, p.strike, p.exp], ["C", 29500, "2026-10-19"]);
  assert.equal(parseOption({ sym: "garbage", oi: 5 }), null);
  assert.equal(parseOption({ sym: "NDXP261019C29500000", oi: 0 }), null);
});

test("gamma is highest at the money and falls away", () => {
  const atm = bsGamma(29500, 29500, 0.2, 5 / 365), far = bsGamma(29500, 31000, 0.2, 5 / 365);
  assert.ok(atm > far * 5);
});

test("walls land on the heavy strikes and the flip sits between them", () => {
  const r = computeGex(chain(), 29500, asOf)!;
  assert.equal(r.all.callWall, 29700);
  assert.equal(r.all.putWall, 29300);
  assert.ok(r.all.flip != null && r.all.flip > 28500 && r.all.flip < 30500);
  assert.equal(r.expiry0, "2026-10-19");
  assert.equal(r.zero.callWall, 29700);
  assert.ok(r.all.calls.length >= 6 && r.all.puts.length >= 6);
});

test("export line is 21 numbers then NDX, call walls first, put walls next, flip last", () => {
  const r = computeGex(chain(), 29500, asOf)!;
  const parts = r.export.split(",");
  assert.equal(parts.length, 22);
  assert.equal(parts[21], "NDX");
  assert.equal(parts[0], "29700"); // cw1 is the strongest call wall
  assert.equal(parts[10], "29300"); // pw1 is the strongest put wall
  assert.equal(parts[20], String(r.all.flip)); // the flip is value 21
  assert.ok(parts.slice(0, 21).every((x) => /^\d+$/.test(x)));
  assert.equal(EXPORT_LEGEND.length, 21);
  assert.equal(r.exportZero!.split(",").length, 22);
  const empty = { callWall: null, putWall: null, flip: null, regime: null, calls: [], puts: [] };
  assert.equal(exportLine(empty), [...Array(21).fill(0), "NDX"].join(","));
});

test("too little data returns nothing instead of made-up levels", () => {
  assert.equal(computeGex(chain().slice(0, 5), 29500, asOf), null);
  assert.equal(computeGex(chain(), 0, asOf), null);
});

test("contracts that have already stopped trading are ignored", () => {
  const afterClose = computeGex(chain(), 29500, new Date("2026-10-19T20:30:00Z"))!; // 4:30 PM ET on the expiry day
  assert.equal(afterClose.expiry0, "2026-10-23");
  const later = computeGex(chain(), 29500, new Date("2026-10-21T14:00:00Z"))!;
  assert.equal(later.expiry0, "2026-10-23");
  const before = computeGex(chain(), 29500, new Date("2026-10-19T19:00:00Z"))!; // 3 PM ET: still trading
  assert.equal(before.expiry0, "2026-10-19");
});

test("basis estimate is positive and shrinks toward expiry", () => {
  const a = estimateBasis(29500, new Date("2026-10-19T12:00:00Z")), b = estimateBasis(29500, new Date("2026-12-10T12:00:00Z"));
  assert.ok(a > 0 && b > 0 && a > b);
});
