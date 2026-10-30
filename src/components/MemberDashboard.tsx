"use client";
import { useCallback, useState } from "react";
import { api } from "@/lib/api-client";
import type { AccountDTO, CatalogFirm, DashboardData, JournalDTO } from "@/lib/types";
import { pct, usd } from "@/lib/format";
import { PlanPanel } from "./PlanPanel";
import { JournalTable } from "./JournalTable";
import { AccountModal } from "./AccountModal";
import { RoadmapModal } from "./RoadmapModal";
import { TradeModal } from "./TradeModal";
import { FeedbackItem } from "./Feedback";
import { Panel, Stat } from "./ui";
import { IconChat } from "./icons";
import { TradingPlanCard } from "./Projections";
import { PlanCard } from "./TradingPlan";
import { RoutineRow, TiltGuard } from "./Routine";
import { PracticeCard } from "./PracticeCard";

type ModalState =
  | { kind: "none" }
  | { kind: "account"; editing: AccountDTO | null }
  | { kind: "roadmap" }
  | { kind: "trade"; editing: JournalDTO | null };

export function MemberDashboard({ initial, catalog, planHref = "/plan" }: { initial: DashboardData; catalog: CatalogFirm[]; planHref?: string }) {
  const [data, setData] = useState(initial);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const refresh = useCallback(async () => setData(await api.dashboard()), []);
  const close = useCallback(() => setModal({ kind: "none" }), []);

  const unread = data.feedback.filter((f) => !f.readAt && !f.journalEntryId);
  const markRead = async (id: string) => { await api.markFeedbackRead(id); await refresh(); };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <StatsStrip data={data} />
      <TiltGuard data={data} />
      <PlanCard data={data} href={planHref} />
      <TradingPlanCard data={data} catalog={catalog} planHref={planHref === "#plan" ? "#plan-projections" : planHref} />

      {unread.length > 0 && (
        <Panel title={<span className="flex items-center gap-2"><span className="live-dot" /> New from your coach</span>}>
          <div className="grid gap-2 p-4">{unread.map((f) => <FeedbackItem key={f.id} f={f} onRead={markRead} />)}</div>
        </Panel>
      )}

      <RoutineRow data={data} />
      <PracticeCard data={data} />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(380px,5fr)_minmax(0,7fr)]">
        <PlanPanel
          data={data}
          onAddAccount={() => setModal({ kind: "account", editing: null })}
          onEditAccount={(a) => setModal({ kind: "account", editing: a })}
          onEditRoadmap={() => setModal({ kind: "roadmap" })}
        />
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          <JournalTable data={data} onNew={() => setModal({ kind: "trade", editing: null })} onEdit={(j) => setModal({ kind: "trade", editing: j })} onChanged={refresh} />
          <CoachNotes data={data} />
        </div>
      </div>

      {modal.kind === "account" && <AccountModal open onClose={close} catalog={catalog} editing={modal.editing} today={data.today} onSaved={refresh} />}
      {modal.kind === "roadmap" && <RoadmapModal open onClose={close} roadmap={data.roadmap} onSaved={refresh} />}
      {modal.kind === "trade" && <TradeModal open onClose={close} accounts={data.accounts} editing={modal.editing} today={data.today} onSaved={refresh} />}
    </div>
  );
}

export function StatsStrip({ data }: { data: DashboardData }) {
  const s = data.stats;
  const tone = (n: number) => (n > 0 ? "win" : n < 0 ? "loss" : undefined);
  return (
    <section className="hud animate-rise grid grid-cols-2 items-center gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label="Trades · 30d" value={String(s.trades30)} sub={s.trades30 === 1 ? "1 trade logged" : `${s.trades30} trades logged`} />
      <Stat label="Today" value={usd(s.todayPnl, { sign: true })} tone={tone(s.todayPnl)} />
      <Stat label="This week" value={usd(s.weekPnl, { sign: true })} tone={tone(s.weekPnl)} />
      <Stat label="This month" value={usd(s.monthPnl, { sign: true })} tone={tone(s.monthPnl)} sub={data.income ? `goal ${usd(data.income.grossMonthlyNeeded)} gross` : undefined} />
      <Stat label="Win rate · 30d" value={pct(s.winRate30)} />
      <Stat label="Plan followed · 30d" value={pct(s.planFollowed30)} tone={s.planFollowed30 != null && s.planFollowed30 >= 0.8 ? "ice" : undefined} />
    </section>
  );
}

function CoachNotes({ data }: { data: DashboardData }) {
  const notes = data.feedback.filter((f) => !f.journalEntryId && f.readAt);
  if (!notes.length) return null;
  return (
    <Panel delay={120} title={<span className="flex items-center gap-2"><IconChat size={13} /> Coaching notes</span>}>
      <div className="grid max-h-80 gap-2 overflow-auto p-4">{notes.map((f) => <FeedbackItem key={f.id} f={f} />)}</div>
    </Panel>
  );
}
