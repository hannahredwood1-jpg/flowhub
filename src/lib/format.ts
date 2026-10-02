export const usd = (n: number | null | undefined, opts: { sign?: boolean; cents?: boolean } = {}) => {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 });
  const sign = n < 0 ? "−" : opts.sign && n > 0 ? "+" : "";
  return `${sign}$${s}`;
};
export const pct = (n: number | null | undefined, digits = 0) => (n == null ? "—" : `${(n * 100).toFixed(digits)}%`);
export const k = (n: number) => (n >= 1000 ? `${n / 1000}K` : `${n}`);
export const shortDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? "T12:00:00Z" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
export const relDays = (iso: string | null, today: string) => {
  if (!iso) return "never";
  const d = Math.round((Date.parse(today) - Date.parse(iso.slice(0, 10))) / 86400000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`;
};
export const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
