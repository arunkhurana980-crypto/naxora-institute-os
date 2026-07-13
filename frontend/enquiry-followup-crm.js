const API = "/api/part58";
let crmConfig = { statuses: [], sources: [], courses: [], followUpOutcomes: [] };
let leads = [];
let selectedLeadId = null;

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || "Request failed");
  return data;
}

function fillSelects() {
  const courseSelect = $("courseSelect");
  const sourceSelect = $("sourceSelect");
  const statusFilter = $("statusFilter");
  const outcomeSelect = $("outcomeSelect");
  courseSelect.innerHTML = crmConfig.courses.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  sourceSelect.innerHTML = crmConfig.sources.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
  statusFilter.innerHTML = `<option value="">All Status</option>` + crmConfig.statuses.map((item) => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("");
  outcomeSelect.innerHTML = crmConfig.followUpOutcomes.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
}

function renderStats(analytics = {}) {
  $("statTotal").textContent = analytics.total ?? 0;
  $("statConverted").textContent = analytics.converted ?? 0;
  $("statOverdue").textContent = analytics.overdue ?? 0;
  $("statRate").textContent = `${analytics.conversionRate ?? 0}%`;
}

function statusLabel(status) {
  return crmConfig.statuses.find((item) => item.id === status)?.label || status;
}

function renderLeads() {
  const list = $("leadList");
  if (!leads.length) {
    list.innerHTML = `<div class="selected-empty">No leads found. New lead create karo.</div>`;
    return;
  }
  list.innerHTML = leads.map((lead) => `
    <article class="lead-card ${lead.leadId === selectedLeadId ? "active" : ""}" data-id="${escapeHtml(lead.leadId)}">
      <div class="lead-top">
        <b>${escapeHtml(lead.studentName)}</b>
        <span class="badge ${escapeHtml(lead.priority)}">${escapeHtml(lead.priority)}</span>
      </div>
      <div class="lead-meta">
        <span>${escapeHtml(lead.phone)} • ${escapeHtml(lead.courseInterest)}</span>
        <span>Status: ${escapeHtml(statusLabel(lead.status))}</span>
        <span>Follow-up: ${lead.followUpDate ? new Date(lead.followUpDate).toLocaleString() : "Not set"}</span>
      </div>
    </article>
  `).join("");
  list.querySelectorAll(".lead-card").forEach((card) => card.addEventListener("click", () => selectLead(card.dataset.id)));
}

function selectLead(leadId) {
  selectedLeadId = leadId;
  const lead = leads.find((item) => item.leadId === leadId);
  renderLeads();
  if (!lead) return;
  $("quickActions").hidden = false;
  const notes = (lead.callNotes || []).slice().reverse().map((note) => `<div class="note"><b>${escapeHtml(note.outcome)}</b><br>${escapeHtml(note.note)}<br><small>${new Date(note.createdAt).toLocaleString()}</small></div>`).join("");
  $("selectedLead").innerHTML = `
    <div class="selected-card">
      <h3>${escapeHtml(lead.studentName)} <span class="badge ${escapeHtml(lead.priority)}">${escapeHtml(statusLabel(lead.status))}</span></h3>
      <p><b>Lead ID:</b> ${escapeHtml(lead.leadId)}</p>
      <p><b>Parent:</b> ${escapeHtml(lead.parentName || "-")} • <b>Phone:</b> ${escapeHtml(lead.phone)}</p>
      <p><b>Course:</b> ${escapeHtml(lead.courseInterest)} • <b>Source:</b> ${escapeHtml(lead.source)}</p>
      <p><b>Follow-up:</b> ${lead.followUpDate ? new Date(lead.followUpDate).toLocaleString() : "Not set"}</p>
      <p><b>Converted:</b> ${lead.conversion?.converted ? "Yes" : "No"}</p>
      <div class="note-list">${notes || `<div class="note">No call notes yet.</div>`}</div>
    </div>
  `;
}

async function loadLeads() {
  const status = $("statusFilter").value;
  const search = $("searchInput").value.trim();
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (search) qs.set("search", search);
  const data = await api(`/leads?${qs.toString()}`);
  leads = data.leads || [];
  renderStats(data.analytics || {});
  renderLeads();
  if (selectedLeadId) selectLead(selectedLeadId);
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function init() {
  crmConfig = await api("/config");
  fillSelects();
  await loadLeads();

  $("refreshBtn").addEventListener("click", loadLeads);
  $("statusFilter").addEventListener("change", loadLeads);
  $("searchInput").addEventListener("input", () => clearTimeout(window.__crmSearchTimer) || (window.__crmSearchTimer = setTimeout(loadLeads, 400)));

  $("leadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = formToObject(form);
    payload.reminderEnabled = Boolean(payload.followUpDate);
    try {
      const data = await api("/leads", { method: "POST", body: JSON.stringify(payload) });
      $("formMessage").textContent = data.message || "Lead saved.";
      form.reset();
      await loadLeads();
      selectLead(data.lead.leadId);
    } catch (err) {
      $("formMessage").textContent = err.message;
    }
  });

  $("noteForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedLeadId) return;
    await api(`/leads/${encodeURIComponent(selectedLeadId)}/call-notes`, { method: "POST", body: JSON.stringify(formToObject(event.currentTarget)) });
    event.currentTarget.reset();
    await loadLeads();
  });

  $("followForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedLeadId) return;
    const payload = formToObject(event.currentTarget);
    payload.reminderEnabled = true;
    await api(`/leads/${encodeURIComponent(selectedLeadId)}/follow-up`, { method: "PATCH", body: JSON.stringify(payload) });
    event.currentTarget.reset();
    await loadLeads();
  });

  $("convertForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedLeadId) return;
    await api(`/leads/${encodeURIComponent(selectedLeadId)}/convert`, { method: "POST", body: JSON.stringify(formToObject(event.currentTarget)) });
    event.currentTarget.reset();
    await loadLeads();
  });
}

init().catch((error) => {
  console.error(error);
  $("leadList").innerHTML = `<div class="selected-empty">CRM load nahi hua: ${escapeHtml(error.message)}</div>`;
});
