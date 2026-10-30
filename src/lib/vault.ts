// The ECHO X ORBIT vault: its module list (mirrors school/src/vault/*.js, a test keeps the two in step), access codes and the coach summary.
import { createHash } from "node:crypto";

export const VAULT_MODULES = [
  { id: "x01", title: "The Idea in Plain Words and the Language" },
  { id: "x02", title: "Instruments, Sessions and News" },
  { id: "x03", title: "Step 1: Build the Narrative" },
  { id: "x04", title: "Rejection Blocks and CISD" },
  { id: "x05", title: "Gaps by Timeframe, Order Blocks, SMT and Key Opens" },
  { id: "x06", title: "Model 1: The External Rejection Block" },
  { id: "x07", title: "Model 2: The CISD Rejection Block" },
  { id: "x08", title: "Model 3: The 1-Minute Continuation" },
  { id: "x09", title: "Grading: Is It Worth the Risk?" },
  { id: "x10", title: "Stops, Targets, Partials and Break-even" },
  { id: "x11", title: "Why Trades Lose, and Adapting to Conditions" },
  { id: "x12", title: "Daily Rules and the Pre-Trade Checklist" },
  { id: "x13", title: "The Echo x Orbit Indicator" },
  { id: "x14", title: "Make the Call: ECHO X ORBIT" },
  { id: "o01", title: "What Orderflow Is and Why It Backs a Rejection" },
  { id: "o02", title: "Reading the Tape Around a Rejection" },
  { id: "o03", title: "Delta, Volume and Imbalance" },
  { id: "o04", title: "Orderflow and the ECHO X ORBIT Checklist" },
  { id: "o05", title: "Gamma Levels as Orderflow Context" },
] as const;
export const VAULT_MODULE_IDS = VAULT_MODULES.map((m) => m.id) as string[];

/** Codes look like FH-7K3QM-X9T2P: Crockford letters and digits (no I, L, O, U), easy to read out loud. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function makeCode(bytes: Uint8Array): string {
  const s = Array.from(bytes.slice(0, 10), (b) => ALPHABET[b % 32]).join("");
  return `FH-${s.slice(0, 5)}-${s.slice(5, 10)}`;
}
export function normalizeCode(input: string): string {
  const s = String(input ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = s.startsWith("FH") ? s.slice(2) : s;
  // the usual look-alikes
  return body.replace(/O/g, "0").replace(/[IL]/g, "1");
}
export const hashCode = (code: string, pepper: string) => createHash("sha256").update(pepper + ":" + normalizeCode(code)).digest("hex");

export type VaultAccessLevel = "open" | "code" | "none";
/** Passed vault modules from a saved progress state (the school page's format). */
export function vaultPassed(state: unknown): number {
  const m = ((state as { v2?: { m?: Record<string, { p?: number }> } } | null)?.v2?.m) ?? {};
  return VAULT_MODULE_IDS.filter((id) => m[id]?.p === 1).length;
}
