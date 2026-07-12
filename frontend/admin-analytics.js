const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

const kpiGrid = document.querySelector("#kpiGrid");
const revenueChart = document.querySelector("#revenueChart");
const leadFunnel = document.querySelector("#leadFunnel");
const studentGrowth = document.querySelector("#studentGrowth");
const planBreakdown = document.querySelector("#planBreakdown");
const liveStats = document.querySelector("#liveStats");
const discoveryStats = document.querySelector("#discoveryStats");
const alerts = document.querySelector("#alerts");
const message = document.querySelector("#analyticsMessage");
const mode = document.querySelector("#analyticsMode");

if (!token) window.location.href = "index.html";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function renderKpis(items) {
  kpiGrid.innerHTML = items.map(item => `
    <article class="kpi-card">
      <h3>${item.label}</h3>
      <div class="kpi-value">${item.value}</div>
      <div class="kpi-meta"><span>${item.note || ""}</span><b class="kpi-trend ${item.tone || ""}">${item.trend || ""}</b></div>
    </article>
  `).join("");
}

function renderRevenue(series) {
  const width = 920, height = 250, pad = 34;
  const max = Math.max(...series.map(x => x.revenue), 1);
  const step = (width - pad * 2) / Math.max(series.length - 1, 1);
  const points = series.map((item, i) => {
    const x = pad + i * step;
    const y = height - pad - (item.revenue / max) * (height - pad * 2);
    return { ...item, x, y };
  });
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${points.at(-1).x},${height - pad} L${points[0].x},${height - pad} Z`;
  revenueChart.innerHTML = `
    <svg class="line-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <path class="area-path" d="${area}"></path>
      <path class="line-path" d="${line}"></path>
      ${points.map(p => `<circle class="point" cx="${p.x}" cy="${p.y}" r="6"><title>${p.month}: ${formatCurrency(p.revenue)}</title></circle>`).join("")}
      ${points.map(p => `<text class="axis-label" x="${p.x}" y="${height - 8}" text-anchor="middle">${p.month}</text>`).join("")}
    </svg>`;
}

function renderFunnel(items) {
  const max = Math.max(...items.map(x => x.count), 1);
  leadFunnel.innerHTML = items.map(item => `
    <div class="funnel-row">
      <span class="funnel-label">${item.stage}</span>
      <div class="funnel-bar"><span style="width:${Math.max(8, (item.count / max) * 100)}%"></span></div>
      <span class="funnel-value">${item.count}</span>
    </div>
  `).join("");
}

function renderBars(items) {
  const max = Math.max(...items.map(x => x.students), 1);
  studentGrowth.innerHTML = items.map(item => `
    <div class="bar-item">
      <div class="bar-stick" style="height:${Math.max(22, (item.students / max) * 205)}px" title="${item.students} students"></div>
      <span class="bar-label">${item.label}</span>
    </div>
  `).join("");
}

function renderMetricList(node, items, labelKey = "label", valueKey = "count") {
  node.innerHTML = items.map(item => `
    <div class="metric-pill"><strong>${item[valueKey]}</strong><span>${item[labelKey]}</span></div>
  `).join("");
}

function renderAlerts(items) {
  alerts.innerHTML = items.map((item, i) => `<div class="alert-item">${i + 1}. ${item}</div>`).join("");
}

async function loadAnalytics() {
  message.textContent = "Analytics loading…";
  try {
    const res = await fetch(`${API}/admin-analytics`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Analytics load failed");
    mode.textContent = data.mode === "database" ? "MongoDB Live" : "Mock Mode";
    renderKpis(data.kpis || []);
    renderRevenue(data.revenueSeries || []);
    renderFunnel(data.leadFunnel || []);
    renderBars(data.studentGrowth || []);
    renderMetricList(planBreakdown, data.planBreakdown || [], "plan", "count");
    renderMetricList(liveStats, data.liveClassStats || []);
    renderMetricList(discoveryStats, data.discoveryStats || []);
    renderAlerts(data.alerts || []);
    message.textContent = "✅ Admin analytics loaded successfully.";
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
}

document.querySelector("#refreshAnalytics").addEventListener("click", loadAnalytics);
document.querySelector("#printAnalytics").addEventListener("click", () => window.print());
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

loadAnalytics();
