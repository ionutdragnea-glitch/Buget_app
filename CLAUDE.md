# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-file personal budgeting PWA ("Buget"), entirely in **Romanian** (UI strings, comments, variable intent). All application code — HTML, CSS, and JavaScript — lives in [index.html](index.html). There is no build step, no framework, no dependencies, and no backend. State persists in `localStorage` under the key `buget.state.v2`.

Keep new UI text and code comments in Romanian to match the existing style.

## Running / testing

Open `index.html` in a browser, or serve the folder over HTTP so the PWA manifest/icons resolve and "Add to Home Screen" works:

```powershell
python -m http.server 8000   # then open http://localhost:8000
```

There is no test suite, linter, or package manager. Verify changes by interacting with the app and inspecting `localStorage` (`buget.state.v2`) in DevTools. The in-app red **Reset** button (dashboard only) zeroes balances and clears journals without touching category definitions; clearing `localStorage` restores `DEFAULT_CATS`.

## Architecture

Single-page app with four views (`#view-dashboard`, `#view-sume`, `#view-categorii`, `#view-food`) toggled by `show(view)`; bottom `nav` switches the active view and calls the matching `render*` function. Rendering is manual DOM construction — each `render*` clears its container's `innerHTML` and rebuilds rows. There is no reactive layer: **any state mutation must call `save()` then the relevant `render*()`** to stay consistent.

### State model — the key concept: "live balances"

`state.cash` and `state.card` are **live running balances**, not static starting amounts. Every payment or journal entry immediately subtracts from the chosen source via `adjustBalance(src, delta)`; deleting an entry or un-checking a paid category adds the money back. This is the source of most subtlety in the code.

- A one-time migration (guarded by `state.liveBalances`) converts older saved states by subtracting everything already spent from cash/card. Preserve this guard when touching load/migration logic.
- `effCash()` / `effCard()` just read the live balances. `adjustBalance` defaults unknown sources to `"card"`.
- Every expense has a `src` of `"cash"` or `"card"` recording where it was paid from, so it can be reversed correctly.

### The three money flows

1. **Categories** (`state.categories`) — recurring fixed expenses, each `{name, lei, data (day-of-month), done, src}`. Checking one on the dashboard opens the source sheet (`askSource`) to pick cash/card, then deducts. Defined/edited in the Categorii view (`DEFAULT_CATS` seeds first run).
2. **Food budget** — computed, not stored per-item. `foodInfo()` returns days remaining until `RESET_DAY` (19) × `FOOD_PER_DAY` (180 lei). `state.foodActualBase` anchors the editable "actual" figure; `bugetActual() = foodActualBase − journalSum()`. After day 19, food is "secured" (amount 0).
3. **Two journals** — `state.foodJournal` and `state.catJournal`, each `{id, date, amount, src}`. Both deduct live from the source on add and refund on delete. They are structurally identical but kept separate (food vs. miscellaneous spending).

### Dashboard math

`Sold buget = Disponibil − De plătit`, where `Disponibil = cash + card` (live) and `De plătit` = sum of unchecked categories plus food-actual (if food not marked done). `state.hideDone` toggles visibility of completed rows.

### Conventions

- `load()` normalizes/migrates older shapes on startup; when adding a new persisted field, give it a default in both `load()`'s fallback object and the migration block so old saved states don't break.
- Helpers: `$`/`$$` (query selectors), `fmt` (Romanian number formatting), `parseNum` (accepts comma decimals), `escapeHtml`/`escapeAttr` (always use these when injecting user text into `innerHTML`).
- Romanian month/date formatting via `MONTHS_SHORT` and `fmtJrnDate`; date keys are `YYYY-MM-DD` strings from `dayKey`.
- Styling is a dark glassmorphism theme driven by CSS custom properties in `:root` (colors, `--glass-*`, safe-area insets). Reuse these variables rather than hardcoding colors.
