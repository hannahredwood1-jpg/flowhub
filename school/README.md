# Trading School

The school at `/school` is one self-contained page assembled from `school/src/` by `school/build.mjs` (called from `deploy/build.mjs`).

- `src/util.js`, `gen.js`, `chart.js`, `items.js`, `app.js` — helpers, procedural chart generators (every scenario has ground truth), the TradingView-style canvas chart, the task types (mcq, tap, rect, level, num, sort, order, time), and the app (hash routing, progress, exams).
- `src/content/*.js` — the 18 modules (`MODS.push({...})`). Each module is learn → apply on a chart → explain in your own words → exam. `src/lib/school.ts` mirrors the module list for coaches; a test keeps the two in step.
- Exams are generated fresh each attempt. Pass mark is 80%; failing restarts the module with new questions. There are no timers and no suggested pacing.
- Progress is saved in `localStorage` and in `/api/school` under `state.v2`; exam attempts post to `/api/school/attempt` (`kind: 'ex'`, `ref: 'mNN'`).
- `src/content/09–12`: modules 19–30 (the Classic school lessons in this format). Display order comes from `o` in each module, ids stay stable.
- `classic.html` (+ `skin.css`) is the earlier walkthrough, still served at `/school/classic`.
