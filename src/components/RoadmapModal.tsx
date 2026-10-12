"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { Instruments, type RoadmapDTO } from "@/lib/types";
import { INDICATORS, SELECTABLE_STRATEGY_KEYS, normalizeSelection, type StrategyKey, type StrategyMode } from "@/lib/strategies";
import { ErrorLine, Field, Modal, cx } from "./ui";

export function RoadmapModal({ open, onClose, roadmap, onSaved }: { open: boolean; onClose: () => void; roadmap: RoadmapDTO | null; onSaved: () => Promise<void> }) {
  const [f, setF] = useState({
    monthlyIncomeGoal: roadmap?.monthlyIncomeGoal ?? 5000,
    tradingDaysPerWeek: roadmap?.tradingDaysPerWeek ?? 5,
    avgRR: roadmap?.avgRR ?? 2.67, // FLOWMTD standard: 15-pt stop, 40-pt target
    tradesPerDay: roadmap?.tradesPerDay ?? 2,
    primaryInstrument: roadmap?.primaryInstrument ?? "MNQ",
    avgStopPoints: roadmap?.avgStopPoints ?? 15,
  });
  const [mode, setMode] = useState<StrategyMode>(roadmap?.strategyMode ?? "INDICATORS");
  const multiSession = true; // sessions come from the models you pick
  const [picks, setPicks] = useState<StrategyKey[]>(() => { const own = (roadmap?.strategies ?? []).filter((k) => SELECTABLE_STRATEGY_KEYS.includes(k) && k !== "DAILY_LEVELS"); return own.length ? own : ["INVERTIX"]; }); // INVERTIX is preselected
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [key]: e.target.value });

  const sel = normalizeSelection({ mode, multiSession, strategies: picks });

  const toggle = (k: StrategyKey) => {
    if (mode === "DAILY_LEVELS") { setMode("INDICATORS"); return setPicks([k]); }
    setPicks(picks.includes(k) ? (picks.length > 1 ? picks.filter((x) => x !== k) : picks) : [...picks, k]);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "INDICATORS" && sel.strategies.length === 0) return setError("Pick at least one strategy.");
    setBusy(true); setError(null);
    try {
      await api.saveRoadmap({ ...f, strategyMode: mode, multiSession, strategies: sel.strategies });
      await onSaved();
      onClose();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Goals & strategy" wide>
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monthly income goal ($)" htmlFor="rm-goal" hint="What you want to take home after the firm's split."><input id="rm-goal" type="number" min={0} step={50} className="field num" value={f.monthlyIncomeGoal} onChange={set("monthlyIncomeGoal")} required /></Field>
          <Field label="Days you trade per week" htmlFor="rm-days"><input id="rm-days" type="number" min={1} max={7} className="field num" value={f.tradingDaysPerWeek} onChange={set("tradingDaysPerWeek")} /></Field>
        </div>

        {/* Strategy picker: three separate models. ECHO X ORBIT stands alone; INVERTIX and ESC VLCTY are separate indicators that can be combined. */}
        <fieldset className="grid gap-3">
          <legend className="label mb-3 !text-ice">What are you trading?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            <ModeCard on={mode === "DAILY_LEVELS"} onClick={() => { setMode("DAILY_LEVELS"); }} title="ECHO X ORBIT" sub="The Discord calls" />
            {INDICATORS.map((ind) => {
              const k = ind.strategies[0];
              return <ModeCard key={ind.name} on={mode === "INDICATORS" && picks.includes(k)} onClick={() => toggle(k)} title={ind.name} sub={ind.sessions} />;
            })}
          </div>
          {mode === "INDICATORS" && <p className="text-xs text-ink-3">INVERTIX and ESC VLCTY are separate indicators: pick one, or both to count both in your plan.</p>}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Avg R:R on winners · standard 2.67 (15 → 40)" htmlFor="rm-rr"><input id="rm-rr" type="number" min={0.1} step={0.01} className="field num" value={f.avgRR} onChange={set("avgRR")} /></Field>
          <Field label="Trades per day" htmlFor="rm-tpd" hint={mode === "INDICATORS" ? "Across all the models you picked." : undefined}><input id="rm-tpd" type="number" min={0.2} step={0.5} className="field num" value={f.tradesPerDay} onChange={set("tradesPerDay")} /></Field>
          <Field label="Main instrument" htmlFor="rm-inst">
            <select id="rm-inst" className="field" value={f.primaryInstrument} onChange={set("primaryInstrument")}>{Instruments.map((i) => <option key={i}>{i}</option>)}</select>
          </Field>
          <Field label="Typical stop (points)" htmlFor="rm-stop"><input id="rm-stop" type="number" min={0.25} step={0.25} className="field num" value={f.avgStopPoints} onChange={set("avgStopPoints")} /></Field>
        </div>

        <ErrorLine error={error} />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>Save goals</button>
        </div>
      </form>
    </Modal>
  );
}


function ModeCard({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}
      className={cx("relative border p-3 text-left transition-colors", on ? "border-ice-dim bg-ice/[0.06]" : "border-line hover:border-line-2")}>
      <span className="block text-ink">{title}</span>
      <span className="block text-xs text-ink-3">{sub}</span>
      {on && <span className="absolute right-3 top-3 h-1.5 w-1.5 bg-signal" />}
    </button>
  );
}

