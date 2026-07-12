const API = (() => {
  const host = window.location.hostname || "127.0.0.1";
  if (window.location.port === "5000") return `${window.location.origin}/api`;
  return `http://${host}:5000/api`;
})();

const token = localStorage.getItem("naxora_token") || localStorage.getItem("token") || "";

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
}

function renderSummary(data) {
  const s = data.summary || {};
  document.getElementById("summaryCards").innerHTML = `
    <div class="final-card"><span>Part</span><strong>49</strong><small>Final Testing Build</small></div>
    <div class="final-card"><span>Pass</span><strong>${s.pass || 0}</strong><small>Ready checks</small></div>
    <div class="final-card"><span>Warn</span><strong>${s.warn || 0}</strong><small>Fix before live</small></div>
    <div class="final-card"><span>DB Mode</span><strong>${data.dbMode || "mock"}</strong><small>${data.freeFirst ? "Free-first safe" : "Production"}</small></div>
  `;
}

function renderChecks(data) {
  document.getElementById("envChecks").innerHTML = (data.checks || []).map(check => `
    <article class="check-row">
      <span class="badge ${check.status}">${check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "×"}</span>
      <div><h3>${check.label}</h3><p>${check.message}</p></div>
    </article>
  `).join("");

  document.getElementById("errorFixes").innerHTML = (data.commonErrorFixes || []).map(item => `
    <article class="fix-row">
      <h3>❌ ${item.error}</h3>
      <p>${item.fix}</p>
    </article>
  `).join("");
}

function renderChecklist(data) {
  document.getElementById("checklist").innerHTML = (data.checklist || []).map(item => `<li>${item}</li>`).join("");
}

function renderPages(data) {
  document.getElementById("pageGrid").innerHTML = (data.pages || []).map(page => `
    <a class="page-card" href="${page.page}">
      <small>${page.group}</small>
      <b>${page.label}</b>
      <em>${page.critical ? "Critical" : "Optional"}</em>
    </a>
  `).join("");
}

async function loadAll() {
  try {
    const [status, checklist, pages] = await Promise.all([
      api("/final-testing/status"),
      api("/final-testing/checklist"),
      api("/final-testing/pages"),
    ]);
    renderSummary(status);
    renderChecks(status);
    renderChecklist(checklist);
    renderPages(pages);
  } catch (error) {
    document.getElementById("reportBox").textContent = `Failed to fetch final testing status.\n\nFix:\n1. taskkill /F /IM node.exe\n2. Part 49 backend folder se npm run dev\n3. Open ${API}/health\n\nError: ${error.message}`;
  }
}

async function runReport() {
  const box = document.getElementById("reportBox");
  box.textContent = "Running final report...";
  try {
    const report = await api("/final-testing/run");
    box.textContent = JSON.stringify(report, null, 2);
  } catch (error) {
    box.textContent = `Final report error: ${error.message}`;
  }
}

document.getElementById("refreshBtn").addEventListener("click", loadAll);
document.getElementById("runBtn").addEventListener("click", runReport);
document.getElementById("logoutBtn")?.addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
loadAll();
