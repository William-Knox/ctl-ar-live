# Hyphen review — layout options A / B / C

Thursday 2026-08-20. MOCK. Not live. Dominus picks after clicking all three.

data.js is a copy of `/workspace/hyphen-board/pages-host/data.js` (sha256 `7ca0b264…`). The live file was not overwritten.

## URLs (local)

- http://127.0.0.1:8766/a/  table left ~420px · case: analysis then ledger | letter
- http://127.0.0.1:8766/b/  same table · case stacked one column
- http://127.0.0.1:8766/c/  cards left ~280px · case split like A

Starter invoice on Chase (leftover chip off): **0506-171310** — Quantity shortfall, signed ledger, builder letter, attachments.

A copy of this tree also lives at `/workspace/hyphen-board/pages-host/review-options/` so the pages-host server can open `/review-options/a/` without touching live `index.html`, `leftover-case.html`, `apply/`, `writeoff/`, `awaiting/`, root `data.js`, or `contacts.js`.

## Locks (all three)

- One full-page review. Left list = current filtered queue. Same chrome every invoice.
- Hide empty Timeline / letter. PTA: no Draft. Write-off: Esme note only, no builder letter. Awaiting: no Send now.
- Leftover 18 is a filter chip only, off by default.
- Chase default excludes `mail === awaiting`.
- Box tabs switch the queue. Signed ledger labels only. Clay on past-due days + Today only.
- Official mark, cream / navy / Inter, MOCK pill. Footer rules from the original brief.
- Click row / Next walks the filtered list.

## Files

`data.js` `ctl-mark-on-white.png` `styles.css` `app.js` `a/index.html` `b/index.html` `c/index.html` `README.md` `VERIFY.txt`

Each page sets `window.LAYOUT = "A"|"B"|"C"` and loads the shared CSS/JS.

Do not git push. Do not publish ctl-ar-live/hyphen/.
