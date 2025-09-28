console.log("Itinerary Builder is working ✅");

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
  expectedDepartureMins: null
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
   Looping wheel utility
   ========================= */
class LoopWheel {
  constructor(colEl, baseItems){
    this.col  = colEl;
    this.base = baseItems.slice();
    if(!this.col || this.base.length === 0) return;

    this.loopFactor = Math.max(5, Math.ceil(9 / this.base.length) * 2 + 1);
    this.itemH = 36;
    this.pad   = 72;
    this.ext = [];
    for(let i=0; i<this.loopFactor; i++){
      this.ext.push(...this.base);
    }
    this.midStart = this.base.length * Math.floor(this.loopFactor/2);

    this._suspendSnap = false;
    this._snapTimer   = null;
    this._pointerActive = false;
    this.currentIndex = this.midStart;
    this.currentBaseIndex = 0;

    this._handleResize = ()=> this.handleResize();
    this._boundScroll = (e)=> this.handleScroll(e);
    this._boundWheel = ()=> this.scheduleSnap();
    this._boundPointerDown = ()=> this.handlePointerDown();
    this._boundPointerUp = ()=> this.handlePointerUp();
    this._boundKeyDown = (e)=> this.handleKey(e);

    this.build();
  }

  build(){
    this.col.innerHTML = '';
    const frag = document.createDocumentFragment();
    let i = 0;
    for(const it of this.ext){
      const div = document.createElement('div');
      div.className = 'picker-item';
      div.textContent = it;
      div.setAttribute('role', 'option');
      div.dataset.loopIndex = String(i++);
      frag.appendChild(div);
    }
    this.col.appendChild(frag);
    this.col.setAttribute('role', 'listbox');
    if(!this.col.hasAttribute('tabindex')){
      this.col.setAttribute('tabindex', '0');
    }

    this.refreshMetrics();
    this.scrollToLoopIndex(this.midStart, true);
    this.currentIndex = this.midStart;
    this.currentBaseIndex = 0;
    this.applySelection();
    this.attachListeners();
  }

  refreshMetrics(){
    const sample = this.col.querySelector('.picker-item');
    if(sample){
      const rect = sample.getBoundingClientRect();
      if(rect.height) this.itemH = rect.height;
    }
    if(!this.itemH) this.itemH = 36;
    const colRect = this.col.getBoundingClientRect();
    if(colRect.height){
      const pad = Math.max(0, (colRect.height - this.itemH) / 2);
      this.pad = pad;
      this.col.style.paddingTop = `${pad}px`;
      this.col.style.paddingBottom = `${pad}px`;
    }
  }

  attachListeners(){
    this.col.addEventListener('scroll', this._boundScroll, { passive:true });
    this.col.addEventListener('wheel', this._boundWheel, { passive:true });
    this.col.addEventListener('pointerdown', this._boundPointerDown);
    this.col.addEventListener('pointerup', this._boundPointerUp);
    this.col.addEventListener('pointercancel', this._boundPointerUp);
    this.col.addEventListener('touchend', this._boundPointerUp, { passive:true });
    this.col.addEventListener('keydown', this._boundKeyDown);

    if(typeof ResizeObserver !== 'undefined'){
      this.resizeObserver = new ResizeObserver(this._handleResize);
      this.resizeObserver.observe(this.col);
    }
    window.addEventListener('resize', this._handleResize);
    window.addEventListener('orientationchange', this._handleResize);
  }

  handlePointerDown(){
    this._pointerActive = true;
    if(this._snapTimer) clearTimeout(this._snapTimer);
  }

  handlePointerUp(){
    if(!this._pointerActive) return;
    this._pointerActive = false;
    this.scheduleSnap();
  }

  prefersReducedMotion(){
    try {
      return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch(err){
      return false;
    }
  }

  handleResize(){
    const prevPad = this.pad;
    const prevItemH = this.itemH;
    this.refreshMetrics();
    if(this.pad !== prevPad || this.itemH !== prevItemH){
      this.scrollToBaseIndex(this.currentBaseIndex, true);
    }
  }

  handleKey(e){
    if(e.key === 'ArrowUp' || e.key === 'PageUp'){
      e.preventDefault();
      this.nudge(-1);
    } else if(e.key === 'ArrowDown' || e.key === 'PageDown'){
      e.preventDefault();
      this.nudge(1);
    } else if(e.key === 'Home'){
      e.preventDefault();
      this.scrollToBaseIndex(0, true);
    } else if(e.key === 'End'){
      e.preventDefault();
      this.scrollToBaseIndex(this.base.length-1, true);
    }
  }

  nudge(delta){
    const next = (this.currentBaseIndex + delta + this.base.length) % this.base.length;
    this.scrollToBaseIndex(next);
  }

  handleScroll(){
    this.updateCurrentIndex();
    this.ensureLoopBuffer();
    if(this._suspendSnap) return;
    if(this._pointerActive) return;
    this.scheduleSnap();
  }

  scheduleSnap(){
    if(this._suspendSnap) return;
    if(this._snapTimer) clearTimeout(this._snapTimer);
    this._snapTimer = setTimeout(()=> this.snapToNearest(), 80);
  }

  snapToNearest(){
    this._snapTimer = null;
    this.updateCurrentIndex();
    const targetLoopIdx = this.midStart + this.currentBaseIndex;
    this._suspendSnap = true;
    this.scrollToLoopIndex(targetLoopIdx, false);
    const settleDelay = this.prefersReducedMotion() ? 0 : 200;
    setTimeout(()=>{
      this.currentIndex = targetLoopIdx;
      this.applySelection();
      this._suspendSnap = false;
      this.ensureLoopBuffer();
    }, settleDelay);
  }

  updateCurrentIndex(){
    const maxIdx = this.ext.length - 1;
    if(!this.itemH) return;
    const raw = (this.col.scrollTop - this.pad) / this.itemH;
    const idx = Math.max(0, Math.min(maxIdx, Math.round(raw)));
    if(idx === this.currentIndex) return;
    this.currentIndex = idx;
    this.currentBaseIndex = ((idx % this.base.length) + this.base.length) % this.base.length;
    this.applySelection();
  }

  ensureLoopBuffer(){
    const buffer = this.base.length;
    if(this.currentIndex < buffer || this.currentIndex >= this.ext.length - buffer){
      const targetLoopIdx = this.midStart + this.currentBaseIndex;
      this._suspendSnap = true;
      this.scrollToLoopIndex(targetLoopIdx, true);
      this.currentIndex = targetLoopIdx;
      this.applySelection();
      requestAnimationFrame(()=>{ this._suspendSnap = false; });
    }
  }

  applySelection(){
    const items = this.col.querySelectorAll('.picker-item');
    const activeLoopId = String(this.currentIndex);
    items.forEach((el)=>{
      const selected = el.dataset.loopIndex === activeLoopId;
      el.classList.toggle('selected', selected);
      el.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  scrollToLoopIndex(loopIdx, instant){
    const top = this.pad + loopIdx * this.itemH;
    const behavior = instant || this.prefersReducedMotion() ? 'auto' : 'smooth';
    this.col.scrollTo({ top, behavior });
  }

  scrollToBaseIndex(baseIdx, instant=false){
    if(!this.col || !this.base.length) return;
    const normalized = ((baseIdx % this.base.length) + this.base.length) % this.base.length;
    this.currentBaseIndex = normalized;
    const targetLoopIdx = this.midStart + normalized;
    this._suspendSnap = true;
    this.scrollToLoopIndex(targetLoopIdx, instant);
    this.currentIndex = targetLoopIdx;
    this.applySelection();
    const settleDelay = instant ? 0 : (this.prefersReducedMotion() ? 0 : 200);
    setTimeout(()=>{ this._suspendSnap = false; }, settleDelay);
  }

  selectedBase(){
    return this.base[this.currentBaseIndex] ?? null;
  }

  destroy(){
    if(!this.col) return;
    this.col.removeEventListener('scroll', this._boundScroll);
    this.col.removeEventListener('wheel', this._boundWheel);
    this.col.removeEventListener('pointerdown', this._boundPointerDown);
    this.col.removeEventListener('pointerup', this._boundPointerUp);
    this.col.removeEventListener('pointercancel', this._boundPointerUp);
    this.col.removeEventListener('touchend', this._boundPointerUp);
    this.col.removeEventListener('keydown', this._boundKeyDown);
    if(this.resizeObserver){
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this._handleResize);
    window.removeEventListener('orientationchange', this._handleResize);
    if(this._snapTimer) clearTimeout(this._snapTimer);
  }
}

/* =========================
   Guests
   ========================= */
function activeGuestIds(){ return State.guests.filter(g=>g.active).map(g=>g.id); }
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
    renderGuests(); renderPreview();
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
function hasOverlap(iso, startMins, endMins, participantIds){
  const day = State.itemsByDate[iso] || [];
  for(const it of day){
    const itStart = it.startMins;
    const itEnd   = it.endMins ?? (it.startMins + (it.duration || 60));
    const shareGuest = (it.participantIds || []).some(id => participantIds.includes(id));
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
  const list = (State.itemsByDate[iso] || []).slice().sort((a,b)=> a.startMins - b.startMins);
  State.itemsByDate[iso] = list;

  // Lunch hint (soft): if between 11:00–14:00 free < 60 min
  if(lunchHint){
    lunchHint.hidden = true;
    if(list.length){
      const windowStart = 11*60, windowEnd = 14*60;
      let busy = 0;
      for(let i=0;i<list.length;i++){
        const s = Math.max(list[i].startMins, windowStart);
        const e = Math.min((list[i].endMins ?? list[i].startMins+60), windowEnd);
        if(e>s) busy += (e-s);
      }
      const total = windowEnd - windowStart;
      const free = Math.max(0, total - busy);
      if(free < 60) lunchHint.hidden = false;
    }
  }

  if(list.length === 0){
    dayListEl.innerHTML = '<li class="empty">No items for this day. Add one above.</li>';
    return;
  }
  dayListEl.innerHTML = '';
  let prev = null;
  for(const it of list){
    const li = document.createElement('li');
    li.className = it.kind==='spa' ? 'row--spa' : it.kind==='dinner' ? 'row--dinner' : '';
    const loc = locationForItem(it);

    const timeLabel = `${formatMins(it.startMins)}${it.endMins?` – ${formatMins(it.endMins)}`:''}`;

    // Participant tags (colored)
    let tags = '';
    if(Array.isArray(it.participantIds) && State.guests.length > 0){
      if(it.participantIds.length > 0){
        const colored = State.guests
          .filter(g=>it.participantIds.includes(g.id))
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

    li.innerHTML = `
      <div class="row-main"><strong>${timeLabel}</strong> | ${it.title}</div>
      <div class="row-meta">
        ${loc ? `<span class="tag loc">${loc}</span>` : ``}
        <span class="row-tags">${tags}</span>
        ${warnHTML || windowWarn}
      </div>
    `;
    dayListEl.appendChild(li);
    prev = it;
  }
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
        if(Array.isArray(it.participantIds) && State.guests.length > 0){
          const allCount = State.guests.length;
          const subCount = it.participantIds.length;
          if(subCount > 0 && subCount < allCount){
            const names = State.guests
              .filter(g=> it.participantIds.includes(g.id))
              .map(g=> firstName(g.name))
              .join(', ');
            line += ` | ${names}`;
          }
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
const DinnerPicker = {
  open(){
    const modal = $$('#modal-dinner'); if(!modal) return;
    if(!this.hourWheel){
      this.hourWheel = new LoopWheel($$('#dinnerHourCol'), ['5','6','7','8']);
    }
    if(!this.minuteWheel){
      this.minuteWheel = new LoopWheel($$('#dinnerMinuteCol'), ['00','15','30']); // no 45 -> 6:45 impossible
    }
    // Default 7:00pm each open
    this.hourWheel.scrollToBaseIndex(2, true);
    this.minuteWheel.scrollToBaseIndex(0, true);
    modal.hidden = false;
  },
  close(){ const modal=$$('#modal-dinner'); if(modal) modal.hidden=true; },
  read(){
    const h = parseInt(this.hourWheel.selectedBase(),10);
    const m = parseInt(this.minuteWheel.selectedBase(),10);
    return { hour:h, minute:m }; // always PM
  }
};

(function initDinnerModal(){
  const modal   = $$('#modal-dinner');
  const openBtn = $$('#addDinner');
  const confirm = $$('#confirmDinnerBtn');

  openBtn?.addEventListener('click', ()=> DinnerPicker.open());
  modal?.addEventListener('click', (e)=>{
    if(e.target.matches('[data-dismiss="modal"], .modal-backdrop')) DinnerPicker.close();
  });

  confirm?.addEventListener('click', ()=>{
    const sel = DinnerPicker.read();
    const mins = (12 + (sel.hour % 12)) * 60 + sel.minute; // PM only
    const { startMins, endMins } = Config.dinner;

    if(mins < startMins || mins > endMins){ alert('Dinner must be between 5:30pm and 8:00pm.'); return; }

    const iso = isoFor(State.selectedDate);
    const participants = activeGuestIds();
    const start = mins, end = mins + 60;

    if(hasOverlap(iso, start, end, participants)){
      alert('That dinner overlaps with another item for at least one selected guest.');
      return;
    }

    const list = (State.itemsByDate[iso] ||= []);
    list.push({
      kind:'dinner',
      startMins: start, endMins: end,
      title:'Dinner at Harvest',
      location: Config.locations.dinner,
      notes:'',
      participantIds: participants
    });
    list.sort((a,b)=> a.startMins - b.startMins);

    renderDayList(iso); renderPreview();
    DinnerPicker.close();
  });
})();

/* =========================
   Spa Picker (looping 12h AM/PM, 5-min steps)
   ========================= */
function buildSpaWheels(){
  const hours12 = ['8','9','10','11','12','1','2','3','4','5','6','7']; // 8am..7pm
  const mins5   = ['00','05','10','15','20','25','30','35','40','45','50','55'];
  const periods = ['AM','PM'];

  return {
    hour:   new LoopWheel($$('#spaHourCol'), hours12),
    minute: new LoopWheel($$('#spaMinuteCol'), mins5),
    period: new LoopWheel($$('#spaPeriodCol'), periods),
    setDefault(){
      // Default 11:00 AM
      this.hour.scrollToBaseIndex(3, true);   // '11'
      this.minute.scrollToBaseIndex(0, true); // '00'
      this.period.scrollToBaseIndex(0, true); // 'AM'
    },
    read(){
      return {
        hour: this.hour.selectedBase(),
        minute: this.minute.selectedBase(),
        period: this.period.selectedBase()
      };
    }
  };
}

const SpaPicker = {
  open(){
    const modal = $$('#modal-spa'); if(!modal) return;
    if(!this.wheels){
      this.wheels = buildSpaWheels();
    }
    this.wheels.setDefault();
    modal.hidden = false;
  },
  close(){ const modal=$$('#modal-spa'); if(modal) modal.hidden=true; },
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
    if(!SpaPicker.wheels){ alert('Time picker not ready.'); return; }
    const t = SpaPicker.wheels.read();
    const mins = hhmmAPToMins(t.hour, t.minute, t.period); // 12h -> mins

    // Limit: 8:00am (480) to 7:00pm (1140)
    if(mins < 8*60 || mins > 19*60){ alert('Spa start must be between 8:00am and 7:00pm.'); return; }

    const iso = isoFor(State.selectedDate);
    const participants = activeGuestIds();
    const start = mins, end = mins + duration;

    if(hasOverlap(iso, start, end, participants)){
      alert('That spa time overlaps with another item for at least one selected guest.');
      return;
    }

    const list = (State.itemsByDate[iso] ||= []);
    list.push({
      kind:'spa',
      title: service,
      duration,
      startMins: start,
      endMins: end,
      location: Config.locations.spa,
      pref, cabana,
      participantIds: participants
    });

    list.sort((a,b)=> a.startMins - b.startMins);
    renderDayList(iso); renderPreview();
    SpaPicker.close();
  });
})();

/* =========================
   Generic Time Picker for Expected Arr/Dep
   ========================= */
const GenTimePicker = {
  hourValues: ['1','2','3','4','5','6','7','8','9','10','11','12'],
  minuteValues: ['00','05','10','15','20','25','30','35','40','45','50','55'],
  periodValues: ['AM','PM'],
  open(targetInput, title='Select Time'){
    this.target = targetInput;
    $$('#timeTitle').textContent = title;
    if(!this.hour){
      this.hour   = new LoopWheel($$('#genHourCol'), this.hourValues);
      this.minute = new LoopWheel($$('#genMinuteCol'), this.minuteValues);
      this.period = new LoopWheel($$('#genPeriodCol'), this.periodValues);
    }
    this.setInitialPosition();
    $$('#modal-time').hidden = false;
  },
  close(){ $$('#modal-time').hidden = true; this.target = null; },
  read(){
    return {
      hour: this.hour.selectedBase(),
      minute: this.minute.selectedBase(),
      period: this.period.selectedBase()
    };
  },
  setInitialPosition(){
    const text = stripOrdinals((this.target?.value || '').trim()).replace(/\s+/g,'').toUpperCase();
    const match = text.match(/^([1-9]|1[0-2]):([0-5][0-9])([AP]M)$/);
    let hourIdx = 2, minIdx = 0, periodIdx = 1; // default 3:00 PM
    if(match){
      const [, h, m, p] = match;
      const period = p === 'AM' ? 'AM' : 'PM';
      const targetHour = String(parseInt(h,10));
      const targetMinute = m;
      const hIdx = this.hourValues.indexOf(targetHour);
      const mIdx = this.minuteValues.indexOf(targetMinute);
      const pIdx = this.periodValues.indexOf(period);
      if(hIdx !== -1) hourIdx = hIdx;
      if(mIdx !== -1) minIdx = mIdx;
      if(pIdx !== -1) periodIdx = pIdx;
    }
    this.hour.scrollToBaseIndex(hourIdx, true);
    this.minute.scrollToBaseIndex(minIdx, true);
    this.period.scrollToBaseIndex(periodIdx, true);
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
