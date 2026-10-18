// The ECHO X ORBIT vault: its module list (mirrors school/src/vault/*.js, a test keeps the two in step), access codes and the coach summary.
import { createHash } from "node:crypto";

export const VAULT_MODULES = [
  { id: "x01", title: "The Idea: Sweep, Reaction, Reclaim" },
  { id: "x02", title: "Levels and the Sweep" },
  { id: "x03", title: "Confirmation: CISD and the Inverted Gap" },
  { id: "x04", title: "The Three Checks" },
  { id: "x05", title: "Alignment: Gaps and Rejection Blocks" },
  { id: "x06", title: "Entry, Stop, Target and Break-even" },
  { id: "x07", title: "The Scenario Playbook" },
  { id: "x08", title: "Discretion, Risk and the Log" },
  { id: "x09", title: "Make the Call: ECHO X ORBIT" },
  { id: "o01", title: "What Orderflow Is and Why It Confirms a Sweep" },
  { id: "o02", title: "Reading the Tape Around a Sweep" },
  { id: "o03", title: "Delta, Volume and Imbalance" },
  { id: "o04", title: "Orderflow and the ECHO X ORBIT Checklist" },
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
