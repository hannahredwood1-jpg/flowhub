// Trading School learning path: every student says where they are, and anything they say they can already do has to be proved with a
// one-attempt "proof exam". The school page keeps a small copy of these rules (school/src/path.js); a test keeps the two in step.
import { SCHOOL_PROVABLE_IDS } from "./school";

export type PathMode = "prove" | "learn";
export const PROOF_PASS = 0.8; // the same 80% as a normal module exam
export const PROOF_FAST_SECS_PER_Q = 6; // coaches get a flag when a proof exam is passed faster than this per question

const PROVABLE = new Set(SCHOOL_PROVABLE_IDS);
export const isProvable = (id: string) => PROVABLE.has(id);

/**
 * Cleans the modes a student sent. Only provable modules can be "prove". A module that is already passed, or whose one proof attempt is already used, is always "learn".
 * Returns every provable module with a mode so the stored path is complete.
 */
export function cleanModes(raw: unknown, passed: ReadonlySet<string>, used: ReadonlySet<string>): Record<string, PathMode> {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, PathMode> = {};
  for (const id of SCHOOL_PROVABLE_IDS) out[id] = o[id] === "prove" && !passed.has(id) && !used.has(id) ? "prove" : "learn";
  return out;
}

/** Where a student says they are: kept for coaches, never used to decide anything on its own. */
export function cleanAnswers(raw: unknown): { start: string; prop: string } {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pick = (v: unknown, ok: string[]) => (typeof v === "string" && ok.includes(v) ? v : "");
  return { start: pick(o.start, ["new", "traded", "experienced"]), prop: pick(o.prop, ["no", "yes"]) };
}

export const proofNeeded = (total: number) => Math.ceil(total * PROOF_PASS - 1e-9);
export const proofFast = (secs: number, total: number) => secs > 0 && secs < total * PROOF_FAST_SECS_PER_Q;
