const form = document.getElementById("part62SearchForm");
const statusEl = document.getElementById("part62Status");
const metaEl = document.getElementById("part62Meta");
const candidatesEl = document.getElementById("part62Candidates");
const candidateSummaryEl = document.getElementById("part62CandidateSummary");
const comparisonEl = document.getElementById("part62Comparison");
const compareSummaryEl = document.getElementById("part62CompareSummary");
const checklistEl = document.getElementById("part62Checklist");
const compareBtn = document.getElementById("compareSelected");

let currentCandidates = [];

async function safeJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function searchParams() {
  const params = new URLSearchParams(new FormData(form));
  if (!form.verifiedOnly.checked) params.delete("verifiedOnly");
  return params;
}

function selectedIds() {
  return [...document.querySelectorAll(".part62-select-input:checked")].map((input) => input.value).slice(0, 4);
}

function renderMeta(data = {}) {
  metaEl.innerHTML = [
    ["Candidates", data.count ?? 0],
    ["Min Compare", data.config?.minCompare || 2],
    ["Max Compare", data.config?.maxCompare || 4],
    ["Mode", data.mode || "mock"]
  ].map(([label, value]) => `<div class="part62-stat"><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></div>`).join("");
}

function renderCandidates(rows = []) {
  if (!rows.length) {
    candidatesEl.innerHTML = `<div class="part62-empty">No institutes found. City/course filter thoda broad karke try karo.</div>`;
    return;
  }
  candidatesEl.innerHTML = rows.map((row, index) => {
    const checked = index < 3 ? "checked" : "";
    const tags = [row.city, row.distanceLabel, row.verified ? "Verified" : "Unverified", row.demoLabel, ...(row.courses || []).slice(0, 2)].filter(Boolean);
    return `
      <article class="part62-candidate ${checked ? "part62-selected" : ""}">
        <label class="part62-select">
          <input class="part62-select-input" type="checkbox" value="${escapeHtml(row.profileId)}" ${checked} />
          Select to compare
        </label>
        <h3>${escapeHtml(row.name)}</h3>
        <p>${escapeHtml(row.tagline || "Public profile available.")}</p>
        <p><b>Fees:</b> ${escapeHtml(row.fees?.label || "Ask institute")}</p>
        <p><b>Rating:</b> ${escapeHtml(row.ratingLabel || "Not rated")}</p>
        <div class="part62-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="part62-candidate-actions" style="margin-top:12px">
          <a class="part62-mini-link" href="${escapeHtml(row.profileUrl)}">Profile</a>
          <a class="part62-mini-link gold" href="${escapeHtml(row.callbackUrl)}">Callback</a>
        </div>
      </article>
    `;
  }).join("");
  document.querySelectorAll(".part62-select-input").forEach((input) => {
    input.addEventListener("change", () => input.closest(".part62-candidate").classList.toggle("part62-selected", input.checked));
  });
}

function renderComparison(comparison = {}) {
  const institutes = comparison.institutes || [];
  if (!institutes.length) {
    comparisonEl.innerHTML = `<div class="part62-empty">Comparison data nahi mila.</div>`;
    return;
  }
  const winner = comparison.winner;
  const winnerHtml = winner ? `<div class="part62-winner"><b>Top Match:</b> ${escapeHtml(winner.name)} · Score ${escapeHtml(winner.score)}/100<br/><span>${escapeHtml((winner.reasons || []).join(", ") || "Balanced comparison score")}</span></div>` : "";
  const head = `<tr><th>Compare Field</th>${institutes.map((item) => `<th>${escapeHtml(item.name)}<br/><small>Score: ${escapeHtml(item.score)}/100</small></th>`).join("")}</tr>`;
  const rows = (comparison.matrix || []).map((field) => `
    <tr>
      <td><b>${escapeHtml(field.label)}</b><br/><small>${escapeHtml(field.note || "")}</small></td>
      ${(field.values || []).map((cell) => `<td>${escapeHtml(cell.value)}</td>`).join("")}
    </tr>
  `).join("");
  const actionRow = `<tr><td><b>Action</b><br/><small>Next admission step</small></td>${institutes.map((item) => `<td><a class="part62-mini-link gold" href="${escapeHtml(item.callbackUrl)}">Request Callback</a><br/><br/><a class="part62-mini-link" href="${escapeHtml(item.profileUrl)}">View Profile</a></td>`).join("")}</tr>`;
  comparisonEl.innerHTML = `${winnerHtml}<div class="part62-table-wrap"><table class="part62-comparison-table"><thead>${head}</thead><tbody>${rows}${actionRow}</tbody></table></div>`;
}

async function loadStatus() {
  try {
    const data = await safeJson("/api/part62/status");
    statusEl.innerHTML = `
      <p><b>${escapeHtml(data.part)}</b></p>
      <p>Status: <span class="part62-badge">${escapeHtml(data.status)}</span></p>
      <p>DB Mode: <span class="part62-badge">${escapeHtml(data.dbMode)}</span></p>
      <p>${escapeHtml(data.purpose)}</p>
    `;
  } catch (error) {
    statusEl.textContent = error.message;
  }
}

async function loadChecklist() {
  try {
    const data = await safeJson("/api/part62/checklist");
    checklistEl.innerHTML = (data.checklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  } catch (error) {
    checklistEl.innerHTML = `<li>${escapeHtml(error.message)}</li>`;
  }
}

async function loadCandidates() {
  candidatesEl.innerHTML = `<div class="part62-empty">Loading institutes...</div>`;
  try {
    const params = searchParams();
    const data = await safeJson(`/api/part62/candidates?${params.toString()}`);
    currentCandidates = data.candidates || [];
    candidateSummaryEl.textContent = `${data.count} institute candidate(s) found. Select 2–4 and compare.`;
    renderMeta({ ...data, config: { minCompare: 2, maxCompare: 4 } });
    renderCandidates(currentCandidates);
    await compareSelected();
  } catch (error) {
    candidatesEl.innerHTML = `<div class="part62-empty">${escapeHtml(error.message)}</div>`;
  }
}

async function compareSelected() {
  try {
    const ids = selectedIds();
    const params = searchParams();
    if (ids.length) params.set("ids", ids.join(","));
    const data = await safeJson(`/api/part62/compare?${params.toString()}`);
    compareSummaryEl.textContent = data.comparison?.summary || data.note || "Comparison ready.";
    renderComparison(data.comparison || {});
  } catch (error) {
    comparisonEl.innerHTML = `<div class="part62-empty">${escapeHtml(error.message)}</div>`;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadCandidates();
});
compareBtn.addEventListener("click", compareSelected);

loadStatus();
loadChecklist();
loadCandidates();
