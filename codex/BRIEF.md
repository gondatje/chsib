# Codex Brief — CHS Itinerary Builder

## Repo layout
- `index.html`, `style.css`, `script.js`
- Data (YAML loaded at runtime, read-only for now):
  - `data/spa.menu.yml` — spa services (durations, therapist prefs, cabana)
  - `data/activities.catalog.yml` — canonical activity titles & metadata
  - `data/activities.seasons.yml` — seasonal schedules / days offered / times
  - `data/copy.snippets.yml` — UI labels, hints, email intro tokens

## What exists today
- Calendar with arrival/departure range, soft warnings
- Guests: add/remove chips; toggle active to assign items
- Dinner & Spa pickers with smooth, looping wheels
- Day list shows items ordered by time; edit/delete for dinner/spa
- Preview pane composes a clean, copyable itinerary

## Core rules (DO NOT change)
- The **Activities list** (center column section) will show a static, scrollable **catalog** of activities from data files.
- Each activity row displays **only**:
  - **Time (or duration)** + **Title**
- Those catalog rows are **not editable** and **not deletable** in the list itself.
- User can **check** an activity to add it to the current day for **currently toggled guests**; unchecking removes for those toggled guests only.
- Tags in the scheduled list:
  - If all guests participate → show “Everyone”
  - Else show **initial bubbles** only (e.g., B, M), not full names
- **Lunch window hint** (11–2) is per-guest: only show when the currently **toggled guests** collectively have < 60 min free in that window for the selected day.
- Navigation: left/right arrows swap days; activities list remains static; day list shows scheduled items only.
- Keep Apple-clean visual vibe; use existing tokens/components.

## Data binding expectations
- Activities catalog: derive display **title** and **default duration** from `data/activities.catalog.yml`.
- Seasonal availability & time slots: honor `data/activities.seasons.yml` (day-of-week and seasonal windows).
- Spa services: respect durations, therapist preference (NP/FT/MT), and cabana (same/separate) from `data/spa.menu.yml`.
- Copy & UI tokens: get labels from `data/copy.snippets.yml`.

## Acceptance checkpoints (Wave 1: Activities Column)
1. New **Activities column** in the center panel (above day list), showing **time/duration + title** only.
2. Each row has a **checkbox**:
   - Checked = scheduled for the **currently toggled guests** on the selected day at the correct time(s).
   - Uncheck removes for the **currently toggled guests** only.
3. When a row is checked, the item appears in the **day list** using current styling:
   - Includes soft overlap checks and cross-location hints already in place.
4. **Initials, not names** in tags inside the day list (e.g., “B”, “M”), unless “Everyone”.
5. Lunch-window hint respects **currently toggled guests** (per-guest view).
6. No editing/deleting from the **Activities column**; edit/delete stays on **scheduled items** in the day list.

## Constraints
- No framework migration. Vanilla JS/HTML/CSS only.
- Maintain current picker polish & smooth scrolling behavior.
- Do not break existing preview generation.

## What to implement next (separate prompt will follow)
- “Activities Column — per-guest add/remove + per-season availability”