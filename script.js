console.log("Itinerary Builder is working ✅");
/* ========= Data bootstrap (YAML -> JS) ========= */
window.DataStore = {
  spaMenu: { services: {} },
  activitiesCatalog: { catalog: {} },
  activitiesSeasons: { seasons: [] },
  copySnippets: { ui: {}, email_intro: {} },
  ready: false,
};

async function loadText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return await res.text();
}

async function initDataStore() {
  try {
    const [spaY, actCatY, actSeasonsY, copyY] = await Promise.all([
      loadText("data/spa.menu.yml"),
      loadText("data/activities.catalog.yml"),
      loadText("data/activities.seasons.yml"),
      loadText("data/copy.snippets.yml"),
    ]);

    // js-yaml provided by index.html CDN
    DataStore.spaMenu            = jsyaml.load(spaY)         || DataStore.spaMenu;
    DataStore.activitiesCatalog  = jsyaml.load(actCatY)      || DataStore.activitiesCatalog;
    DataStore.activitiesSeasons  = jsyaml.load(actSeasonsY)  || DataStore.activitiesSeasons;
    DataStore.copySnippets       = jsyaml.load(copyY)        || DataStore.copySnippets;

    DataStore.ready = true;

    // Simple sanity log so you can confirm it loaded
    console.log("[DataStore] ready ✓", {
      spaServices: Object.keys(DataStore.spaMenu.services || {}).length,
      activities:  Object.keys(DataStore.activitiesCatalog.catalog || {}).length,
      seasons:     (DataStore.activitiesSeasons.seasons || []).length,
    });
  } catch (err) {
    console.error("[DataStore] load error", err);
  }
}

// Kick off loading but don’t block the UI
initDataStore();
/* =========================
   Config
   ========================= */
const Config = {
  dinner: { startMins: 17 * 60 + 30, endMins: 20 * 60, step: 15 }, // 5:30–8:00pm
  checkIn:  { timeLabel: "4:00pm",  line: "Guaranteed Check-In", note: "Welcome to arrive as early as 12:00pm" },
  checkOut: { timeLabel: "11:00am", line: "Check-Out",          note: "Welcome to stay on property until 1:00pm" },
  locations: {
    dinner: "Harvest",
    spa: "Spa"
  }
};

/* Guest colors (soft pastels) */
const GuestPalette = [
  { bg: '#e6f0eb', text: '#1f3a2a', border: '#cfe2d7' },
  { bg: '#e8eef8', text: '#23324a', border: '#d7e1f3' },
  { bg: '#f7efe6', text: '#493521', border: '#eadfce' },
  { bg: '#f3e8f8', text: '#3f2a4a', border: '#e7d6f0' },
  { bg: '#eaf7f0', text: '#234334', border: '#d8efe4' },
  { bg: '#fff0f3', text: '#5a2a34', border: '#f8d6dd' },
];
function guestStyle(g){
  const i = (g.id - 1) % GuestPalette.length;
  return GuestPalette[i];
}

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

  guests: [],            // [{id, name, active, primary}]
  nextGuestId: 1,

  expectedArrivalMins: null,
  expectedDepartureMins: null,

  nextItemId: 1
};

const $$  = sel => document.querySelector(sel);
const calGrid    = $$('#calGrid');
const dayTitleEl = $$('#dayTitle');
const dayListEl  = $$('#dayList');
const itineraryBody = $$('#itineraryBody');
const copyBtn    = $$('#copyBtn');
const lunchHint  = $$('#lunchHint');

/* Guests DOM */
const guestsChipsEl = $$('#guestsChips');
const addGuestBtn   = $$('#addGuestBtn');

/* IO editor DOM */
const ioCheckInTime  = $$('#ioCheckInTime');
const ioCheckInNote  = $$('#ioCheckInNote');
const ioCheckOutTime = $$('#ioCheckOutTime');
const ioCheckOutNote = $$('#ioCheckOutNote');
const expectedArrival = $$('#expectedArrival');
const expectedDeparture = $$('#expectedDeparture');

/* =========================
   Wheel utility (non-looping)
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
    if(!this.el.hasAttribute('tabindex')){
      this.el.setAttribute('tabindex', '0');
    }

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
        div.setAttribute('role', 'option');
        frag.appendChild(div);
      });
    }

    this.el.innerHTML = '';
    if(sets > 0){
      this.el.appendChild(frag);
    }
    this.displayCount = this.el.children.length;

    if(this.values.length === 0){
      this.currentIndex = 0;
      this.currentDisplayIndex = 0;
      return;
    }

    if(this.currentIndex >= this.values.length){
      this.currentIndex = this.values.length - 1;
    }
    if(this.currentIndex < 0) this.currentIndex = 0;
    this.currentDisplayIndex = this.loopEnabled ? this.loopBaseOffset + this.currentIndex : this.currentIndex;
  }

  emitChange(){
    if(!this.el) return;
    const value = this.getValue();
    const event = new CustomEvent('wheelchange', {
      bubbles: true,
      detail: { value }
    });
    this.el.dispatchEvent(event);
  }

  prefersReducedMotion(){
    if(this._prefersReducedMotion != null) return this._prefersReducedMotion;
    try {
      this._prefersReducedMotion = typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch(err){
      this._prefersReducedMotion = false;
    }
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
    if(baseIndex >= 0){
      this.scrollToIndex(baseIndex, false);
    }
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
    if(e.key === 'ArrowUp' || e.key === 'PageUp'){
      e.preventDefault();
      this.scrollToIndex(this.currentIndex - 1, false);
    } else if(e.key === 'ArrowDown' || e.key === 'PageDown'){
      e.preventDefault();
      this.scrollToIndex(this.currentIndex + 1, false);
    } else if(e.key === 'Home'){
      e.preventDefault();
      this.scrollToIndex(0, true);
    } else if(e.key === 'End'){
      e.preventDefault();
      this.scrollToIndex(this.values.length - 1, true);
    }
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
    if(this._snapTimer){
      clearTimeout(this._snapTimer);
      this._snapTimer = null;
    }
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
    hourSelector,
    minuteSelector,
    periodSelector,
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
    hour: defaultSelection.hour && config.hours.includes(defaultSelection.hour) ? defaultSelection.hour : config.hours[0],
    minute: defaultSelection.minute && config.minutes.includes(defaultSelection.minute) ? defaultSelection.minute : config.minutes[0],
    period: defaultSelection.period && config.periods.includes(defaultSelection.period) ? defaultSelection.period : config.periods[0],
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
        hour:   new WheelColumn(hourEl, config.hours, { loop: config.loop.hour }),
        minute: new WheelColumn(minuteEl, config.minutes, { loop: config.loop.minute }),
        period: new WheelColumn(periodEl, config.periods, { loop: config.loop.period }),
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
    setFromMinutes(mins, instant=true){
      const parts = timePartsFromMins(mins);
      if(parts){
        this.setSelection(parts, instant);
      } else {
        this.setSelection(this.config.defaultSelection, instant);
      }
    },
    read(){
      this.ensure();
      if(!this.wheels){
        return { ...this.config.defaultSelection };
      }
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
   Guests
   ========================= */
function activeGuestIds(){ return State.guests.filter(g=>g.active).map(g=>g.id); }
function allGuestIds(){ return State.guests.map(g=>g.id); }
function allGuestsActive(){ return State.guests.length>0 && State.guests.every(g=>g.active); }

function renderGuests(){
  if(!guestsChipsEl) return;
  guestsChipsEl.innerHTML = '';
  if(State.guests.length===0){
    guestsChipsEl.innerHTML = `<span class="muted" style="padding:4px 0;">No guests yet</span>`;
    return;
  }
  for(const g of State.guests){
    const chip = document.createElement('div');
    chip.className = 'gchip' + (g.active ? ' active' : '');
    chip.dataset.id = g.id;

    const s = guestStyle(g);
    chip.style.borderColor = s.border;
    chip.style.background  = g.active ? s.bg : '#fff';

    chip.innerHTML = `
      <span class="dot" style="background:${s.text};"></span>
      <span class="name" style="color:${g.active ? s.text : 'inherit'}">${g.name}</span>
      <span class="x" title="Remove">×</span>
    `;
    chip.addEventListener('click', (e)=>{
      if(e.target.classList.contains('x')) return;
      g.active = !g.active;
      renderGuests(); renderDayList(isoFor(State.selectedDate)); renderPreview();
    });
    chip.querySelector('.x')?.addEventListener('click', (e)=>{
      e.stopPropagation();
      const wasPrimary = g.primary;
      State.guests = State.guests.filter(x=>x.id!==g.id);
      if(wasPrimary && State.guests[0]) State.guests[0].primary = true;
      renderGuests(); renderDayList(isoFor(State.selectedDate)); renderPreview();
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
    renderGuests(); renderDayList(isoFor(State.selectedDate)); renderPreview();
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

  // nav
  $$('#prevMonth')?.addEventListener('click', ()=> shiftMonth(-1));
  $$('#nextMonth')?.addEventListener('click', ()=> shiftMonth(+1));
  $$('#prevYear') ?.addEventListener('click', ()=> { State.viewY--; renderCalendar(State.viewY, State.viewM); });
  $$('#nextYear') ?.addEventListener('click', ()=> { State.viewY++; renderCalendar(State.viewY, State.viewM); });

  // Today
  $$('#todayBtn')?.addEventListener('click', ()=>{
    State.selectedDate = new Date();
    State.selectedDate.setHours(0,0,0,0);
    State.viewY = State.selectedDate.getFullYear();
    State.viewM = State.selectedDate.getMonth();
    renderCalendar(State.viewY, State.viewM);
    focusDate(State.selectedDate);
  });

  // Clear All (header top-right)
  $$('#resetBtn')?.addEventListener('click', ()=>{
    if(!confirm('Clear dates and all scheduled items?')) return;
    State.rangeStartISO = null;
    State.rangeEndISO   = null;
    State.itemsByDate   = Object.create(null);
    State.nextItemId    = 1;
    renderCalendar(State.viewY, State.viewM);
    renderDayList(isoFor(State.selectedDate));
    renderPreview();
  });

  // Range buttons
  $$('#setArrivalBtn')?.addEventListener('click', ()=>{
    const iso = isoFor(State.selectedDate);
    State.rangeStartISO = iso;
    if(!State.rangeEndISO || State.rangeEndISO < State.rangeStartISO){
      State.rangeEndISO = State.rangeStartISO;
    }
    paintRange(); renderPreview();
  });
  $$('#setDepartureBtn')?.addEventListener('click', ()=>{
    const iso = isoFor(State.selectedDate);
    if(!State.rangeStartISO){
      State.rangeStartISO = iso; State.rangeEndISO = iso;
    } else {
      if(iso < State.rangeStartISO){ alert("Departure can’t be before arrival."); return; }
      State.rangeEndISO = iso;
    }
    paintRange(); renderPreview();
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

    // leading
    for(let i = startDay-1; i >= 0; i--){
      const d = daysPrev - i;
      calGrid.appendChild(makeCell(year, month-1, d, true));
    }
    // current
    for(let d=1; d<=daysInMonth; d++){
      calGrid.appendChild(makeCell(year, month, d, false));
    }
    // trailing
    const cellsSoFar = calGrid.querySelectorAll('.cal-cell').length;
    const need = Math.max(0, 42 - cellsSoFar);
    for(let d=1; d<=need; d++){
      calGrid.appendChild(makeCell(year, month+1, d, true));
    }

    paintRange();
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

  function paintRange(){
    const s = State.rangeStartISO, e = State.rangeEndISO;
    calGrid.querySelectorAll('.cal-cell').forEach(c=>{
      c.classList.remove('arrival','inrange','departure');
      const iso = c.dataset.date?.slice(0,10);
      if(!iso || !s || !e) return;
      if(iso===s && iso===e) c.classList.add('arrival');
      else if(iso===s) c.classList.add('arrival');
      else if(iso===e) c.classList.add('departure');
      else if(iso>s && iso<e) c.classList.add('inrange');
    });
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
    renderDayList(isoFor(date));
    renderPreview();
  }

  State.focusDate = focusDate;
  State.renderCalendar = renderCalendar;
})();

/* =========================
   IO editor behavior
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

/* =========================
   Overlap detection
   ========================= */
function hasOverlap(iso, startMins, endMins, participantIds, ignoreId=null){
  const day = State.itemsByDate[iso] || [];
  const participants = Array.isArray(participantIds) ? participantIds : [];
  for(const it of day){
    if(ignoreId != null && it.id === ignoreId) continue;
    const itStart = it.startMins;
    const itEnd   = it.endMins ?? (it.startMins + (it.duration || 60));
    const shareGuest = (it.participantIds || []).some(id => participants.includes(id));
    if(shareGuest){
      if(Math.max(itStart, startMins) < Math.min(itEnd, endMins)) return true;
    }
  }
  return false;
}

/* =========================
   Day builder
   ========================= */
(function initDayBuilder(){
  if(!dayListEl) return;

  const mo = new MutationObserver(()=> {
    const y = (new Date()).getFullYear();
    const plain = stripOrdinals(dayTitleEl.textContent || '');
    const d = new Date(`${plain}, ${y}`);
    if(!isNaN(d.getTime())){
      State.selectedDate = d;
      renderDayList(isoFor(d));
      renderPreview();
    }
  });
  mo.observe(dayTitleEl, { childList:true, subtree:true });

  const prevDayBtn = $$('#prevDay');
  const nextDayBtn = $$('#nextDay');

  const shiftDay = (delta)=>{
    const newDate = addDays(State.selectedDate, delta);
    newDate.setHours(0,0,0,0);
    State.selectedDate = newDate;
    State.viewY = newDate.getFullYear();
    State.viewM = newDate.getMonth();
    if(typeof State.renderCalendar === 'function'){
      State.renderCalendar(State.viewY, State.viewM);
    }
    if(typeof State.focusDate === 'function'){
      State.focusDate(newDate);
    }else{
      if(dayTitleEl){ dayTitleEl.innerHTML = formatDateWithOrdinalHTML(newDate); }
      renderDayList(isoFor(newDate));
      renderPreview();
    }
  };

  prevDayBtn?.addEventListener('click', ()=> shiftDay(-1));
  nextDayBtn?.addEventListener('click', ()=> shiftDay(1));

  dayListEl.addEventListener('click', (e)=>{
    const button = e.target.closest('.row-btn[data-action]');
    if(!button) return;
    const action = button.dataset.action;
    const li = button.closest('li');
    if(!li) return;
    const id = parseInt(li.dataset.id, 10);
    if(!Number.isFinite(id)) return;
    const iso = isoFor(State.selectedDate);
    const list = State.itemsByDate[iso] || [];
    const item = list.find(entry => entry.id === id);
    if(!item) return;

    if(action === 'delete'){
      if(confirm(`Delete ${item.title}?`)){
        State.itemsByDate[iso] = list.filter(entry => entry.id !== id);
        renderDayList(iso);
        renderPreview();
      }
    } else if(action === 'edit'){
      if(item.kind === 'dinner'){
        DinnerPicker.open(item, iso);
      } else if(item.kind === 'spa'){
        SpaPicker.open(item, iso);
      } else {
        const updated = prompt('Update item title', item.title);
        if(updated != null){
          const trimmed = updated.trim();
          if(trimmed) item.title = trimmed;
          renderDayList(iso);
          renderPreview();
        }
      }
    }
  });

  $$('#addDinner') ?.addEventListener('click', ()=> DinnerPicker.open());
  $$('#addSpa')    ?.addEventListener('click', ()=> SpaPicker.open());
  $$('#addActivity')?.addEventListener('click', ()=> alert('Activity picker coming next.'));
})();

function locationForItem(it){
  if(it.kind==='dinner') return Config.locations.dinner;
  if(it.kind==='spa')    return Config.locations.spa;
  return it.location || '';
}

/* Day list rendering with warnings */
function renderDayList(iso){
  const stateList = State.itemsByDate[iso] ||= [];
  for(const item of stateList){
    if(item && typeof item.id !== 'number'){
      item.id = State.nextItemId++;
    }
  }
  stateList.sort((a,b)=> a.startMins - b.startMins);

  // Lunch hint (soft): if between 11:00–14:00 free < 60 min
  if(lunchHint){
    lunchHint.hidden = true;
    if(stateList.length){
      const windowStart = 11*60, windowEnd = 14*60;
      const intervals = [];
      for(const item of stateList){
        const start = Math.max(item.startMins, windowStart);
        const end = Math.min((item.endMins ?? item.startMins + (item.duration || 60)), windowEnd);
        if(end > start) intervals.push([start, end]);
      }

      intervals.sort((a,b)=> a[0] - b[0]);

      let busy = 0;
      let current = null;
      for(const [start, end] of intervals){
        if(!current){
          current = [start, end];
        }else if(start <= current[1]){
          current[1] = Math.max(current[1], end);
        }else{
          busy += current[1] - current[0];
          current = [start, end];
        }
      }
      if(current) busy += current[1] - current[0];

      const total = windowEnd - windowStart;
      const free = Math.max(0, total - busy);
      const show = intervals.length > 0 && free < 60;
      lunchHint.hidden = !show;
    }
  }

  if(stateList.length === 0){
    dayListEl.innerHTML = '<li class="empty">No items for this day. Add one above.</li>';
    return;
  }

  dayListEl.innerHTML = '';
  let prev = null;
  for(const it of stateList){
    const li = document.createElement('li');
    li.className = it.kind==='spa' ? 'row--spa' : it.kind==='dinner' ? 'row--dinner' : '';
    if(it.id != null) li.dataset.id = String(it.id);
    if(it.kind) li.dataset.kind = it.kind;
    const loc = locationForItem(it);

    const timeLabel = `${formatMins(it.startMins)}${it.endMins?` – ${formatMins(it.endMins)}`:''}`;

    // Participant tags (colored)
    let tags = '';
    const totalGuests = State.guests.length;
    const participantSet = new Set(Array.isArray(it.participantIds) ? it.participantIds : []);
    const hasAllGuests = totalGuests > 0 && State.guests.every(g => participantSet.has(g.id));

    if(it.kind === 'dinner'){
      if(totalGuests > 0) tags = `<span class="tag everyone">Everyone</span>`;
    }else if(totalGuests > 0 && participantSet.size > 0){
      if(hasAllGuests){
        tags = `<span class="tag everyone">Everyone</span>`;
      }else{
        const colored = State.guests
          .filter(g=> participantSet.has(g.id))
          .map(g=>{
            const s = guestStyle(g);
            return `<span class="tag guest" style="background:${s.bg}; border-color:${s.border}; color:${s.text}">${firstName(g.name)}</span>`;
          });
        tags = colored.join('');
      }
    }

    // Cross-location soft warning
    let warnHTML = '';
    if(prev){
      const prevLoc = locationForItem(prev);
      const gap = it.startMins - (prev.endMins ?? prev.startMins);
      if(prevLoc && loc && prevLoc !== loc && gap < 15){
        warnHTML = `<span class="pill warn inline">⚠ ${gap} min cross-location</span>`;
      }
    }

    // Expected window soft warnings
    let windowWarn = '';
    if(State.expectedArrivalMins != null && it.startMins < State.expectedArrivalMins){
      windowWarn = `<span class="pill warn inline">⏰ Before expected arrival (${formatMins(State.expectedArrivalMins)})</span>`;
    }
    if(State.expectedDepartureMins != null && (it.endMins ?? it.startMins) > State.expectedDepartureMins){
      windowWarn = `<span class="pill warn inline">⏰ After expected departure (${formatMins(State.expectedDepartureMins)})</span>`;
    }

    const supportsEditing = it.kind === 'dinner' || it.kind === 'spa';
    const actionsHTML = `
      <div class="row-actions">
        ${supportsEditing ? '<button class="row-btn" type="button" data-action="edit">Edit</button>' : ''}
        <button class="row-btn danger" type="button" data-action="delete">Delete</button>
      </div>
    `;

    li.innerHTML = `
      <div class="row-top">
        <div class="row-main"><strong>${timeLabel}</strong> | ${it.title}</div>
        ${actionsHTML}
      </div>
      <div class="row-meta">
        ${loc ? `<span class="tag loc">${loc}</span>` : ``}
        <span class="row-tags">${tags}</span>
        ${warnHTML || windowWarn}
      </div>
    `;
    dayListEl.appendChild(li);
    prev = it;
  }

  State.itemsByDate[iso] = stateList;
}

/* =========================
   Preview renderer
   ========================= */
function pluralizeServiceTitle(title){
  if(/massage$/i.test(title)) return title.replace(/massage$/i,'Massages');
  if(/facial$/i.test(title))  return title.replace(/facial$/i,'Facials');
  return `${title}s`;
}

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

  const prefLabel = (p)=> p==='FT' ? 'Female Therapist' : p==='MT' ? 'Male Therapist' : 'No Preference';
  const cabanaLabel = (c)=> c==='same' ? 'Same Cabanas' : 'Separate Cabanas';

  let html = `<h3 class="preview-heading">Current Itinerary:</h3>`;

  for(let d=new Date(start); d<=end; d=addDays(d,1)){
    const iso = isoFor(d);
    const label = formatDateWithOrdinalHTML(d);
    const raw = (State.itemsByDate[iso] || []).slice().sort((a,b)=> a.startMins - b.startMins);

    // Merge identical SPA lines (start, service, duration, pref, cabana)
    const merged = [];
    for(const it of raw){
      if(it.kind!=='spa'){ merged.push(it); continue; }
      const key = ['spa', it.startMins, it.title, it.duration, it.pref, it.cabana].join('|');
      const m = merged.find(x => x._mergeKey === key);
      if(m){
        m.participantIds = Array.from(new Set([...(m.participantIds||[]), ...(it.participantIds||[])]));
      }else{
        const clone = {...it};
        clone._mergeKey = key;
        merged.push(clone);
      }
    }
    const list = merged.length ? merged : raw;

    html += `<div style="font-weight:700; margin-top:10px;">${label}</div>`;
    html += `<ul style="margin:6px 0 0 0; padding:0; list-style:none;">`;

    if(iso===State.rangeStartISO){
      html += `<li style="padding:4px 0;">${Config.checkIn.timeLabel} ${Config.checkIn.line} | ${Config.checkIn.note}</li>`;
    }

    if(list.length===0){
      html += `<li style="padding:4px 0; color:#6b6d70;">(No items yet)</li>`;
    }else{
      for(const it of list){
        const startLabel = formatMins(it.startMins);
        const endLabel   = it.endMins ? formatMins(it.endMins) : null;

        // Title adjustments for SPA
        let lineTitle = it.title;
        if(it.kind==='spa'){
          const multi = Array.isArray(it.participantIds) && it.participantIds.length > 1;
          const baseName = it.title.replace(/^(\d+\-Minute\s+)/i,'');
          const serviceLabel = `${it.duration}-Minute ${multi ? pluralizeServiceTitle(baseName) : baseName}`;
          lineTitle = serviceLabel;
        }

        let line = endLabel
          ? `${startLabel} - ${endLabel} | ${lineTitle}`
          : `${startLabel} | ${lineTitle}`;

        if(it.kind==='spa'){
          line += ` | ${prefLabel(it.pref)} | ${cabanaLabel(it.cabana)}`;
        }

        // Names only if subset (not all)
        const totalGuests = State.guests.length;
        const participantSet = new Set(Array.isArray(it.participantIds) ? it.participantIds : []);
        const hasAllGuests = totalGuests > 0 && State.guests.every(g => participantSet.has(g.id));

        if(it.kind !== 'dinner' && totalGuests > 0 && participantSet.size > 0 && !hasAllGuests){
          const names = State.guests
            .filter(g=> participantSet.has(g.id))
            .map(g=> firstName(g.name))
            .join(', ');
          if(names) line += ` | ${names}`;
        }

        if(it.notes){ line += ` | ${it.notes}`; }

        html += `<li style="padding:4px 0;">${line}</li>`;
      }
    }

    if(iso===State.rangeEndISO){
      html += `<li style="padding:4px 0;">${Config.checkOut.timeLabel} ${Config.checkOut.line} | ${Config.checkOut.note}</li>`;
    }

    html += `</ul>`;
  }

  itineraryBody.innerHTML = html;
}

/* Copy button */
copyBtn?.addEventListener('click', ()=>{
  const text = itineraryBody.innerText || '';
  if(!text.trim()) return;
  navigator.clipboard?.writeText(text).then(showToast).catch(()=> showToast());
});
function showToast(){ const t=$$('#toast'); if(!t) return; t.hidden=false; setTimeout(()=>{ t.hidden=true; }, 900); }

/* =========================
   Dinner Picker (looping)
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

const DinnerMinuteOptions = {
  '5': ['30','45'],
  '6': ['00','15','30'],
  '7': ['00','15','30','45'],
  '8': ['00']
};

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
  close(){
    const modal = $$('#modal-dinner');
    if(modal) modal.hidden = true;
    this.context = null;
  },
  read(){
    const sel = dinnerTimeController.read();
    this.lastSelection = sel;
    return sel;
  }
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

    const context = DinnerPicker.context;
    const iso = context?.iso ?? isoFor(State.selectedDate);
    const participants = allGuestIds();
    const start = mins, end = mins + 60;

    const ignoreId = context?.mode === 'edit' ? context.item?.id ?? null : null;
    if(hasOverlap(iso, start, end, participants, ignoreId)){
      alert('That dinner overlaps with another item for at least one selected guest.');
      return;
    }

    const list = (State.itemsByDate[iso] ||= []);
    if(context?.mode === 'edit' && context.item){
      context.item.startMins = start;
      context.item.endMins = end;
      context.item.participantIds = participants;
    } else {
      list.push({
        id: State.nextItemId++,
        kind:'dinner',
        startMins: start, endMins: end,
        title:'Dinner at Harvest',
        location: Config.locations.dinner,
        notes:'',
        participantIds: participants
      });
    }

    list.sort((a,b)=> a.startMins - b.startMins);

    renderDayList(iso); renderPreview();
    DinnerPicker.close();
  });
})();

/* =========================
   Spa Picker (looping 12h AM/PM, 5-min steps)
   ========================= */
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

    const serviceField  = $$('#spaService');
    const durationField = $$('#spaDuration');
    const prefField     = $$('#spaPref');
    const cabanaField   = $$('#spaCabana');

    if(item){
      if(serviceField) serviceField.value = item.title;
      if(durationField) durationField.value = String(item.duration);
      if(prefField) prefField.value = item.pref;
      if(cabanaField) cabanaField.value = item.cabana;
    } else {
      if(serviceField && serviceField.defaultValue !== undefined) serviceField.value = serviceField.defaultValue;
      if(durationField && durationField.defaultValue !== undefined) durationField.value = durationField.defaultValue;
      if(prefField && prefField.defaultValue !== undefined) prefField.value = prefField.defaultValue;
      if(cabanaField && cabanaField.defaultValue !== undefined) cabanaField.value = cabanaField.defaultValue;
    }

    const targetParts = item
      ? timePartsFromMins(item.startMins)
      : (this.lastSelection || spaTimeController.config.defaultSelection);

    modal.hidden = false;
    requestAnimationFrame(()=> spaTimeController.setSelection(targetParts || spaTimeController.config.defaultSelection, true));
  },
  close(){
    const modal = $$('#modal-spa');
    if(modal) modal.hidden = true;
    this.context = null;
  },
};

(function initSpaModal(){
  const modal   = $$('#modal-spa');
  const openBtn = $$('#addSpa');
  const confirm = $$('#confirmSpaBtn');

  openBtn?.addEventListener('click', ()=> SpaPicker.open());
  modal?.addEventListener('click', (e)=>{
    if(e.target.matches('[data-dismiss="modal"], .modal-backdrop')) SpaPicker.close();
  });

  confirm?.addEventListener('click', ()=>{
    const service  = $$('#spaService').value;
    const duration = parseInt($$('#spaDuration').value, 10);
    const pref     = $$('#spaPref').value;      // NP / FT / MT
    const cabana   = $$('#spaCabana').value;    // same / separate
    const t = spaTimeController.read();
    const mins = hhmmAPToMins(t.hour, t.minute, t.period); // 12h -> mins

    // Limit: 8:00am (480) to 7:00pm (1140)
    if(mins < 8*60 || mins > 19*60){ alert('Spa start must be between 8:00am and 7:00pm.'); return; }

    const context = SpaPicker.context;
    const iso = context?.iso ?? isoFor(State.selectedDate);
    const existing = context?.mode === 'edit' && context.item
      ? Array.isArray(context.item.participantIds) ? context.item.participantIds.slice() : []
      : [];
    const toggled = activeGuestIds();
    const participants = toggled.length ? toggled : (existing.length ? existing : toggled);
    const start = mins, end = mins + duration;

    const ignoreId = context?.mode === 'edit' ? context.item?.id ?? null : null;
    if(hasOverlap(iso, start, end, participants, ignoreId)){
      alert('That spa time overlaps with another item for at least one selected guest.');
      return;
    }

    const list = (State.itemsByDate[iso] ||= []);
    if(context?.mode === 'edit' && context.item){
      context.item.title = service;
      context.item.duration = duration;
      context.item.startMins = start;
      context.item.endMins = end;
      context.item.pref = pref;
      context.item.cabana = cabana;
      context.item.participantIds = participants;
    } else {
      list.push({
        id: State.nextItemId++,
        kind:'spa',
        title: service,
        duration,
        startMins: start,
        endMins: end,
        location: Config.locations.spa,
        pref, cabana,
        participantIds: participants
      });
    }

    list.sort((a,b)=> a.startMins - b.startMins);
    renderDayList(iso); renderPreview();
    SpaPicker.lastSelection = t;
    SpaPicker.close();
  });
})();

/* =========================
   Generic Time Picker for Expected Arr/Dep
   ========================= */
const genericTimeController = createTimeWheelController({
  hourSelector: '#genHourCol',
  minuteSelector: '#genMinuteCol',
  periodSelector: '#genPeriodCol',
  hours: ['1','2','3','4','5','6','7','8','9','10','11','12'],
  minutes: ['00','05','10','15','20','25','30','35','40','45','50','55'],
  periods: ['AM','PM'],
  defaultSelection: { hour: '3', minute: '00', period: 'PM' }
});

const GenTimePicker = {
  target: null,
  lastSelection: null,
  open(targetInput, title='Select Time'){
    this.target = targetInput;
    $$('#timeTitle').textContent = title;
    const modal = $$('#modal-time');
    const parsed = parseTimeLabelToParts(targetInput?.value);
    if(modal) modal.hidden = false;
    requestAnimationFrame(()=>{
      if(parsed){
        genericTimeController.setSelection(parsed, true);
      } else if(this.lastSelection){
        genericTimeController.setSelection(this.lastSelection, true);
      } else {
        genericTimeController.setSelection(genericTimeController.config.defaultSelection, true);
      }
    });
  },
  close(){ $$('#modal-time').hidden = true; this.target = null; },
  read(){
    const sel = genericTimeController.read();
    this.lastSelection = sel;
    return sel;
  }
};

(function initGenericTimePicker(){
  const modal = $$('#modal-time');
  const confirm = $$('#confirmGenTimeBtn');

  document.addEventListener('click', (e)=>{
    if(e.target.matches('[data-dismiss="modal"], .modal-backdrop')) GenTimePicker.close();
    if(e.target.id === 'expectedArrival')  GenTimePicker.open(e.target, 'Expected Arrival');
    if(e.target.id === 'expectedDeparture')GenTimePicker.open(e.target, 'Expected Departure');
  });

  confirm?.addEventListener('click', ()=>{
    if(!GenTimePicker.target){ GenTimePicker.close(); return; }
    const t = GenTimePicker.read();
    const mins = hhmmAPToMins(t.hour, t.minute, t.period);
    const label = `${parseInt(t.hour,10)}:${t.minute}${t.period.toLowerCase()}`;

    if(GenTimePicker.target.id === 'expectedArrival'){
      GenTimePicker.target.value = label;
      State.expectedArrivalMins = mins;
    } else {
      GenTimePicker.target.value = label;
      State.expectedDepartureMins = mins;
    }

    renderDayList(isoFor(State.selectedDate));
    GenTimePicker.close();
  });
})();
// ---- TEMP: On-page data status pill (safe to delete later) ----
(function showDataStatusPill(){
  function make(text, ok=true){
    const host = document.querySelector('.topbar .brand');
    if(!host) return;
    const pill = document.createElement('span');
    pill.style.cssText = `
      margin-left: 8px; padding: 2px 8px; border-radius: 999px;
      font-size: 12px; font-weight: 600; border:1px solid #e0e0e0;
      background:${ok ? '#e8f7ef' : '#fff4f2'}; color:${ok ? '#1e6b47' : '#9a2f1f'};
      vertical-align: middle;
    `;
    pill.textContent = text;
    host.appendChild(pill);
  }

  let tries = 0;
  const timer = setInterval(()=>{
    tries++;

    const ds = window.DataStore || {};
    const spa = Object.keys(ds.spaMenu?.services || {}).length;
    const acts = Object.keys(ds.activitiesCatalog?.catalog || {}).length;
    const seas = Array.isArray(ds.activitiesSeasons?.seasons) ? ds.activitiesSeasons.seasons.length : 0;

    // Wait a bit while data hydrates
    if(!ds.ready && tries < 6){
      if(tries === 1) make('data: loading…', true);
      return;
    }

    // Update pill
    document.querySelectorAll('.topbar .brand > span').forEach((el,i)=>{ if(i>0) el.remove(); });
    make(`data ✓  spa:${spa}  act:${acts}  seasons:${seas}`, true);
    clearInterval(timer);
  }, 500);
})();