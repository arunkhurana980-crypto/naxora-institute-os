const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
if (!token) window.location.href = "index.html";

const listMessage = document.querySelector("#superListMessage");
const instituteList = document.querySelector("#instituteList");
const alertList = document.querySelector("#alertList");
const planBreakdown = document.querySelector("#planBreakdown");
const actionList = document.querySelector("#actionList");
const noteForm = document.querySelector("#superNoteForm");
const noteMessage = document.querySelector("#noteMessage");

function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function money(value = 0) { return `₹${Number(value || 0).toLocaleString("en-IN")}`; }
function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function label(value = "") { return String(value || "").replaceAll("_", " "); }
function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}
function queryParams() {
  const params = new URLSearchParams();
  const search = getValue("superSearch");
  const status = getValue("superStatusFilter");
  const planName = getValue("superPlanFilter");
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (planName) params.set("planName", planName);
  return params.toString();
}
function setStats(summary = {}) {
  ["totalInstitutes", "activeInstitutes", "expiring7", "pastDueInstitutes", "totalUsers"].forEach((id) => {
    document.querySelector(`#${id}`).textContent = summary[id] || 0;
  });
  document.querySelector("#estimatedMRR").textContent = money(summary.estimatedMRR || 0);
}
function renderAlerts(alerts = []) {
  if (!alerts.length) {
    alertList.innerHTML = `<div class="alert-card"><strong>All clear</strong><p>Abhi koi urgent SaaS alert nahi hai.</p></div>`;
    return;
  }
  alertList.innerHTML = alerts.map((a) => `<article class="alert-card alert-${escapeHtml(a.priority)}"><strong>${escapeHtml(a.title)}</strong><p>${escapeHtml(a.message)}</p></article>`).join("");
}
function renderPlanBreakdown(items = []) {
  if (!items.length) {
    planBreakdown.innerHTML = `<div class="plan-row"><strong>No plans yet</strong><p>Subscriptions add karoge to plan split yahan dikhega.</p></div>`;
    return;
  }
  planBreakdown.innerHTML = items.map((item) => `<div class="plan-row"><strong>${escapeHtml(label(item.planName))} • ${item.count}</strong><p>Base ${money(item.base)} • Paid ${money(item.paid)}</p></div>`).join("");
}
function renderInstitutes(items = []) {
  if (!items.length) {
    instituteList.innerHTML = `<p class="empty-state">Abhi institutes nahi mil rahe. Subscriptions page me institute subscription add karo.</p>`;
    return;
  }
  instituteList.innerHTML = items.map((item) => `<article class="data-card" data-id="${item.id}" data-name="${escapeHtml(item.instituteName)}">
    <div class="data-top">
      <div>
        <h3>${escapeHtml(item.instituteName)} ${item.vaniEnabled ? `<span class="tag vani-badge">VANI AI</span>` : ""}</h3>
        <p>${escapeHtml(item.ownerName || "No owner")} • ${escapeHtml(item.ownerPhone || "No phone")} • ${escapeHtml(item.city || "No city")}</p>
      </div>
      <div class="subscription-badges">
        <span class="tag gold">${escapeHtml(label(item.planName))}</span>
        <span class="tag status-${escapeHtml(item.status)}">${escapeHtml(label(item.status))}</span>
        <span class="tag risk-${escapeHtml(item.risk)}">Risk: ${escapeHtml(item.risk)}</span>
      </div>
    </div>
    <div class="super-kpis">
      <div><span>Amount Due</span><b>${money(item.amountDue)}</b></div>
      <div><span>Expiry</span><b>${formatDate(item.expiryDate)}</b></div>
      <div><span>Days Left</span><b>${item.daysLeft ?? "—"}</b></div>
      <div><span>Last Payment</span><b>${money(item.lastPaymentAmount)}</b></div>
      <div><span>Students Used</span><b>${item.studentsUsed || 0}</b></div>
      <div><span>Branches Used</span><b>${item.branchesUsed || 0}</b></div>
      <div><span>AI Doubts Used</span><b>${item.aiDoubtsUsed || 0}</b></div>
      <div><span>Updated</span><b>${formatDate(item.updatedAt)}</b></div>
    </div>
    <div class="admin-actions">
      <button class="edit-btn" data-action="active">Mark Active</button>
      <button class="edit-btn" data-action="past_due">Past Due</button>
      <button class="edit-btn" data-action="paused">Block/Pause</button>
      <button class="edit-btn" data-action="premium">Premium Plan</button>
      <button class="edit-btn" data-action="note">Add Note</button>
    </div>
  </article>`).join("");
}
function renderActions(items = []) {
  if (!items.length) {
    actionList.innerHTML = `<p class="empty-state">Abhi action history empty hai.</p>`;
    return;
  }
  actionList.innerHTML = items.map((item) => `<article class="data-card" data-action-id="${item.id}">
    <div class="data-top"><div><h3>${escapeHtml(item.title || "Admin Action")}</h3><p>${escapeHtml(item.instituteName || "General")} • ${escapeHtml(label(item.actionType))} • ${escapeHtml(label(item.priority))}</p></div><span class="tag">${formatDate(item.createdAt)}</span></div>
    <p>${escapeHtml(item.note || "No note")}</p>
    ${item.oldValue || item.newValue ? `<p class="last-note"><b>Change:</b> ${escapeHtml(item.oldValue || "-")} → ${escapeHtml(item.newValue || "-")}</p>` : ""}
  </article>`).join("");
}
async function loadSuperAdmin() {
  listMessage.textContent = "Super Admin data loading…";
  try {
    const response = await fetch(`${API}/super-admin?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Super Admin load failed");
    setStats(data.summary || {});
    renderAlerts(data.alerts || []);
    renderPlanBreakdown(data.planBreakdown || []);
    renderInstitutes(data.institutes || []);
    renderActions(data.recentActions || []);
    listMessage.textContent = "✅ Part 26 Super Admin backend se connected hai.";
  } catch (error) {
    listMessage.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.clear();
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}
async function patchStatus(id, status) {
  const response = await fetch(`${API}/super-admin/institutes/${id}/status`, { method:"PATCH", headers: authHeaders({ "Content-Type":"application/json" }), body: JSON.stringify({ status, note: `Super Admin se ${status} mark kiya.` }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Status update failed");
  listMessage.textContent = `✅ ${data.message}`;
  await loadSuperAdmin();
}
async function patchPlan(id, planName) {
  const basePrice = planName === "premium" ? 4999 : planName === "pro" ? 2499 : 999;
  const response = await fetch(`${API}/super-admin/institutes/${id}/plan`, { method:"PATCH", headers: authHeaders({ "Content-Type":"application/json" }), body: JSON.stringify({ planName, basePrice, note: "Super Admin plan control se update." }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Plan update failed");
  listMessage.textContent = `✅ ${data.message}`;
  await loadSuperAdmin();
}
function fillNote(id, name) {
  document.querySelector("#noteInstituteId").value = id || "";
  document.querySelector("#noteInstituteName").value = name || "";
  document.querySelector("#noteTitle").value = "Follow-up required";
  document.querySelector("#noteBody").value = `${name || "Institute"} ke liye admin follow-up note.`;
  document.querySelector("#priority").value = "high";
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}
async function saveNote(event) {
  event.preventDefault();
  try {
    const payload = {
      instituteId: getValue("noteInstituteId"),
      instituteName: getValue("noteInstituteName"),
      actionType: getValue("actionType"),
      priority: getValue("priority"),
      title: getValue("noteTitle"),
      note: getValue("noteBody"),
    };
    const response = await fetch(`${API}/super-admin/notes`, { method:"POST", headers: authHeaders({ "Content-Type":"application/json" }), body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Note save failed");
    noteMessage.textContent = `✅ ${data.message}`;
    noteForm.reset();
    await loadSuperAdmin();
  } catch (error) { noteMessage.textContent = `❌ ${error.message}`; }
}

document.querySelector("#logoutBtn").addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
document.querySelector("#refreshSuperAdminBtn").addEventListener("click", loadSuperAdmin);
document.querySelector("#seedDemoBtn").addEventListener("click", () => fillNote("", "NAXORA Demo Institute"));
["superSearch", "superStatusFilter", "superPlanFilter"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", loadSuperAdmin));
noteForm.addEventListener("submit", saveNote);
instituteList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const card = button.closest(".data-card");
  const id = card.dataset.id;
  const name = card.dataset.name;
  try {
    const action = button.dataset.action;
    if (["active", "past_due", "paused"].includes(action)) await patchStatus(id, action);
    if (action === "premium") await patchPlan(id, "premium");
    if (action === "note") fillNote(id, name);
  } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
});
loadSuperAdmin();
