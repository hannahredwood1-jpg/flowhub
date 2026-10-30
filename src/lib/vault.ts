// The ECHO X ORBIT vault: its module list (mirrors school/src/vault/*.js, a test keeps the two in step), access codes and the coach summary.
import { createHash } from "node:crypto";

export { VAULT_MODULES, VAULT_MODULE_IDS } from "./vaultModules";
import { VAULT_MODULE_IDS } from "./vaultModules";

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
