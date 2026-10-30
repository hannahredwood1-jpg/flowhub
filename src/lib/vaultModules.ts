// The ECHO X ORBIT vault's module list, kept apart from vault.ts (which needs node:crypto) so the browser bundle can use it too.
// Mirrors school/src/vault/*.js (a test keeps the two in step).
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
