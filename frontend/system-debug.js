
const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const outputBox = document.querySelector("#outputBox");
const debugMessage = document.querySelector("#debugMessage");
const debugCards = document.querySelector("#debugCards");
const token = localStorage.getItem("naxora_token");

document.querySelector("#logoutBtn")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "index.html";
});

function show(data) {
  outputBox.textContent = JSON.stringify(data, null, 2);
}

function renderCards(health, debug) {
  const report = debug?.report || {};
  debugCards.innerHTML = [
    { label: "Backend", value: health?.status || "unknown", note: health?.part || "Check health" },
    { label: "DB Mode", value: report.dbMode || health?.dbMode || "unknown", note: report.mongoUriPresent ? "Mongo URI present" : "Mock/Missing URI" },
    { label: "Frontend", value: report.currentOrigin || location.origin, note: "Current origin" },
    { label: "Part", value: "44", note: "Master Bug Fix + Demo Seeder" },
  ].map(item => `
    <article class="kpi-card">
      <h3>${item.label}</h3>
      <div class="kpi-value">${item.value}</div>
      <div class="kpi-meta"><span>${item.note || ""}</span></div>
    </article>
  `).join("");
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({ success: false, message: "Invalid JSON response" }));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function run(action) {
  debugMessage.textContent = "Checking…";
  try {
    let data;
    if (action === "health") data = await api("/health");
    if (action === "routes") data = await api("/route-check");
    if (action === "features") data = await api("/features");
    if (action === "demoStatus") data = await api("/demo-data/status");
    if (action === "seedDemo") data = await api("/demo-data/seed", { method: "POST", body: JSON.stringify({ force: false }) });
    show(data);
    debugMessage.textContent = "✅ Done";
    const health = await api("/health").catch(() => null);
    const debug = await api("/system/debug").catch(() => null);
    renderCards(health, debug);
  } catch (error) {
    debugMessage.textContent = `❌ ${error.message}`;
    show({ success: false, message: error.message, apiBase: API, fix: "Pehle browser me http://127.0.0.1:5000/api/health open karo." });
  }
}

document.querySelectorAll("[data-action]").forEach(btn => btn.addEventListener("click", () => run(btn.dataset.action)));
(async () => {
  const health = await api("/health").catch(() => null);
  const debug = await api("/system/debug").catch(() => null);
  renderCards(health, debug);
  show(debug || health || { message: "Backend check karo: /api/health" });
})();
