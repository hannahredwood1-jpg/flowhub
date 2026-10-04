(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // FLOWHUB preview: switch between the three screens
  var tabs = document.querySelectorAll('[data-screen]');
  var appTab = { dash: 0, school: 2, practice: 3 };
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      var key = t.getAttribute('data-screen');
      tabs.forEach(function (o) { o.setAttribute('aria-selected', o === t ? 'true' : 'false'); });
      document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== key; });
      document.querySelectorAll('.nx-tab').forEach(function (n, i) { n.classList.toggle('on', i === appTab[key]); });
    });
  });

  // Segmented meters (same look as the real FLOWHUB)
  document.querySelectorAll('.segs').forEach(function (el) {
    var v = parseFloat(el.getAttribute('data-value')), color = el.getAttribute('data-color');
    var filled = Math.round(v * 24);
    for (var i = 0; i < 24; i++) {
      var s = document.createElement('i');
      if (i < filled) { s.style.background = color; s.style.opacity = (0.35 + 0.65 * (i + 1) / filled).toFixed(2); }
      el.appendChild(s);
    }
  });

  // Count numbers up and fill rings the first time they scroll into view.
  // Everything shows its final value at rest; the animation replays from zero.
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var start = null, dur = 1600;
    function step(ts) {
      if (!start) start = ts;
      var t = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * e);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function fillRing(r) {
    var final = r.getAttribute('data-offset'), full = r.getAttribute('stroke-dasharray');
    r.style.transition = 'none';
    r.style.strokeDashoffset = full;
    r.getBoundingClientRect();
    r.style.transition = '';
    r.style.strokeDashoffset = final;
  }

  if (!('IntersectionObserver' in window) || reduce) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      io.unobserve(el);
      if (el.hasAttribute('data-count')) countUp(el);
      else if (el.classList.contains('ring')) fillRing(el);
      else el.classList.add('in');
    });
  }, { threshold: 0.25 });
  document.querySelectorAll('[data-count], .ring, .reveal').forEach(function (el) { io.observe(el); });
})();

// Hero: live replay of price coming into a daily level and running to target
(function () {
  var svg = document.getElementById('lc'); if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var X0 = 12, X1 = 516, TOP = 18, BOT = 344, LO = 48, HI = 108, LEVEL = 60, TARGET = 100, BASE = 24500, N = 45;
  var y = function (p) { return TOP + (HI - p) / (HI - LO) * (BOT - TOP); };
  var step = (X1 - X0) / N;
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); (parent || svg).appendChild(e); return e; }
  function fmt(p) { return (BASE + p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // deterministic path: drift down into the level, sweep it, run to target
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var way = [[0, 92], [5, 85], [9, 89], [14, 76], [18, 71], [21, 67], [24, 61], [26, 65], [29, 73], [33, 81], [36, 78], [40, 90], [44, 99]];
  function at(i) { for (var k = 1; k < way.length; k++) if (i <= way[k][0]) { var a = way[k - 1], b = way[k]; return a[1] + (b[1] - a[1]) * (i - a[0]) / (b[0] - a[0]); } return 99; }
  var C = [], prev = 93;
  for (var i = 0; i < N; i++) {
    var c = at(i) + (rnd() - .5) * 4, o = prev;
    var hi = Math.max(o, c) + rnd() * 2.5, lo = Math.min(o, c) - rnd() * 2.5;
    if (i < 22) lo = Math.max(lo, LEVEL + 2.5);
    if (i === 24) { lo = LEVEL - 4; c = Math.max(c, LEVEL + 3); }
    if (i === N - 1) hi = TARGET + 1.5;
    C.push({ o: o, c: c, h: hi, l: lo }); prev = c;
  }

  // static layers
  var defs = el('defs', {});
  var f = el('filter', { id: 'glow', x: '-20%', y: '-200%', width: '140%', height: '500%' }, defs);
  el('feGaussianBlur', { stdDeviation: '4' }, f);
  for (var p = 50; p <= 105; p += 10) {
    el('line', { x1: 0, x2: X1 + 4, y1: y(p), y2: y(p), stroke: '#1c1c1c' });
    var t = el('text', { x: 596, y: y(p) + 4, 'text-anchor': 'end', fill: '#5f5f5f', 'font-size': 10, 'font-family': 'JetBrains Mono, monospace' }); t.textContent = fmt(p);
  }
  var zone = el('rect', { x: 0, y: 0, width: 0, height: 0, fill: 'rgba(255,107,0,.14)' });
  el('line', { x1: 0, x2: X1 + 4, y1: y(LEVEL), y2: y(LEVEL), stroke: '#ff6b00', 'stroke-width': 6, filter: 'url(#glow)', class: 'lvl-glow' });
  el('line', { x1: 0, x2: X1 + 4, y1: y(LEVEL), y2: y(LEVEL), stroke: '#ff6b00', 'stroke-width': 2 });
  el('line', { x1: 0, x2: X1 + 4, y1: y(TARGET), y2: y(TARGET), stroke: '#ffffff', 'stroke-width': 1.5, 'stroke-dasharray': '6 6' });
  el('rect', { x: 8, y: y(LEVEL) + 8, width: 150, height: 22, rx: 4, fill: '#ff6b00' });
  var lt = el('text', { x: 16, y: y(LEVEL) + 23, fill: '#070707', 'font-size': 11, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace' }); lt.textContent = 'DAILY LEVEL · CALLED';
  el('rect', { x: 8, y: y(TARGET) - 30, width: 68, height: 22, rx: 4, fill: '#ffffff' });
  var tt = el('text', { x: 16, y: y(TARGET) - 15, fill: '#070707', 'font-size': 11, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace' }); tt.textContent = 'TARGET';
  var g = el('g', {}), pinG = el('g', {});
  var tag = el('g', {}), tagR = el('rect', { x: 520, y: 0, width: 78, height: 20, rx: 3, fill: '#f5f5f5' }, tag), tagT = el('text', { x: 559, y: 0, 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: '#070707', 'font-family': 'JetBrains Mono, monospace' }, tag);
  var pl = el('line', { x1: 0, x2: 520, y1: 0, y2: 0, stroke: '#f5f5f5', 'stroke-opacity': .35, 'stroke-dasharray': '2 3' });
  svg.insertBefore(pl, tag);

  var pnl = document.getElementById('pnl'), pnlBox = document.getElementById('pnl-box'), toast = document.getElementById('toast');
  var i = 0, entry = -1, timer;

  function draw(k, animate) {
    var d = C[k], x = X0 + k * step + step / 2, up = d.c >= d.o;
    var col = entry >= 0 && up ? '#ff6b00' : (up ? '#f5f5f5' : '#3a3a3a');
    var cg = el('g', { class: animate ? 'cdl' : '' }, g);
    el('line', { x1: x, x2: x, y1: y(d.h), y2: y(d.l), stroke: up ? col : '#666' }, cg);
    el('rect', { x: x - 3.5, y: y(Math.max(d.o, d.c)), width: 7, height: Math.max(1.5, Math.abs(y(d.o) - y(d.c))), fill: col, stroke: up ? col : '#666' }, cg);
    if (entry < 0 && k > 20 && d.l <= LEVEL) {
      entry = k;
      var pg = el('g', { class: 'pin' }, pinG);
      el('circle', { cx: x, cy: y(LEVEL), r: 8, fill: 'none', stroke: '#ff6b00', 'stroke-width': 2 }, pg);
      el('circle', { cx: x, cy: y(LEVEL), r: 3, fill: '#ff6b00' }, pg);
      var et = el('text', { x: x, y: y(LEVEL) + 44, 'text-anchor': 'middle', fill: '#ff6b00', 'font-size': 10, 'font-weight': 700, 'font-family': 'JetBrains Mono, monospace' }, pg); et.textContent = 'ENTRY';
      pnlBox.classList.add('on');
    }
    var last = Math.min(d.c, TARGET), hit = d.h >= TARGET && entry >= 0;
    if (hit) last = TARGET;
    tagR.setAttribute('y', y(last) - 10); tagT.setAttribute('y', y(last) + 4); tagT.textContent = fmt(last);
    pl.setAttribute('y1', y(last)); pl.setAttribute('y2', y(last));
    if (entry >= 0) {
      var ex = X0 + entry * step, val = Math.max(0, last - LEVEL);
      zone.setAttribute('x', ex); zone.setAttribute('width', x - ex + step / 2);
      zone.setAttribute('y', y(Math.max(last, LEVEL))); zone.setAttribute('height', Math.abs(y(LEVEL) - y(Math.max(last, LEVEL))));
      pnl.textContent = '+' + val.toFixed(2);
    }
    return hit;
  }
  function reset() {
    g.textContent = ''; pinG.textContent = ''; entry = -1; i = 0;
    zone.setAttribute('width', 0); pnl.textContent = '+0.00'; pnlBox.classList.remove('on'); toast.hidden = true;
  }
  function tick() {
    var hit = draw(i, true); i++;
    if (hit || i >= N) { toast.hidden = false; timer = setTimeout(function () { reset(); timer = setTimeout(loop, 400); }, 3600); return; }
    timer = setTimeout(tick, 150);
  }
  function loop() { tick(); }
  if (reduce) { for (var k = 0; k < N; k++) draw(k, false); toast.hidden = false; return; }
  // first frame shows the chart already moving
  for (var k2 = 0; k2 < 12; k2++) draw(k2, false); i = 12;
  timer = setTimeout(tick, 400);
})();
