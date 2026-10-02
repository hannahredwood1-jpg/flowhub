# Trading School

`trading-school.html` is the whole interactive walkthrough (TradingView basics + NYFlow H/L, NYFlow PO3 and AsiaFlow PO3 replays) as one self-contained page body.

- `deploy/build.mjs` wraps it into a full HTML document and stores it in the `AppAsset` table as `school.html`; the server serves it at `/school` to signed-in members and fills in the `<!--FH_NAV-->` placeholder with the FLOWHUB tabs.
- `public/school.html` is the same full document for the Next.js app.
- The model replays are scripted practice sessions in the `MODELS` section (`HL`, `PO3`, `ASIA`). To add a model, add a session there and a `replaySteps(...)` branch plus a chapter in `CH`.
