const STORAGE_KEY = "uber-earnings-tracker-all-years-purple-v1";

const views = {
  reports: document.querySelector("#reportsView"),
  log: document.querySelector("#logView"),
  entries: document.querySelector("#entriesView"),
  backup: document.querySelector("#backupView")
};

const titles = {
  reports: "Reports",
  log: "Log Day",
  entries: "Entries",
  backup: "Backup"
};

const fields = {
  screenTitle: document.querySelector("#screenTitle"),
  entryForm: document.querySelector("#entryForm"),
  entriesList: document.querySelector("#entriesList"),
  recentReports: document.querySelector("#recentReports"),
  barChart: document.querySelector("#barChart"),
  profitLabel: document.querySelector("#profitLabel"),
  reportProfit: document.querySelector("#reportProfit"),
  daysWorked: document.querySelector("#daysWorked"),
  kmDriven: document.querySelector("#kmDriven"),
  revenueTotal: document.querySelector("#revenueTotal"),
  fuelCostTotal: document.querySelector("#fuelCostTotal"),
  otherCostTotal: document.querySelector("#otherCostTotal"),
  avgRevenueDay: document.querySelector("#avgRevenueDay"),
  revenueKm: document.querySelector("#revenueKm"),
  profitKm: document.querySelector("#profitKm"),
  hoursTotal: document.querySelector("#hoursTotal"),
  revenueHour: document.querySelector("#revenueHour"),
  profitHour: document.querySelector("#profitHour"),
  liveFuel: document.querySelector("#liveFuel"),
  liveProfit: document.querySelector("#liveProfit"),
  liveRevenueKm: document.querySelector("#liveRevenueKm"),
  liveProfitKm: document.querySelector("#liveProfitKm"),
  logSummaryDate: document.querySelector("#logSummaryDate"),
  summaryRevenue: document.querySelector("#summaryRevenue"),
  summaryFuel: document.querySelector("#summaryFuel"),
  summaryOther: document.querySelector("#summaryOther"),
  summaryProfit: document.querySelector("#summaryProfit"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  importJsonInput: document.querySelector("#importJsonInput")
};

let state = loadState();
let currentView = "reports";
let currentPeriod = "daily";

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch {
    return { entries: [] };
  }
}

function saveState() {
  state.entries.sort((a, b) => b.date.localeCompare(a.date));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number.isFinite(value) ? value : 0);
}

function oneDecimal(value) {
  return (Number.isFinite(value) ? value : 0).toFixed(1).replace(/\.0$/, "");
}

function value(form, name) {
  const num = Number(new FormData(form).get(name));
  return Number.isFinite(num) ? num : 0;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateLabel(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function entryMath(entry) {
  const fuelCost = entry.km * (entry.mileage / 100) * entry.fuelRate;
  const profit = entry.revenue - fuelCost - entry.otherCost;
  return {
    fuelCost,
    profit,
    revenueKm: entry.km > 0 ? entry.revenue / entry.km : 0,
    profitKm: entry.km > 0 ? profit / entry.km : 0,
    revenueHour: entry.hours > 0 ? entry.revenue / entry.hours : 0,
    profitHour: entry.hours > 0 ? profit / entry.hours : 0
  };
}

function summarize(entries) {
  const base = {
    entries,
    days: entries.length,
    km: 0,
    revenue: 0,
    fuelCost: 0,
    otherCost: 0,
    profit: 0,
    hours: 0
  };

  entries.forEach((entry) => {
    const calc = entryMath(entry);
    base.km += entry.km;
    base.revenue += entry.revenue;
    base.fuelCost += calc.fuelCost;
    base.otherCost += entry.otherCost;
    base.profit += calc.profit;
    base.hours += entry.hours;
  });

  return {
    ...base,
    avgRevenueDay: base.days > 0 ? base.revenue / base.days : 0,
    revenueKm: base.km > 0 ? base.revenue / base.km : 0,
    profitKm: base.km > 0 ? base.profit / base.km : 0,
    revenueHour: base.hours > 0 ? base.revenue / base.hours : 0,
    profitHour: base.hours > 0 ? base.profit / base.hours : 0
  };
}

function startOfWeek(date) {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function periodKey(date, period) {
  if (period === "daily") return date;
  if (period === "weekly") return startOfWeek(date);
  if (period === "monthly") return date.slice(0, 7);
  return date.slice(0, 4);
}

function periodName(key, period) {
  if (period === "daily") return key;
  if (period === "weekly") return `Week of ${key}`;
  if (period === "monthly") {
    const [year, month] = key.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });
  }
  return key;
}

function groupedEntries(period) {
  const groups = new Map();
  state.entries.forEach((entry) => {
    const key = periodKey(entry.date, period);
    groups.set(key, [...(groups.get(key) || []), entry]);
  });
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, entries]) => ({ key, entries, summary: summarize(entries) }));
}

function currentReportEntries() {
  if (!state.entries.length) return [];
  if (currentPeriod === "daily") return state.entries;
  return groupedEntries(currentPeriod)[0]?.entries || [];
}

function renderReports() {
  const summary = summarize(currentReportEntries());
  const labelPrefix = currentPeriod === "daily" ? "All-time" : periodName(groupedEntries(currentPeriod)[0]?.key || "", currentPeriod);

  fields.profitLabel.textContent = currentPeriod === "daily" ? "All-time profit" : `${labelPrefix} profit`;
  fields.reportProfit.textContent = money(summary.profit);
  fields.daysWorked.textContent = summary.days;
  fields.kmDriven.textContent = oneDecimal(summary.km);
  fields.revenueTotal.textContent = money(summary.revenue);
  fields.fuelCostTotal.textContent = money(summary.fuelCost);
  fields.otherCostTotal.textContent = money(summary.otherCost);
  fields.avgRevenueDay.textContent = money(summary.avgRevenueDay);
  fields.revenueKm.textContent = money(summary.revenueKm);
  fields.profitKm.textContent = money(summary.profitKm);
  fields.hoursTotal.textContent = oneDecimal(summary.hours);
  fields.revenueHour.textContent = money(summary.revenueHour);
  fields.profitHour.textContent = money(summary.profitHour);

  const bars = groupedEntries(currentPeriod).slice(0, 4).reverse();
  const maxProfit = Math.max(1, ...bars.map((group) => Math.max(0, group.summary.profit)));
  fields.barChart.innerHTML = bars.length
    ? bars.map((group) => `<span title="${periodName(group.key, currentPeriod)}" style="height:${Math.max(8, (Math.max(0, group.summary.profit) / maxProfit) * 100)}%"></span>`).join("")
    : "<span></span><span></span><span></span><span></span>";

  fields.recentReports.innerHTML = state.entries.length
    ? state.entries.slice(0, 6).map(entryCard).join("")
    : '<section class="mini-card muted-card">No entries yet.</section>';
}

function entryCard(entry) {
  const calc = entryMath(entry);
  return `
    <article class="entry-card">
      <div class="entry-card-head">
        <h3>${entry.date}</h3>
        <strong>${money(calc.profit)}</strong>
      </div>
      <div class="entry-metrics">
        <div><span>Km driven</span><b>${oneDecimal(entry.km)}</b></div>
        <div><span>Revenue</span><b>${money(entry.revenue)}</b></div>
        <div><span>Fuel cost</span><b>${money(calc.fuelCost)}</b></div>
        <div><span>Other cost</span><b>${money(entry.otherCost)}</b></div>
      </div>
      ${entry.description ? `<p>${entry.description}</p>` : ""}
    </article>
  `;
}

function renderEntries() {
  fields.entriesList.innerHTML = state.entries.length
    ? state.entries.map(entryCard).join("")
    : '<section class="mini-card muted-card">No entries yet.</section>';
}

function updateLiveTotals() {
  const entry = {
    km: value(fields.entryForm, "km"),
    revenue: value(fields.entryForm, "revenue"),
    hours: value(fields.entryForm, "hours"),
    fuelRate: value(fields.entryForm, "fuelRate"),
    mileage: value(fields.entryForm, "mileage"),
    otherCost: value(fields.entryForm, "otherCost")
  };
  const calc = entryMath(entry);
  fields.liveFuel.textContent = money(calc.fuelCost);
  fields.liveProfit.textContent = money(calc.profit);
  fields.liveRevenueKm.textContent = entry.km > 0 ? money(calc.revenueKm) : "-";
  fields.liveProfitKm.textContent = entry.km > 0 ? money(calc.profitKm) : "-";
  fields.logSummaryDate.textContent = dateLabel(fields.entryForm.elements.date.value || todayIso());
  fields.summaryRevenue.textContent = money(entry.revenue);
  fields.summaryFuel.textContent = calc.fuelCost > 0 ? `-${money(calc.fuelCost)}` : money(0);
  fields.summaryOther.textContent = entry.otherCost > 0 ? `-${money(entry.otherCost)}` : money(0);
  fields.summaryProfit.textContent = money(calc.profit);
}

function render() {
  renderReports();
  renderEntries();
}

function setView(view) {
  currentView = view;
  document.body.dataset.view = view;
  fields.screenTitle.textContent = titles[view];
  Object.entries(views).forEach(([key, node]) => node.classList.toggle("active", key === view));
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function download(name, type, text) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function exportJson() {
  download(`uber-earnings-backup-${todayIso()}.json`, "application/json", JSON.stringify(state, null, 2));
}

function exportCsv() {
  const headers = ["date", "km", "revenue", "hours", "fuelRate", "mileage", "fuelCost", "otherCost", "profit", "description"];
  const rows = state.entries.map((entry) => {
    const calc = entryMath(entry);
    return [entry.date, entry.km, entry.revenue, entry.hours, entry.fuelRate, entry.mileage, calc.fuelCost.toFixed(2), entry.otherCost, calc.profit.toFixed(2), entry.description]
      .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
      .join(",");
  });
  download(`uber-earnings-${todayIso()}.csv`, "text/csv", [headers.join(","), ...rows].join("\n"));
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      const imported = Array.isArray(parsed.entries) ? parsed.entries : [];
      const merged = new Map(state.entries.map((entry) => [entry.date, entry]));
      imported.forEach((entry) => {
        if (entry?.date) merged.set(entry.date, normalizeEntry(entry));
      });
      state.entries = [...merged.values()];
      saveState();
      render();
      setView("entries");
    } catch {
      alert("Could not import that JSON backup.");
    }
  };
  reader.readAsText(file);
}

function normalizeEntry(entry) {
  return {
    date: String(entry.date || todayIso()),
    km: Number(entry.km) || 0,
    revenue: Number(entry.revenue) || 0,
    hours: Number(entry.hours) || 0,
    fuelRate: Number(entry.fuelRate) || 0,
    mileage: Number(entry.mileage) || 0,
    otherCost: Number(entry.otherCost) || 0,
    description: String(entry.description || "")
  };
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll(".period-tab").forEach((button) => {
  button.addEventListener("click", () => {
    currentPeriod = button.dataset.period;
    document.querySelectorAll(".period-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    renderReports();
  });
});

fields.entryForm.addEventListener("input", updateLiveTotals);

fields.entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(fields.entryForm);
  const entry = normalizeEntry({
    date: formData.get("date"),
    km: formData.get("km"),
    revenue: formData.get("revenue"),
    hours: formData.get("hours"),
    fuelRate: formData.get("fuelRate"),
    mileage: formData.get("mileage"),
    otherCost: formData.get("otherCost"),
    description: formData.get("description")
  });
  const existingIndex = state.entries.findIndex((item) => item.date === entry.date);
  if (existingIndex >= 0) state.entries[existingIndex] = entry;
  else state.entries.push(entry);
  saveState();
  render();
  setView("reports");
});

fields.exportJsonBtn.addEventListener("click", exportJson);
fields.exportCsvBtn.addEventListener("click", exportCsv);
fields.importJsonInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importJson(file);
});

fields.entryForm.elements.date.value = todayIso();
fields.entryForm.elements.fuelRate.value = "1.85";
fields.entryForm.elements.mileage.value = "9";
updateLiveTotals();
render();
