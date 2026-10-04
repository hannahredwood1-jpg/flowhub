// Trading School progress summary for coaches. Mirrors the level/module/lesson map in school/trading-school.html.
export const SCHOOL_LEVELS = [
  { id: "beginner", name: "Beginner", modules: [
    { id: "b1", lessons: ["d:futures"] }, { id: "b2", lessons: ["d:charts"] },
    { id: "b3", lessons: ["d:setup", "c:chart", "c:connect+order", "d:orders"] },
    { id: "b4", lessons: ["d:risk", "c:manage", "c:limits"] }, { id: "b5", lessons: ["c:end"], noCheck: true },
  ], exam: true },
  { id: "intermediate", name: "Intermediate", modules: [
    { id: "i1", lessons: ["d:prop"] }, { id: "i2", lessons: ["d:math"] }, { id: "i3", lessons: ["d:manage", "d:mistakes"] },
    { id: "i4", lessons: ["d:psych"] }, { id: "i5", lessons: ["d:day", "d:planlesson"] },
  ], exam: true },
  { id: "advanced", name: "Advanced", modules: [
    { id: "a1", lessons: ["d:rs", "c:dl"] }, { id: "a2", lessons: ["c:hl", "c:po3", "c:asia"] },
  ], exam: true },
  { id: "exo", name: "ECHO x ORBIT", modules: [
    { id: "x1", lessons: ["d:exo-intro", "d:echo", "d:orbit", "d:exo-rules", "d:exo-replay"] },
  ], exam: false },
] as const;
export const SCHOOL_LEVEL_IDS = SCHOOL_LEVELS.map((l) => l.id) as string[];
// Section counts per dive, so "done" means every part is finished.
export const DIVE_PARTS: Record<string, number> = {
  futures: 5, charts: 5, orders: 3, risk: 3, rs: 3, planlesson: 2, setup: 5, prop: 4, math: 4, manage: 3, mistakes: 4, psych: 1, day: 4,
  "exo-intro": 3, echo: 4, orbit: 4, "exo-rules": 4, "exo-replay": 2,
};
type Best = { best?: number; pass?: boolean; n?: number; at?: number };
export type SchoolState = { ch?: string[]; dives?: Record<string, Record<string, number>>; ck?: Record<string, Best>; ex?: Record<string, Best> };
export type SchoolAttemptRow = { kind: string; ref: string; score: number; total: number; pass: boolean; createdAt: Date | string };
export type SchoolSummary = {
  levels: { id: string; name: string; lessons: number; lessonsDone: number; checkpoints: number; checkpointsPassed: number; exam: { best: number; pass: boolean; tries: number } | null; manualUnlock: boolean }[];
  attempts: { kind: "ck" | "ex"; ref: string; label: string; pct: number; pass: boolean; at: string }[];
  current: string;
};
const MODULE_LABEL: Record<string, string> = {
  b1: "How futures & NQ work", b2: "Reading charts", b3: "Platform & orders", b4: "Risk basics", i1: "Prop Firm 101", i2: "Why the math works",
  i3: "Trade management", i4: "Trading psychology", i5: "Day in the life & plan", a1: "Extended Learning", a2: "Indicator models", x1: "ECHO x ORBIT",
};
export function summarizeSchool(state: SchoolState | null, unlocks: string[], attempts: SchoolAttemptRow[]): SchoolSummary {
  const s = state ?? {}, ch = new Set(s.ch ?? []), dives = s.dives ?? {};
  const done = (key: string) => {
    const [k, id] = key.split(":");
    if (k === "c") return id.split("+").every((c) => ch.has(c));
    return Object.keys(dives[id] ?? {}).length >= (DIVE_PARTS[id] ?? 1);
  };
  const levels = SCHOOL_LEVELS.map((l) => {
    const mods = l.modules as readonly { id: string; lessons: readonly string[]; noCheck?: boolean }[];
    const lessons = mods.flatMap((m) => m.lessons);
    const cks = mods.filter((m) => !m.noCheck);
    const ex = s.ex?.[l.id];
    return {
      id: l.id, name: l.name, lessons: lessons.length, lessonsDone: lessons.filter(done).length,
      checkpoints: cks.length, checkpointsPassed: cks.filter((m) => s.ck?.[m.id]?.pass).length,
      exam: l.exam ? { best: ex?.best ?? 0, pass: !!ex?.pass, tries: ex?.n ?? 0 } : null,
      manualUnlock: unlocks.includes(l.id),
    };
  });
  const current = (levels.find((l) => l.lessonsDone < l.lessons || l.checkpointsPassed < l.checkpoints || (l.exam && !l.exam.pass)) ?? levels[levels.length - 1]).name;
  return {
    levels, current,
    attempts: attempts.slice(0, 12).map((a) => ({
      kind: a.kind === "ex" ? "ex" : "ck", ref: a.ref,
      label: a.kind === "ex" ? `${SCHOOL_LEVELS.find((l) => l.id === a.ref)?.name ?? a.ref} exam` : `Checkpoint · ${MODULE_LABEL[a.ref] ?? a.ref}`,
      pct: a.total ? a.score / a.total : 0, pass: a.pass, at: new Date(a.createdAt).toISOString(),
    })),
  };
}
