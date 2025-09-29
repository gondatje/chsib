# Wave 1 — Activities Column (Per-Guest Add/Remove)

## Context (do not change)
Repo has:
- `index.html`, `style.css`, `script.js`
- YAML data loaded at runtime into `window.DataStore`:
  - `DataStore.activitiesCatalog.catalog` (canonical activities)
  - `DataStore.activitiesSeasons.seasons` (seasonal availability + days/times)
  - `DataStore.spaMenu.services` (not used in this wave)
  - `DataStore.copySnippets` (labels/hints)

Existing UI:
- Left = calendar + arrival/departure range
- Center = guests bar, IO editor, **Activities** title, “Add Spa/Dinner/Activity” buttons, **day list**
- Right = itinerary preview
- Guests can be toggled “active” (chips). We already schedule Dinner/Spa to the currently toggled guests.

## Goal
Add a **static, scrollable Activities Column** (catalog) that shows **time/duration + title only** for each activity and a checkbox to add/remove it for the **currently toggled guest chips** on the **selected day**.

The catalog itself is **not** editable or deletable. Scheduling produces items in the **day list** (center panel) using existing styles & overlap warnings.

## Strict rules
- Catalog rows display ONLY: **time (or duration) + title**. No notes or extra fields.
- Checking a row **adds** that activity for the **currently toggled guests only** on the currently selected day.
- Unchecking removes it for the **currently toggled guests only** (if other guests still have it, keep theirs).
- Day-list participant tags must show **initial bubbles (B, M, …)** instead of names, unless everyone is on the item (then show “Everyone”).
- **Lunch window hint (11–2)** must consider **only the currently toggled guests** for overlap/free-time math.
- Respect **seasonal availability** and **day-of-week** from `DataStore.activitiesSeasons.seasons`.
  - If an activity isn’t offered that day/season, disable its checkbox and show it dimmed.
- Keep style aligned with current Apple-clean look. Reuse existing classes/tokens where possible.

## Data expectations
- Use `DataStore.activitiesCatalog.catalog` as the source of truth for activity IDs, titles, and default durations.
  - Assume each catalog entry has at least: `id`, `title`, `defaultDurationMin` (or similar; if missing, default to 60).
- Use `DataStore.activitiesSeasons.seasons` for availability:
  - Season objects include: `{ start: "YYYY-MM-DD", end: "YYYY-MM-DD", days: { mon/tue/...: [ { activityId, time:"HH:MM", durationMin? } ] } }`
  - Only show/enable the activity if the **selected day** falls inside a season that lists that activity for that weekday.
  - If multiple time options exist that day, picking the activity should schedule the **listed start time** for that day; if multiple per day, pick the **first** for now.

## What to build (exact edits)

### 1) index.html
- Under the “Activities” section title (center panel), insert a new block above the “Add Spa / Add Dinner / Activity” buttons:
  ```html
  <div class="activities-column" id="activitiesColumn" aria-label="Activities Catalog"></div>
	•	Keep the existing “Add” buttons and day list as-is for now.

2) style.css
	•	Add minimal styles for .activities-column:
	•	Card-like list container with small gap.
	•	Each row uses the same typography scale as .day-list li, but smaller.
	•	Disabled rows (not available that day/season) appear dimmed with cursor: not-allowed.

3) script.js — new helpers

Add the following (or equivalent) functions:
	•	currentSeasonFor(dateISO) → returns the season that contains dateISO or null.
	•	activitiesForDay(dateISO) → from the matched season, returns an array of { activityId, title, startMins, durationMin } for the weekday; falls back to catalog defaultDurationMin if durationMin not present.
	•	initials(name) → returns uppercase initials (e.g., “B”, “BM” for two-part names). Use this for participant tags in the day list.
	•	isScheduledForGuests(iso, activityId, guestIds) → boolean; true if all given guestIds have an item for that activity at the configured time on iso.

4) script.js — render the catalog
	•	Implement renderActivitiesColumn(iso) which:
	•	Looks up activitiesForDay(iso).
	•	Renders a vertical list; each row shows:
	•	Time or duration (e.g., “8:30am” or “60m” if time not fixed)
	•	title
	•	a checkbox on the right
	•	Checkbox state is checked only if all currently toggled guests have that activity scheduled on iso.
	•	Disabled if not available that day (row dimmed, checkbox disabled).
	•	Call renderActivitiesColumn(isoFor(State.selectedDate)):
	•	when the day changes,
	•	after guests toggle,
	•	after scheduling/un-scheduling succeeds.

5) script.js — schedule/unschedule logic
	•	On check:
	•	For each active guest (activeGuestIds()), insert an item into State.itemsByDate[iso]:
    {
  id: State.nextItemId++,
  kind: 'activity',
  activityId,
  title,
  startMins,                   // from season day data; if absent, keep null and show duration-only
  endMins: startMins ? startMins + durationMin : null,
  duration: durationMin,       // fallback 60 if not provided
  location: '',                // leave empty for activities
  participantIds: [guestId]    // one per guest (so we can remove per guest independently)
}
	•	Respect overlap: if hasOverlap(...) for a guest, skip that guest and show a soft alert.

	•	On uncheck:
	•	Remove only items that match { iso, kind:'activity', activityId } for the currently active guest IDs. Leave other guests’ instances intact.
	•	After any change → renderDayList(iso) and renderActivitiesColumn(iso) and renderPreview().

6) script.js — participant tags = initials
	•	In renderDayList(...), replace guest name chips with initials (single-letter bubble per guest). Keep “Everyone” if all guests participate.

7) script.js — lunch hint per toggled guests
	•	Update lunch-window calculation to consider only items whose participantIds intersect the currently active guest IDs.
	•	If the active set is empty, hide the hint.

Acceptance tests
	•	Changing days updates the catalog list & availability (based on season/weekday).
	•	Checking a row adds separate entries per active guest for that activity on that day at the correct time.
	•	Unchecking removes only for currently active guests.
	•	Day list shows initials (B, M, …) unless Everyone.
	•	Lunch hint appears only when the active guests collectively have <60m free from 11–2.
	•	Overlaps block scheduling per guest with a soft alert; non-overlapping guests still get scheduled.
	•	Catalog rows that are unavailable that day are dimmed and disabled.

Do not
	•	Do not change Dinner/Spa flows.
	•	Do not introduce frameworks or change file structure.
	•	Do not add new data files; use existing YAML already loaded.
 