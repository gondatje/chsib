/* Itinerary Builder — instant Activities + fixed time wheels */

console.log("Itinerary Builder is working ✅");

/* ========= Instant bootstrap: embedded Activities data =========
   - Renders immediately from these constants (zero fetch waits)
   - If YAML loads later, it will transparently override
*/
const EMBED_ACTIVITIES_DAY_TEMPLATE = [
  { slug: "overlook-hike", time: "06:45", end: "08:15" },
  { slug: "scenic-desert-ebike", time: "07:00", end: "09:15" },
  { slug: "castle-peak-via-ferrata", time: "07:00", end: "10:00" },
  { slug: "crater-canyon-exploration", time: "07:00", end: "10:00" },
  { slug: "rise-and-shine-flow-yoga", time: "08:30", end: "09:25" },
  { slug: "ebiking-101-intro", time: "09:00", end: "10:15" },
  { slug: "landscape-restoration-tour", time: "09:30", end: "10:15" },
  { slug: "meditation-reset", time: "09:40", end: "10:00" },
  { slug: "guided-archery", time: "10:00", end: "10:45" },
  { slug: "intro-to-tai-chi", time: "10:15", end: "11:00" },
  { slug: "farm-tour", time: "10:30", end: "11:30" },
  { slug: "axe-throwing", time: "11:00", end: "11:45" },
  { slug: "paddle-board-yoga", time: "11:00", end: "12:00" },
  { slug: "sound-bath", time: "12:30", end: "13:30" },
  { slug: "mindfulness-rock-mandalas", time: "14:00", end: "14:45" },
  { slug: "cooling-aroma-restorative-yoga", time: "14:00", end: "15:00" },
  { slug: "wine-tasting", time: "15:00", end: "16:00" },
  { slug: "afternoon-yoga", time: "15:15", end: "16:10" },
  { slug: "chs-documentary-viewing", time: "16:00", end: "16:45" },
  { slug: "connecting-with-water", time: "16:00", end: "17:00" },
  { slug: "yoga-nidra", time: "16:30", end: "17:00" }
];

const EMBED_ACTIVITIES_CATALOG = {
  "overlook-hike": { title: "Overlook Hike", duration_min: 90 },
  "scenic-desert-ebike": { title: "Scenic Desert E-Bike Ride", duration_min: 135 },
  "castle-peak-via-ferrata": { title: "Castle Peak Via Ferrata Climb", duration_min: 180 },
  "crater-canyon-exploration": { title: "Crater Canyon Exploration", duration_min: 180 },
  "rise-and-shine-flow-yoga": { title: "Rise & Shine Flow Yoga", duration_min: 55 },
  "ebiking-101-intro": { title: "E-Biking 101: Intro to E-Bike Tour", duration_min: 75 },
  "landscape-restoration-tour": { title: "Landscape Restoration and Development Tour", duration_min: 45 },
  "meditation-reset": { title: "Meditation", duration_min: 20 },
  "guided-archery": { title: "Guided Archery", duration_min: 45 },
  "intro-to-tai-chi": { title: "Intro to Tai Chi", duration_min: 45 },
  "farm-tour": { title: "Farm Tour", duration_min: 60 },
  "axe-throwing": { title: "Axe Throwing", duration_min: 45 },
  "paddle-board-yoga": { title: "Paddle Board Yoga", duration_min: 60 },
  "sound-bath": { title: "Sound Bath", duration_min: 60 },
  "mindfulness-rock-mandalas": { title: "Mindfulness Activity - Rock Mandalas", duration_min: 45 },
  "cooling-aroma-restorative-yoga": { title: "Cooling Aroma Restorative Yoga", duration_min: 60 },
  "wine-tasting": { title: "Wine Tasting", duration_min: 60 },
  "afternoon-yoga": { title: "Yoga", duration_min: 55 },
  "chs-documentary-viewing": { title: "Castle Hot Springs Documentary Viewing", duration_min: 45 },
  "connecting-with-water": { title: "Connecting With Water", duration_min: 60 },
  "yoga-nidra": { title: "Yoga Nidra", duration_min: 30 }
};

const EMBED_ACTIVITIES_SEASONS = [
  {
    name: "Year Round Highlights",
    start: "2024-01-01",
    end: "2026-12-31",
    weekly: {
      mon: EMBED_ACTIVITIES_DAY_TEMPLATE.map(slot => ({ ...slot })),
      tue: EMBED_ACTIVITIES_DAY_TEMPLATE.map(slot => ({ ...slot })),
      wed: EMBED_ACTIVITIES_DAY_TEMPLATE.map(slot => ({ ...slot })),
      thu: EMBED_ACTIVITIES_DAY_TEMPLATE.map(slot => ({ ...slot })),
      fri: EMBED_ACTIVITIES_DAY_TEMPLATE.map(slot => ({ ...slot })),
      sat: EMBED_ACTIVITIES_DAY_TEMPLATE.map(slot => ({ ...slot })),
      sun: EMBED_ACTIVITIES_DAY_TEMPLATE.map(slot => ({ ...slot }))
    }
  }
];

/* ========= Data bootstrap (YAML -> JS) ========= */
window.DataStore = {
  spaMenu: { services: {} },
  // activities use the embedded data first:
  activitiesCatalog: { catalog: { ...EMBED_ACTIVITIES_CATALOG } },
  activitiesSeasons: { seasons: [ ...EMBED_ACTIVITIES_SEASONS ] },
  copySnippets: { ui: {}, email_intro: {} },
  ready: false,
};

async function loadText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return await res.text();
}

function safeYamlLoad(y) {
  try { return jsyaml.load(y); } catch { return null; }
}

async function initDataStore() {
  try {
    const [spaY, actCatY, actSeasonsY, copyY] = await Promise.all([
      loadText("data/spa.menu.yml").catch(()=>null),
      loadText("data/activities.catalog.yml").catch(()=>null),
      loadText("data/activities.seasons.yml").catch(()=>null),
      loadText("data/copy.snippets.yml").catch(()=>null),
    ]);

    const spaParsed       = spaY        ? safeYamlLoad(spaY)        : null;
    const actCatParsed    = actCatY     ? safeYamlLoad(actCatY)     : null;
    const actSeasonsParsed= actSeasonsY ? safeYamlLoad(actSeasonsY) : null;
    const copyParsed      = copyY       ? safeYamlLoad(copyY)       : null;

    if (spaParsed)        DataStore.spaMenu = spaParsed;
    if (actCatParsed)     DataStore.activitiesCatalog = actCatParsed;
    if (actSeasonsParsed) DataStore.activitiesSeasons = actSeasonsParsed;
    if (copyParsed)       DataStore.copySnippets = copyParsed;

    DataStore.ready = true;
    document.dispatchEvent(new CustomEvent('chs:data-ready'));
    console.log("[DataStore] ready ✓", {
      spaServices: Object.keys(DataStore.spaMenu.services || {}).length,
      activities:  Object.keys(DataStore.activitiesCatalog.catalog || {}).length,
      seasons:     (DataStore.activitiesSeasons.seasons || []).length,
    });
  } catch (err) {
    console.error("[DataStore] load error", err);
  }
}
// Kick off loading but UI renders instantly from embedded data
initDataStore();

/* =========================
   Config
   ========================= */
const Config = {
  dinner: { startMins: 17 * 60 + 30, endMins: 20 * 60, step: 15 }, // 5:30–8:00pm
  checkIn:  { timeLabel: "4:00pm",  line: "Guaranteed Check-In", note: "Welcome to arrive as early as 12:00pm" },
  checkOut: { timeLabel: "11:00am", line: "Check-Out",          note: "Welcome to stay on property until 1:00pm" },
  locations: { dinner: "Harvest", spa: "Spa" }
};

/* =========================
   Date / time helpers
   ========================= */
function ordinalSuffixHTML(n){ const s=["th","st","nd","rd"], v=n%100; return `${n}<sup>${s[(v-20)%10]||s[v]||s[0]}</sup>`; }
function formatDateWithOrdinalHTML(date){
  const weekday = date.toLocaleDateString('en-US',{ weekday:'long' });
  const month = date.toLocaleDateString('en-US',{ month:'long' });
  return `${weekday}, ${month} ${ordinalSuffixHTML(date.getDate())}`;
}
function stripOrdinals(text){ return (text||'').replace(/\b(\d+)(st|nd|rd|th)\b/gi,'$1'); }
function formatMins(mins){
  let h24 = Math.floor(mins/60), m = mins%60;
  const ap = h24>=12 ? 'pm' : 'am';
  let h = h24%12; if(h===0) h=12;
  return `${h}:${m.toString().padStart(2,'0')}${ap}`;
}
function minsFromHHMM(hhmm){ const [h,m]=hhmm.split(':').map(Number); return h*60+m; }
function isoFor(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10); }
function parseISO(iso){ const [y,m,dd]=iso.split('-').map(Number); return new Date(y, m-1, dd); }
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function isSameDate(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function firstName(name){ return (name||'').trim().split(/\s+/)[0] || ''; }
function hhmmAPToMins(hour12, minute, period){
  let h = parseInt(hour12,10) % 12;
  if(period==='PM') h += 12;
  return h*60 + parseInt(minute,10);
}
function weekdayKey(date){
  return ['sun','mon','tue','wed','thu','fri','sat'][date.getDay()];
}

/* =========================
   State & DOM
   ========================= */
const State = {
  today: new Date(),
  viewY: new Date().getFullYear(),
  viewM: new Date().getMonth(),
  selectedDate: new Date(),
  rangeStartISO: null,
  rangeEndISO:   null,
  itemsByDate: Object.create(null),
  guests: [],
  nextGuestId: 1,
  selectedGuestId: null,
  expectedArrivalMins: null,
  expectedDepartureMins: null,
  nextItemId: 1,
  guestActivitySelections: Object.create(null)
};

const $$  = sel => document.querySelector(sel);
const calGrid    = $$('#calGrid');
const dayTitleEl = $$('#dayTitle');
const activitiesScheduleEl = $$('#activitiesSchedule');
const itineraryBody = $$('#itineraryBody');
const copyBtn    = $$('#copyBtn');
const lunchHint  = $$('#lunchHint');
const guestsChipsEl = $$('#guestsChips');
const addGuestBtn   = $$('#addGuestBtn');
const ioCheckInTime  = $$('#ioCheckInTime');
const ioCheckInNote  = $$('#ioCheckInNote');
const ioCheckOutTime = $$('#ioCheckOutTime');
const ioCheckOutNote = $$('#ioCheckOutNote');
const expectedArrival = $$('#expectedArrival');
const expectedDeparture = $$('#expectedDeparture');

/* =========================
   Wheel utility (non-looping, fixed text-select)
   ========================= */
class WheelColumn {
  constructor(colEl, values, options={}){
    this.el = colEl;
    this.baseValues = Array.isArray(values) ? values.slice() : [];
    this.loopPreference = options.loop !== undefined ? !!options.loop : true;
    this.values = this.baseValues.slice();
    this.itemHeight = 40;
    this.currentIndex = 0;
    this.currentDisplayIndex = 0;
    this.loopEnabled = false;
    this.loopSetSize = 0;
    this.loopBaseOffset = 0;
    this.displayCount = 0;
    this.pad = 0;
    this._snapTimer = null;
    this._releaseTimer = null;
    this._pointerActive = false;
    this._suspend = false;
    this._prefersReducedMotion = null;

    this.emitChange = this.emitChange.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleClick = this.handleClick.bind(this);

    if(!this.el) return;
    this.build();
  }
  build(){
    this.populate(this.baseValues);
    this.el.setAttribute('role', 'listbox');
    if(!this.el.hasAttribute('tabindex')) this.el.setAttribute('tabindex','0');

    // 🚫 Kill text selection that caused the “reverse spin” glitch
    this.el.style.userSelect = 'none';
    this.el.style.webkitUserSelect = 'none';
    this.el.style.msUserSelect = 'none';

    this.refreshMetrics();
    this.realign(true);
    this.applySelection();

    this.el.addEventListener('scroll', this.handleScroll, { passive:true });
    this.el.addEventListener('pointerdown', this.handlePointerDown);
    this.el.addEventListener('pointerup', this.handlePointerUp);
    this.el.addEventListener('pointercancel', this.handlePointerUp);
    this.el.addEventListener('touchend', this.handlePointerUp, { passive:true });
    this.el.addEventListener('keydown', this.handleKeyDown);
    this.el.addEventListener('click', this.handleClick);

    if(typeof ResizeObserver !== 'undefined'){
      this.resizeObserver = new ResizeObserver(()=> this.handleResize());
      this.resizeObserver.observe(this.el);
    }
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
  }
  populate(values){
    if(!this.el) return;
    this.baseValues = Array.isArray(values) ? values.slice() : [];
    this.values = this.baseValues.slice();
    this.loopEnabled = this.loopPreference && this.values.length > 1;
    this.loopSetSize = this.values.length || 1;
    this.loopBaseOffset = this.loopEnabled ? this.loopSetSize : 0;

    const sets = this.loopEnabled ? 3 : 1;
    const frag = document.createDocumentFragment();
    for(let r=0; r<sets; r++){
      this.values.forEach((value, baseIndex)=>{
        const div = document.createElement('div');
        div.className = 'picker-item';
        div.textContent = value;
        div.dataset.value = value;
        div.dataset.baseIndex = String(baseIndex);
        div.setAttribute('role','option');
        frag.appendChild(div);
      });
    }
    this.el.innerHTML = '';
    if(sets>0) this.el.appendChild(frag);
    this.displayCount = this.el.children.length;

    if(this.values.length === 0){
      this.currentIndex = 0;
      this.currentDisplayIndex = 0;
      return;
    }
    if(this.currentIndex >= this.values.length) this.currentIndex = this.values.length - 1;
    if(this.currentIndex < 0) this.currentIndex = 0;
    this.currentDisplayIndex = this.loopEnabled ? this.loopBaseOffset + this.currentIndex : this.currentIndex;
  }
  emitChange(){
    if(!this.el) return;
    const value = this.getValue();
    this.el.dispatchEvent(new CustomEvent('wheelchange',{ bubbles:true, detail:{ value }}));
  }
  prefersReducedMotion(){
    if(this._prefersReducedMotion != null) return this._prefersReducedMotion;
    try {
      this._prefersReducedMotion = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch { this._prefersReducedMotion = false; }
    return this._prefersReducedMotion;
  }
  refreshMetrics(){
    if(!this.el) return;
    const sample = this.el.querySelector('.picker-item');
    if(sample){
      const rect = sample.getBoundingClientRect();
      if(rect.height) this.itemHeight = rect.height;
    }
    if(!this.itemHeight) this.itemHeight = 40;
    const colRect = this.el.getBoundingClientRect();
    if(colRect.height){
      const pad = Math.max(0, (colRect.height - this.itemHeight) / 2);
      this.pad = pad;
      this.el.style.paddingTop = `${pad}px`;
      this.el.style.paddingBottom = `${pad}px`;
    }
  }
  handleResize(){
    const prevPad = this.pad;
    const prevItem = this.itemHeight;
    this.refreshMetrics();
    if(prevPad !== this.pad || prevItem !== this.itemHeight){
      this.realign(true);
    }
  }
  handleClick(e){
    const item = e.target.closest('.picker-item');
    if(!item) return;
    const baseIndex = parseInt(item.dataset.baseIndex ?? '-1', 10);
    if(baseIndex >= 0) this.scrollToIndex(baseIndex, false);
  }
  handlePointerDown(){
    this._pointerActive = true;
    if(this._snapTimer) clearTimeout(this._snapTimer);
  }
  handlePointerUp(){
    if(!this._pointerActive) return;
    this._pointerActive = false;
    this.snapToNearest();
  }
  handleKeyDown(e){
    if(e.key === 'ArrowUp' || e.key === 'PageUp'){ e.preventDefault(); this.scrollToIndex(this.currentIndex - 1, false); }
    else if(e.key === 'ArrowDown' || e.key === 'PageDown'){ e.preventDefault(); this.scrollToIndex(this.currentIndex + 1, false); }
    else if(e.key === 'Home'){ e.preventDefault(); this.scrollToIndex(0, true); }
    else if(e.key === 'End'){ e.preventDefault(); this.scrollToIndex(this.values.length - 1, true); }
  }
  handleScroll(){
    if(this._suspend) return;
    this.updateCurrentIndex();
    if(this._pointerActive) return;
    this.scheduleSnap();
  }
  scheduleSnap(){
    if(this._suspend) return;
    if(this._snapTimer) clearTimeout(this._snapTimer);
    this._snapTimer = setTimeout(()=> this.snapToNearest(), 100);
  }
  snapToNearest(){
    if(this._snapTimer){ clearTimeout(this._snapTimer); this._snapTimer = null; }
    if(this._pointerActive) return;
    this.updateCurrentIndex();
    this.scrollToIndex(this.currentIndex, false);
  }
  updateCurrentIndex(){
    if(!this.el || !this.values.length || !this.itemHeight) return;
    if(this.displayCount === 0) return;

    const raw = this.el.scrollTop / this.itemHeight;
    let displayIndex = Math.round(raw);

    if(this.loopEnabled){
      const span = this.loopSetSize;
      const min = this.loopBaseOffset;
      const max = this.loopBaseOffset + span - 1;
      if(displayIndex < min){
        displayIndex += span;
        this._suspend = true;
        this.el.scrollTop += span * this.itemHeight;
        this._suspend = false;
      } else if(displayIndex > max){
        displayIndex -= span;
        this._suspend = true;
        this.el.scrollTop -= span * this.itemHeight;
        this._suspend = false;
      }
    }
    displayIndex = Math.max(0, Math.min(this.displayCount - 1, displayIndex));
    const node = this.el.children[displayIndex];
    const baseIndex = node ? parseInt(node.dataset.baseIndex ?? '0', 10) : 0;

    this.currentDisplayIndex = displayIndex;
    const changed = baseIndex !== this.currentIndex;
    this.currentIndex = baseIndex;
    this.applySelection();
    if(changed) this.emitChange();
  }
  applySelection(){
    if(!this.el) return;
    const items = this.el.children;
    for(let i=0; i<items.length; i++){
      const selected = i === this.currentDisplayIndex;
      items[i].classList.toggle('selected', selected);
      items[i].setAttribute('aria-selected', selected ? 'true' : 'false');
    }
  }
  realign(instant){
    if(!this.values.length) return;
    this.jumpToDisplayIndex(instant);
    this.applySelection();
  }
  jumpToDisplayIndex(instant){
    if(!this.el || !this.values.length) return;
    const top = Math.max(0, this.currentDisplayIndex * this.itemHeight);
    const useSmooth = !instant && !this.prefersReducedMotion();
    this._suspend = true;
    if(useSmooth){
      this.el.scrollTo({ top, behavior: 'smooth' });
      if(this._releaseTimer) clearTimeout(this._releaseTimer);
      this._releaseTimer = setTimeout(()=>{
        this.el.scrollTop = top;
        this._suspend = false;
        this.applySelection();
      }, 240);
    } else {
      this.el.scrollTop = top;
      this._suspend = false;
    }
  }
  scrollToIndex(idx, instant=true){
    if(!this.values.length) return;
    const span = this.loopSetSize;
    let target = idx;
    if(this.loopEnabled){
      target = ((idx % span) + span) % span;
    } else {
      target = Math.max(0, Math.min(span - 1, idx));
    }
    const changed = target !== this.currentIndex;
    this.currentIndex = target;
    this.currentDisplayIndex = this.loopEnabled ? this.loopBaseOffset + target : target;
    this.refreshMetrics();
    this.jumpToDisplayIndex(instant);
    this.applySelection();
    if(changed) this.emitChange();
  }
  setValue(value, instant=true){
    if(!this.values.length) return;
    let idx = this.values.indexOf(value);
    if(idx === -1) idx = 0;
    this.scrollToIndex(idx, instant);
  }
  setOptions(values, preferredValue=null){
    if(!this.el || !Array.isArray(values)) return;
    const prevValue = this.getValue();
    this.populate(values);
    this.refreshMetrics();
    if(!this.values.length){
      this.applySelection();
      return;
    }
    const targetValue = preferredValue && this.values.includes(preferredValue)
      ? preferredValue
      : (this.values.includes(prevValue) ? prevValue : this.values[0]);
    const targetIndex = this.values.indexOf(targetValue);
    this.scrollToIndex(targetIndex, true);
  }
  getValue(){
    if(!this.values.length) return null;
    return this.values[this.currentIndex] ?? this.values[0] ?? null;
  }
}

function createTimeWheelController({ hourSelector, minuteSelector, periodSelector, hours, minutes, periods, defaultSelection={}, loop={} }){
  const config = {
    hourSelector, minuteSelector, periodSelector,
    hours: Array.isArray(hours) && hours.length ? hours.slice() : ['12'],
    minutes: Array.isArray(minutes) && minutes.length ? minutes.slice() : ['00'],
    periods: Array.isArray(periods) && periods.length ? periods.slice() : ['AM', 'PM'],
    loop: {
      hour:   loop.hour   !== undefined ? !!loop.hour   : true,
      minute: loop.minute !== undefined ? !!loop.minute : true,
      period: loop.period !== undefined ? !!loop.period : true,
    },
  };
  const fallback = {
    hour:  defaultSelection.hour  && config.hours.includes(defaultSelection.hour)   ? defaultSelection.hour  : config.hours[0],
    minute:defaultSelection.minute&& config.minutes.includes(defaultSelection.minute)? defaultSelection.minute: config.minutes[0],
    period:defaultSelection.period&& config.periods.includes(defaultSelection.period)? defaultSelection.period: config.periods[0],
  };
  const getEl = (sel)=> typeof sel === 'string' ? document.querySelector(sel) : sel;
  return {
    config: { ...config, defaultSelection: { ...fallback } },
    wheels: null,
    ensure(){
      if(this.wheels) return;
      const hourEl   = getEl(config.hourSelector);
      const minuteEl = getEl(config.minuteSelector);
      const periodEl = getEl(config.periodSelector);
      if(!hourEl || !minuteEl || !periodEl) return;
      this.wheels = {
        hour:   new WheelColumn(hourEl, config.hours,   { loop: config.loop.hour }),
        minute: new WheelColumn(minuteEl, config.minutes,{ loop: config.loop.minute }),
        period: new WheelColumn(periodEl, config.periods,{ loop: config.loop.period }),
      };
    },
    setSelection(parts, instant=true){
      this.ensure();
      if(!this.wheels) return;
      const target = {
        hour: parts?.hour ?? this.config.defaultSelection.hour,
        minute: parts?.minute ?? this.config.defaultSelection.minute,
        period: parts?.period ?? this.config.defaultSelection.period,
      };
      this.wheels.hour.setValue(target.hour, instant);
      this.wheels.minute.setValue(target.minute, instant);
      this.wheels.period.setValue(target.period, instant);
    },
    read(){
      this.ensure();
      if(!this.wheels) return { ...this.config.defaultSelection };
      return {
        hour: this.wheels.hour.getValue() ?? this.config.defaultSelection.hour,
        minute: this.wheels.minute.getValue() ?? this.config.defaultSelection.minute,
        period: this.wheels.period.getValue() ?? this.config.defaultSelection.period,
      };
    }
  };
}

function timePartsFromMins(mins){
  if(typeof mins !== 'number' || Number.isNaN(mins)) return null;
  let total = mins % (24 * 60);
  if(total < 0) total += 24 * 60;
  const h24 = Math.floor(total / 60);
  const minute = String(total % 60).padStart(2, '0');
  const period = h24 >= 12 ? 'PM' : 'AM';
  let hour = h24 % 12;
  if(hour === 0) hour = 12;
  return { hour: String(hour), minute, period };
}
function parseTimeLabelToParts(label){
  const clean = stripOrdinals((label || '').trim()).replace(/\s+/g,'').toUpperCase();
  const match = clean.match(/^([1-9]|1[0-2]):([0-5][0-9])([AP]M)$/);
  if(!match) return null;
  const [, rawHour, minute, period] = match;
  return { hour: String(parseInt(rawHour, 10)), minute, period };
}

/* =========================
   Guests (unchanged UI)
   ========================= */
function guestStyle(g){
  const palette = [
    { bg: '#e6f0eb', text: '#1f3a2a', border: '#cfe2d7' },
    { bg: '#e8eef8', text: '#23324a', border: '#d7e1f3' },
    { bg: '#f7efe6', text: '#493521', border: '#eadfce' },
    { bg: '#f3e8f8', text: '#3f2a4a', border: '#e7d6f0' },
    { bg: '#eaf7f0', text: '#234334', border: '#d8efe4' },
    { bg: '#fff0f3', text: '#5a2a34', border: '#f8d6dd' },
  ];
  const i = (g.id - 1) % palette.length;
  return palette[i];
}
function activeGuestIds(){ return State.guests.filter(g=>g.active).map(g=>g.id); }
function allGuestIds(){ return State.guests.map(g=>g.id); }

function ensureSelectedGuest(){
  if(State.guests.length === 0){
    State.selectedGuestId = null;
    return;
  }
  if(!State.guests.some(g => g.id === State.selectedGuestId)){
    State.selectedGuestId = State.guests[0].id;
  }
}

function removeGuestFromSelections(guestId){
  const map = State.guestActivitySelections;
  for(const iso of Object.keys(map)){
    const isoMap = map[iso];
    for(const key of Object.keys(isoMap)){
      if(isoMap[key] && isoMap[key][guestId]){
        delete isoMap[key][guestId];
      }
      if(isoMap[key] && Object.keys(isoMap[key]).length === 0){
        delete isoMap[key];
      }
    }
    if(Object.keys(isoMap).length === 0){
      delete map[iso];
    }
  }
}

function renderGuests(){
  if(!guestsChipsEl) return;
  ensureSelectedGuest();
  guestsChipsEl.innerHTML = '';
  if(State.guests.length===0){
    guestsChipsEl.innerHTML = `<span class="muted" style="padding:4px 0;">No guests yet</span>`;
    renderActivitiesForDate(isoFor(State.selectedDate));
    return;
  }
  for(const g of State.guests){
    const isSelected = g.id === State.selectedGuestId;
    g.active = isSelected;
    const chip = document.createElement('div');
    chip.className = 'gchip' + (isSelected ? ' active' : '');
    chip.dataset.id = g.id;

    const s = guestStyle(g);
    chip.style.borderColor = s.border;
    chip.style.background  = isSelected ? s.bg : '#fff';
    chip.innerHTML = `
      <span class="dot" style="background:${s.text};"></span>
      <span class="name" style="color:${isSelected ? s.text : 'inherit'}">${g.name}</span>
      <span class="x" title="Remove">×</span>
    `;
    chip.addEventListener('click', (e)=>{
      if(e.target.classList.contains('x')) return;
      State.selectedGuestId = g.id;
      renderGuests();
      renderActivitiesForDate(isoFor(State.selectedDate));
      renderPreview();
    });
    chip.querySelector('.x')?.addEventListener('click', (e)=>{
      e.stopPropagation();
      removeGuestFromSelections(g.id);
      const wasPrimary = g.primary;
      State.guests = State.guests.filter(x=>x.id!==g.id);
      if(wasPrimary && State.guests[0]) State.guests[0].primary = true;
      ensureSelectedGuest();
      renderGuests();
      renderActivitiesForDate(isoFor(State.selectedDate));
      renderPreview();
    });
    guestsChipsEl.appendChild(chip);
  }
}
(function initGuests(){
  addGuestBtn?.addEventListener('click', ()=>{
    const input = prompt('Guest full name?')?.trim();
    if(!input) return;
    const g = { id: State.nextGuestId++, name: input, active: true, primary: State.guests.length===0 };
    State.guests.push(g);
    State.selectedGuestId = g.id;
    renderGuests(); renderActivitiesForDate(isoFor(State.selectedDate)); renderPreview();
  });
  renderGuests();
})();

/* =========================
   Calendar
   ========================= */
(function initCalendar(){
  if(!calGrid) return;
  State.selectedDate.setHours(0,0,0,0);
  State.viewY = State.selectedDate.getFullYear();
  State.viewM = State.selectedDate.getMonth();
  renderCalendar(State.viewY, State.viewM);
  focusDate(State.selectedDate);

  $$('#prevMonth')?.addEventListener('click', ()=> shiftMonth(-1));
  $$('#nextMonth')?.addEventListener('click', ()=> shiftMonth(+1));
  $$('#prevYear') ?.addEventListener('click', ()=> { State.viewY--; renderCalendar(State.viewY, State.viewM); });
  $$('#nextYear') ?.addEventListener('click', ()=> { State.viewY++; renderCalendar(State.viewY, State.viewM); });
  $$('#todayBtn')?.addEventListener('click', ()=>{
    State.selectedDate = new Date();
    State.selectedDate.setHours(0,0,0,0);
    State.viewY = State.selectedDate.getFullYear();
    State.viewM = State.selectedDate.getMonth();
    renderCalendar(State.viewY, State.viewM);
    focusDate(State.selectedDate);
  });

  function shiftMonth(delta){
    let m = State.viewM + delta, y = State.viewY;
    if(m < 0){ m = 11; y--; }
    if(m > 11){ m = 0; y++; }
    State.viewM = m; State.viewY = y;
    renderCalendar(y, m);
  }

  function renderCalendar(year, month){
    const monthName = new Date(year, month, 1).toLocaleString('en-US', { month: 'long' });
    const mt = $$('#calTitleMonth'), yr = $$('#calTitleYear');
    if(mt && yr){ mt.textContent = monthName; yr.textContent = String(year); }

    calGrid.innerHTML = '';
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const daysPrev = new Date(year, month, 0).getDate();

    for(let i = startDay-1; i >= 0; i--) calGrid.appendChild(makeCell(year, month-1, daysPrev - i, true));
    for(let d=1; d<=daysInMonth; d++)  calGrid.appendChild(makeCell(year, month, d, false));

    const cellsSoFar = calGrid.querySelectorAll('.cal-cell').length;
    const need = Math.max(0, 42 - cellsSoFar);
    for(let d=1; d<=need; d++) calGrid.appendChild(makeCell(year, month+1, d, true));

    highlightSelected();
  }

  function makeCell(y, m, d, isOut){
    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (isOut ? ' out' : '');
    const date = new Date(y, m, d); date.setHours(0,0,0,0);
    cell.textContent = String(date.getDate());
    cell.dataset.date = date.toISOString();
    if(isSameDate(date, State.today)) cell.classList.add('today');

    cell.addEventListener('click', ()=>{
      State.selectedDate = date;
      if(isOut){
        State.viewY = date.getFullYear(); State.viewM = date.getMonth();
        renderCalendar(State.viewY, State.viewM);
      } else {
        highlightSelected();
      }
      focusDate(State.selectedDate);
    });

    return cell;
  }

  function highlightSelected(){
    const sel = isoFor(State.selectedDate);
    calGrid.querySelectorAll('.cal-cell.sel').forEach(c=>c.classList.remove('sel'));
    const match = Array.from(calGrid.querySelectorAll('.cal-cell'))
      .find(c => c.dataset.date && c.dataset.date.slice(0,10)===sel);
    match && match.classList.add('sel');
  }

  function focusDate(date){
    if(dayTitleEl){ dayTitleEl.innerHTML = formatDateWithOrdinalHTML(date); }
    // ⏱ INSTANT render from embedded data (no loading text ever)
    renderActivitiesForDate(isoFor(date));
    renderPreview();
  }
})();

/* =========================
   ACTIVITIES (instant, time range + title only)
   ========================= */
function getSeasons(){ return (DataStore.activitiesSeasons?.seasons?.length ? DataStore.activitiesSeasons.seasons : EMBED_ACTIVITIES_SEASONS).slice(); }
function getCatalog(){ return (DataStore.activitiesCatalog?.catalog && Object.keys(DataStore.activitiesCatalog.catalog).length ? DataStore.activitiesCatalog.catalog : EMBED_ACTIVITIES_CATALOG); }

function inRange(dateISO, season){
  const x = dateISO;
  return (!season.start || x >= season.start) && (!season.end || x <= season.end);
}
function activitiesForDate(iso){
  const date = parseISO(iso);
  const wkey = weekdayKey(date);
  const seasons = getSeasons().filter(s => inRange(iso, s));
  const cat = getCatalog();

  const map = new Map();
  for(const s of seasons){
    const daySlots = s.weekly?.[wkey] || [];
    for(const slot of daySlots){
      const slug = slot.slug || slot.activity || slot.id || null;
      const meta = slug ? cat[slug] : null;
      const startLabel = slot.time || slot.start;
      if(!startLabel) continue;
      const start = minsFromHHMM(startLabel);
      let end = null;
      if(slot.end){
        end = minsFromHHMM(slot.end);
      } else if(typeof slot.duration_min === 'number'){ end = start + slot.duration_min; }
      else if(typeof slot.duration === 'number'){ end = start + slot.duration; }
      else if(meta && typeof meta.duration_min === 'number'){ end = start + meta.duration_min; }
      else { end = start + 60; }
      if(!Number.isFinite(end) || end <= start){ end = start + 15; }
      const title = slot.title || meta?.title || slug || 'Activity';
      const base = (slug || title).toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const key = `${base || 'activity'}-${start}-${end}`;
      if(!map.has(key)){
        map.set(key, {
          key,
          slug,
          startMins: start,
          endMins: end,
          title,
          season: s.name || ''
        });
      }
    }
  }
  const items = Array.from(map.values());
  items.sort((a,b)=> a.startMins - b.startMins || a.title.localeCompare(b.title));
  return items;
}

function toggleGuestActivitySelection(iso, key, guestId, shouldCheck){
  if(!guestId) return;
  if(!State.guestActivitySelections[iso]) State.guestActivitySelections[iso] = Object.create(null);
  const isoMap = State.guestActivitySelections[iso];
  if(!isoMap[key]) isoMap[key] = Object.create(null);
  if(shouldCheck){
    isoMap[key][guestId] = true;
  } else {
    delete isoMap[key][guestId];
    if(Object.keys(isoMap[key]).length === 0){
      delete isoMap[key];
    }
  }
  if(Object.keys(isoMap).length === 0){
    delete State.guestActivitySelections[iso];
  }
}

function renderActivitiesForDate(iso){
  const target = activitiesScheduleEl;
  if(!target) return;
  const list = activitiesForDate(iso);
  target.innerHTML = '';

  if(list.length === 0){
    target.innerHTML = '<li class="empty">No activities scheduled for this day.</li>';
    return;
  }

  const guestId = State.selectedGuestId;
  for(const it of list){
    const li = document.createElement('li');
    li.className = 'activity-card';

    const label = document.createElement('label');
    label.className = 'activity-check';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'activity-checkbox';
    const safeId = `activity-${iso}-${it.key}`.replace(/[^a-z0-9_-]/gi,'-');
    checkbox.id = safeId;
    checkbox.disabled = !guestId;
    const checked = guestId ? !!(State.guestActivitySelections[iso]?.[it.key]?.[guestId]) : false;
    checkbox.checked = checked;
    checkbox.addEventListener('change', ()=>{
      const activeGuest = State.selectedGuestId;
      if(!activeGuest){
        checkbox.checked = false;
        return;
      }
      toggleGuestActivitySelection(iso, it.key, activeGuest, checkbox.checked);
    });

    const mark = document.createElement('span');
    mark.className = 'activity-checkmark';
    mark.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.className = 'activity-text';
    const timeSpan = document.createElement('span');
    timeSpan.className = 'activity-time';
    timeSpan.textContent = `${formatMins(it.startMins)} - ${formatMins(it.endMins)}`;
    const sep = document.createElement('span');
    sep.className = 'activity-sep';
    sep.textContent = '|';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'activity-title';
    titleSpan.textContent = it.title;

    text.append(timeSpan, sep, titleSpan);
    label.append(checkbox, mark, text);
    li.append(label);
    target.append(li);
  }
}

/* Also re-render once YAML is ready (silently swaps data if different) */
document.addEventListener('chs:data-ready', ()=>{
  renderActivitiesForDate(isoFor(State.selectedDate));
});

/* =========================
   IO editor + Preview (unchanged logic)
   ========================= */
(function initIO(){
  ioCheckInTime.value  = Config.checkIn.timeLabel;
  ioCheckInNote.value  = Config.checkIn.note;
  ioCheckOutTime.value = Config.checkOut.timeLabel;
  ioCheckOutNote.value = Config.checkOut.note;

  const sync = ()=>{
    Config.checkIn.timeLabel  = ioCheckInTime.value.trim() || "4:00pm";
    Config.checkIn.note       = ioCheckInNote.value.trim() || "Welcome to arrive as early as 12:00pm";
    Config.checkOut.timeLabel = ioCheckOutTime.value.trim() || "11:00am";
    Config.checkOut.note      = ioCheckOutNote.value.trim() || "Welcome to stay on property until 1:00pm";
    renderPreview();
  };
  [ioCheckInTime, ioCheckInNote, ioCheckOutTime, ioCheckOutNote].forEach(el=>{
    el?.addEventListener('input', sync);
    el?.addEventListener('change', sync);
  });
})();

function renderPreview(){
  if(!itineraryBody) return;
  if(!State.rangeStartISO || !State.rangeEndISO){
    itineraryBody.innerHTML = `
      <h3 class="preview-heading">Current Itinerary:</h3>
      <p class="muted">Select <strong>Set Arrival</strong> and <strong>Set Departure</strong> to begin.</p>
    `;
    return;
  }
  const start = parseISO(State.rangeStartISO);
  const end   = parseISO(State.rangeEndISO);

  let html = `<h3 class="preview-heading">Current Itinerary:</h3>`;
  for(let d=new Date(start); d<=end; d=addDays(d,1)){
    const iso = isoFor(d);
    const label = formatDateWithOrdinalHTML(d);
    html += `<div style="font-weight:700; margin-top:10px;">${label}</div>`;
    html += `<ul style="margin:6px 0 0 0; padding:0; list-style:none;">`;
    if(iso===State.rangeStartISO){
      html += `<li style="padding:4px 0;">${Config.checkIn.timeLabel} ${Config.checkIn.line} | ${Config.checkIn.note}</li>`;
    }
    html += `<li style="padding:4px 0; color:#6b6d70;">(Activities appear in the center column.)</li>`;
    if(iso===State.rangeEndISO){
      html += `<li style="padding:4px 0;">${Config.checkOut.timeLabel} ${Config.checkOut.line} | ${Config.checkOut.note}</li>`;
    }
    html += `</ul>`;
  }
  itineraryBody.innerHTML = html;
}

/* =========================
   Dinner + Spa pickers (time wheels fixed via userSelect: none)
   ========================= */
const dinnerTimeController = createTimeWheelController({
  hourSelector: '#dinnerHourCol',
  minuteSelector: '#dinnerMinuteCol',
  periodSelector: '#dinnerPeriodCol',
  hours: ['5','6','7','8'],
  minutes: ['00','15','30','45'],
  periods: ['PM'],
  defaultSelection: { hour: '7', minute: '00', period: 'PM' }
});
const DinnerMinuteOptions = { '5':['30','45'], '6':['00','15','30'], '7':['00','15','30','45'], '8':['00'] };

const DinnerPicker = {
  lastSelection: null,
  context: null,
  open(item=null, iso=isoFor(State.selectedDate)){
    const modal = $$('#modal-dinner'); if(!modal) return;
    dinnerTimeController.ensure();
    const titleEl = $$('#dinnerTitle');
    const confirmBtn = $$('#confirmDinnerBtn');
    const isEdit = !!item;
    this.context = { mode: isEdit ? 'edit' : 'add', iso, item };
    if(titleEl) titleEl.textContent = isEdit ? 'Edit Dinner Time' : 'Choose Dinner Time';
    if(confirmBtn) confirmBtn.textContent = isEdit ? 'Update' : 'Add';

    const targetParts = item
      ? timePartsFromMins(item.startMins)
      : (this.lastSelection || dinnerTimeController.config.defaultSelection);

    const hourWheel = dinnerTimeController.wheels?.hour;
    const minuteWheel = dinnerTimeController.wheels?.minute;

    modal.hidden = false;
    requestAnimationFrame(()=> {
      dinnerTimeController.setSelection(targetParts || dinnerTimeController.config.defaultSelection, true);
      if(hourWheel && minuteWheel){
        const hourValue = dinnerTimeController.wheels.hour.getValue();
        const minutes = DinnerMinuteOptions[hourValue] || dinnerTimeController.config.minutes;
        minuteWheel.setOptions(minutes, targetParts?.minute || minuteWheel.getValue());
      }
    });
  },
  close(){ const modal = $$('#modal-dinner'); if(modal) modal.hidden = true; this.context = null; },
  read(){ const sel = dinnerTimeController.read(); this.lastSelection = sel; return sel; }
};
(function initDinnerModal(){
  const modal   = $$('#modal-dinner');
  const openBtn = $$('#addDinner');
  const confirm = $$('#confirmDinnerBtn');

  dinnerTimeController.ensure();
  const hourWheel = dinnerTimeController.wheels?.hour;
  const minuteWheel = dinnerTimeController.wheels?.minute;

  if(hourWheel && minuteWheel){
    const syncMinutes = (hourValue, preferredMinute)=>{
      const allowed = DinnerMinuteOptions[hourValue] || dinnerTimeController.config.minutes;
      minuteWheel.setOptions(allowed, preferredMinute);
    };
    hourWheel.el.addEventListener('wheelchange', (e)=>{
      const hourValue = e?.detail?.value || hourWheel.getValue();
      const minuteValue = minuteWheel.getValue();
      syncMinutes(hourValue, minuteValue);
    });
    syncMinutes(hourWheel.getValue(), minuteWheel.getValue());
  }

  openBtn?.addEventListener('click', ()=> DinnerPicker.open());
  modal?.addEventListener('click', (e)=>{
    if(e.target.matches('[data-dismiss="modal"], .modal-backdrop')) DinnerPicker.close();
  });

  confirm?.addEventListener('click', ()=>{
    const sel = DinnerPicker.read();
    const mins = hhmmAPToMins(sel.hour, sel.minute, sel.period);
    const { startMins, endMins } = Config.dinner;
    if(mins < startMins || mins > endMins){ alert('Dinner must be between 5:30pm and 8:00pm.'); return; }
    DinnerPicker.close();
  });
})();

const spaTimeController = createTimeWheelController({
  hourSelector: '#spaHourCol',
  minuteSelector: '#spaMinuteCol',
  periodSelector: '#spaPeriodCol',
  hours: ['8','9','10','11','12','1','2','3','4','5','6','7'],
  minutes: ['00','05','10','15','20','25','30','35','40','45','50','55'],
  periods: ['AM','PM'],
  defaultSelection: { hour: '11', minute: '00', period: 'AM' }
});
const SpaPicker = {
  lastSelection: null,
  context: null,
  open(item=null, iso=isoFor(State.selectedDate)){
    const modal = $$('#modal-spa'); if(!modal) return;
    spaTimeController.ensure();
    const titleEl = $$('#spaTitle');
    const confirmBtn = $$('#confirmSpaBtn');
    const isEdit = !!item;
    this.context = { mode: isEdit ? 'edit' : 'add', iso, item };
    if(titleEl) titleEl.textContent = isEdit ? 'Edit Spa Service' : 'Add Spa Service';
    if(confirmBtn) confirmBtn.textContent = isEdit ? 'Update' : 'Add';

    const targetParts = item
      ? timePartsFromMins(item.startMins)
      : (this.lastSelection || spaTimeController.config.defaultSelection);

    modal.hidden = false;
    requestAnimationFrame(()=> spaTimeController.setSelection(targetParts || spaTimeController.config.defaultSelection, true));
  },
  close(){ const modal = $$('#modal-spa'); if(modal) modal.hidden = true; this.context = null; },
};
(function initSpaModal(){
  const modal   = $$('#modal-spa');
  const openBtn = $$('#addSpa');
  const confirm = $$('#confirmSpaBtn');

  openBtn?.addEventListener('click', ()=> SpaPicker.open());
  modal?.addEventListener('click', (e)=>{
    if(e.target.matches('[data-dismiss="modal"], .modal-backdrop')) SpaPicker.close();
  });
  confirm?.addEventListener('click', ()=>{ SpaPicker.close(); });
})();

/* Copy button */
copyBtn?.addEventListener('click', ()=>{
  const text = itineraryBody.innerText || '';
  if(!text.trim()) return;
  navigator.clipboard?.writeText(text).then(showToast).catch(()=> showToast());
});
function showToast(){ const t=$$('#toast'); if(!t) return; t.hidden=false; setTimeout(()=>{ t.hidden=true; }, 900); }
