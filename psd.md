# psd.md

## 0) Name
**CHSIB V1 — Product Spec Doc (PSD)**

## 1) Modules (one-word)
- **Calendar** — arrival/departure selection + day focus
- **Guests** — chips, toggle, colors
- **I/O** — editable check-in/out times & notes; expected arr/dep pickers
- **Builder** — add Dinner, Spa (future: Activity)
- **Preview** — final email formatter (copyable)

## 2) Key screens
1) **Main Dashboard** (3-column at ≥1080px; stacked below)
   - Left: **Calendar**
   - Center: **Guests**, **I/O**, **Builder** (day list)
   - Right: **Preview**
2) **Modals**
   - Dinner time picker
   - Spa picker (service/duration/pref/cabana + time wheel)
   - Generic time picker (expected arr/dep)

## 3) Calendar Spec
- Header with **prev year / prev month** on left, **next month / next year** on right.
- Center title **stacks month over year** to avoid squish.
- Grid 6×7 with leading/trailing days muted.
- Date click = focuses that date (updates day list & preview).
- Buttons:
  - `Set Arrival` (marks arrival to selected date)
  - `Set Departure` (validates ≥ arrival)
  - `Today`
- Range styles: `arrival`, `inrange`, `departure`.
- Today shows subtle ring.

## 4) Guests Spec
- Add guest → prompt full name → chip created **active** with unique pastel color.
- Chip click toggles active (on/off).
- `×` removes guest (and removes participation from items); if primary deleted, first remaining becomes primary.
- **No star emoji** anywhere.
- Active guests at time of adding an item become that item’s participants.

## 5) I/O (Check-in / Check-out / Expected) Spec
- Inputs:
  - **Arrival** line: time (editable text), fixed label “Guaranteed Check-In”, note (editable text).
  - **Departure** line: time (editable text), fixed label “Check-Out”, note (editable text).
- Expected window:
  - **Expected Arrival** (generic time picker 12h, 5-min).
  - **Expected Departure** (generic time picker 12h, 5-min).
  - Soft warnings only; no blocking.

## 6) Builder — Dinner
- Open dinner modal:
  - Loop wheels: Hours `[5,6,7,8]`, Minutes `[00,15,30]`, Period fixed PM.
  - **6:45** impossible (no `45` minute option).
  - Validate 5:30–8:00pm inclusive; **duration 60** (implicit end = start+60).
  - Overlap check with selected participants (active chips).
- Persist:
  - `kind:'dinner'`
  - `location:'Harvest'`
  - `participantIds:[…]`
  - `startMins`, `endMins = start+60`

## 7) Builder — Spa
- Fields:
  - **Service** (string; exact email title; never abbreviated)
  - **Duration** (60/90/120; extensible)
  - **Therapist**: NP/FT/MT → **No Preference / Female Therapist / Male Therapist**
  - **Cabanas**: same / separate → **Same Cabanas / Separate Cabanas**
  - **Start Time**: 12h looping wheels with **5-min** increments; **8:00am–7:00pm** start inclusive
- Validate:
  - Start within window, duration adds end.
  - Overlap check (hard block) per participant.
- Persist:
  - `kind:'spa'`, `title:service`, `duration`, `pref`, `cabana`, `location:'Spa'`
  - `participantIds:[…]`
  - `startMins`, `endMins`

## 8) Day List (center panel)
- Every item shows:
  - **Bold time range** (or start if no end) + title.
  - Secondary row: location chip + guest chips (colored) + soft pills (warnings).
- **Cross-location** pill: if previous item location differs and `gap < 15 min`, pill appears: `⚠ X min cross-location`.
- **Expected** pills:
  - Before expected arrival / After expected departure.

## 9) Preview (right panel) — Canonical Email Rules
- Header: “**Current Itinerary:**” (underline).
- Day headers: bold, ordinal date with `<sup>`.
- **Arrival day** line renders using I/O values (editable).
- **Dinner**:
  - `start - end | Dinner at Harvest` (end = start + 60).
- **Spa**:
  - If **identical** (`start, service, duration, pref, cabana`) and **>1 participant** → **merge** to **single line**, pluralize noun:
    - Massage→Massages, Facial→Facials (extendable map).
    - No names shown.
  - Otherwise per-guest line; append first names if subset.
  - Always show therapist pref and cabana:
    - `| Female Therapist | Separate Cabanas` (or NP/FT/MT mapped labels + same/separate mapped labels).
- **Departure day** line renders using I/O values.

## 10) Merging & Pluralization (detailed)
- Merge key: `['spa', startMins, title, duration, pref, cabana]`.
- Pluralization applies to **last noun**:
  - Regex map (case-insensitive):
    - `/massage$/i → Massages`
    - `/facial$/i → Facials`
  - Otherwise generic `+ "s"`.
- If guests later diverge on pref/cabana/service/duration → auto **un-merge** (separate lines).

## 11) Overlap (hard rule)
- Two items A,B **overlap** if `max(A.start, B.start) < min(A.end, B.end)` for **any shared guest**.
- Block add with alert; do not write the item.

## 12) Time pickers (looping mechanics)
- All columns are **infinite** via repeated base arrays; on scroll end:
  - Snap nearest item, then re-center to middle repetition to preserve infinite feel.

## 13) Performance & quality bars
- No console errors.
- Interaction budget: ≤ 16ms per common action.
- Simple, accessible focus order and readable controls.

## 14) Extensibility (post-V1)
- **Activities**: same data shape `{kind:'act', title, location, start/end, participants}`, with catalog & seasonal validity.
- **Magic**: constraint solver that respects expected window, lunch ≥ 60m, cross-location ≥ 15m, and user “locked” items.
- **PA Note**: separate formatting engine with per-activity abbreviation prompts.

## 15) Test matrix (must pass)
- **Dates**
  - Prevent dep < arr.
  - Single-night stay renders both check-in/out on same or different days correctly.
- **Guests**
  - Add 3+ guests; colors unique; toggling affects participants of new items.
- **Dinner**
  - 6:45 impossible; 8:15 invalid; overlap with spa is blocked for shared guests.
- **Spa**
  - 5-min increments accepted; 7:55am invalid; 7:00pm valid; durations compute end.
  - Same start/service/duration/pref/cabana for 2 guests → merged plural line.
  - Same start but different service → two lines with names and cabana/pref.
- **Warnings**
  - Cross-location gap 10 min → pill shows.
  - Item at 10:30am with expected arrival 11:00am → before-arrival pill shows.
- **Email**
  - Pluralization correct; names omitted only when all participants included.