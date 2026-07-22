/**
 * =================================================================
 * FUSO QUIZ ANALYTICS — app.js
 * =================================================================
 * Berisi:
 *  - Date range picker gaya Traveloka (dua bulan berdampingan)
 *  - Hour range picker (grid 24 jam)
 *  - Pemanggilan API (lihat fetchQuizStats — tandai TODO untuk sambung API)
 *  - Render kartu statistik & grafik (Chart.js)
 * =================================================================
 */

/* ---------------------------------------------------------------
   STATE
   --------------------------------------------------------------- */
const state = {
  calendarLeftMonth: startOfMonth(new Date()),
  rangeStart: null,          // Date
  rangeEnd: null,            // Date
  hoverDate: null,

  hourStart: null,           // 0-23
  hourEnd: null,             // 0-23
  hourHover: null,

  appliedDateLabel: "Pilih tanggal",
  appliedHourLabel: "Sepanjang hari",
};

const DAY_LABELS_ID = ["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
const MONTH_LABELS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

/* ---------------------------------------------------------------
   DOM REFS
   --------------------------------------------------------------- */
const el = {
  dateTrigger: document.getElementById("dateTrigger"),
  dateValue: document.getElementById("dateValue"),
  calendarPopover: document.getElementById("calendarPopover"),
  monthTitleLeft: document.getElementById("monthTitleLeft"),
  monthTitleRight: document.getElementById("monthTitleRight"),
  calendarGridLeft: document.getElementById("calendarGridLeft"),
  calendarGridRight: document.getElementById("calendarGridRight"),
  prevMonthBtn: document.getElementById("prevMonthBtn"),
  nextMonthBtn: document.getElementById("nextMonthBtn"),
  rangeStartLabel: document.getElementById("rangeStartLabel"),
  rangeEndLabel: document.getElementById("rangeEndLabel"),
  clearDateBtn: document.getElementById("clearDateBtn"),
  applyDateBtn: document.getElementById("applyDateBtn"),
  quickRanges: document.getElementById("quickRanges"),

  hourTrigger: document.getElementById("hourTrigger"),
  hourValue: document.getElementById("hourValue"),
  hourPopover: document.getElementById("hourPopover"),
  hourGrid: document.getElementById("hourGrid"),
  hourStartLabel: document.getElementById("hourStartLabel"),
  hourEndLabel: document.getElementById("hourEndLabel"),
  clearHourBtn: document.getElementById("clearHourBtn"),
  applyHourBtn: document.getElementById("applyHourBtn"),
  quickHours: document.getElementById("quickHours"),

  searchBtn: document.getElementById("searchBtn"),

  statTotal: document.getElementById("statTotal"),
  statToday: document.getElementById("statToday"),
  statRange: document.getElementById("statRange"),
  statAvgHour: document.getElementById("statAvgHour"),

  dayChartEmpty: document.getElementById("dayChartEmpty"),
  hourChartEmpty: document.getElementById("hourChartEmpty"),
  dayChartHint: document.getElementById("dayChartHint"),
  hourChartHint: document.getElementById("hourChartHint"),

  connectionStatus: document.getElementById("connectionStatus"),
};

/* =================================================================
   DATE HELPERS
   ================================================================= */
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d, n){ return new Date(d.getFullYear(), d.getMonth()+n, 1); }
function isSameDay(a,b){ return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function isBetween(d, start, end){ return start && end && d > start && d < end; }
function fmtShort(d){ return `${d.getDate()} ${MONTH_LABELS_ID[d.getMonth()].slice(0,3)} ${d.getFullYear()}`; }
function fmtISO(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function fmtHour(h){ return String(h).padStart(2,"0") + ":00"; }

/* =================================================================
   CALENDAR RENDERING
   ================================================================= */
function renderCalendar(){
  // Full (re)build: only needed when the visible month(s) change
  // (navigation, quick range, init). Selection highlighting itself
  // is handled separately by updateCalendarSelectionUI(), which
  // does NOT touch the DOM structure — see note below.
  const leftMonth = state.calendarLeftMonth;
  const rightMonth = addMonths(leftMonth, 1);

  el.monthTitleLeft.textContent = `${MONTH_LABELS_ID[leftMonth.getMonth()]} ${leftMonth.getFullYear()}`;
  el.monthTitleRight.textContent = `${MONTH_LABELS_ID[rightMonth.getMonth()]} ${rightMonth.getFullYear()}`;

  buildMonthGrid(el.calendarGridLeft, leftMonth);
  buildMonthGrid(el.calendarGridRight, rightMonth);

  updateCalendarSelectionUI();
}

function buildMonthGrid(container, monthDate){
  container.innerHTML = "";
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  // Monday-first offset
  let offset = firstDay.getDay() - 1;
  if (offset < 0) offset = 6;
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = new Date();

  for (let i=0;i<offset;i++){
    const pad = document.createElement("span");
    container.appendChild(pad);
  }

  for (let day=1; day<=daysInMonth; day++){
    const d = new Date(year, month, day);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-day";
    btn.textContent = day;
    // Store the timestamp so we can re-evaluate this exact button's
    // state later without ever having to recreate it.
    btn.dataset.time = String(d.getTime());

    if (isSameDay(d, today)) btn.classList.add("is-today");

    // NOTE: this listener only updates classes (cheap, no DOM
    // rebuild), so the button the user is hovering never gets
    // swapped out from under the cursor mid-selection.
    btn.addEventListener("mouseenter", () => {
      if (state.rangeStart && !state.rangeEnd){
        state.hoverDate = d;
        updateCalendarSelectionUI();
      }
    });

    btn.addEventListener("click", () => onDayClick(d));
    container.appendChild(btn);
  }
}

// Re-applies range/today/hover classes to the *existing* day
// buttons (looked up via their stored timestamp) instead of
// destroying and recreating them. This is what keeps clicking
// the "sampai" (end) date reliable.
function updateCalendarSelectionUI(){
  [el.calendarGridLeft, el.calendarGridRight].forEach(container => {
    container.querySelectorAll(".cal-day").forEach(btn => {
      const t = Number(btn.dataset.time);
      if (Number.isNaN(t)) return;
      const d = new Date(t);

      btn.classList.remove("is-in-range", "is-range-start", "is-range-end", "is-range-single");

      if (state.rangeStart && !state.rangeEnd && state.hoverDate){
        if (isBetween(d, state.rangeStart, state.hoverDate) || isBetween(d, state.hoverDate, state.rangeStart)){
          btn.classList.add("is-in-range");
        }
      }
      if (isBetween(d, state.rangeStart, state.rangeEnd)) btn.classList.add("is-in-range");

      if (state.rangeStart && state.rangeEnd && isSameDay(d, state.rangeStart) && isSameDay(d, state.rangeEnd)){
        btn.classList.add("is-range-single");
      } else if (state.rangeStart && isSameDay(d, state.rangeStart)){
        btn.classList.add(state.rangeEnd ? "is-range-start" : "is-range-single");
      } else if (state.rangeEnd && isSameDay(d, state.rangeEnd)){
        btn.classList.add("is-range-end");
      }
    });
  });

  el.rangeStartLabel.textContent = state.rangeStart ? fmtShort(state.rangeStart) : "—";
  el.rangeEndLabel.textContent = state.rangeEnd ? fmtShort(state.rangeEnd) : "—";
}

function onDayClick(d){
  if (!state.rangeStart || (state.rangeStart && state.rangeEnd)){
    state.rangeStart = d;
    state.rangeEnd = null;
  } else {
    if (d < state.rangeStart){
      state.rangeEnd = state.rangeStart;
      state.rangeStart = d;
    } else {
      state.rangeEnd = d;
    }
  }
  state.hoverDate = null;
  // Selection changed but the month grid itself didn't — only
  // refresh classes, don't rebuild the buttons.
  updateCalendarSelectionUI();
}

function setQuickDateRange(kind){
  const today = new Date();
  today.setHours(0,0,0,0);
  if (kind === "today"){
    state.rangeStart = today;
    state.rangeEnd = today;
  } else {
    const days = parseInt(kind, 10);
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    state.rangeStart = start;
    state.rangeEnd = today;
  }
  state.calendarLeftMonth = startOfMonth(state.rangeStart);
  renderCalendar(); // month may have changed, so a full rebuild is correct here
}

/* =================================================================
   HOUR PICKER RENDERING
   ================================================================= */
function buildHourGrid(){
  el.hourGrid.innerHTML = "";
  for (let h=0; h<24; h++){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hour-cell";
    btn.textContent = fmtHour(h);
    btn.dataset.hour = String(h);

    // Same fix as the calendar: only update classes on hover,
    // never rebuild the grid, so the "sampai" hour stays clickable.
    btn.addEventListener("mouseenter", () => {
      if (state.hourStart !== null && state.hourEnd === null){
        state.hourHover = h;
        updateHourSelectionUI();
      }
    });

    btn.addEventListener("click", () => onHourClick(h));
    el.hourGrid.appendChild(btn);
  }
  updateHourSelectionUI();
}

function updateHourSelectionUI(){
  el.hourGrid.querySelectorAll(".hour-cell").forEach(btn => {
    const h = Number(btn.dataset.hour);
    btn.classList.remove("is-in-range", "is-range-start", "is-range-end", "is-range-single");

    if (state.hourStart !== null && state.hourEnd === null && state.hourHover !== null){
      const lo = Math.min(state.hourStart, state.hourHover);
      const hi = Math.max(state.hourStart, state.hourHover);
      if (h > lo && h < hi) btn.classList.add("is-in-range");
    }
    if (state.hourStart !== null && state.hourEnd !== null && h > state.hourStart && h < state.hourEnd){
      btn.classList.add("is-in-range");
    }

    if (state.hourStart !== null && state.hourEnd !== null && h === state.hourStart && h === state.hourEnd){
      btn.classList.add("is-range-single");
    } else if (state.hourStart !== null && h === state.hourStart){
      btn.classList.add(state.hourEnd !== null ? "is-range-start" : "is-range-single");
    } else if (state.hourEnd !== null && h === state.hourEnd){
      btn.classList.add("is-range-end");
    }
  });

  el.hourStartLabel.textContent = state.hourStart !== null ? fmtHour(state.hourStart) : "—";
  el.hourEndLabel.textContent = state.hourEnd !== null ? fmtHour(state.hourEnd) : "—";
}

function onHourClick(h){
  if (state.hourStart === null || (state.hourStart !== null && state.hourEnd !== null)){
    state.hourStart = h;
    state.hourEnd = null;
  } else {
    if (h < state.hourStart){
      state.hourEnd = state.hourStart;
      state.hourStart = h;
    } else {
      state.hourEnd = h;
    }
  }
  state.hourHover = null;
  updateHourSelectionUI();
}

function setQuickHourRange(kind){
  if (kind === "full"){ state.hourStart = 0; state.hourEnd = 23; }
  if (kind === "morning"){ state.hourStart = 6; state.hourEnd = 12; }
  if (kind === "evening"){ state.hourStart = 18; state.hourEnd = 23; }
  updateHourSelectionUI();
}

/* =================================================================
   POPOVER OPEN / CLOSE
   ================================================================= */
function openPopover(popoverEl, triggerEl){
  closeAllPopovers();
  popoverEl.classList.add("is-open");
  triggerEl.classList.add("is-active");
  triggerEl.setAttribute("aria-expanded", "true");
}
function closeAllPopovers(){
  [el.calendarPopover, el.hourPopover].forEach(p => p.classList.remove("is-open"));
  [el.dateTrigger, el.hourTrigger].forEach(t => { t.classList.remove("is-active"); t.setAttribute("aria-expanded","false"); });
}

el.dateTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = el.calendarPopover.classList.contains("is-open");
  isOpen ? closeAllPopovers() : openPopover(el.calendarPopover, el.dateTrigger);
});
el.hourTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = el.hourPopover.classList.contains("is-open");
  isOpen ? closeAllPopovers() : openPopover(el.hourPopover, el.hourTrigger);
});
document.addEventListener("click", (e) => {
  if (!el.calendarPopover.contains(e.target) && !el.hourPopover.contains(e.target)){
    closeAllPopovers();
  }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAllPopovers(); });

/* Calendar controls */
el.prevMonthBtn.addEventListener("click", () => { state.calendarLeftMonth = addMonths(state.calendarLeftMonth, -1); renderCalendar(); });
el.nextMonthBtn.addEventListener("click", () => { state.calendarLeftMonth = addMonths(state.calendarLeftMonth, 1); renderCalendar(); });
el.clearDateBtn.addEventListener("click", () => { state.rangeStart = null; state.rangeEnd = null; state.hoverDate = null; updateCalendarSelectionUI(); });
el.applyDateBtn.addEventListener("click", () => {
  if (state.rangeStart && state.rangeEnd){
    el.dateValue.textContent = `${fmtShort(state.rangeStart)} - ${fmtShort(state.rangeEnd)}`;
  } else if (state.rangeStart){
    el.dateValue.textContent = fmtShort(state.rangeStart);
  } else {
    el.dateValue.textContent = "Pilih tanggal";
  }
  closeAllPopovers();
});
el.quickRanges.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-range]");
  if (btn) setQuickDateRange(btn.dataset.range);
});

/* Hour controls */
el.clearHourBtn.addEventListener("click", () => { state.hourStart = null; state.hourEnd = null; state.hourHover = null; updateHourSelectionUI(); });
el.applyHourBtn.addEventListener("click", () => {
  if (state.hourStart !== null && state.hourEnd !== null){
    el.hourValue.textContent = `${fmtHour(state.hourStart)} - ${fmtHour(state.hourEnd)}`;
  } else {
    el.hourValue.textContent = "Sepanjang hari";
  }
  closeAllPopovers();
});
el.quickHours.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-hour-range]");
  if (btn) setQuickHourRange(btn.dataset.hourRange);
});

/* =================================================================
   CHART SETUP (Chart.js) — empty by default, ready for real data
   ================================================================= */
const chartPalette = {
  primary: "#2C5A94",
  secondary: "#4E79B9",
  accent: "#E8B88F",
  grid: "#E3E6EC",
  text: "#4B5A72",
};

const dayChart = new Chart(document.getElementById("dayChart"), {
  type: "line",
  data: { labels: [], datasets: [{
    label: "Pemain",
    data: [],
    borderColor: chartPalette.primary,
    backgroundColor: "rgba(44,90,148,0.12)",
    tension: 0.35,
    fill: true,
    pointBackgroundColor: chartPalette.primary,
  }]},
  options: {
    responsive: true,
    plugins: { legend: { display:false } },
    scales: {
      x: { grid: { display:false }, ticks: { color: chartPalette.text, font:{ family:"'MazdaType', sans-serif" } } },
      y: { grid: { color: chartPalette.grid }, ticks: { color: chartPalette.text, font:{ family:"'MazdaType', sans-serif" } }, beginAtZero:true },
    },
  },
});

const hourChart = new Chart(document.getElementById("hourChart"), {
  type: "bar",
  data: { labels: [], datasets: [{
    label: "Pemain",
    data: [],
    backgroundColor: chartPalette.accent,
    borderRadius: 6,
    maxBarThickness: 28,
  }]},
  options: {
    responsive: true,
    plugins: { legend: { display:false } },
    scales: {
      x: { grid: { display:false }, ticks: { color: chartPalette.text, font:{ family:"'MazdaType', sans-serif" } } },
      y: { grid: { color: chartPalette.grid }, ticks: { color: chartPalette.text, font:{ family:"'MazdaType', sans-serif" } }, beginAtZero:true },
    },
  },
});

function showChartEmptyState(show){
  el.dayChartEmpty.style.display = show ? "flex" : "none";
  el.hourChartEmpty.style.display = show ? "flex" : "none";
}

/* =================================================================
   API INTEGRATION — Activity Tracker API
   =================================================================
   API-nya (lihat config.js) hanya menerima start_date/end_date
   datetime penuh, tidak ada parameter jam terpisah. Strateginya:

   1. Untuk kartu "Total Pemain" & "Pemain Hari Ini": panggil
      GET /activity-records/summary (ringan, tidak perlu paginasi)
      dengan/tanpa start_date-end_date, lalu jumlahkan total_count
      dari semua activity yang dikembalikan.
   2. Untuk kartu "Pemain di Rentang Terpilih", "Rata-rata per Jam",
      dan kedua grafik: tarik semua record pada rentang tanggal
      terpilih lewat GET /activity-records (dipaginasi), lalu filter
      jam dilakukan di browser dari field created_at tiap record.
   ================================================================= */

function apiUrl(path, params){
  const url = new URL(CONFIG.BASE_URL + path);
  if (params){
    Object.entries(params).forEach(([k,v]) => {
      if (v !== null && v !== undefined && v !== "") url.searchParams.set(k, v);
    });
  }
  return url.toString();
}

async function apiGet(path, params){
  const res = await fetch(apiUrl(path, params));
  if (!res.ok) throw new Error(`API error ${res.status} pada ${path}`);
  const json = await res.json();
  if (json.status && json.status >= 400) throw new Error(json.message || `API error pada ${path}`);
  return json;
}

/* Ambil total_count gabungan semua activity dari endpoint summary
   (ringan, tanpa paginasi). */
async function fetchSummaryTotal(startDate, endDate){
  const params = {};
  if (startDate) params[CONFIG.PARAM_NAMES.START_DATE] = startDate;
  if (endDate)   params[CONFIG.PARAM_NAMES.END_DATE] = endDate;

  const json = await apiGet(CONFIG.ENDPOINTS.SUMMARY, params);
  const rows = json.data || [];
  return rows.reduce((sum, r) => sum + (r.total_count || 0), 0);
}

/* Tarik semua record pada rentang tanggal, dengan paginasi. */
async function fetchAllRecordsInRange(startDate, endDate){
  const records = [];
  let page = 1;

  while (page <= CONFIG.MAX_PAGES){
    const params = { page, limit: CONFIG.PAGE_LIMIT };
    if (startDate) params[CONFIG.PARAM_NAMES.START_DATE] = startDate;
    if (endDate)   params[CONFIG.PARAM_NAMES.END_DATE] = endDate;

    const json = await apiGet(CONFIG.ENDPOINTS.RECORDS, params);
    const grouped = json.data?.records || {};

    // Response-nya dikelompokkan per activity_name (bukan array datar),
    // jadi kita ratakan dulu supaya semua activity ikut terhitung.
    Object.values(grouped).forEach(arr => records.push(...arr));

    const pagination = json.data?.pagination;
    if (!pagination || page >= pagination.total_pages) break;
    page++;
  }

  return records;
}

/* Format Date -> "YYYY-MM-DD HH:mm:ss" seperti contoh di spesifikasi API. */
function fmtDateTime(d, timeStr){
  return `${fmtISO(d)} ${timeStr}`;
}

async function fetchQuizStats({ startDate, endDate, startHour, endHour }){
  // Rentang tanggal untuk "Rentang Terpilih" & grafik. Kalau user
  // belum memilih tanggal sama sekali, pakai default N hari terakhir
  // supaya tidak menarik seluruh histori data.
  let rangeStartDate = startDate;
  let rangeEndDate = endDate;
  if (!rangeStartDate && !rangeEndDate){
    const today = new Date();
    const past = new Date(today);
    past.setDate(past.getDate() - (CONFIG.DEFAULT_RANGE_DAYS - 1));
    rangeStartDate = fmtISO(past);
    rangeEndDate = fmtISO(today);
  } else if (!rangeEndDate){
    rangeEndDate = rangeStartDate;
  } else if (!rangeStartDate){
    rangeStartDate = rangeEndDate;
  }

  const rangeStartDT = fmtDateTime(new Date(rangeStartDate), "00:00:00");
  const rangeEndDT = fmtDateTime(new Date(rangeEndDate), "23:59:59");

  const todayISO = fmtISO(new Date());
  const todayStartDT = fmtDateTime(new Date(todayISO), "00:00:00");
  const todayEndDT = fmtDateTime(new Date(todayISO), "23:59:59");

  const [totalPlayers, todayPlayers, rangeRecords] = await Promise.all([
    fetchSummaryTotal(null, null),
    fetchSummaryTotal(todayStartDT, todayEndDT),
    fetchAllRecordsInRange(rangeStartDT, rangeEndDT),
  ]);

  // Filter jam dilakukan di sini (client-side), karena API tidak
  // menyediakan parameter start_hour/end_hour.
  const hLo = startHour ?? 0;
  const hHi = endHour ?? 23;
  const filtered = rangeRecords.filter(rec => {
    const hour = new Date(rec.created_at.replace(" ", "T")).getHours();
    return hour >= hLo && hour <= hHi;
  });

  // Bucket per hari
  const dayMap = {};
  filtered.forEach(rec => {
    const day = rec.created_at.slice(0, 10);
    dayMap[day] = (dayMap[day] || 0) + 1;
  });
  const byDay = Object.keys(dayMap).sort().map(date => ({ date, count: dayMap[date] }));

  // Bucket per jam (0-23)
  const hourMap = Array(24).fill(0);
  filtered.forEach(rec => {
    const hour = new Date(rec.created_at.replace(" ", "T")).getHours();
    hourMap[hour]++;
  });
  const byHour = hourMap.map((count, hour) => ({ hour, count }));

  const daySpan = Math.max(1, Math.round((new Date(rangeEndDate) - new Date(rangeStartDate)) / 86400000) + 1);
  const hourSpan = Math.max(1, hHi - hLo + 1);
  const avgPerHour = Math.round(filtered.length / (daySpan * hourSpan));

  return {
    totalPlayers,
    todayPlayers,
    rangePlayers: filtered.length,
    avgPerHour,
    byDay,
    byHour,
  };
}

/* =================================================================
   CONNECTION STATUS
   ================================================================= */
function setConnectionStatus(mode, text){
  // mode: "off" | "on" | "loading"
  const dot = el.connectionStatus.querySelector(".status-dot");
  dot.classList.remove("status-dot--off", "status-dot--on");
  dot.classList.add(mode === "on" ? "status-dot--on" : "status-dot--off");
  el.connectionStatus.lastElementChild.textContent = text;
}

/* =================================================================
   RENDER RESULT
   ================================================================= */
function renderStats(data){
  if (!data){
    el.statTotal.textContent = "—";
    el.statToday.textContent = "—";
    el.statRange.textContent = "—";
    el.statAvgHour.textContent = "—";
    showChartEmptyState(true);
    el.dayChartHint.textContent = "Belum ada data";
    el.hourChartHint.textContent = "Belum ada data";
    return;
  }

  el.statTotal.textContent = data.totalPlayers ?? "—";
  el.statToday.textContent = data.todayPlayers ?? "—";
  el.statRange.textContent = data.rangePlayers ?? "—";
  el.statAvgHour.textContent = data.avgPerHour ?? "—";

  if (data.byDay?.length){
    dayChart.data.labels = data.byDay.map(p => p.date);
    dayChart.data.datasets[0].data = data.byDay.map(p => p.count);
    dayChart.update();
    el.dayChartHint.textContent = `${data.byDay.length} titik data`;
  }
  if (data.byHour?.length){
    hourChart.data.labels = data.byHour.map(p => fmtHour(p.hour));
    hourChart.data.datasets[0].data = data.byHour.map(p => p.count);
    hourChart.update();
    el.hourChartHint.textContent = `${data.byHour.length} titik data`;
  }
  showChartEmptyState(!(data.byDay?.length || data.byHour?.length));
}

async function applyFilters(){
  el.searchBtn.disabled = true;
  const original = el.searchBtn.innerHTML;
  el.searchBtn.innerHTML = "Memuat…";
  setConnectionStatus("loading", "Memuat data dari API…");

  try {
    const data = await fetchQuizStats({
      startDate: state.rangeStart ? fmtISO(state.rangeStart) : null,
      endDate: state.rangeEnd ? fmtISO(state.rangeEnd) : null,
      startHour: state.hourStart,
      endHour: state.hourEnd,
    });
    renderStats(data);
    setConnectionStatus("on", "Tersambung ke API");
  } catch (err){
    console.error("Gagal memuat statistik quiz:", err);
    renderStats(null);
    setConnectionStatus("off", `Gagal tersambung: ${err.message}`);
  } finally {
    el.searchBtn.disabled = false;
    el.searchBtn.innerHTML = original;
  }
}

el.searchBtn.addEventListener("click", async function() {
  // Fetch data pemain dari API sebelum apply filters
  await fetchPlayersData(
    state.rangeStart ? fmtISO(state.rangeStart) : null,
    state.rangeEnd ? fmtISO(state.rangeEnd) : null
  );
  applyFilters();
});

/* =================================================================
   PLAYERS TABLE
   ================================================================= */

// Players state
const playersState = {
  allData: [],
  filteredData: [],
  displayData: [],
  currentPage: 1,
  itemsPerPage: 10,
  searchQuery: "",
  sortBy: "skor-desc",
};

// Fetch daftar pemain dari API records
async function fetchPlayersData(startDate, endDate) {
  try {
    const rangeStartDate = startDate || fmtISO(new Date(Date.now() - CONFIG.DEFAULT_RANGE_DAYS * 86400000));
    const rangeEndDate = endDate || fmtISO(new Date());

    const rangeStartDT = fmtDateTime(new Date(rangeStartDate), "00:00:00");
    const rangeEndDT = fmtDateTime(new Date(rangeEndDate), "23:59:59");

    const records = await fetchAllRecordsInRange(rangeStartDT, rangeEndDT);

    // Satu baris tabel = satu kali main (satu record dari API).
    // Field asli dari API (lihat ActivityTracker_apidog.json):
    // full_name, point_score, time_score, created_at, id — TIDAK ada
    // user_id/username/score/point seperti sebelumnya. Karena API
    // tidak punya id pemain yang stabil (cuma full_name/email/phone
    // per record), setiap record ditampilkan sebagai baris sendiri
    // alih-alih digabung per pemain — supaya angkanya benar-benar
    // dari API, bukan hasil tebakan/agregasi yang bisa salah.
    const players = records.map(rec => {
      const point = rec.point_score !== null && rec.point_score !== undefined
        ? Number(rec.point_score)
        : null;
      return {
        id: rec.id,
        username: rec.full_name && rec.full_name.trim() ? rec.full_name : "Anonim",
        email: rec.email && rec.email.trim() ? rec.email : null,
        phone: rec.phone_number && rec.phone_number.trim() ? rec.phone_number : null,
        createdAt: rec.created_at,
        totalSkor: point, // null = belum ada skor tercatat untuk record ini
      };
    });

    playersState.allData = players;
    playersState.filteredData = [...players];

    // Sort default by skor tertinggi
    applySort();
    playersState.currentPage = 1;
    renderPlayersTable();

    return players;
  } catch (err) {
    console.error("Gagal fetch data pemain:", err);
    // Jika API gagal, kosongkan tabel
    playersState.allData = [];
    playersState.filteredData = [];
    renderPlayersTable();
    return [];
  }
}

// Format timestamp ke "DD Mon YYYY HH:mm"
function formatPlayDateTime(dateString) {
  try {
    const date = new Date(dateString.replace(" ", "T"));
    const day = String(date.getDate()).padStart(2, "0");
    const month = MONTH_LABELS_ID[date.getMonth()].slice(0, 3);
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${mins}`;
  } catch (e) {
    return "—";
  }
}

// Update tampilan tabel
function renderPlayersTable() {
  const tbody = document.getElementById("playersTableBody");
  const tableEmpty = document.getElementById("tableEmpty");
  const tableFooter = document.getElementById("tableFooter");

  if (playersState.filteredData.length === 0) {
    tbody.innerHTML = "";
    tableEmpty.style.display = "flex";
    tableFooter.style.display = "none";
    return;
  }

  tableEmpty.style.display = "none";
  tableFooter.style.display = "flex";

  // Hitung pagination
  const totalPages = Math.ceil(playersState.filteredData.length / playersState.itemsPerPage);
  const startIdx = (playersState.currentPage - 1) * playersState.itemsPerPage;
  const endIdx = startIdx + playersState.itemsPerPage;
  playersState.displayData = playersState.filteredData.slice(startIdx, endIdx);

  // Render rows
  tbody.innerHTML = playersState.displayData.map((player, idx) => {
    const rank = startIdx + idx + 1;
    let rankClass = "rank-other";
    if (rank === 1) rankClass = "rank-1";
    else if (rank === 2) rankClass = "rank-2";
    else if (rank === 3) rankClass = "rank-3";

    return `
      <tr>
        <td style="text-align: center;">
          <span class="player-rank ${rankClass}">${rank}</span>
        </td>
        <td>
          <span class="player-id">${player.id ? escapeHtml(String(player.id)) : "—"}</span>
        </td>
        <td>
          <span class="player-username">${escapeHtml(player.username)}</span>
        </td>
        <td>
          <span class="player-email">${player.email ? escapeHtml(player.email) : "—"}</span>
        </td>
        <td>
          <span class="player-phone">${player.phone ? escapeHtml(player.phone) : "—"}</span>
        </td>
        <td>
          <span class="player-waktu">${formatPlayDateTime(player.createdAt)}</span>
        </td>
        <td>
          <span class="player-skor">${player.totalSkor !== null ? player.totalSkor.toLocaleString("id-ID") : "—"}</span>
        </td>
      </tr>
    `;
  }).join("");

  // Update info
  document.getElementById("tableRecordCount").textContent = 
    `${startIdx + 1} - ${Math.min(endIdx, playersState.filteredData.length)} dari ${playersState.filteredData.length} pemain`;
  
  document.getElementById("pageIndicator").textContent = 
    `Halaman ${playersState.currentPage} dari ${totalPages}`;

  // Update tombol pagination
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  prevBtn.disabled = playersState.currentPage === 1;
  nextBtn.disabled = playersState.currentPage === totalPages;
}

// Search & filter pemain
function searchPlayers() {
  const query = document.getElementById("playerSearch").value.toLowerCase();
  playersState.searchQuery = query;

  playersState.filteredData = playersState.allData.filter(player =>
    player.username.toLowerCase().includes(query) ||
    (player.email && player.email.toLowerCase().includes(query)) ||
    (player.phone && player.phone.toLowerCase().includes(query))
  );

  applySort();
  playersState.currentPage = 1;
  renderPlayersTable();
}

// Sort pemain
function applySort() {
  const sortType = playersState.sortBy;
  const scoreOf = (p) => (p.totalSkor === null ? -1 : p.totalSkor); // belum ada skor dianggap paling rendah

  playersState.filteredData.sort((a, b) => {
    switch (sortType) {
      case "skor-desc":
        return scoreOf(b) - scoreOf(a);
      case "skor-asc":
        return scoreOf(a) - scoreOf(b);
      case "waktu-desc":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "waktu-asc":
        return new Date(a.createdAt) - new Date(b.createdAt);
      case "username-asc":
        return a.username.localeCompare(b.username);
      case "username-desc":
        return b.username.localeCompare(a.username);
      default:
        return 0;
    }
  });
}

function sortPlayers(e) {
  playersState.sortBy = e.target.value;
  playersState.currentPage = 1;
  applySort();
  renderPlayersTable();
}

// Pagination
function previousPage() {
  if (playersState.currentPage > 1) {
    playersState.currentPage--;
    renderPlayersTable();
  }
}

function nextPage() {
  const totalPages = Math.ceil(playersState.filteredData.length / playersState.itemsPerPage);
  if (playersState.currentPage < totalPages) {
    playersState.currentPage++;
    renderPlayersTable();
  }
}

// Escape HTML untuk security
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Event listeners untuk players table
document.getElementById("playerSearch").addEventListener("input", searchPlayers);
document.getElementById("playerSort").addEventListener("change", sortPlayers);
document.getElementById("prevPageBtn").addEventListener("click", previousPage);
document.getElementById("nextPageBtn").addEventListener("click", nextPage);

/* =================================================================
   INIT
   ================================================================= */
renderCalendar();
buildHourGrid();
renderStats(null);
renderPlayersTable(); // tampilkan tabel pemain (awalnya kosong)
fetchPlayersData(); // fetch data pemain dari API
applyFilters(); // muat data begitu halaman dibuka, dengan rentang default
