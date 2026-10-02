// ── Terminology: every term with a drawn, playable example ─────────
// Engine: a tiny candle chart in SVG. A spec has candles (c), optional slots, a price line (line)
// and annotations (ann) that appear when the candle at `at` has closed. Play reveals candles
// one by one, each forming Open → first extreme → second extreme → Close.
const K = (o, h, l, c) => ({ o, h, l, c });
// Candles from a list of closes: each candle opens at the previous close. ov overrides fields.
function cs(closes, ov = {}) {
  const out = [];
  for (let i = 1; i < closes.length; i++) {
    const o = closes[i - 1], c = closes[i], k = i - 1;
    const wu = 0.25 + ((k * 37) % 7) / 14, wd = 0.25 + ((k * 53) % 7) / 14;
    out.push(Object.assign({ o, c, h: Math.max(o, c) + wu, l: Math.min(o, c) - wd }, ov[k] || {}));
  }
  return out;
}
const TW = 320, TH = 180, TPAD = { l: 8, r: 8, t: 18, b: 16 };
const tcol = (c) => COL[c] || c || COL.ink2;
function tRange(spec) {
  let lo = Infinity, hi = -Infinity;
  const add = (p) => { if (p == null || !isFinite(p)) return; lo = Math.min(lo, p); hi = Math.max(hi, p); };
  (spec.c || []).forEach((k) => k && (add(k.h), add(k.l)));
  (spec.line || []).forEach(add);
  (spec.ann || []).forEach((a) => { add(a.p); add(a.lo); add(a.hi); add(a.p0); add(a.p1); (a.pts || []).forEach((q) => add(q[1])); });
  if (spec.range) { add(spec.range[0]); add(spec.range[1]); }
  const pad = (hi - lo) * 0.1 || 1;
  return [lo - pad, hi + pad];
}
function partialCandle(k, s) {
  const bull = k.c >= k.o;
  if (s === 0) return bull ? { o: k.o, h: k.o, l: k.l, c: k.l } : { o: k.o, h: k.h, l: k.o, c: k.h };
  if (s === 1) return bull ? { o: k.o, h: k.h, l: k.l, c: k.h } : { o: k.o, h: k.h, l: k.l, c: k.l };
  return k;
}
// frame: undefined = finished picture. Otherwise candles shown = floor(frame/3), forming stage = frame%3.
function tSvg(spec, frame, quiz) {
  const cands = spec.c || [], line = spec.line || null;
  const slots = spec.slots || Math.max(cands.length, line ? line.length : 0);
  const [lo, hi] = tRange(spec);
  const W = TW, H = spec.h || TH, P = TPAD;
  const bw = (W - P.l - P.r) / slots;
  const x = (i) => P.l + (i + 0.5) * bw;
  const y = (p) => P.t + ((hi - p) / (hi - lo)) * (H - P.t - P.b);
  const total = line ? line.length : cands.length;
  let n = total, stage = 2;
  if (frame != null) { if (line) { n = Math.min(total, frame + 1); } else { n = Math.floor(frame / 3); stage = frame % 3; } }
  const closed = line ? n - 1 : (frame == null ? total - 1 : (stage === 2 ? n : n - 1));
  const vis = (a) => (a.at || 0) <= closed;
  const out = [], base = [];
  const T = (tx, ty, t, col, anchor = 'start', extra = '') => quiz ? '' : `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" fill="${tcol(col)}" text-anchor="${anchor}" ${extra}>${esc(t)}</text>`;
  // grid
  for (let g = 1; g < 4; g++) base.push(`<line x1="0" x2="${W}" y1="${(H * g) / 4}" y2="${(H * g) / 4}" stroke="${COL.line}" stroke-width="1"/>`);
  const anns = (spec.ann || []).filter(vis);
  const under = [], over = [];
  for (const a of anns) {
    const col = tcol(a.col);
    const i0 = a.i0 == null ? -0.5 : a.i0, i1 = a.i1 == null ? slots - 0.5 : a.i1;
    if (a.k === 'band') {
      const y0 = y(a.hi), y1 = y(a.lo);
      under.push(`<rect x="${x(i0)}" y="${y0}" width="${x(i1) - x(i0)}" height="${Math.max(1, y1 - y0)}" fill="${alpha(col, a.fill || 0.14)}" stroke="${alpha(col, 0.55)}" stroke-width="1"/>`);
      if (a.t) { const pos = a.tpos || 'in'; const ty = pos === 'above' ? y0 - 4 : pos === 'below' ? y1 + 11 : y0 + 11; const ax = a.tx === 'r' ? x(i1) - 3 : x(i0) + 3; over.push(T(ax, ty, a.t, a.col, a.tx === 'r' ? 'end' : 'start')); }
    } else if (a.k === 'h') {
      const yy = y(a.p);
      under.push(`<line x1="${x(i0)}" x2="${x(i1)}" y1="${yy}" y2="${yy}" stroke="${col}" stroke-width="${a.w || 1.3}" ${a.dash === false ? '' : `stroke-dasharray="${a.dash || '5 3'}"`}/>`);
      if (a.t) { const pos = a.tpos || 'r'; const ty = a.below ? yy + 11 : yy - 4; over.push(pos === 'l' ? T(x(i0) + 2, ty, a.t, a.col) : T(x(i1) - 2, ty, a.t, a.col, 'end')); }
    } else if (a.k === 'line') {
      let pts = a.pts; if (a.grow) pts = pts.filter((q) => q[0] <= closed);
      if (pts.length > 1) under.push(`<polyline points="${pts.map((q) => `${x(q[0]).toFixed(1)},${y(q[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${a.w || 1.5}" ${a.dash ? `stroke-dasharray="${a.dash}"` : ''} stroke-linejoin="round"/>`);
    } else if (a.k === 'vr') {
      const xx = x(a.i) + (a.dx || 0), ya = y(a.p0), yb = y(a.p1);
      over.push(`<path d="M${xx - 4} ${ya}H${xx + 4}M${xx} ${ya}V${yb}M${xx - 4} ${yb}H${xx + 4}" stroke="${col}" stroke-width="1.5" fill="none"/>`);
      if (a.t) over.push(T(xx + (a.tl ? -7 : 7), (ya + yb) / 2 + 3, a.t, a.col, a.tl ? 'end' : 'start'));
    }
  }
  // candles
  const cw = Math.max(2, Math.min(16, bw * 0.62));
  const shown = frame == null ? cands.length : Math.min(cands.length, n + (stage < 2 ? 1 : 0));
  for (let i = 0; i < shown; i++) {
    let k = cands[i]; if (!k) continue;
    if (frame != null && i === n && stage < 2) k = partialCandle(k, stage);
    const up = k.c >= k.o, col = spec.mono ? COL.ink2 : (up ? COL.win : COL.loss), xx = x(i);
    const dim = spec.dim && spec.dim.includes(i) ? 0.35 : 1;
    out.push(`<g opacity="${dim}"><line x1="${xx}" x2="${xx}" y1="${y(k.h)}" y2="${y(k.l)}" stroke="${col}" stroke-width="1.2"/><rect x="${xx - cw / 2}" y="${y(Math.max(k.o, k.c))}" width="${cw}" height="${Math.max(1, Math.abs(y(k.o) - y(k.c)))}" fill="${col}"/></g>`);
  }
  if (line) {
    const pts = line.slice(0, n).map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    out.push(`<polyline points="${pts}" fill="none" stroke="${COL.ice}" stroke-width="2" stroke-linejoin="round"/>`);
    if (n > 0) out.push(`<circle cx="${x(n - 1)}" cy="${y(line[n - 1])}" r="3" fill="${COL.ice}"/>`);
  }
  for (const a of anns) {
    const col = tcol(a.col);
    if (a.k === 'dot') {
      const yy = y(a.p); over.push(`<circle cx="${x(a.i)}" cy="${yy}" r="${a.r || 4}" fill="none" stroke="${col}" stroke-width="2"/>`);
      if (a.t) over.push(T(x(a.i) + (a.dx || 0), a.pos === 'below' ? yy + 15 : yy - 8, a.t, a.col, a.anchor || 'middle'));
    } else if (a.k === 'x') {
      const xx = x(a.i), yy = y(a.p); over.push(`<path d="M${xx - 4} ${yy - 4}L${xx + 4} ${yy + 4}M${xx + 4} ${yy - 4}L${xx - 4} ${yy + 4}" stroke="${col}" stroke-width="2"/>`);
      if (a.t) over.push(T(xx + (a.dx || 0), a.pos === 'below' ? yy + 15 : yy - 8, a.t, a.col, a.anchor || 'middle'));
    } else if (a.k === 'arrow') {
      const xx = x(a.i), yy = y(a.p), d = a.dir === 'down' ? 1 : -1;
      over.push(`<path d="M${xx} ${yy}l-5 ${-d * 8}h10z" transform="translate(0 ${-d * 3})" fill="${col}"/>`);
      if (a.t) over.push(T(xx + (a.dx || 0), yy + d * -16, a.t, a.col, a.anchor || 'middle'));
    } else if (a.k === 'tag') {
      over.push(T(x(a.i) + (a.dx || 0), y(a.p) + (a.dy || 0), a.t, a.col, a.anchor || 'middle', a.big ? 'font-size="12" font-weight="700"' : ''));
    }
  }
  const txt = over.join('').replace(/<text /g, `<text stroke="${COL.abyss}" stroke-width="3" `);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${quiz ? 'Mystery chart' : 'Example chart'}" font-family="JetBrains Mono, monospace" font-size="10.5" style="paint-order:stroke" stroke-linejoin="round">${base.join('')}${under.join('')}${out.join('')}${txt}</svg>`;
}
function tFrames(spec) { if (spec.frames) return spec.frames; if (spec.line) return spec.line.length; return (spec.c || []).length * 3; }
// Last `say` visible at this frame, else the static caption.
function tSay(spec, frame, fallback) {
  if (frame == null) return fallback;
  const total = spec.line ? spec.line.length : (spec.c || []).length;
  const closed = spec.line ? Math.min(total, frame + 1) - 1 : Math.floor(frame / 3) - (frame % 3 === 2 ? 0 : 1);
  let s = null; for (const a of spec.ann || []) if (a.say && (a.at || 0) <= closed) s = a.say;
  return s || (closed < 0 ? 'Watching…' : fallback);
}

// ── Custom drawings for terms that aren't a single chart ──
const svgBox = (h, inner, label) => `<svg viewBox="0 0 ${TW} ${h}" role="img" aria-label="${esc(label)}" font-family="JetBrains Mono, monospace" font-size="9.5">${inner}</svg>`;
function candleAt(k, xx, cw, y, col) {
  const up = k.c >= k.o, c = col || (up ? COL.win : COL.loss);
  return `<line x1="${xx}" x2="${xx}" y1="${y(k.h)}" y2="${y(k.l)}" stroke="${c}" stroke-width="1.2"/><rect x="${xx - cw / 2}" y="${y(Math.max(k.o, k.c))}" width="${cw}" height="${Math.max(1, Math.abs(y(k.o) - y(k.c)))}" fill="${c}"/>`;
}
const TF_SMALL = cs([10, 11.2, 10.4, 12, 13.4, 12.3, 11.6, 13, 14.6, 13.9, 15.6, 16.1, 17.2]);
function tfPair(which) {
  return {
    frames: TF_SMALL.length,
    draw(frame) {
      const n = frame == null ? TF_SMALL.length : frame + 1, sm = TF_SMALL.slice(0, n);
      const y = (p) => 22 + ((19 - p) / 11) * 130;
      const agg = { o: sm[0].o, c: sm[sm.length - 1].c, h: Math.max(...sm.map((k) => k.h)), l: Math.min(...sm.map((k) => k.l)) };
      const onL = which === 'ltf', hi = COL.ice;
      let s = `<rect x="4" y="4" width="206" height="172" fill="none" stroke="${onL ? hi : COL.line2}" ${onL ? '' : 'stroke-dasharray="3 3"'}/><rect x="226" y="4" width="90" height="172" fill="none" stroke="${!onL ? hi : COL.line2}" ${!onL ? '' : 'stroke-dasharray="3 3"'}/>`;
      sm.forEach((k, i) => { s += candleAt(k, 18 + i * 15.5, 8, y); });
      s += candleAt(agg, 271, 26, y);
      s += `<text x="12" y="170" fill="${onL ? hi : COL.ink3}">LTF · 5m · ${n} candle${n > 1 ? 's' : ''}</text><text x="236" y="170" fill="${!onL ? hi : COL.ink3}">HTF · 1H · 1</text>`;
      s += `<text x="218" y="92" fill="${COL.ink3}" text-anchor="middle">=</text>`;
      return svgBox(180, s, 'Twelve 5-minute candles make one 1-hour candle');
    },
  };
}
function ladder(which) {
  const steps = [['EVAL', 'pass the challenge', 'ink2'], ['FUNDED', 'firm’s capital · payouts', 'ice'], ['LIVE', 'real money', 'win']];
  return {
    frames: 3,
    draw(frame) {
      const n = frame == null ? 3 : frame + 1; let s = '';
      steps.slice(0, n).forEach(([t, d, c], i) => {
        const on = t === which, x0 = 10 + i * 102, y0 = 118 - i * 44;
        s += `<rect x="${x0}" y="${y0}" width="96" height="40" fill="${alpha(tcol(c), on ? 0.16 : 0.05)}" stroke="${on ? tcol(c) : COL.line2}" stroke-width="${on ? 2 : 1}"/>`;
        s += `<text x="${x0 + 8}" y="${y0 + 17}" fill="${on ? tcol(c) : COL.ink2}" font-size="12" font-weight="700">${t}</text><text x="${x0 + 8}" y="${y0 + 32}" fill="${COL.ink3}">${d}</text>`;
        if (i < 2 && i + 1 < n) s += `<path d="M${x0 + 96} ${y0 + 10} L${x0 + 104} ${y0 - 14}" stroke="${COL.ink3}" fill="none"/>`;
      });
      return svgBox(170, s, 'Eval, then funded, then live');
    },
  };
}
const propFlow = {
  frames: 4,
  draw(frame) {
    const n = frame == null ? 4 : frame + 1;
    const box = [['YOU', 'pay for an eval', 'ink2'], ['PROP FIRM', 'sets the rules', 'ice'], ['PASS', 'get funded capital', 'win'], ['PAYOUT', 'you keep a profit split', 'signal']];
    let s = '';
    box.slice(0, n).forEach(([t, d, c], i) => {
      const x0 = 8 + (i % 2) * 160, y0 = 12 + Math.floor(i / 2) * 78;
      s += `<rect x="${x0}" y="${y0}" width="144" height="52" fill="${alpha(tcol(c), 0.08)}" stroke="${tcol(c)}"/><text x="${x0 + 10}" y="${y0 + 22}" fill="${tcol(c)}" font-size="12" font-weight="700">${t}</text><text x="${x0 + 10}" y="${y0 + 39}" fill="${COL.ink2}">${d}</text>`;
    });
    if (n > 1) s += `<path d="M152 38h12" stroke="${COL.ink3}"/><path d="M160 34l6 4-6 4" fill="${COL.ink3}"/>`;
    if (n > 2) s += `<path d="M240 64 V76 H80 V88" fill="none" stroke="${COL.ink3}"/><path d="M76 86l4 6 4-6" fill="${COL.ink3}"/>`;
    if (n > 3) s += `<path d="M152 116h12" stroke="${COL.ink3}"/><path d="M160 112l6 4-6 4" fill="${COL.ink3}"/>`;
    return svgBox(150, s, 'How a prop firm works');
  },
};
const sessions = {
  frames: 5,
  draw(frame) {
    const n = frame == null ? 5 : frame + 1;
    // 6 PM → 11 AM next day, 17 hours
    const x = (h) => 10 + ((h - 18) / 17) * 300;
    const items = [
      [18, 18.05, '6 PM daily open', 'ink2', 30], [20, 24, 'ASIA · 8 PM–12 AM', 'lag', 58], [24, 24.05, '12 AM midnight open', 'signal', 30],
      [31, 33.42, 'NY range 7:00–9:25', 'ice', 58], [33.5, 34, 'A+ · 9:30–10:00', 'win', 96],
    ];
    let s = `<line x1="10" x2="310" y1="126" y2="126" stroke="${COL.line2}"/>`;
    [18, 20, 24, 28, 31, 33.5, 35].forEach((h) => { const hh = h % 24; s += `<line x1="${x(h)}" x2="${x(h)}" y1="122" y2="130" stroke="${COL.ink3}"/><text x="${x(h)}" y="142" fill="${COL.ink3}" text-anchor="middle" font-size="8.5">${hh % 12 || 12}${h % 1 ? ':30' : ''}${hh < 12 ? 'a' : 'p'}</text>`; });
    items.slice(0, n).forEach(([a, b, t, c, yy]) => {
      const w = Math.max(2, x(b) - x(a));
      s += `<rect x="${x(a)}" y="${yy}" width="${w}" height="${126 - yy}" fill="${alpha(tcol(c), w > 3 ? 0.16 : 1)}" stroke="${tcol(c)}"/>`;
      const right = x(a) > 200;
      s += `<text x="${right ? x(b) : x(a)}" y="${yy - 5}" fill="${tcol(c)}" text-anchor="${right ? 'end' : 'start'}">${t}</text>`;
    });
    s += `<text x="10" y="164" fill="${COL.ink3}">All times New York (ET)</text>`;
    return svgBox(172, s, 'Sessions and key times');
  },
};

// ── The terms ──────────────────────────────────────────────
const TCATS = ['Market Structure', 'Risk Management', 'Trading Positions', 'Time Frames', 'Prop Firm Terms', 'Charts & Orders', 'FLOWMTD Models'];
const TERMS = [
  // Market Structure (definitions: FLOWMTD terminology sheet)
  { ab: 'ATH', full: 'All-Time High', cat: 0, def: 'Highest price an asset has ever reached.', vis() {
    const c = cs([20, 22, 21, 24, 27.5, 25, 23, 24, 26, 29, 33, 31, 29.5]);
    return { c, ann: [
      { k: 'h', p: c[3].h, i0: 3, i1: 9, col: 'ink3', t: 'old high', at: 3, say: 'The old high. Nothing above it yet.' },
      { k: 'h', p: c[9].h, i0: 9, col: 'ice', t: 'ATH', at: 9, dash: false, say: 'Broke the old high: a new all-time high.' },
      { k: 'dot', i: 9, p: c[9].h, col: 'signal', at: 9 }] };
  }, cap: 'Price takes out the old high. The highest point ever printed is the ATH.', rel: ['ATL', 'BOS'] },
  { ab: 'ATL', full: 'All-Time Low', cat: 0, def: 'Lowest price an asset has ever reached.', vis() {
    const c = cs([30, 28, 29, 26, 22.5, 25, 27, 26, 24, 21, 17, 19, 20.5]);
    return { c, ann: [
      { k: 'h', p: c[3].l, i0: 3, i1: 9, col: 'ink3', t: 'old low', below: true, at: 3, say: 'The old low. Nothing below it yet.' },
      { k: 'h', p: c[9].l, i0: 9, col: 'loss', t: 'ATL', below: true, at: 9, dash: false, say: 'Broke the old low: a new all-time low.' },
      { k: 'dot', i: 9, p: c[9].l, col: 'signal', at: 9 }] };
  }, cap: 'Price breaks under the old low. The lowest point ever printed is the ATL.', rel: ['ATH'] },
  { ab: 'BOS', full: 'Break of Structure', cat: 0, def: 'When price breaks a previous high or low, signaling possible continuation or reversal.', vis() {
    const c = cs([10, 13.5, 17, 15, 13, 15.2, 16.8, 19.5, 21, 19.6, 22]);
    const sh = c[1].h, bi = c.findIndex((k, i) => i > 1 && k.c > sh);
    return { c, ann: [
      { k: 'h', p: sh, i0: 1, i1: bi, col: 'ice', t: 'previous high', at: 1, say: 'A swing high forms. That’s the structure.' },
      { k: 'tag', i: bi, p: c[bi].h, dy: -8, t: 'BOS ↑', col: 'signal', at: bi, big: true, say: 'A candle CLOSES above the previous high: break of structure.' },
      { k: 'dot', i: bi, p: sh, col: 'signal', at: bi, r: 3 }] };
  }, cap: 'A candle closes through the previous high. Structure is broken, so buyers are in control for now.', rel: ['COS', 'PA'] },
  { ab: 'EQH', full: 'Equal Highs', cat: 0, def: 'Multiple highs around the same level, often targeted as liquidity', vis() {
    const c = cs([10, 14, 18, 16, 13, 15, 18, 15.5, 12.5, 14, 17, 21, 22.5], { 1: { h: 18.6 }, 2: { h: 18.3 }, 5: { h: 18.6 }, 6: { h: 18.3 } });
    return { c, ann: [
      { k: 'h', p: 18.6, i0: 1, i1: 10.5, col: 'lag', t: 'EQH · stops rest above', at: 5, say: 'Two highs at the same price. Stop orders pile up just above.' },
      { k: 'dot', i: 1, p: 18.6, col: 'lag', r: 3, at: 1 }, { k: 'dot', i: 5, p: 18.6, col: 'lag', r: 3, at: 5 },
      { k: 'tag', i: 10, p: c[10].h, dy: -8, t: 'liquidity taken', col: 'signal', at: 10, say: 'Price runs straight through them and takes that liquidity.' }] };
  }, cap: 'Two highs line up. Price comes back and runs through them to take the stops sitting above.', rel: ['EQL', 'LIQUIDITY', 'SWEEP'] },
  { ab: 'EQL', full: 'Equal Lows', cat: 0, def: 'Multiple lows around the same level, often targeted as liquidity.', vis() {
    const c = cs([22, 18, 14, 16, 19, 17, 14, 16.5, 19.5, 18, 15, 11, 9.5], { 1: { l: 13.4 }, 2: { l: 13.7 }, 5: { l: 13.4 }, 6: { l: 13.7 } });
    return { c, ann: [
      { k: 'h', p: 13.4, i0: 1, i1: 10.5, col: 'lag', t: 'EQL · stops rest below', below: true, at: 5, say: 'Two lows at the same price. Stop orders pile up just below.' },
      { k: 'dot', i: 1, p: 13.4, col: 'lag', r: 3, at: 1 }, { k: 'dot', i: 5, p: 13.4, col: 'lag', r: 3, at: 5 },
      { k: 'tag', i: 10, p: c[10].l, dy: 16, t: 'liquidity taken', col: 'signal', at: 10, say: 'Price runs through them and takes that liquidity.' }] };
  }, cap: 'Two lows line up. Price comes back down through them to take the stops sitting below.', rel: ['EQH', 'LIQUIDITY', 'SWEEP'] },
  { ab: 'FVG', full: 'Fair Value Gap', cat: 0, def: 'An imbalance in price caused by aggressive movement', vis() {
    const c = [K(9, 10, 8, 9.5), K(9.5, 10.5, 8.8, 10.2), K(10.2, 12, 9.8, 11.6), K(11.6, 19.6, 11.4, 19.2), K(19.2, 21.5, 15, 21), K(21, 21.8, 17.5, 18), K(18, 18.4, 14.2, 15.5), K(15.5, 20.5, 15.2, 20.2), K(20.2, 23, 19.8, 22.6)];
    return { c, ann: [
      { k: 'band', lo: 12, hi: 15, i0: 2, i1: 8.5, col: 'win', t: 'FVG', tx: 'r', at: 4, say: 'Candle 1’s high and candle 3’s low don’t overlap. That empty space is the FVG.' },
      { k: 'tag', i: 2, p: 12, dy: -6, t: '1', col: 'signal', at: 2, big: true }, { k: 'tag', i: 3, p: 11.4, dy: 14, t: '2', col: 'signal', at: 3, big: true, say: 'One aggressive candle. Price moved so fast the market skipped levels.' }, { k: 'tag', i: 4, p: 21.5, dy: -6, t: '3', col: 'signal', at: 4, big: true },
      { k: 'arrow', i: 6, p: 14.2, dir: 'up', col: 'win', at: 7, say: 'Price comes back into the gap and reacts off it.' }] };
  }, cap: 'Three candles. The gap between candle 1’s high and candle 3’s low is the imbalance.', rel: ['IFVG', 'PD-ARRAY'], ch: 'hl' },
  { ab: 'RT', full: 'Retracement', cat: 0, def: 'A temporary pullback against the main trend.', vis() {
    const c = cs([10, 13, 16.2, 19, 22, 20.4, 18.8, 18, 19.8, 22.6, 25.4, 28]);
    return { c, ann: [
      { k: 'line', pts: [[0, 10], [3, 22]], col: 'win', dash: '4 3', at: 3 },
      { k: 'band', lo: c[6].l, hi: 22.4, i0: 3.5, i1: 6.5, col: 'lag', t: 'RT', tpos: 'below', at: 6, say: 'A pullback against the trend. Temporary.' },
      { k: 'tag', i: 9, p: c[10].h, dy: -4, t: 'trend continues', col: 'win', at: 10, say: 'The trend picks back up after the retracement.' }] };
  }, cap: 'Up, pull back a little, then up again. The pullback is the retracement.', rel: ['PA'] },
  { ab: 'PA', full: 'Price Action', cat: 0, def: 'Reading candle movement and market structure without indicators.', vis() {
    const c = cs([10, 12, 14, 13, 12, 14.5, 17, 16, 15, 17.5, 20, 19, 18, 20.5, 23]);
    const H = (i, t) => ({ k: 'tag', i, p: c[i].h, dy: -6, t, col: 'win', at: i }), L = (i, t) => ({ k: 'tag', i, p: c[i].l, dy: 14, t, col: 'ice', at: i });
    return { c, ann: [H(1, 'H'), L(3, 'L'), { ...H(5, 'HH'), say: 'Higher high.' }, { ...L(7, 'HL'), say: 'Higher low.' }, H(9, 'HH'), L(11, 'HL'), { ...H(13, 'HH'), say: 'Higher highs and higher lows = uptrend. No indicators needed.' }] };
  }, cap: 'Just candles. Higher highs (HH) and higher lows (HL) tell you the trend.', rel: ['BOS', 'RT'] },

  // Risk Management
  { ab: 'SL', full: 'Stop Loss', cat: 1, def: 'Automatically closes a trade to limit losses.', vis() {
    const c = cs([20, 21, 20.6, 22, 21.4, 20, 18.2, 16.4, 15, 13.8]);
    const hit = c.findIndex((k) => k.l <= 17);
    return { c, ann: [
      { k: 'h', p: 21, i0: 0.5, i1: hit, col: 'ice', t: 'ENTRY · long', at: 0, say: 'Long at 21. The stop loss sits below at 17.' },
      { k: 'h', p: 17, i0: 0.5, i1: hit, col: 'loss', t: 'SL', below: true, at: 0 },
      { k: 'x', i: hit, p: 17, col: 'loss', t: 'SL hit · out', pos: 'below', dx: -18, at: hit, say: 'Price hits the stop. The trade closes automatically. Loss capped.' },
      { k: 'tag', i: 8, p: c[8].l, dy: 16, t: 'kept falling', col: 'ink3', at: 8, say: 'Price kept falling, but you were already out.' }] };
  }, cap: 'Price hits your stop loss and the trade closes on its own, before the loss gets bigger.', rel: ['TP', 'BRACKET', 'BE'] },
  { ab: 'TP', full: 'Take Profit', cat: 1, def: 'Automatically closes a trade to secure profits.', vis() {
    const c = cs([20, 21, 21.5, 22.6, 22, 23.6, 25, 26.6, 27.4, 26, 24.4]);
    const hit = c.findIndex((k) => k.h >= 26);
    return { c, ann: [
      { k: 'h', p: 21, i0: 0.5, i1: hit, col: 'ice', t: 'ENTRY', below: true, at: 0, say: 'Long at 21 with a take profit at 26.' },
      { k: 'h', p: 26, i0: 0.5, i1: hit, col: 'win', t: 'TP', tpos: 'l', at: 0 },
      { k: 'dot', i: hit, p: 26, col: 'win', t: 'TP hit · +profit', at: hit, say: 'Price touches the take profit. The trade closes and the profit is locked in.' },
      { k: 'tag', i: 9, p: c[9].l, dy: 14, t: 'price came back', col: 'ink3', at: 9, say: 'Price fell back afterwards, but the profit was already secured.' }] };
  }, cap: 'Price reaches your take profit and the trade closes on its own with the profit banked.', rel: ['SL', 'RR', 'BRACKET'] },
  { ab: 'RR', full: 'Risk to Reward Ratio', alias: 'RRR', cat: 1, def: 'Comparing potential profit to the amount being risked.', vis() {
    const c = cs([19, 20, 19.2, 18.4, 20.4, 22, 21.4, 24, 26, 25.4, 28, 29.6]);
    return { c, ann: [
      { k: 'band', lo: 17, hi: 20, i0: 0.5, col: 'loss', t: 'risk · 3 pts = 1R', tpos: 'below', at: 0, say: 'Risk: entry 20, stop 17. That’s 3 points, called 1R.' },
      { k: 'band', lo: 20, hi: 29, i0: 0.5, col: 'win', fill: 0.07, t: 'reward · 9 pts = 3R', tx: 'r', at: 0, say: 'Reward: target 29, 9 points away. That’s 3R.' },
      { k: 'tag', i: 3, p: 26, t: 'RR 1:3', col: 'ink', big: true, at: 0 },
      { k: 'dot', i: 10, p: 29, col: 'win', at: 10, say: 'Risk 1 to make 3. Win 1 of 4 trades and you still break even.' }] };
  }, cap: 'Risk 3 points to make 9: that’s 1:3. The bigger the reward vs the risk, the fewer wins you need.', rel: ['SL', 'TP'] },
  { ab: 'BE', full: 'Break Even', cat: 1, def: 'Moving stop loss to entry so the trade can no longer lose.', vis() {
    const c = cs([19.5, 20, 21, 22, 23.4, 22.6, 21.6, 20.4, 19.4, 17.8, 16.4]);
    const k = 3, out = c.findIndex((q, i) => i > k && q.l <= 20);
    return { c, ann: [
      { k: 'h', p: 20, i0: 0.5, i1: k, col: 'ice', t: 'ENTRY', at: 0, say: 'Long at 20, stop at 17.' },
      { k: 'h', p: 17, i0: 0.5, i1: k, col: 'loss', t: 'SL', below: true, at: 0 },
      { k: 'h', p: 23, i0: k - 0.5, i1: k + 0.5, col: 'win', t: '1:1', at: k, dash: false, say: 'Price is 1:1 in your favor.' },
      { k: 'h', p: 20, i0: k, i1: out, col: 'signal', t: 'SL → BE', below: true, at: k, dash: false, say: 'Stop moves up to the entry: break even. This trade can’t lose now.' },
      { k: 'x', i: out, p: 20, col: 'signal', t: 'out at $0', pos: 'below', dx: 22, at: out, say: 'Price comes back and closes you out at $0 instead of a loss.' },
      { k: 'tag', i: 9, p: 17.8, dy: 16, t: 'the old stop would’ve been hit', col: 'ink3', at: 9, anchor: 'end', dx: 10 }] };
  }, cap: 'Once the trade is 1:1 in profit, the stop moves to entry. Worst case now: $0.', rel: ['SL', 'RR'], ch: 'dl' },
  { ab: 'DD', full: 'Drawdown', cat: 1, def: 'The amount an account is down from its highest balance.', vis() {
    const line = [50000, 50600, 51200, 50900, 51800, 52400, 51900, 51300, 50700, 51100, 51500];
    return { line, ann: [
      { k: 'h', p: 52400, i0: 5, col: 'ice', t: 'highest balance $52,400', at: 5, say: 'New highest balance: $52,400.' },
      { k: 'vr', i: 8, p0: 52400, p1: 50700, col: 'loss', t: 'DD −$1,700', at: 8, say: 'Now at $50,700. That’s $1,700 of drawdown from the peak.' }] };
  }, cap: 'Drawdown is measured from the highest balance, not from where you started.', rel: ['EVAL', 'DLL'] },

  // Trading Positions
  { ab: 'LONG', full: 'Buying Position', cat: 2, def: 'Entering a trade expecting price to rise.', vis() {
    const c = cs([18, 19, 18.6, 20, 21.6, 21, 23, 24.6, 26]);
    return { c, ann: [
      { k: 'arrow', i: 0, p: 18.6, dir: 'up', col: 'ice', t: 'BUY', at: 0, say: 'Buy here, expecting price to go up.' },
      { k: 'band', lo: 19, hi: 26, i0: 0.5, col: 'win', fill: 0.08, t: 'price up = profit', tx: 'r', tpos: 'below', at: 7, say: 'Price rises. The higher it goes, the more a long makes.' }] };
  }, cap: 'Buy first, sell later. You make money when price goes UP.', rel: ['SHORT', 'ENTRY'] },
  { ab: 'SHORT', full: 'Selling Position', cat: 2, def: 'Entering a trade expecting price to fall.', vis() {
    const c = cs([26, 25, 25.4, 24, 22.4, 23, 21, 19.4, 18]);
    return { c, ann: [
      { k: 'arrow', i: 0, p: 25.4, dir: 'down', col: 'loss', t: 'SELL', at: 0, say: 'Sell here, expecting price to go down.' },
      { k: 'band', lo: 18, hi: 25, i0: 0.5, col: 'win', fill: 0.08, t: 'price down = profit', tx: 'r', at: 7, say: 'Price falls. The lower it goes, the more a short makes.' }] };
  }, cap: 'Sell first, buy back later. You make money when price goes DOWN.', rel: ['LONG'] },
  { ab: 'ENTRY', full: 'Trade Entry', cat: 2, def: 'The price level where a trade is opened.', vis() {
    const c = cs([24, 23, 22, 21.4, 20.6, 21.8, 23, 24.2]);
    const f = c.findIndex((k) => k.l <= 21);
    return { c, ann: [
      { k: 'h', p: 21, col: 'ice', t: 'ENTRY 21', below: true, at: 0, say: 'Your order waits at 21.' },
      { k: 'dot', i: f, p: 21, col: 'ice', t: 'filled: trade open', pos: 'below', dx: 30, at: f, say: 'Price trades at 21: your order fills. This is your entry.' }] };
  }, cap: 'The exact price your order filled at. Everything (stop, target, P&L) is measured from here.', rel: ['EXIT', 'LIMIT'] },
  { ab: 'EXIT', full: 'Trade Exit', cat: 2, def: 'The price level where a trade is closed', vis() {
    const c = cs([20.5, 21, 22, 23, 22.5, 24, 25, 24.4, 23]);
    return { c, ann: [
      { k: 'h', p: 21, i0: 0.5, i1: 5, col: 'ice', t: 'entry', below: true, at: 0, say: 'In at 21.' },
      { k: 'band', lo: 21, hi: 25, i0: 0.5, i1: 5, col: 'win', fill: 0.07, at: 5 },
      { k: 'x', i: 5, p: 25, col: 'signal', t: 'EXIT 25', at: 5, say: 'Out at 25. Trade closed: +4 points.' }] };
  }, cap: 'Where you closed the trade: at your target, your stop, or by hand.', rel: ['ENTRY', 'TP', 'SL'] },

  // Time Frames
  { ab: 'LTF', full: 'Lower Time Frame', cat: 3, def: 'Smaller charts like 1m, 5m, or 15m.', custom: tfPair('ltf'), cap: 'Each small candle is 5 minutes. Twelve of them build one 1-hour candle.', rel: ['HTF'] },
  { ab: 'HTF', full: 'Higher Time Frame', cat: 3, def: 'Larger charts like 1H, 4H, or Daily.', custom: tfPair('htf'), cap: 'Same price, zoomed out: the whole hour in one candle. HTF sets the direction; LTF times the entry.', rel: ['LTF', 'OLHC'] },
  { ab: 'SESSIONS', full: 'Sessions & key times', cat: 3, def: 'The windows of the day the models trade, in New York time.', custom: sessions, cap: '6 PM daily open, Asia 8 PM–12 AM, midnight open, NY range 7:00–9:25, then the 9:30 open.', rel: ['OPENS', 'RANGE H/L'] },

  // Prop Firm Terms
  { ab: 'PROP FIRM', full: 'Proprietary Trading Firm', cat: 4, def: 'A company that provides traders with funded capital.', custom: propFlow, cap: 'You prove yourself on their rules, they give you capital, you split the profits.', rel: ['EVAL', 'FUNDED'] },
  { ab: 'EVAL', full: 'Evaluation Phase', cat: 4, def: 'The challenge phase required to earn a funded account.', vis() {
    const line = [50000, 50400, 50100, 50900, 51500, 51200, 52000, 52600, 53100];
    return { line, range: [48000, 53400], ann: [
      { k: 'h', p: 53000, col: 'win', t: 'PROFIT TARGET · pass', at: 0, say: 'Hit the profit target without breaking a rule…' },
      { k: 'h', p: 48000, col: 'loss', t: 'MAX DRAWDOWN · fail', below: true, at: 0, say: '…and never touch the drawdown limit.' },
      { k: 'tag', i: 8, p: 53100, dy: 16, t: 'PASSED', col: 'win', big: true, anchor: 'end', at: 8, say: 'Target reached: evaluation passed. Next: funded.' }] };
  }, cap: 'Example 50K eval: make the profit target before you hit the max drawdown.', rel: ['FUNDED', 'DD', 'DLL'] },
  { ab: 'FUNDED', full: 'Funded Account', cat: 4, def: 'The account you get after passing the eval: you trade the firm’s capital under its rules and request payouts.', custom: ladder('FUNDED'), cap: 'Pass the eval → funded. Same rules still apply, and now profits can be paid out.', rel: ['EVAL', 'LIVE'] },
  { ab: 'LIVE', full: 'Live Account', cat: 4, def: 'Trading with real money.', custom: ladder('LIVE'), cap: 'Real money on the line. Every rule you practiced matters most here.', rel: ['FUNDED', 'PROP FIRM'] },
  { ab: 'DLL', full: 'Daily Loss Limit', cat: 4, def: 'The most your account can lose in one day. Hit it and you’re done for the day (or the account fails, depending on the firm).', vis() {
    const line = [0, -200, 150, -300, -550, -400, -750, -1000];
    return { line, range: [-1150, 300], ann: [
      { k: 'h', p: 0, col: 'ink3', t: 'start of day', at: 0 },
      { k: 'h', p: -1000, col: 'loss', t: 'DLL −$1,000', below: true, at: 0, say: 'Today’s P&L. The daily loss limit sits at −$1,000.' },
      { k: 'x', i: 7, p: -1000, col: 'loss', t: 'done for today', anchor: 'end', dx: -6, at: 7, say: 'Limit hit. No more trades today.' }] };
  }, cap: 'Your firm’s daily limit is a wall. Your own daily stop should be well above it.', rel: ['DD', 'EVAL'] },

  // Charts & Orders (from the lessons)
  { ab: 'CANDLE', full: 'Candlestick · OHLC', cat: 5, def: 'One bar of price over one time period: where it Opened, its High, its Low and where it Closed. Green closed higher, red closed lower.', vis() {
    const c = [null, K(12, 22, 8, 19), null, null, K(19, 23, 9, 12), null];
    const lab = (i, p, t, col) => ({ k: 'tag', i, p, dx: 14, dy: 3, t, col: col || 'ink2', anchor: 'start', at: i });
    return { c, slots: 6, ann: [lab(1, 22, 'High'), lab(1, 19, 'Close', 'win'), lab(1, 12, 'Open'), lab(1, 8, 'Low'), lab(4, 23, 'High'), lab(4, 19, 'Open'), lab(4, 12, 'Close', 'loss'), lab(4, 9, 'Low'),
      { k: 'tag', i: 1, p: 5.5, t: 'UP candle', col: 'win', at: 1, say: 'Green: it closed higher than it opened.' }, { k: 'tag', i: 4, p: 5.5, t: 'DOWN candle', col: 'loss', at: 4, say: 'Red: it closed lower than it opened.' }] };
  }, cap: 'Press play and watch each candle form: open, one extreme, the other, then the close.', rel: ['WICK', 'OLHC'], ch: 'chart' },
  { ab: 'WICK', full: 'Wick', cat: 5, def: 'The thin line above or below the body. Price traded there during the candle but didn’t close there.', vis() {
    const c = cs([16, 15.5, 16.2, 15.6], { 2: { l: 9.5, h: 16.4, c: 15.6 } });
    c.push(K(15.6, 18, 15.2, 17.6));
    return { c, slots: 6, ann: [
      { k: 'band', lo: 9.5, hi: 15.2, i0: 1.6, i1: 2.4, col: 'signal', fill: 0.12, at: 2 },
      { k: 'tag', i: 2, p: 12, dx: 12, t: 'long wick: sellers pushed down,', col: 'signal', anchor: 'start', at: 2, say: 'Price dropped hard during the candle…' },
      { k: 'tag', i: 2, p: 12, dx: 12, dy: 12, t: 'buyers pushed it back', col: 'signal', anchor: 'start', at: 2, say: '…then got rejected and closed back up. The wick shows where it went.' }] };
  }, cap: 'Wicks show where price went and got rejected. That’s where stops and orders traded.', rel: ['CANDLE', 'SWEEP'] },
  { ab: 'TICK', full: 'Tick & Point', cat: 5, def: 'The smallest price move. On NQ/MNQ one tick is 0.25, and 4 ticks make 1 point.', raw: () => VIS.ticks(), cap: 'MNQ: $0.50 a tick, $2 a point. NQ: $5 a tick, $20 a point.', rel: ['SL', 'RR'], ch: 'chart' },
  { ab: 'MARKET', full: 'Market Order', cat: 5, def: 'Buy or sell right now at the current price.', vis() {
    const c = cs([20, 21, 20.4, 21.6, 22.8, 22.2, 23.6]);
    return { c, slots: 7, ann: [{ k: 'dot', i: 2, p: c[2].c, col: 'win', t: 'MARKET BUY · filled now', pos: 'below', at: 2, say: 'Press buy: filled instantly at whatever price it is.' }] };
  }, cap: 'Fastest fill, but you take whatever price is there.', rel: ['LIMIT', 'STOP'], ch: 'order' },
  { ab: 'LIMIT', full: 'Limit Order', cat: 5, def: 'Waits at your price. A buy limit sits below price and fills if price dips to it.', vis() {
    const c = cs([24, 23.4, 22.4, 21.6, 20.6, 21.6, 23, 24.4]);
    const f = c.findIndex((k) => k.l <= 21);
    return { c, ann: [
      { k: 'h', p: 21, i1: f, col: 'ice', t: 'BUY LIMIT 21 · waiting', below: true, at: 0, say: 'The order waits below price at 21.' },
      { k: 'dot', i: f, p: 21, col: 'win', t: 'filled', pos: 'below', at: f, say: 'Price dips to 21: filled. You got the price you wanted.' }] };
  }, cap: 'You pick the price. It only fills if price comes to you.', rel: ['MARKET', 'STOP', 'ENTRY'], ch: 'order' },
  { ab: 'STOP', full: 'Stop Order', cat: 5, def: 'Waits at your price and fills when price breaks through it. A buy stop sits above price.', vis() {
    const c = cs([20, 20.6, 20.2, 21, 20.6, 22.4, 24, 25.2]);
    const f = c.findIndex((k) => k.h >= 22);
    return { c, ann: [
      { k: 'h', p: 22, i1: f, col: 'ice', t: 'BUY STOP 22 · waiting', at: 0, say: 'The order waits ABOVE price at 22.' },
      { k: 'dot', i: f, p: 22, col: 'win', t: 'filled on the break', pos: 'below', dx: 26, at: f, say: 'Price breaks up through 22: filled.' }] };
  }, cap: 'Fills on a break. It’s also how a stop loss works: it fires when price reaches it.', rel: ['LIMIT', 'SL'], ch: 'order' },
  { ab: 'BRACKET', full: 'Bracket Order · OCO', cat: 5, def: 'An entry with a stop loss and take profit attached. When one of them fills, the other cancels (One Cancels Other).', vis() {
    const c = cs([20, 20.8, 21.6, 21, 22.6, 24, 25.2, 26.4, 25]);
    const hit = c.findIndex((k) => k.h >= 26);
    return { c, ann: [
      { k: 'h', p: 20.5, i1: hit, col: 'ice', t: 'ENTRY', below: true, at: 0, say: 'Entry with the stop and target attached.' },
      { k: 'h', p: 26, i1: hit, col: 'win', t: 'TP', tpos: 'l', at: 0 },
      { k: 'h', p: 17.5, i1: hit, col: 'loss', t: 'SL', below: true, at: 0 },
      { k: 'dot', i: hit, p: 26, col: 'win', t: 'TP filled', at: hit, say: 'Target fills…' },
      { k: 'x', i: hit, p: 17.5, col: 'ink3', t: 'SL cancelled', pos: 'below', at: hit, say: '…and the stop cancels itself. One cancels other.' }] };
  }, cap: 'Set it once. Whichever side gets hit first closes the trade and cancels the other.', rel: ['SL', 'TP'], ch: 'order' },

  // FLOWMTD Models (definitions from the teaching guides / lessons)
  { ab: 'LIQUIDITY', full: 'Liquidity', cat: 6, def: 'Stop orders resting above old highs and below old lows. Price is drawn to them: they’re the draw, your target.', vis() {
    const c = cs([16, 19, 21, 19, 16.5, 14, 12, 14, 16.5, 19, 21.5, 23]);
    return { c, ann: [
      { k: 'h', p: c[1].h, i0: 1, i1: 9.5, col: 'lag', t: 'buy stops above', at: 1 },
      { k: 'h', p: c[5].l, i0: 5, col: 'lag', t: 'sell stops below', below: true, at: 5, say: 'Every obvious high and low has stops parked beyond it.' },
      { k: 'tag', i: 10, p: c[10].h, dy: -6, t: 'draw taken', col: 'signal', at: 10, say: 'Price travels to the pool of stops and takes it.' }] };
  }, cap: 'Stops sit just past obvious highs and lows. Price gets pulled toward them.', rel: ['EQH', 'EQL', 'SWEEP'], ch: 'po3' },
  { ab: 'SWEEP', full: 'Liquidity Sweep', cat: 6, def: 'Price trades through a high or low, grabs the stops parked there, and comes back. It traps traders on the wrong side.', vis() {
    const c = cs([20, 22, 20.6, 19, 21, 22.2, 20.4, 19.6, 20.6, 22.8, 24.6, 26], { 6: { l: 16.6 } });
    return { c, ann: [
      { k: 'band', lo: 18.4, hi: 22.9, i0: -0.5, i1: 5.5, col: 'ice', fill: 0.06, t: 'range', at: 0 },
      { k: 'h', p: 18.4, i0: -0.5, i1: 7, col: 'ice', t: 'range low', below: true, tpos: 'l', at: 3 },
      { k: 'dot', i: 6, p: 16.6, col: 'signal', t: 'SWEEP', pos: 'below', at: 6, say: 'A wick runs under the range low, grabs the stops… and closes back inside.' },
      { k: 'tag', i: 10, p: c[10].h, dy: -6, t: 'reversal', col: 'win', at: 10, say: 'Trapped sellers fuel the move back up.' }] };
  }, cap: 'Run the stops, close back inside, reverse. Low swept → look for longs.', rel: ['LIQUIDITY', 'IFVG', 'RANGE H/L', 'TURTLE SOUP'], ch: 'hl' },
  { ab: 'IFVG', full: 'Inverted Fair Value Gap', alias: 'IFG', cat: 6, def: 'A gap that flipped. Sellers made the gap; when a candle CLOSES back above it, old resistance becomes support.', vis() {
    const c = [K(22, 22.6, 20.8, 21), K(21, 21.4, 16, 16.4), K(16.4, 17.6, 14.2, 15), K(15, 17.2, 14.6, 16.8), K(16.8, 19.8, 16.4, 19.2), K(19.2, 20.6, 17.4, 20.2), K(20.2, 22.8, 19.8, 22.4)];
    return { c, ann: [
      { k: 'band', lo: 17.6, hi: 20.8, i0: 0, col: 'loss', t: 'bearish FVG', tx: 'r', at: 2, say: 'The drop leaves a bearish gap.' },
      { k: 'tag', i: 3, p: 17.2, dy: -6, t: 'wick in: not yet', col: 'ink3', at: 3 },
      { k: 'band', lo: 17.6, hi: 20.8, i0: 4, col: 'win', t: 'iFVG · now support', tx: 'r', tpos: 'below', at: 5, say: 'A candle CLOSES above the gap. It has inverted: support now.' },
      { k: 'arrow', i: 5, p: 17.4, dir: 'up', col: 'win', at: 5 }] };
  }, cap: 'A wick inside isn’t enough. It needs a close back through the gap.', rel: ['FVG', 'SWEEP'], ch: 'hl' },
  { ab: 'RANGE H/L', full: 'Range High / Range Low', cat: 6, def: 'NYFlow H/L: the highest high and lowest low from 7:00 to 9:25 AM ET. At 9:25 the range locks.', vis() {
    const c = cs([20, 21.4, 20.2, 22.6, 21.4, 19.6, 18.6, 20.4, 21.8, 20.6, 19.4, 20.8, 17.6, 19.8, 22.4], { 11: { l: 16.8 } });
    return { c, ann: [
      { k: 'band', lo: c[5].l, hi: c[2].h, i0: -0.5, i1: 9.5, col: 'ice', fill: 0.06, t: '7:00–9:25', at: 9, say: 'The range locks at 9:25.' },
      { k: 'h', p: c[2].h, i0: 2, col: 'ice', t: 'range high', at: 2, say: 'Every new extreme moves a line.' },
      { k: 'h', p: c[5].l, i0: 5, col: 'ice', t: 'range low', below: true, at: 5 },
      { k: 'dot', i: 11, p: 16.8, col: 'signal', t: 'low swept → longs', pos: 'below', at: 11, say: 'After 9:30 one side gets swept. Low swept → longs toward the range high.' }] };
  }, cap: 'Mark the high and low of the pre-market. The fuel sits just past them.', rel: ['SWEEP', 'SESSIONS'], ch: 'hl' },
  { ab: 'PO3', full: 'Power of Three · AMD', alias: 'AMD', cat: 6, def: 'Price moves in three phases: Accumulation (sideways chop), Manipulation (a fake move that sweeps stops), Distribution (the real move).', vis() {
    const c = cs([20, 21, 20, 21.2, 19.8, 20.8, 19.6, 18, 16.6, 18.6, 21.6, 24, 26.4]);
    return { c, ann: [
      { k: 'band', lo: 19.2, hi: 21.8, i0: -0.5, i1: 5.5, col: 'ink2', fill: 0.08, t: 'A · accumulation', tpos: 'above', at: 5, say: 'A: chop. No trades here.' },
      { k: 'tag', i: 7, p: c[7].l, dy: 16, t: 'M · manipulation', col: 'loss', at: 7, say: 'M: the fake move down that sweeps stops. Not the real move.' },
      { k: 'tag', i: 10, p: c[11].h, dy: -4, t: 'D · distribution', col: 'win', anchor: 'end', at: 11, say: 'D: the real move, with the trend.' }] };
  }, cap: 'Chop, fake-out, real move. The model trades the real move after the fake one.', rel: ['OLHC', 'SWEEP', 'LIQUIDITY'], ch: 'po3' },
  { ab: 'OLHC', full: 'Open → Low → High → Close', alias: 'OHLC', cat: 6, def: 'How a bullish key candle (10:00 in NY, 8 PM in Asia) builds: dip below the open first (manipulation), then drive up and close higher. Shorts: OHLC.', vis() {
    const c = [null, K(20, 26, 15, 25), null];
    return { c, slots: 3, ann: [
      { k: 'h', p: 20, i0: 0.6, i1: 1.4, col: 'ink', t: 'O', tpos: 'l', dash: '2 2', at: -1 },
      { k: 'tag', i: 1, p: 15, dx: 22, t: 'L · dip first', col: 'loss', anchor: 'start', at: 1, say: 'Open, then a dip below it: the manipulation.' },
      { k: 'tag', i: 1, p: 26, dx: 22, t: 'H', col: 'win', anchor: 'start', dy: 4, at: 1 },
      { k: 'tag', i: 1, p: 25, dx: 22, dy: 12, t: 'C · closes high', col: 'win', anchor: 'start', at: 1, say: 'Then it drives up and closes near the high: distribution.' }] };
  }, cap: 'Press play: the candle dips first, then runs. That’s the order you want for longs.', rel: ['PO3', 'HTF'], ch: 'po3' },
  { ab: 'KEY LEVEL', full: 'Key Level', cat: 6, def: 'AsiaFlow: a level that lines up with the draw, somewhere price can dip into during the manipulation before going your way.', vis() {
    const c = cs([23, 22.4, 23, 22, 21, 19.4, 18.4, 19.6, 21.6, 23.4, 25.2]);
    return { c, ann: [
      { k: 'band', lo: 17.6, hi: 19.2, i0: -0.5, col: 'win', t: 'KEY LEVEL', tx: 'r', tpos: 'below', at: 0, say: 'Your landing spot, marked before the session.' },
      { k: 'h', p: 26, col: 'lag', t: 'the draw', at: 0 },
      { k: 'dot', i: 6, p: c[6].l, col: 'signal', t: 'manipulation into it', pos: 'below', dx: -34, at: 6, say: 'Price dips into the level. That’s the manipulation you were waiting for.' },
      { k: 'arrow', i: 9, p: c[9].h, dir: 'up', col: 'win', at: 9, say: 'Then it drives toward the draw.' }] };
  }, cap: 'No key level, nowhere to wait. It’s where the fake move should land.', rel: ['NWOG', 'PO3'], ch: 'asia' },
  { ab: 'NWOG', full: 'New Week Opening Gap', cat: 6, def: 'The gap between Friday’s close and Sunday’s 6 PM open. In AsiaFlow it’s the highest-priority draw.', vis() {
    const c = [...cs([20, 21, 20.4, 21.6, 22]), null, ...cs([26.5, 26, 25, 24, 23.4, 24.6, 23.8, 22.4])];
    return { c, ann: [
      { k: 'band', lo: 22, hi: 26.5, i0: 3.5, col: 'lag', t: 'NWOG', tx: 'r', at: 5, say: 'Friday closed at 22. Sunday opened at 26.5. The empty space is the NWOG.' },
      { k: 'tag', i: 1.5, p: 19, t: 'Friday', col: 'ink3', at: 0 }, { k: 'tag', i: 8, p: 27.8, t: 'Sunday 6 PM →', col: 'ink3', at: 5 },
      { k: 'dot', i: 12, p: 22.4, col: 'signal', t: 'gap filled', pos: 'below', at: 12, say: 'Price gets drawn back into the gap.' }] };
  }, cap: 'The weekend leaves a hole in price. Price tends to come back for it.', rel: ['KEY LEVEL', 'FVG'], ch: 'asia' },
  { ab: 'OPENS', full: 'Opening Prices', cat: 6, def: 'Daily Levels: 6 PM daily open, midnight (true day) open, 8:30 and 9:30. Below them → look for longs. Above → shorts. A confluence, not a deal breaker.', vis() {
    const c = cs([24, 24.6, 23.6, 22.4, 21.6, 20, 19, 17.8, 18.6, 20.8, 22.6, 24.4, 26]);
    return { c, ann: [
      { k: 'h', p: 24.8, col: 'ink3', t: '6 PM open', at: 0 },
      { k: 'h', p: 23.6, i0: 1.5, col: 'signal', t: 'midnight open', below: true, at: 1 },
      { k: 'band', lo: 17.4, hi: 18.8, i0: -0.5, col: 'win', t: 'level below the opens → longs', tpos: 'below', at: 0, say: 'The level sits below both opens: longs only.' },
      { k: 'arrow', i: 7, p: c[7].l, dir: 'up', col: 'win', at: 8, say: 'Price trades down into the level, then back above the opens.' }] };
  }, cap: 'Where the day opened tells you which side to look for.', rel: ['PLC', 'SESSIONS'], ch: 'dl' },
  { ab: 'PLC', full: 'Protected Low Catalyst', alias: 'PHC', cat: 6, def: 'On the 4H: a swing low that formed inside a bullish FVG while price respected it. It’s a draw: price is expected to come back and take it. (PHC is the same for highs.)', vis() {
    const c = [K(16, 17, 15.4, 16.8), K(16.8, 18.2, 16.4, 18), K(18, 25, 17.8, 24.6), K(24.6, 27, 21.4, 26.4), K(26.4, 27.2, 22, 22.6), K(22.6, 26.6, 22.2, 26.2), K(26.2, 27.4, 24.6, 25), K(25, 25.4, 21.2, 21.6), K(21.6, 22, 19.6, 20.4)];
    return { c, ann: [
      { k: 'band', lo: 18.2, hi: 21.4, i0: 1, col: 'win', fill: 0.1, t: 'bullish FVG', tx: 'r', tpos: 'below', at: 3, say: 'A bullish 4H gap.' },
      { k: 'h', p: 22, i0: 4, i1: 7, col: 'signal', t: 'PLC', tpos: 'l', below: true, at: 4, say: 'A swing low forms while price respects the gap: the PLC.' },
      { k: 'dot', i: 7, p: 22, col: 'signal', t: 'PLC swept', pos: 'below', dx: 18, at: 7, say: 'Price comes back and takes it. Your level sits below it.' }] };
  }, cap: 'About 90% of daily levels are built around a PLC or PHC.', rel: ['PL', 'OPENS', 'TURTLE SOUP'], ch: 'dl' },
  { ab: 'LRL', full: 'Low-Resistance Liquidity', cat: 6, def: 'Price stepping toward your level slowly, making low after low. Each little low is easy fuel, so price slides right into the level.', vis() {
    const c = cs([25, 24.2, 24.6, 23.6, 23.9, 22.9, 23.2, 22.2, 22.5, 21.4, 19.6, 22.2, 24.6], { 9: { l: 19 } });
    const lows = [0, 2, 4, 6, 8];
    return { c, ann: [
      { k: 'band', lo: 18.6, hi: 20.2, i0: -0.5, col: 'win', t: 'LEVEL', tx: 'r', tpos: 'below', at: 0 },
      ...lows.map((i, j) => ({ k: 'dot', i, p: c[i].l, col: 'lag', r: 2.5, at: i, say: j === 2 ? 'Low after low after low…' : undefined })),
      { k: 'tag', i: 3, p: c[2].h, dy: -12, t: 'LRL: low after low', col: 'lag', at: 4 },
      { k: 'arrow', i: 9, p: 19, dir: 'up', col: 'win', at: 10, say: '…straight into the level, then the reaction.' }] };
  }, cap: 'Slow, stair-step lows into the level: one of the two things a limit entry needs.', rel: ['TURTLE SOUP', 'PLC'], ch: 'dl' },
  { ab: 'TURTLE SOUP', full: 'Turtle Soup', cat: 6, def: 'A short-term low forms just above your level. Price runs through it, tags the level and rejects hard. That’s the sweep that makes a limit entry valid.', vis() {
    const c = cs([24, 23, 22.4, 21.2, 21.6, 20.9, 21.8, 22.6, 21.4, 20, 22.6, 24.4, 26]);
    const stl = c[4].l;
    c[8] = { ...c[8], l: 17.6, c: 20.2 }; c[9] = K(20.2, 23, 19.8, 22.6);
    return { c, ann: [
      { k: 'band', lo: 17, hi: 18.6, i0: -0.5, col: 'win', t: 'LEVEL', tx: 'r', tpos: 'below', at: 0 },
      { k: 'h', p: stl, i0: 4, i1: 8.5, col: 'signal', t: 'short-term low', at: 4, say: 'A short-term low forms just above the level.' },
      { k: 'dot', i: 8, p: 17.6, col: 'signal', t: 'turtle soup', pos: 'below', dx: -28, at: 8, say: 'Price runs the short-term low, tags the level, rejects with a long wick.' },
      { k: 'tag', i: 10, p: c[10].h, dy: -6, t: 'protected low', col: 'win', at: 10, say: 'That low is now protected. Price delivers higher.' }] };
  }, cap: 'Stops under the short-term low get taken right into your level.', rel: ['LRL', 'SWEEP', 'PL'], ch: 'dl' },
  { ab: 'PL', full: 'Protected Low', alias: 'PH', cat: 6, def: 'The low that held after the sweep and that price delivered higher from. While the idea is valid, price shouldn’t trade back through it. (PH for highs.)', vis() {
    const c = cs([22, 20.4, 18.6, 17.2, 19.6, 21.2, 20.2, 22.6, 24, 23.2, 25.6], { 2: { l: 16.4 } });
    return { c, ann: [
      { k: 'h', p: 16.4, i0: 2, col: 'win', t: 'PROTECTED LOW', below: true, dash: false, at: 3, say: 'The low held. It’s now protected.' },
      { k: 'tag', i: 6, p: c[6].l, dy: 16, t: 'higher low', col: 'ink2', at: 6 },
      { k: 'tag', i: 9, p: c[9].l, dy: 16, t: 'never back below', col: 'ink2', at: 9, say: 'Every pullback holds above it while price delivers higher.' }] };
  }, cap: 'If price closes back through the protected low, the idea is wrong.', rel: ['TURTLE SOUP', 'PLC'], ch: 'dl' },
  { ab: 'OB', full: 'Order Block', cat: 6, def: 'The last opposite candle before a strong move: for longs, the last down candle before price displaces up. Price often reacts when it comes back to it.', vis() {
    const c = [K(22, 22.4, 20.6, 21), K(21, 21.3, 19.4, 19.8), K(19.8, 20.2, 18.4, 18.8), K(18.8, 23.6, 18.6, 23.2), K(23.2, 26, 22.8, 25.6), K(25.6, 26.2, 22.4, 22.8), K(22.8, 23, 19.2, 20), K(20, 24.8, 19.6, 24.4), K(24.4, 27.8, 24, 27.4)];
    return { c, ann: [
      { k: 'band', lo: 18.4, hi: 20.2, i0: 1.6, col: 'ice', t: 'OB', tx: 'r', tpos: 'below', at: 3, say: 'The last down candle before the strong move up: the order block.' },
      { k: 'arrow', i: 6, p: 19.2, dir: 'up', col: 'win', at: 7, say: 'Price comes back to it and reacts.' }] };
  }, cap: 'Find the last down candle before the push. That’s where the buying started.', rel: ['BREAKER', 'PD-ARRAY'], ch: 'dl' },
  { ab: 'BREAKER', full: 'Breaker', cat: 6, def: 'A level that failed and flipped: price broke through it, and when price comes back it acts the other way (old resistance becomes support).', vis() {
    const c = [K(18, 21.6, 17.8, 21.2), K(21.2, 21.6, 17, 17.4), K(17.4, 18, 15.2, 15.8), K(15.8, 20, 15.6, 19.6), K(19.6, 24.2, 19.4, 23.8), K(23.8, 24.4, 20.8, 21.2), K(21.2, 23.4, 20.6, 23), K(23, 26.4, 22.6, 26)];
    return { c, ann: [
      { k: 'band', lo: 18, hi: 21.6, i0: -0.5, i1: 3.5, col: 'loss', t: 'resistance', tpos: 'above', at: 1, say: 'The last up candle before the drop: resistance.' },
      { k: 'band', lo: 18, hi: 21.6, i0: 3.5, col: 'win', t: 'breaker · support', tx: 'r', tpos: 'below', at: 4, say: 'Price closes up through it. It failed, so it flips.' },
      { k: 'arrow', i: 5, p: 20.8, dir: 'up', col: 'win', at: 6, say: 'Price retests it from above and it holds as support.' }] };
  }, cap: 'A broken level flips sides. In Daily Levels it’s the 15m/5m refinement.', rel: ['OB', 'IFVG', 'REFINE'], ch: 'dl' },
  { ab: 'PD-ARRAY', full: 'PD-Array', cat: 6, def: 'The places price reacts from: FVGs, order blocks, breakers. After confirmation, entries are taken at the first PD-array.', vis() {
    const c = cs([26, 24.6, 23.4, 22, 20.6, 22.8, 24.8, 26.8, 27.4]);
    return { c, slots: 10, ann: [
      { k: 'band', lo: 22.4, hi: 23.6, i0: -0.5, col: 'win', t: 'FVG', tx: 'r', at: 0 },
      { k: 'band', lo: 20.4, hi: 21.6, i0: -0.5, col: 'ice', t: 'order block', tx: 'r', at: 0 },
      { k: 'band', lo: 18, hi: 19.2, i0: -0.5, col: 'lag', t: 'breaker', tx: 'r', at: 0, say: 'Map the arrays before price gets there.' },
      { k: 'arrow', i: 4, p: c[4].l, dir: 'up', col: 'win', at: 5, say: 'Price reacts at one of them.' }] };
  }, cap: 'Mark them in advance. They’re where price is likely to react.', rel: ['FVG', 'OB', 'BREAKER'], ch: 'dl' },
  { ab: 'REFINE', full: 'Refining a Level', cat: 6, def: 'Take the same idea from the 4H down through the 1H and 15m/5m (and optionally 1m) to cut the drawdown. Same target, a fraction of the risk.', raw: () => VIS.refine(), cap: 'A 4H level might need 150 ticks of room. Refined to the 15m it can need 50 or less.', rel: ['PD-ARRAY', 'BREAKER', 'HTF'], ch: 'dl' },
  { ab: 'COS', full: 'Change of Structure', cat: 6, def: 'Price breaks the last swing AGAINST the trend. In a downtrend, a close above the last lower high: first sign the trend is turning.', vis() {
    const c = cs([26, 23.6, 24.8, 22, 20, 21.4, 19.2, 17.8, 19, 21.6, 23.2, 22.4, 24.6]);
    const lh = c[4].h, bi = c.findIndex((k, i) => i > 6 && k.c > lh);
    return { c, ann: [
      { k: 'tag', i: 1, p: c[1].h, dy: -6, t: 'LH', col: 'loss', at: 1 }, { k: 'tag', i: 4, p: c[4].h, dy: -6, t: 'LH', col: 'loss', at: 4, say: 'Lower highs: a downtrend.' },
      { k: 'h', p: lh, i0: 4, i1: bi, col: 'ice', at: 4 },
      { k: 'tag', i: bi, p: c[bi].h, dy: -8, t: 'COS ↑', col: 'signal', big: true, at: bi, say: 'A close above the last lower high: change of structure.' }] };
  }, cap: 'BOS continues the trend. COS is the first break against it.', rel: ['BOS', 'IFVG'], ch: 'dl' },
  { ab: 'PDH / PDL', full: 'Previous Day High / Low', cat: 6, def: 'Yesterday’s high and low. Common targets, because stops rest just past them.', vis() {
    const c = [...cs([20, 22, 23.6, 21.8, 19.6, 18.4, 20.2]), null, ...cs([20.6, 21.4, 22.6, 23.4, 24.4])];
    const pdh = Math.max(...c.slice(0, 6).map((k) => k.h)), pdl = Math.min(...c.slice(0, 6).map((k) => k.l));
    return { c, ann: [
      { k: 'h', p: pdh, i0: 1, col: 'ice', t: 'PDH', at: 5 }, { k: 'h', p: pdl, i0: 4, col: 'ice', t: 'PDL', below: true, at: 5, say: 'Yesterday’s high and low carry into today.' },
      { k: 'tag', i: 2.5, p: pdl, dy: 26, t: 'yesterday', col: 'ink3', at: 0 }, { k: 'tag', i: 9, p: pdl, dy: 26, t: 'today', col: 'ink3', at: 7 },
      { k: 'dot', i: 10, p: pdh, col: 'signal', t: 'PDH taken', pos: 'below', dx: -10, at: 10, say: 'Today price runs the PDH: the target.' }] };
  }, cap: 'Mark them every morning. They’re targets for Daily Levels.', rel: ['LIQUIDITY', 'RS'], ch: 'dl' },
  { ab: 'RS', full: 'Range Settlement', cat: 6, def: 'Forms every weekday at 9:30. Futures trade overnight but the index doesn’t, so orders get left behind. At the open they get filled, and price is drawn to that level.', vis() {
    const c = cs([20, 20.6, 19.8, 21, 21.8, 23.4, 24.8, 26.2, 27.2]);
    return { c, ann: [
      { k: 'h', p: 20.6, i0: 0.5, i1: 1.5, col: 'ink', t: '9:30', tpos: 'l', below: true, dash: false, at: 0, say: '9:30: price opens below the Range Settlement.' },
      { k: 'band', lo: 20.6, hi: 27, i0: 0.5, col: 'lag', fill: 0.06, at: 0 },
      { k: 'h', p: 27, col: 'lag', t: 'RS · the AM draw', tpos: 'l', at: 0 },
      { k: 'dot', i: 7, p: 27, col: 'lag', t: 'RS filled', pos: 'below', dx: -8, at: 7, say: 'Pulled up to fill it.' }] };
  }, cap: 'Opened below RS → the AM draw is up. It only applies after 9:30, never overnight.', rel: ['OPENS', 'PDH / PDL'], ch: 'dl' },
];
TERMS.forEach((t, i) => { t.id = 't-' + t.ab.toLowerCase().replace(/[^a-z0-9]+/g, '-'); t.i = i; });
const termById = (ab) => TERMS.find((t) => t.ab === ab);
function termSpec(t) { if (!t._spec && t.vis) t._spec = t.vis(); return t._spec; }
function termSvg(t, frame, quiz) {
  if (t.raw) return t.raw();
  if (t.custom) return t.custom.draw(frame);
  return tSvg(termSpec(t), frame, quiz);
}
function termFrames(t) { if (t.raw) return 0; if (t.custom) return t.custom.frames; return tFrames(termSpec(t)); }
function termSay(t, frame) { if (!t.vis || frame == null) return t.cap; return tSay(termSpec(t), frame, t.cap); }

// ── View ───────────────────────────────────────────────────
const TV_ST = { q: '', cat: -1, view: 'lessons' };
const LESSON_NAME = (id) => (CH.find((c) => c.id === id) || {}).name;
function termCard(t) {
  const lesson = t.ch && LESSON_NAME(t.ch);
  return `<article class="term" id="${t.id}" data-term="${t.i}">
    <div class="t-top"><h3 class="t-ab">${esc(t.ab)}</h3><span class="hud">${esc(TCATS[t.cat])}</span></div>
    <div class="t-full">${esc(t.full)}${t.alias ? ` <span class="t-alias">· also ${esc(t.alias)}</span>` : ''}</div>
    <p class="t-def">${esc(t.def)}</p>
    <figure class="t-vis" data-vis>${termSvg(t)}</figure>
    <p class="t-cap" data-cap><b>On the chart</b>${esc(t.cap)}</p>
    <div class="t-act">
      ${termFrames(t) ? `<button type="button" class="btn" data-play>▶ Watch it form</button>` : ''}
      ${lesson ? `<button type="button" class="btn ghost" data-lesson="${t.ch}">Practice: ${esc(lesson)} →</button>` : ''}
    </div>
    ${t.rel ? `<div class="t-rel"><span class="hud">Related</span>${t.rel.filter(termById).map((r) => `<button type="button" class="t-chip" data-goto="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : ''}
  </article>`;
}
function termMatches(t) {
  if (TV_ST.cat >= 0 && t.cat !== TV_ST.cat) return false;
  const q = TV_ST.q.trim().toLowerCase(); if (!q) return true;
  return [t.ab, t.full, t.alias || '', t.def].join(' ').toLowerCase().includes(q);
}
function renderTerms() {
  const list = TERMS.filter(termMatches);
  $('#t-count').textContent = `${list.length} term${list.length === 1 ? '' : 's'}`;
  let html = '';
  TCATS.forEach((name, ci) => {
    const items = list.filter((t) => t.cat === ci); if (!items.length) return;
    html += `<section class="t-sec"><h2 class="t-h">${esc(name)} <span class="num">${items.length}</span></h2><div class="t-grid">${items.map(termCard).join('')}</div></section>`;
  });
  $('#t-list').innerHTML = html || `<p class="empty">No term matches “${esc(TV_ST.q)}”. Try an abbreviation like FVG or BE.</p>`;
  $$('#t-cats [data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.cat === TV_ST.cat)));
}
const players = new Map();
function playTerm(card) {
  const t = TERMS[+card.dataset.term], total = termFrames(t);
  const btn = card.querySelector('[data-play]'), fig = card.querySelector('[data-vis]'), cap = card.querySelector('[data-cap]');
  if (players.has(card)) { clearInterval(players.get(card)); players.delete(card); }
  let f = 0; btn.textContent = '■ Playing'; btn.classList.add('primary');
  const step = t.custom ? 700 : (t.vis && termSpec(t).line ? 420 : 150);
  const tick = () => {
    fig.innerHTML = termSvg(t, f);
    cap.innerHTML = `<b>On the chart</b>${esc(termSay(t, f))}`;
    f++;
    if (f >= total) {
      clearInterval(players.get(card)); players.delete(card);
      setTimeout(() => { fig.innerHTML = termSvg(t); cap.innerHTML = `<b>On the chart</b>${esc(termSay(t, total - 1))}`; btn.textContent = '↻ Watch again'; btn.classList.remove('primary'); }, step);
    }
  };
  tick(); players.set(card, setInterval(tick, step));
}
function gotoTerm(ab) {
  const t = termById(ab); if (!t) return;
  if (!termMatches(t)) { TV_ST.q = ''; TV_ST.cat = -1; $('#t-q').value = ''; renderTerms(); }
  const el = document.getElementById(t.id); if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}
function setView(v) {
  TV_ST.view = v;
  $('#lessons-view').hidden = v !== 'lessons'; $('#terms-view').hidden = v !== 'terms';
  $$('#views [data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  document.body.classList.toggle('terms-on', v === 'terms');
  if (v === 'terms' && !$('#t-list').children.length) renderTerms();
  if (v === 'lessons') { resize(); dirty(); }
  try { history.replaceState(null, '', v === 'terms' ? '#terms' : location.pathname + location.search); } catch (e) { /* file:// */ }
}

// Quiz: the chart without its labels + the definition with the term blanked out. Pick the term.
const QZ = { t: null, opts: [], picked: null, right: 0, seen: 0 };
const quizPool = () => TERMS.filter((t) => t.vis);
function blank(t, s) { let out = s; [t.ab, t.full, t.alias].filter(Boolean).forEach((w) => { out = out.split(w).join('____'); }); return out; }
function newQuiz() {
  const pool = quizPool(); let t;
  do { t = pool[Math.floor(Math.random() * pool.length)]; } while (QZ.t && t === QZ.t && pool.length > 1);
  const pickFrom = pool.filter((x) => x !== t).map((x) => [x, Math.random() + (x.cat === t.cat ? 0 : 0.6)]).sort((a, b) => a[1] - b[1]).slice(0, 3).map((x) => x[0]);
  Object.assign(QZ, { t, opts: [t, ...pickFrom].sort(() => Math.random() - 0.5), picked: null });
  renderQuiz();
}
function renderQuiz() {
  const t = QZ.t, box = $('#t-quiz');
  const right = QZ.picked != null && QZ.opts[QZ.picked] === t;
  box.innerHTML = `<div class="card-in">
    <div class="eyebrow"><span class="hud">Quiz · name the term</span><span class="hud num">${QZ.right}/${QZ.seen} right</span></div>
    <div class="q-grid"><figure class="t-vis">${termSvg(t, undefined, QZ.picked == null)}</figure>
    <div class="q-side"><p class="t-def">${esc(QZ.picked == null ? blank(t, t.def) : t.def)}</p>
    <div class="opts">${QZ.opts.map((o, i) => `<button type="button" class="opt${QZ.picked != null ? (o === t ? ' right' : i === QZ.picked ? ' wrong' : '') : ''}" data-q="${i}" ${QZ.picked != null ? 'disabled' : ''}>${esc(o.ab)} <span class="t-alias">· ${esc(o.full)}</span></button>`).join('')}</div>
    ${QZ.picked != null ? `<div class="fb ${right ? 'good' : 'bad'}"><b>${right ? 'Correct' : 'Not quite'}</b>${right ? esc(t.cap) : `That was <b>${esc(t.ab)}</b>: ${esc(t.cap)}`}</div>` : ''}
    <div class="actions"><button type="button" class="btn primary" id="q-next" ${QZ.picked == null ? 'hidden' : ''}>Next term →</button><button type="button" class="btn ghost" id="q-close">Close quiz</button></div></div></div></div>`;
}
function openQuiz() { $('#t-quiz').hidden = false; QZ.right = 0; QZ.seen = 0; QZ.t = null; newQuiz(); $('#t-quiz').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

$('#views').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
$('#t-q').addEventListener('input', (e) => { TV_ST.q = e.target.value; renderTerms(); });
$('#t-cats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; const c = +b.dataset.cat; TV_ST.cat = TV_ST.cat === c ? -1 : c; renderTerms(); });
$('#t-quiz-btn').addEventListener('click', openQuiz);
$('#t-quiz').addEventListener('click', (e) => {
  const o = e.target.closest('[data-q]');
  if (o && QZ.picked == null) { QZ.picked = +o.dataset.q; QZ.seen++; if (QZ.opts[QZ.picked] === QZ.t) QZ.right++; renderQuiz(); if (QZ.opts[QZ.picked] !== QZ.t) $('#t-quiz').classList.add('shake'), setTimeout(() => $('#t-quiz').classList.remove('shake'), 400); return; }
  if (e.target.closest('#q-next')) newQuiz();
  if (e.target.closest('#q-close')) $('#t-quiz').hidden = true;
});
$('#t-list').addEventListener('click', (e) => {
  const card = e.target.closest('.term'); if (!card) return;
  if (e.target.closest('[data-play]')) playTerm(card);
  const g = e.target.closest('[data-goto]'); if (g) gotoTerm(g.dataset.goto);
  const l = e.target.closest('[data-lesson]'); if (l) { setView('lessons'); jumpChapter(l.dataset.lesson); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});
$('#t-cats').innerHTML = TCATS.map((c, i) => `<button type="button" class="t-cat" data-cat="${i}" aria-pressed="false">${esc(c)} <span class="num">${TERMS.filter((t) => t.cat === i).length}</span></button>`).join('');
if (location.hash === '#terms') setView('terms');
