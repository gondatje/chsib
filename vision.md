# VISION.md — Castle Hot Springs Itinerary Builder (CHSIB)

---

## 1. Executive Summary

**CHSIB** (Castle Hot Springs Itinerary Builder) is an internal, Apple-grade tool for **Pre-Arrival** (PA) coordinators to create **flawless guest itineraries** with **zero friction**. It unifies **calendar planning**, **multi-guest activity selection**, **spa scheduling**, and a **pixel-correct email preview** that matches our house style. The system enforces **time logic, conflicts, travel constraints, and formatting**, while remaining **modular and extensible** (“Lego-like”) for future growth: Magic (auto-schedule), Guide (reference/compare), and Note (PA note generator).

**Primary objectives**

* **Accuracy**: No overlaps or logic violations; correct date/time formatting; correct pluralization and tagging.
* **Speed**: Fewer clicks, fewer modals, clear default paths; “two clicks away” from any core action.
* **Clarity**: Everything visible and editable; chronological views; consistent component language.
* **Modularity**: Features are additive and swappable; simple to expand (new activities, seasons, rules).
* **Determinism**: Rules are explicit; inputs → outputs are testable and reproducible for AI agents.

---

## 2. Mission Statement

**Transform chaos into clarity by enabling PA coordinators to compose perfect, multi-guest itineraries with zero friction, absolute accuracy, and Apple-level polish—every time.**

---

## 3. Scope & Non-Goals

**In scope (V1)**

* Calendar with **arrival**/**departure** selection and in-stay highlighting.
* Multi-guest management (primary + additional guests), unique color identity, toggles per guest.
* Activities & Spa scheduling with **time rules**, **conflict prevention**, **travel warnings**, and **chronological insertion**.
* Dinner selection (Harvest) with a **15-minute grid**, **range limits**, and disallowed slots.
* **Email composer/preview** mirroring house style: headings, day lines, tags, pluralization rules.
* Editable **check-in/checkout** default lines and **expected arrival/departure** hints with availability warnings.

**Deferred (post-V1, documented for completeness)**

* **Magic** (auto-fill itinerary optimizer).
* **Guide** (interactive activity/spa catalog & compare).
* **Note** (PA note generator with manual abbreviation prompts).
* External API integrations (Opera/PMS/Spa systems).
* Localization/multilingual support.

---

## 4. Product Definition

A **single-page application** (HTML/CSS/JS) that:

1. Lets PAs select dates & guests,
2. Add activities/spa/dinner with rule-checked times,
3. Presents a live, **copy-ready email** in our exact format, and
4. Stores state locally (and later, via pluggable persistence) to resume work.

**It is not**: public-facing, guest self-service, or a booking engine. It **assists** human PAs; it does **not replace** them.

---

## 5. Audience

* **Primary**: Castle Hot Springs **Pre-Arrival (PA)** coordinators (6–8 users).
* **Secondary**: AI agents/co-pilots that read this spec and modify code/docs.

---

## 6. Core Principles

* **Clarity first**: Always show where a user is, what’s selected, and what’s next.
* **Two-click reach**: Any core action within two clicks.
* **Deterministic logic**: Inputs → outputs with explicit rules; no hidden magic in V1.
* **Progressive disclosure**: Simple defaults, reveal complexity on demand.
* **Undo-friendly**: Non-destructive editing, clear “Clear All” and targeted remove.
* **Apple-grade polish**: Clean type, balanced spacing, elegant motion, no clutter.

---

## 7. Brand Personality

* **Quiet engineer**: Invisible power, never shouty.
* **Creative designer**: Beautiful, tasteful, restrained.
* **In your control**: Tool is assistant, not driver.

---

## 8. Design Pillars

1. **Everything important is visible**; nothing critical is hidden behind nested menus.
2. **Chronology is king**; day timelines shape mental models.
3. **Rules guide, not block (when safe)**; warnings over hard stops unless correctness demands.
4. **Edit anything inline**; fewer dialogs, more direct manipulation.
5. **Consistency**: One pattern for chips, pickers, tags, headings, separators.

---

## 9. Success Metrics

* **≥90%** itineraries require **no post-compose manual edits**.
* **≥50%** reduction in time to produce a complete email vs current workflow.
* **0** formatting mismatches vs examples (headings, ordinals, separators).
* **0** scheduling overlaps allowed; **100%** correct conflict warnings.
* **<1s** main interactions; **<2s** initial load on typical hardware.

---

## 10. Modules Overview

* **Guests**: Manage guest list, primary, colors, per-guest toggles.
* **Calendar**: Navigate months/years; set arrival/departure; select day.
* **Activities**: Add/arrange activities (non-spa), custom items, dinner times.
* **Spa**: Add spa services with duration, therapist preference, cabana type, start time.
* **Email**: Live, copy-ready preview; inline intro; check-in/out lines; per-day items.
* **Magic (future)**: Auto schedule around constraints & existing bookings.
* **Guide (future)**: Search/compare activities/spa; quick answers while on a call.
* **Note (future)**: PA note generator (manual abbreviations, normalized output).

---

## 11. Guests Module (Rules)

* **Add guest** by name → creates **chip** with **unique color** (palette mapping below).
* **Primary guest** = first chip created; **no star emoji**; indicated by order and subtle “Primary” label (assistive text, not in email).
* **Per-guest toggles**: Decide who participates when adding items; *Dinner* always applies to **all** guests (no tags).
* **Color assignment**: Deterministic (see §26) so chips and tags are stable across sessions.
* **Add later**: Adding a new guest after activities exist → prompt: “Add to all existing items?” (Yes/No per item group).
* **Removal**: Removing a guest removes their tags from items; items with only that guest become hidden unless dinner.

---

## 12. Calendar Module (Rules)

* **Controls**: Prev/next month, prev/next year; **title never squishes**—month/year **stack on narrow widths**.
* **Select arrival**/**departure**: in-stay range shaded; selected day highlights.
* **Day click** shows that day’s items in Activities pane.
* **Today** jumps to current month/day.
* **Date label** uses **weekday, Month D<sup>th</sup>** (correct ordinals).
* **No quiet hours** globally; constraints come from item types (e.g., spa window).

---

## 13. Activities Module (Non-Spa)

* Add **custom activities** with **5-minute** start increments.
* Each activity may specify **location** (optional, selected from known list).
* Items insert **chronologically** within the day; **added** items get a subtle “added” token.
* Each item displays **chips** for participating guests (initials + color) or a single **“All”** chip if everyone.
* **Day jumper** within Activities to switch to previous/next day quickly.

---

## 14. Spa Module

* **Service**: Choose from Spa Menu (title as email display name).
* **Duration**: 60/75/90/120 (support **any 5-min multiple**: e.g., 50, 110, future-proof).
* **Window**: **8:00am–7:00pm** inclusive start times.
* **Granularity**: **5-minute increments**.
* **Therapist preference**: Male / Female / No Preference.
* **Cabana type**: Same or Separate.
* **Guests**: Determined by **current guest toggles**.
* **Line merging** rules for email preview (see §41–§42).
* **Simultaneous different services** at same time: **each line** must include cabana type and guest tag(s); never merge across different titles.
* **Overlap**: Disallowed per guest; blocking rule (see §30).
* **Travel warnings**: If back-to-back different locations with <15 min, show **15-minute indicator** (see §31).

---

## 15. Dinner Scheduling Rules (Harvest)

* **Time picker**: 5:30pm–8:00pm, **15-minute increments** (00/15/30), **disallow 6:45pm**.
* **All guests by definition**; dinner **never** shows per-guest tags in email.
* **Repeat across days**: choose times day by day.
* Optional **selection summary** in UI (e.g., 6:30 ×2, 7:15 ×2) for operator awareness; **email output remains per-day lines**.

---

## 16. Email Module (Live Preview)

* Heading: **“Current Itinerary:”** **underlined**, slightly larger.
* Day headers: same size as heading, **bold**, **not underlined**, formatted: **Thursday, September 25<sup>th</sup>**.
* **Arrival day** auto-adds default check-in line; **Departure day** auto-adds default checkout line (editable, see §43).
* Items listed **chronologically**; **no empty days** rendered.
* **Separator**: `time [– end] | Title [| Qualifiers] [| Guest tags]`
* Inline **intro** from selected template (manual choice), editable in place; templates limited to those that **present an itinerary**.

---

## 17. Note Module (Future)

* Generates PA Note with **all auto-known fields**, but **no common toggles** auto-injected; PAs add extra lines manually (e.g., “24 CXL”).
* **Abbreviations** are **prompted per activity** at generation time (titles provided, no saved presets).
* **All fields mandatory**: prompt for missing info in a **single, clean pass**.

---

## 18. Magic Module (Future)

* Ingests free-form **wishlists** (activities, counts, per-guest wishes, spa with preferences).
* Auto places items respecting **windows**, **durations**, **travel buffers**, **lunch window (11:00–14:00)** with **≥60 min** target, honoring existing locked items.
* Produces a **diff report** & **fix shortcuts** when constraints prevent exact packing.

---

## 19. Guide Module (Future)

* Search and filter **Activities** and **Spa**; compare two+ items; expose **images, durations, descriptions, price**, season applicability.
* Designed for **on-call Q&A**; single keystroke to **insert** an item into the current day.

---

## 20. Data Sources (Authoritative)

* **Activities Catalog** per season (late summer/fall/winter/spring PDFs).
* **Spa Menu** (services, durations, descriptions, pricing).
* **PA Email Templates** (intros that include itineraries).
* **Arrivals Detailed** examples to **standardize PA Note** formatting (future Note module).
  *Inputs are curated and versioned; parsers map documents to internal models (see §21–§25).*

---

## 21. Data Model Overview

Structured as immutable **entities** with explicit keys:

* `Guest`: id, name, color, primary: boolean
* `Item`: id, date, kind: ('activity'|'spa'|'dinner'|'custom'), start, duration, title, location?, qualifiers{}, participants[guestId]
* `Day`: isoDate, items[]
* `CheckLines`: checkIn { timeLabel, note }, checkOut { timeLabel, note }, expectedArrival?, expectedDeparture?
* `Season`: name, dateRange, activities[]
* `Email`: introTemplateId, introText, per-day content
  All times in minutes from midnight local; formatting deferred to view layer.

---

## 22. Guest Data Model

```json
{
  "id": "string",
  "name": "Brittany",
  "initials": "B",
  "color": "#3a7d7c",
  "isPrimary": true
}
```

---

## 23. Activity Data Model

```json
{
  "kind": "activity | custom | dinner",
  "title": "Dinner at Harvest",
  "location": "Meadow",
  "date": "YYYY-MM-DD",
  "start": 1110,
  "duration": 60,
  "participants": ["guestId1","guestId2"],
  "qualifiers": { "Notes": "Optional freeform" }
}
```

---

## 24. Spa Service Data Model

```json
{
  "kind": "spa",
  "title": "Castle Hot Springs Custom Massage",
  "date": "YYYY-MM-DD",
  "start": 660,
  "duration": 120,
  "therapistPref": "Female | Male | No Preference",
  "cabana": "Same | Separate",
  "participants": ["guestId1","guestId2"]
}
```

---

## 25. Time & Date Model

* Store **minutes since midnight** for arithmetic.
* Render with **12-hour clock** + am/pm; pad minutes (e.g., 11:00am).
* **Ordinals** for day numbers (1st, 2nd, 3rd, 4th…).
* **Ranges**: display `start – end` when duration present.

---

## 26. Color & Identity Model

* **Deterministic palette** (e.g., 12 hues at medium saturation; pass WCAG contrast on white): assign by **hash(name) % palette.length** to keep color stable across sessions.
* Colors appear on **chips** and **initial tags** in Activities; **email** uses **text tags** only (no color).

---

## 27. State Management

* Single in-memory `State` object; changes via small reducer functions.
* **Derived** values (e.g., in-stay, conflict flags) computed on demand.
* **Undo/redo** (future) by snapshotting diffs.
* **Persistence**: localStorage slot `chsib:v1` with schema version; safe load if versions match.

---

## 28. Persistence Rules

* Save on every mutation; throttle to 250ms.
* On load, validate schema and **migrate** fields if needed.
* “Clear All” wipes storage and resets defaults.

---

## 29. Validation Framework

* **Synchronous checks** on add/edit:

  * Time window compliance (dinner/spa).
  * Overlap per participant (strict).
  * Travel warnings (15-minute threshold).
  * Expected arrival/departure window hints (non-blocking warning).
* **Explainable errors**: short, specific messages, never cryptic.

---

## 30. Overlap & Conflict Rules

* **Direct overlaps** (same participant, times intersect) → **blocked** (no add).
* Partial adjacency allowed (end == start).
* **Group constraints**: If “All” (dinner) exists, non-overlapping rule per guest still applies to other items.

---

## 31. Cross-Location Travel Rules (15-Minute Indicator)

* If **consecutive items** for any participant are in **different locations** and the **gap < 15 min**, show **warning**:

  * “Travel window is only X minutes between [Location A] and [Location B].”
* Warning appears in Activities list and in a **non-printing** sidebar (not in email).

---

## 32. Expected Arrival/Departure Constraints

* In **Check Lines Editor**, operator may set **Expected Arrival** and **Expected Departure**.
* Selecting an item **before expected arrival** or **after expected departure** shows a **warning**, not a block:

  * “Guest expects to arrive ~3:00pm; this item starts at 2:30pm.”
* Operator can proceed (human judgment preserved).

---

## 33. Dinner Time Picker Spec

* Columns: **Hour (5/6/7/8)**, **Minute (00/15/30)**, **PM** (fixed).
* **Infinite loop** in each scroll column (cycling lists).
* **Disallow 6:45pm** explicitly.
* Snap-to-center on scroll end; selection lane mask.

---

## 34. Generic Time Picker Spec

* Columns: **Hour (1–12)**, **Minute (00..55 in 5-min steps)**, **AM/PM** (toggle).
* **Window restriction** per item type (e.g., spa 8:00am–7:00pm).
* Infinite scroll; snap to center; mouse/touch wheel with inertial scrolling.

---

## 35. Calendar Interaction Spec

* Month/Year nav with **non-squishing title**; on tight widths, **stack month over year**.
* Day click updates **Day Title** and Activities list.
* **In-stay shading** between arrival/departure; arrival/departure cells **accented**.
* Today ring.

---

## 36. Guest Chip Interaction Spec

* Add by typing name + Enter → creates chip; **unique color**; **Primary** = first chip only (no star emoji).
* Tap/toggle per guest to filter **who gets the next item**.
* “All” chip appears on items that include all guests (dinner always implies All).
* Remove chip (X) → removes guest; prompts to handle existing items.

---

## 37. Activity Selection UX

* Toolbar: **Add Activity**, **Add Dinner**, **Add Spa**.
* Each adds a row via modal or inline picker; rows sort by start time.
* **Small chips** show participants; tap a chip inside a row to toggle inclusion quickly (except dinner).
* **Reorder** by changing time only; no drag reorder (chronology enforced).

---

## 38. Spa Scheduling UX

* Modal: **Service**, **Duration**, **Therapist Pref**, **Cabana**, **Start time** (5-min picker), **Participants (from toggles)**.
* If multiple guests share the **same** service, **same** start, **same** duration, **same** pref, **same** cabana → **one merged line** (pluralized title, no tags).
* Any difference → **separate lines** with explicit **guest tags** and **cabana**.

---

## 39. Email Composition Rules (General)

* Lines are **deterministic**: `start [– end] | Title | Qualifiers | Tags`.
* **No abbreviations** in email (titles use canonical names from our menus).
* **Dinner**: `7:15pm | Dinner at Harvest` (no tags).
* **Custom**: operator title as entered.

---

## 40. Email Day Headers & Date Formatting

* Heading example: **Thursday, September 25<sup>th</sup>**
* Arrival day (if selected as such) includes auto check-in line.
* Departure day includes auto checkout line.
* **No empty days**: if a day has *only* check lines and no items, still show the day header with those lines.

---

## 41. Email Pluralization & Tagging (Spa)

* If **all selected guests** have **identical** spa parameters (service, duration, preference, cabana, start) → **single plural line** with **no tags**:

  * `11:00am – 1:00pm | 120-Minute Castle Hot Springs Custom Massages | No Preference | Separate Cabanas`
* If any parameter differs, split lines and **append guest tag** to each distinct line:

  * `11:00am – 12:00pm | 60-Minute Castle Hot Springs Custom Massage | Female Therapist | Separate Cabanas | Brittany`
  * `11:00am – 12:00pm | 60-Minute Castle Custom Facial | Female Therapist | Separate Cabanas | Megan`
* If **same start time** but **different services**, *always* separate lines **and include cabana info** on each.

---

## 42. Email Qualifier Ordering

Order (when present):

1. **Therapist Preference** (Spa)
2. **Cabana Type** (Spa)
3. **Location** (non-spa activities)
4. **Freeform Notes**
5. **Guest tags** (only when not all guests)

---

## 43. Check-In/Check-Out Lines Editor

**Defaults (editable anywhere in UI):**

* **Arrival**: `4:00pm Guaranteed Check-In | Welcome to arrive as early as 12:00pm`
* **Departure**: `11:00am Check-Out | Welcome to stay on property until 1:00pm`

Operators can edit **time** and **note** to any text (not limited to times).
Fields for **Expected Arrival** / **Expected Departure** drive **non-blocking warnings** (§32).

---

## 44. Intro Templates (Email)

* Operator selects from **only those templates** that **present an itinerary** (per the PA templates document).
* Inserted intro is **auto-filled** where possible (names, dates range) then **inline editable**.
* Templates that are unrelated (e.g., “Attempt to Reach You”) are **excluded** from the selector.

---

## 45. Abbreviation Prompt (Note, Future)

* At Note generate time, for each activity **title is shown**; operator enters the **abbreviation** manually.
* **No saving** of abbreviations (always manual per request).
* Resulting Note uses **standardized layout** derived from **Arrivals Detailed** conventions.

---

## 46. Note Format Rules (Future)

* Sections: PA (status), Guest(s), Allergies/Dietary, Activities (abbrev lines, times), **Addenda** lines **only if operator adds them**.
* “24 CXL” and other normalized snippets are **optional manual entries**.

---

## 47. Guide Module Spec (Future)

* **Search** across catalog; **filters** (season, duration, intensity, cost, location).
* **Compare** two or more items side-by-side (key props, constraints, images).
* Insert selected item into the **current day** with one click.

---

## 48. Magic Algorithm (Future)

**Inputs**: wishlist ({guest → [items with counts]}, spa options, preferences), in-stay dates, lunch policy, expected arrival/departure windows, locked items.
**Objective**: maximize wishlist coverage while respecting time windows, travel gaps, and lunch ≥60 min.
**Output**: itinerary + issues list + one-click fixes (suggest opening an extra class when impossible).

---

## 49. Error Handling UX

* Errors inline, near control; **plain English** (“Dinner must be between 5:30pm and 8:00pm; 6:45pm is unavailable.”).
* Warnings use **amber**; blocks use **red**.
* Toasts for copy actions; modal for rare confirmations.

---

## 50. Notifications & Toasts

* **Copy Email** → toast “Copied”.
* Non-blocking warnings summarized in a **lightweight inspector** pane (optional).

---

## 51. Accessibility

* Keyboard navigation throughout; focus ring visible.
* Wheel pickers operable via keyboard **↑/↓** and **PageUp/PageDown**.
* Min contrast **AA**; larger text for headings; semantic landmarks.

---

## 52. Performance

* Initial load < **2s** on typical hardware; interactions < **100ms** median.
* Avoid layout thrash; virtualize long lists (future).
* Pre-compute ordinals and month names.

---

## 53. Security & Privacy

* Local-only V1; no PII beyond names.
* When persistence expands: encrypt at rest (future), least-privilege access.

---

## 54. Localization (Future-Ready)

* All strings centralized; dates/times localized via formatting layer.
* V1 English-only.

---

## 55. Theming & Brand Accents

* **Apple-like neutrals** with subtle **CHS teal** accents.
* Colors used sparingly; content leads, chrome recedes.

---

## 56. Responsive Layout

* **Three-column** desktop (Calendar | Activities | Preview).
* **Stacked** on narrow widths; calendar title stacks **Month** over **Year**.
* Controls remain reachable within **two taps** on tablet.

---

## 57. Component Library

* **Chips** (guest/color), **Pills** (added/labels), **Buttons** (primary/ghost/danger), **Wheel Pickers**, **Modals**, **List Rows**, **Tabs**, **Dividers**, **Toasts**.
* One place to tune radius, spacing, shadows.

---

## 58. Motion & Animation

* Subtle **elevation** on calendar selections; mask lane glow on wheel pickers.
* 150–250ms curves; never bouncy or playful; **calm**.

---

## 59. Keyboard Shortcuts (Optional, Post-V1)

* `A`: Add Activity, `S`: Add Spa, `D`: Add Dinner, `G`: Add Guest, `T`: Today.
* `←/→`: Prev/Next day when a day is active.

---

## 60. Logging & Telemetry (Internal Only, Future)

* Anonymous counts: conflicts prevented, warnings shown, time-to-email.
* Toggleable in a developer panel.

---

## 61. Testing Strategy

* **Unit**: time math, overlap detection, pluralization, formatting.
* **Integration**: adding items flows, email rendering end-to-end.
* **Golden tests**: emails compared to **reference snapshots** (string compare).
* **Rule tests**: 6:45pm dinner disallowed; spa window 8:00–19:00; 5-min spa granularity; cross-location warnings.

---

## 62. QA Acceptance Criteria

* Can build a **multi-guest** itinerary with **no overlaps**, correct tags, and **correct merged spa lines**.
* All dinner times respect rules; 6:45pm blocked.
* Check-in/out defaults editable and reflected in preview.
* Calendar title **does not squish** at any width; stacks cleanly.

---

## 63. Definition of Done Linkage

A feature is **Done** when:

* All **rules** in this doc for that feature pass.
* **Golden email** snapshot matches expected.
* No accessibility **AA** regressions.
* Performance budgets held.

---

## 64. Roadmap Linkage

**Phases** (high level; detailed in `roadmap.md`):

1. Core (Guests, Calendar, Activities, Dinner, Email)
2. Spa logic & robust conflicts
3. Magic + Guide
4. Note + refinements

---

## 65. Risks & Mitigations

* **Rule creep** → Keep rules centralized; add ADR entries (§67).
* **Inconsistent data** → Single registry of activities/spa.
* **Over-modal UX** → Prefer inline edits; cap modal depth.

---

## 66. Open Questions

* None required for V1. Future: which external systems to integrate first (Opera/PMS/Spa)?

---

## 67. Decision Records (ADR)

* **ADR-001**: Dinner time policy (range, increments, 6:45pm disallowed).
* **ADR-002**: Spa window (8:00–19:00) and 5-minute increments.
* **ADR-003**: No star emoji for primary guest; “Primary” indicated by order/assistive text.

---

## 68. Contribution Guidance (AI-Focused)

* **Read this file first.**
* Respect module boundaries (§10–§19).
* Add tests for **every rule** you touch (§61).
* Update ADRs and `changelog.md` on every decision.

---

## 69. File & Folder Structure (Suggested)

```
/src
  /components
  /modules
    guests/
    calendar/
    activities/
    spa/
    email/
    magic/     (future)
    guide/     (future)
    note/      (future)
  /styles
  /utils
/tests
/docs
```

---

## 70. Build/Deploy (Static First)

* V1 static hosting (GitHub Pages or equivalent).
* No server requirements; future APIs behind feature flags.

---

## 71. Integration Plan (Future APIs)

* Opera Cloud/PMS read-only (bookings, notes).
* Spa booking endpoints (availability checks).
* Import/export of guest data (CSV or API).

---

## 72. Versioning & Changelog

* Semantic versioning for releases.
* `changelog.md` updated on every feature/bugfix.

---

## 73. Naming Conventions

* **Components**: `PascalCase`.
* **State keys**: `camelCase`.
* **Time**: `startMins`, `durationMins`.
* **Kinds**: `'activity'|'custom'|'dinner'|'spa'`.

---

## 74. Copywriting Guidelines

* Short, direct, friendly.
* Warnings explain **why** and **how to fix**.
* Email lines use **exact official titles** (no abbreviations).

---

## 75. Glossary

* **In-stay**: Dates between arrival and departure.
* **Qualifiers**: Extra descriptors appended to titles (e.g., therapist preference).
* **Tags**: Guest names appended when not everyone participates.

---

## 76. Sample Scenarios

1. **Two guests, same spa service, same params:** one pluralized line, no tags.
2. **Two guests, different therapist prefs:** separate lines with tags.
3. **Simultaneous different spa services, Same Cabanas:** separate lines, include cabana and tags.
4. **Activity at 2:30pm when expected arrival is 3:00pm:** show non-blocking warning.
5. **Back-to-back different locations with 10 minutes gap:** show travel warning.
6. **Dinner at 6:45pm attempt:** block with rule message.

---

## 77. Appendix — Pseudocode Overview

**Overlap check (per participant):**

```js
function overlaps(a, b) {
  const aEnd = a.start + (a.duration || 0);
  const bEnd = b.start + (b.duration || 0);
  return (a.start < bEnd) && (b.start < aEnd);
}
```

**Travel warning (consecutive items, different locations):**

```js
if (prev.location && next.location && prev.location !== next.location) {
  const gap = next.start - (prev.start + prev.duration);
  if (gap < 15 * 60) warn(`Travel window only ${Math.round(gap/60)} minutes`);
}
```

**Spa line merging (same everything):**

```js
// group key: title|start|duration|therapistPref|cabana
// if group includes all selected guests => pluralize title; omit tags
// else => split groups; append guest tags
```

**Dinner guard:**

```js
function isValidDinner(mins) {
  const h = Math.floor(mins/60), m = mins % 60;
  const notAllowed = (h === 18 && m === 45); // 6:45pm
  const inRange = mins >= (17*60+30) && mins <= (20*60);
  const onGrid  = m === 0 || m === 15 || m === 30;
  return inRange && onGrid && !notAllowed;
}
```

**Email line format:**

```js
function emailLine(item){
  const t0 = fmt(item.start);
  const t1 = item.duration ? ` – ${fmt(item.start + item.duration)}` : '';
  const q  = qualifiers(item).join(' | ');
  const tags = guestTags(item).join(', ');
  return [t0 + t1, item.title, q, tags].filter(Boolean).join(' | ');
}
```

---

**Authoritative Note:**
This document is the **North Star** for CHSIB. All future docs (definition, psd, roadmap, architecture) must remain consistent with the rules and intent captured here.
