# roadmap.md

## Goal
Ship **V1** that **perfectly generates emails** for multi-guest stays with dinner & spa, enforcing overlaps and formatting rules. Then iterate to add Activities, Magic, and Note.

---

## Milestones

### M0 — Repo & Guardrails (Today)
- ✓ Add **definition.md**, **psd.md**, **roadmap.md** (this file).
- ✓ Adopt **branch** workflow (`main` protected; PRs only).
- ✓ Add **/tests/manual-checklist.md** (later) for quick QA runs.

**Exit:** Docs merged; baseline code compiles; no console errors.

---

### M1 — Calendar & Guests (Core Shell)
- Implement calendar header (stacked month/year), range selection, day focus.
- Guests chips with add/remove/toggle & unique colors. No star icon.
- I/O editor (check-in/out editable + expected times with generic picker).

**Exit QA:**
- Arrival/departure set; day headers render correctly with ordinals.
- Expected window fields accept time; warnings show when out of window.

---

### M2 — Dinner (Picker + Overlap)
- Looping dinner picker (PM only, 5/6/7/8 × 00/15/30; **no 6:45**).
- 60-min duration implicit; location **Harvest**; participants = active chips.
- Overlap block per guest.

**Exit QA:**
- Illegal times blocked; overlap blocked; preview shows `start - end | Dinner at Harvest`.

---

### M3 — Spa (5-min + Pref/Cabana + Merge)
- Looping 12h wheel with **5-min** increments; **8:00am–7:00pm** start.
- Duration select (60/90/120); therapist pref NP/FT/MT; cabanas same/separate.
- Overlap block per guest.
- **Merge rule**: identical `start, service, duration, pref, cabana` → pluralized single line, omit names if all participants.

**Exit QA:**
- All spa examples from spec render exactly.
- Subset cases append names; merge/unmerge behaves as rules state.

---

### M4 — Warnings & Hints Polish
- Cross-location `<15m` pill between adjacent items of different locations.
- Lunch hint: if free < 60m in 11–2 window.
- Preview/email formatting final review; copy button behavior verified.

**Exit QA:**
- All hint pills show only when appropriate and disappear when resolved.

---

### M5 — Stabilization & V1 Tag
- Bug fixes, code comments, small refactors.
- Manual test pass on Chrome/Safari/Edge.
- Tag `v1.0.0`.

**Exit:** You can build full multi-guest itineraries and copy perfect emails.

---

## Post-V1 Roadmap

### P1 — Activities (Catalog + Seasonal Validity)
- Add **Activity** picker (5-min increments; locations from catalog).
- Enforce seasonal/day-of-week validity (from your PDFs).
- Same overlap/cross-location logic.

### P2 — Note (PA Note Generator)
- Mode that prompts **per-activity abbreviations** at export.
- Strict template rendering; missing fields dialog.

### P3 — Magic (Auto-Schedule)
- Constraint engine honoring:
  - Expected arr/dep, lunch ≥60m (11–2), cross-location ≥15m,
  - Existing locked items, dinner window, spa window,
  - Per-guest selections & counts (e.g., 2× archery).
- Clear conflict reports + one-click fixes.

### P4 — Data & Integrations
- External source importers (Opera Cloud exports, Spa systems).
- Read-only first; later write-back with guardrails.

---

## Project Hygiene

- **Branches**: `feature/*`, `fix/*`, `chore/*`.
- **PR template** (add later): summary, screenshots/gif, test notes.
- **Labels**: `spec`, `ui`, `logic`, `bug`, `good-first-issue`, `blocked`.
- **Issues**: one crisp deliverable each; reference exact clauses from **psd.md** / **definition.md**.

---

## Acceptance checklist (for each milestone)
- ✅ Matches **definition.md** rules verbatim.
- ✅ UI visually clean at ≥1080px and <1080px.
- ✅ No console errors.
- ✅ Manual test cases pass (see psd test matrix).
- ✅ Copy to clipboard matches Preview exactly.