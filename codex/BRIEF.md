# CHS Itinerary Builder — Codex Brief

## Project shape
- Single-page app: `index.html`, `style.css`, `script.js`
- Data lives in YAML under `/data` and is loaded at runtime via js-yaml.
- Core state is in `script.js` (calendar, guests, itemsByDate, pickers).

## Data files Codex must read
- `data/activities.catalog.yml`   → canonical activities dictionary (titles, locations, default durations).
- `data/activities.seasons.yml`   → seasons with weekly schedules (days/times each activity runs).
- `data/spa.menu.yml`             → spa services + allowed durations, gender prefs, cabana options.
- `data/copy.snippets.yml`        → UI text & small constants (lunch window copy, time windows).

## Current UI (high-level)
- Left: calendar with arrival/departure range.
- Center: guests bar, IO editor, day list (“Activities”).
- Right: text preview of itinerary.
- Time wheels are smooth, looping; dinner is PM-only with allowed minutes.

## Style expectations
- Apple-level polish; minimal, clean, consistent.
- No jitter on wheel pickers; continuous, smooth feel.
- Buttons and chips with subtle elevation & focus states.