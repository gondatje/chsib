# definition.md

## 1) Product name
**CHSIB** — Castle Hot Springs Itinerary Builder

## 2) Mission (single sentence)
Transform chaos into clarity: build accurate, Apple-grade guest itineraries with **zero friction**, in **fewer clicks**, and **no manual reformatting**.

## 3) Primary users
- **Pre-Arrival Coordinators (PA team)** — 6–8 internal users. This is not guest-facing.

## 4) Non-goals for V1 (explicitly out)
- **Magic** auto-scheduling button
- **Activities Guide** exploration panel
- **PA Note** generator
- External PMS/SPA APIs (standalone for now)
- Localization/multi-language

## 5) Definition of “Done” for V1
- Users can:
  - Set **arrival/departure dates** on calendar; preview shows **day headers** with ordinal date (e.g., “Thursday, September 25<sup>th</sup>”).
  - Maintain **guest chips** (add/remove/toggle), each with **unique pastel color**; primary = first added (no star icon in UI).
  - Add **Dinner** (wheel picker: 5/6/7/8 + minutes 00/15/30; **PM only**; **6:45 excluded**; duration 60 min; **no overlap** per guest).
  - Add **Spa** (wheel picker: **5-minute** increments; **8:00am–7:00pm** start; configurable **duration** (60/90/120 now, extensible); therapist pref (NP/FT/MT); cabanas (same/separate); **no overlap** per guest).
  - See **cross-location soft warning** if two adjacent items are under **15 minutes apart** and locations differ.
  - Set **expected arrival/departure** (soft warnings if items outside this window).
  - **Copy email** body exactly as Preview formats it.
- Preview formatting obeys **all email rules** below.
- Direct overlaps are **blocked** for any shared guest.
- No runtime errors in console; layout works in 1-column and 3-column modes.

## 6) Email formatting (authoritative)
- **Heading:** “**Current Itinerary:**” — bold, underlined, slightly sized up (as per CSS).
- **Day headers:** Weekday, Month D<sup>th</sup> — bold (not underlined); strictly **chronological**; **no empty days** shown.
- **Arrival day line (default):**  
  `4:00pm Guaranteed Check-In | Welcome to arrive as early as 12:00pm`  
  - First time & note editable in “Check-in/out” editor.
- **Departure day line (default):**  
  `11:00am Check-Out | Welcome to stay on property until 1:00pm`  
  - First time & note editable in “Check-in/out” editor.
- **Dinner line:**  
  `7:15pm - 8:15pm | Dinner at Harvest`  
  - Always **full words** (never abbreviate), **60-minute** span.
  - Dinner is **implicitly everyone** if all toggles active at add time (but we still store participants).
- **Spa lines:**
  - Time **range** is computed from start + duration (e.g., `11:00am - 12:00pm`).
  - **Service name NEVER abbreviated** in email.
  - **Pluralization rule**: when **>1 guest** doing same **service+duration+start+pref+cabana** → pluralize final noun only:  
    - Massage → **Massages**, Facial → **Facials** (extensible map).
    - Example (multi):  
      `11:00am - 1:00pm | 120-Minute Castle Hot Springs Custom Massages | No Preference | Separate Cabanas`
  - **Per-guest listing** if any parameter differs (service, duration, pref, cabana, or participants subset):  
    - Example (subset & different service):  
      `11:00am - 12:00pm | 60-Minute Castle Hot Springs Custom Massage | Female Therapist | Separate Cabanas | Brittany`  
      `11:00am - 12:00pm | 60-Minute Castle Custom Facial | Female Therapist | Separate Cabanas | Megan`
  - **Names** are appended **only** when a subset of the party is involved; if **all guests** of the party are participants, **no names**.
- **Ordering within day:** chronological by **start time**.
- **Intros:** chosen manually from PA Email Templates (outside V1 scope of this doc); in-place editable.

## 7) Business rules (V1)
- **Calendar**
  - Arrival ≤ Departure (block if not).
  - Month/year header: stacked on wide view to avoid squish; responsive at <1080px.
- **Guests**
  - Each guest has stable color chip (unique pastel rotation).
  - Toggle governs who receives the next added item.
  - Removing a guest removes them from items; if the primary is removed, primary becomes first remaining.
- **Overlap**
  - **Hard block** if time ranges intersect for **any shared guest** (`Max(startA,startB) < Min(endA,endB)`).
- **Cross-location warning**
  - If **previous item** has different location and **gap < 15 min** → show soft pill `⚠ X min cross-location`.
  - Locations today: “Harvest” for Dinner, “Spa” for spa; activities later will carry their own.
- **Expected window soft warnings**
  - If item starts before expected arrival → show `⏰ Before expected arrival (h:mmam/pm)`.
  - If item ends after expected departure → show `⏰ After expected departure (h:mmam/pm)`.
- **Lunch hint**
  - Between **11:00–2:00**, if free time < **60 min**, show subtle hint pill.
- **Wheel pickers**
  - All wheels are **infinite** (looping) columns.
  - **Dinner:** hours `[5,6,7,8]`, minutes `[00,15,30]`, implicit PM; **disallow 6:45** by design (no `45` in minutes).
  - **Spa:** hours 12-hour; minutes every **5**; period AM/PM; **start 8:00am–7:00pm**.
  - **Generic:** 12-hour; minutes every **5**; period AM/PM.
- **Preview merge logic (spa only)**
  - Merge into a single line **iff** same `start, service, duration, therapistPref, cabana`.
  - Pluralize noun and **omit names** (since all participants share same params).
- **Performance**
  - Pure client-side; render ≤ 16ms per interaction on modern hardware.

## 8) Data inputs
- Guests: names typed by user.
- Calendar dates: user selected.
- Spa services/durations: from UI dropdowns (later: from **Spa Wellness Menu.pdf**).
- Dinner: 60-min implicit duration.
- Expected arrival/departure: user set via picker.
- (Later) Activities: from **Activities Catalog / seasonal PDFs**.

## 9) Data outputs
- **Email body** (copied to clipboard) as seen in Preview.
- **Internal timeline view** (calendar/day list) is considered an output for QA (visual correctness).

## 10) Edge cases to handle now
- Setting **departure before arrival**.
- Selecting dinner **outside window** or **6:45**.
- **Overlapping** spa/dinner across any shared guest.
- Two same-time items with different **locations** → cross-location check still uses previous gap.
- Removing last guest from a multi-guest merged spa group → may un-merge.

## 11) Accessibility & UX tone
- Keyboard focus rings on focusable controls; readable font sizes; color contrast ≥ WCAG AA where feasible.
- Motion subtle; no reliance solely on color for meaning.

## 12) Security/Privacy
- No network calls; data is in memory; clipboard copy is user-initiated.

## 13) Future (tracked but out of V1)
- Magic Button (constraint-aware auto scheduler).
- Activities Guide (power search & compare).
- PA Note generator (strict format prompts at export).
- External integrations (Opera Cloud, spa booking systems).