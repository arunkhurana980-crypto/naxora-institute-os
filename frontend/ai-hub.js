const toolsGrid = document.getElementById("toolsGrid");
const timeline = document.getElementById("vaniTimeline");
const checklist = document.getElementById("checklist");
const toolCount = document.getElementById("toolCount");
const readyCount = document.getElementById("readyCount");
const vaniStatus = document.getElementById("vaniStatus");
const refreshBtn = document.getElementById("refreshBtn");

async function getJson(url) {
  const response = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function toolCard(tool) {
  const isVani = tool.id === "vani-ai-assistant";
  return `
    <article class="aihub-card ${isVani ? "vani" : ""}">
      <span class="${isVani ? "aihub-pill" : "aihub-muted-pill"}">${escapeHtml(tool.status)}</span>
      <h3>${escapeHtml(tool.title)}</h3>
      <p>${escapeHtml(tool.tagline)}</p>
      <p><strong>Benefit:</strong> ${escapeHtml(tool.userBenefit)}</p>
      <p><strong>Safe mode:</strong> ${escapeHtml(tool.safeMode)}</p>
      <div class="aihub-card-footer">
        <a class="aihub-btn small ${isVani ? "primary" : ""}" href="${escapeHtml(tool.route)}">Open</a>
        <a class="aihub-btn small" href="${escapeHtml(tool.apiRoute)}" target="_blank">API</a>
      </div>
    </article>
  `;
}

async function loadHub() {
  toolsGrid.innerHTML = '<article class="aihub-card skeleton">Loading AI tools...</article>';
  timeline.innerHTML = "";
  checklist.innerHTML = "";

  const [toolsData, vaniData, checklistData, usageData] = await Promise.all([
    getJson("/api/part67/tools"),
    getJson("/api/part67/vani-roadmap"),
    getJson("/api/part67/checklist"),
    getJson("/api/part67/usage-summary")
  ]);

  toolsGrid.innerHTML = toolsData.tools.map(toolCard).join("");
  toolCount.textContent = String(toolsData.count || toolsData.tools.length);
  readyCount.textContent = String((usageData.usage && usageData.usage.readyFoundationTools) || 0);
  vaniStatus.textContent = (usageData.usage && usageData.usage.vaniVisible) ? "Visible" : "Missing";

  timeline.innerHTML = vaniData.roadmap.map((step) => `
    <div class="aihub-step">
      <strong>Part ${escapeHtml(step.part)}</strong>
      <div>
        <h3>${escapeHtml(step.title)} <span class="aihub-muted-pill">${escapeHtml(step.status)}</span></h3>
        <p>${escapeHtml(step.scope)}</p>
        <p><strong>Output:</strong> ${escapeHtml(step.output)}</p>
      </div>
    </div>
  `).join("");

  checklist.innerHTML = checklistData.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

refreshBtn?.addEventListener("click", loadHub);
loadHub().catch((error) => {
  toolsGrid.innerHTML = `<article class="aihub-card"><h3>AI Hub load error</h3><p>${escapeHtml(error.message)}</p><p>Check /api/part67/status after deploy.</p></article>`;
});
