// The vault's module list (the ECHO x ORBIT course), kept apart from vault.ts (which needs node:crypto) so the browser bundle can use it too.
// Mirrors school/src/vault/*.js (a test keeps the two in step).
export const VAULT_MODULES = [
  { id: "e01", title: "Two Strategies, One Flow of Messages" },
  { id: "e02", title: "Echo: Is the Rejection Real?" },
  { id: "e03", title: "When Price Returns to Your Limit" },
  { id: "e04", title: "Orbit: The Tap, the Inversion and the Limit" },
  { id: "e05", title: "Using Them Together, and the Rules That Never Change" },
] as const;
export const VAULT_MODULE_IDS = VAULT_MODULES.map((m) => m.id) as string[];
