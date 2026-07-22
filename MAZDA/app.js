/**
 * =================================================================
 * MAZDA QUIZ ANALYTICS — app.js
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

  appliedHourLabel: "Sepanjang hari",
  allPlayers: [],
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
  footerStatus: document.getElementById("footerStatus"),

  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  playerTableBody: document.getElementById("playerTableBody"),
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
  primary: "#A51F29",   // Soul Red Crystal
  secondary: "#2A4F8A", // Deep Sky Blue
  accent: "#C89F6E",    // Soft Celestial Gold
  grid: "rgba(240,240,240,0.08)",
  text: "#B8BCC6",
};

const dayChart = new Chart(document.getElementById("dayChart"), {
  type: "line",
  data: { labels: [], datasets: [{
    label: "Pemain",
    data: [],
    borderColor: chartPalette.primary,
    backgroundColor: "rgba(165,31,41,0.15)",
    tension: 0.35,
    fill: true,
    pointBackgroundColor: chartPalette.primary,
  }]},
  options: {
    responsive: true,
    plugins: { legend: { display:false } },
    scales: {
      x: { grid: { display:false }, ticks: { color: chartPalette.text, font:{ family:"MazdaType" } } },
      y: { grid: { color: chartPalette.grid }, ticks: { color: chartPalette.text, font:{ family:"MazdaType" } }, beginAtZero:true },
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
      x: { grid: { display:false }, ticks: { color: chartPalette.text, font:{ family:"MazdaType" } } },
      y: { grid: { color: chartPalette.grid }, ticks: { color: chartPalette.text, font:{ family:"MazdaType" } }, beginAtZero:true },
    },
  },
});

function showChartEmptyState(show){
  el.dayChartEmpty.style.display = show ? "flex" : "none";
  el.hourChartEmpty.style.display = show ? "flex" : "none";
}

/* =================================================================
   API INTEGRATION
   ================================================================= */

/**
 * Mengambil data statistik dari API
 */
async function fetchQuizStats({ startDate, endDate, startHour, endHour }) {
  try {
    const params = new URLSearchParams();
    
    if (startDate) {
      let startDateTime = startDate;
      if (startHour !== null && startHour !== undefined) {
        startDateTime += ` ${String(startHour).padStart(2, '0')}:00:00`;
      } else {
        startDateTime += ` 00:00:00`;
      }
      params.set(CONFIG.PARAM_NAMES.START_DATE, startDateTime);
    }
    
    if (endDate) {
      let endDateTime = endDate;
      if (endHour !== null && endHour !== undefined) {
        endDateTime += ` ${String(endHour).padStart(2, '0')}:59:59`;
      } else {
        endDateTime += ` 23:59:59`;
      }
      params.set(CONFIG.PARAM_NAMES.END_DATE, endDateTime);
    }

    const summaryUrl = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.SUMMARY}?${params.toString()}`;
    const recordsUrl = `${CONFIG.BASE_URL}${CONFIG.ENDPOINTS.RECORDS}?${params.toString()}`;
    
    console.log("Fetching API...");
    
    const [summaryRes, recordsRes] = await Promise.all([
      fetch(summaryUrl),
      fetch(recordsUrl)
    ]);
    
    if (!summaryRes.ok) throw new Error(`API error (Summary): ${summaryRes.status}`);
    if (!recordsRes.ok) throw new Error(`API error (Records): ${recordsRes.status}`);
    
    const summaryJson = await summaryRes.json();
    const recordsJson = await recordsRes.json();
    
    return normalizeStatsResponse(summaryJson, recordsJson);
    
  } catch (error) {
    console.error("Error fetching quiz stats:", error);
    updateConnectionStatus(false, error.message);
    throw error;
  }
}

function normalizeStatsResponse(summaryJson, recordsJson) {
  if (!summaryJson || summaryJson.status !== 200 || !summaryJson.data) return null;
  if (!recordsJson || recordsJson.status !== 200 || !recordsJson.data) return null;

  const summaryData = summaryJson.data;
  let totalPlayers = 0;
  const activityStats = [];
  
  if (Array.isArray(summaryData)) {
    summaryData.forEach(item => {
      totalPlayers += item.total_count || 0;
      activityStats.push({
        activity_name: item.activity_name,
        total_count: item.total_count || 0
      });
    });
  }

  // Parse records
  let players = [];
  const recordsData = recordsJson.data.records;
  if (recordsData) {
    Object.keys(recordsData).forEach(activityName => {
      const activityRecords = recordsData[activityName] || [];
      activityRecords.forEach(rec => {
        players.push(rec);
      });
    });
  }
  
  // Calculate today's players
  const today = new Date();
  let todayPlayers = 0;
  players.forEach(p => {
    const d = new Date(p.created_at);
    if (isSameDay(d, today)) todayPlayers++;
  });

  // Calculate byDay
  const byDayMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    byDayMap[fmtISO(d)] = 0;
  }
  players.forEach(p => {
    const d = new Date(p.created_at);
    const iso = fmtISO(d);
    if (byDayMap[iso] !== undefined) byDayMap[iso]++;
  });
  const byDay = Object.keys(byDayMap).map(k => ({ date: k, count: byDayMap[k] }));
  byDay.sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically

  // Calculate byHour
  const byHourMap = {};
  for(let i=0; i<24; i++) byHourMap[i] = 0;
  players.forEach(p => {
    const d = new Date(p.created_at);
    byHourMap[d.getHours()]++;
  });
  const byHour = Object.keys(byHourMap).map(k => ({ hour: parseInt(k), count: byHourMap[k] }));
  byHour.sort((a, b) => a.hour - b.hour);

  const avgPerHour = Math.round(totalPlayers / 24) || 0;

  return {
    totalPlayers,
    todayPlayers,
    rangePlayers: totalPlayers,
    avgPerHour,
    byDay,
    byHour,
    activityStats,
    players
  };
}

async function applyFilters() {
  el.searchBtn.disabled = true;
  const original = el.searchBtn.innerHTML;
  el.searchBtn.innerHTML = '<span class="spinner"></span> Memuat…';

  try {
    const data = await fetchQuizStats({
      startDate: state.rangeStart ? fmtISO(state.rangeStart) : null,
      endDate: state.rangeEnd ? fmtISO(state.rangeEnd) : null,
      startHour: state.hourStart,
      endHour: state.hourEnd,
    });
    
    if (data) {
      renderStats(data);
      if (state.rangeStart && state.rangeEnd) {
        el.dateValue.textContent = `${fmtShort(state.rangeStart)} - ${fmtShort(state.rangeEnd)}`;
      } else if (state.rangeStart) {
        el.dateValue.textContent = fmtShort(state.rangeStart);
      } else {
        el.dateValue.textContent = "Pilih tanggal";
      }
      
      if (state.hourStart !== null && state.hourEnd !== null) {
        el.hourValue.textContent = `${fmtHour(state.hourStart)} - ${fmtHour(state.hourEnd)}`;
      } else {
        el.hourValue.textContent = "Sepanjang hari";
      }
    } else {
      renderStats(null);
    }
  } catch (err) {
    console.error("Gagal memuat statistik quiz:", err);
    renderStats(null);
    updateConnectionStatus(false, err.message || 'Gagal terhubung ke API');
  } finally {
    el.searchBtn.disabled = false;
    el.searchBtn.innerHTML = original;
  }
}

function updateConnectionStatus(connected, message = '') {
  const statusEl = document.getElementById('connectionStatus');
  const footerEl = document.getElementById('footerStatus');
  
  if (connected) {
    statusEl.innerHTML = `<span class="status-dot status-dot--on"></span><span>Terhubung ke API</span>`;
    footerEl.textContent = 'Terhubung ke API • ' + new Date().toLocaleString('id-ID');
  } else {
    statusEl.innerHTML = `<span class="status-dot status-dot--off"></span><span>${message || 'Belum tersambung ke API'}</span>`;
    footerEl.textContent = 'Menunggu koneksi API • ' + new Date().toLocaleString('id-ID');
  }
}

/* =================================================================
   RENDER RESULT - Perbaikan untuk menampilkan data dengan lebih baik
   ================================================================= */
function renderStats(data) {
  if (!data) {
    el.statTotal.textContent = "—";
    el.statToday.textContent = "—";
    el.statRange.textContent = "—";
    el.statAvgHour.textContent = "—";
    showChartEmptyState(true);
    el.dayChartHint.textContent = "Belum ada data";
    el.hourChartHint.textContent = "Belum ada data";
    updateConnectionStatus(false, 'Data tidak tersedia');
    el.playerTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">
          <div class="empty-state">
            <span class="empty-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
            <p>Tidak ada data pemain</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  // Update stat cards
  el.statTotal.textContent = data.totalPlayers?.toLocaleString('id-ID') ?? "—";
  el.statToday.textContent = data.todayPlayers?.toLocaleString('id-ID') ?? "—";
  el.statRange.textContent = data.rangePlayers?.toLocaleString('id-ID') ?? "—";
  el.statAvgHour.textContent = data.avgPerHour?.toLocaleString('id-ID') ?? "—";

  // Update status
  updateConnectionStatus(true);
  
  // Update chart hint dengan informasi aktivitas
  if (data.activityStats && data.activityStats.length > 0) {
    const activityNames = data.activityStats
      .slice(0, 3)
      .map(item => item.activity_name)
      .join(', ');
    el.dayChartHint.textContent = `${data.activityStats.length} aktivitas: ${activityNames}`;
    el.hourChartHint.textContent = `Total ${data.totalPlayers} pemain dari ${data.activityStats.length} aktivitas`;
  }

  // Render chart per hari
  if (data.byDay?.length) {
    dayChart.data.labels = data.byDay.map(p => p.date);
    dayChart.data.datasets[0].data = data.byDay.map(p => p.count);
    dayChart.update();
    el.dayChartHint.textContent = `${data.byDay.length} hari terakhir`;
  }

  // Render chart per jam
  if (data.byHour?.length) {
    hourChart.data.labels = data.byHour.map(p => fmtHour(p.hour));
    hourChart.data.datasets[0].data = data.byHour.map(p => p.count);
    hourChart.update();
    el.hourChartHint.textContent = `Distribusi ${data.totalPlayers} pemain per jam`;
  }

  // Tampilkan/hilangkan empty state
  const hasData = (data.byDay?.length > 0) || (data.byHour?.length > 0);
  showChartEmptyState(!hasData);

  // Render Table List
  state.allPlayers = data.players || [];
  renderPlayerList();
}

function renderPlayerList() {
  let list = [...state.allPlayers];
  
  // Filter by search
  const query = el.searchInput.value.toLowerCase();
  if (query) {
    list = list.filter(p => 
      (p.full_name && p.full_name.toLowerCase().includes(query)) ||
      (p.email && p.email.toLowerCase().includes(query)) ||
      (p.phone_number && p.phone_number.includes(query)) ||
      (p.activity_name && p.activity_name.toLowerCase().includes(query))
    );
  }
  
  // Sort
  const sortVal = el.sortSelect.value;
  list.sort((a, b) => {
    const scoreA = parseFloat(a.point_score) || 0;
    const scoreB = parseFloat(b.point_score) || 0;
    const dateA = new Date(a.created_at).getTime() || 0;
    const dateB = new Date(b.created_at).getTime() || 0;
    const nameA = (a.full_name || "").toLowerCase();
    const nameB = (b.full_name || "").toLowerCase();

    if (sortVal === "score_desc") return scoreB - scoreA;
    if (sortVal === "score_asc") return scoreA - scoreB;
    if (sortVal === "date_desc") return dateB - dateA;
    if (sortVal === "date_asc") return dateA - dateB;
    if (sortVal === "name_asc") return nameA.localeCompare(nameB);
    if (sortVal === "name_desc") return nameB.localeCompare(nameA);
    return 0;
  });
  
  if (list.length === 0) {
    el.playerTableBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">
          <div class="empty-state">
            <span class="empty-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
            <p>Tidak ada data pemain</p>
          </div>
        </td>
      </tr>`;
    return;
  }
  
  el.playerTableBody.innerHTML = list.map((p, index) => {
    let star = '';
    if (sortVal === "score_desc" && index < 3 && parseFloat(p.point_score) > 0) {
      star = `<svg viewBox="0 0 24 24" width="16" height="16" fill="${index===0?'#FFD700':index===1?'#C0C0C0':'#CD7F32'}" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
    }
    
    return `
      <tr>
        <td class="col-star">${star}</td>
        <td>${p.id || '-'}</td>
        <td>${p.full_name || '-'}</td>
        <td>${p.email || '-'}</td>
        <td>${p.phone_number || '-'}</td>
        <td>${p.created_at || '-'}</td>
        <td><strong style="color: var(--soft-celestial-gold)">${parseFloat(p.point_score || 0).toLocaleString('id-ID')}</strong></td>
      </tr>
    `;
  }).join('');
}

el.searchInput.addEventListener("input", renderPlayerList);
el.sortSelect.addEventListener("change", renderPlayerList);
el.searchBtn.addEventListener("click", applyFilters);

/* =================================================================
   INIT
   ================================================================= */

// Coba koneksi ke API saat load
async function checkConnection() {
  try {
    const data = await fetchQuizStats({
      startDate: null,
      endDate: null,
      startHour: null,
      endHour: null,
    });
    if (data) {
      updateConnectionStatus(true);
      renderStats(data);
    } else {
      updateConnectionStatus(false, 'Tidak ada data tersedia');
    }
  } catch (err) {
    updateConnectionStatus(false, err.message || 'Gagal terhubung ke API');
    renderStats(null);
  }
}

// Inisialisasi
renderCalendar();
buildHourGrid();
// renderStats(null); // ganti dengan checkConnection
checkConnection();
