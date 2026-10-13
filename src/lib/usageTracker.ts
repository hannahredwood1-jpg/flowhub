// Usage tracker for the FLOWHUB dashboard pages (the school and practice pages have their own copy in school/src/track.js).
// Counts seconds only while the tab is visible and the member has done something in the last 90 seconds, and reports them to /api/usage.
export function startUsageTracker(getSection: () => string): () => void {
  const sid = (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36) + "0000000000").slice(0, 40);
  let act = Date.now(), at = Date.now();
  const buf: Record<string, number> = {};
  const bump = () => { act = Date.now(); };
  const evs = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"];
  evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
  const send = (section: string, secs: number, beacon: boolean) => {
    const body = JSON.stringify({ sid, area: "dashboard", section, secs: Math.round(secs) });
    try {
      if (beacon && navigator.sendBeacon) return navigator.sendBeacon("/api/usage", new Blob([body], { type: "application/json" }));
      fetch("/api/usage", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, credentials: "same-origin" }).catch(() => {});
    } catch { /* ignore */ }
  };
  const flush = (beacon: boolean) => { for (const k of Object.keys(buf)) if (buf[k] >= 1) { send(k, Math.min(120, buf[k]), beacon); buf[k] = 0; } };
  const tick = setInterval(() => {
    const now = Date.now(), dt = Math.min(10, (now - at) / 1000); at = now;
    if (document.visibilityState === "visible" && now - act < 90000) { const s = getSection(); buf[s] = (buf[s] || 0) + dt; }
  }, 5000);
  const fl = setInterval(() => flush(false), 30000);
  const vis = () => { if (document.visibilityState === "hidden") flush(true); };
  const hide = () => flush(true);
  document.addEventListener("visibilitychange", vis);
  window.addEventListener("pagehide", hide);
  send(getSection(), 0, false); // registers the visit
  return () => { clearInterval(tick); clearInterval(fl); evs.forEach((e) => window.removeEventListener(e, bump)); document.removeEventListener("visibilitychange", vis); window.removeEventListener("pagehide", hide); flush(true); };
}
