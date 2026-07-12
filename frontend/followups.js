const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

const profilePill = document.querySelector("#profilePill");
const message = document.querySelector("#message");
const followupStats = document.querySelector("#followupStats");
const followupList = document.querySelector("#followupList");
const performanceList = document.querySelector("#performanceList");
const logDialog = document.querySelector("#logDialog");
const logForm = document.querySelector("#logForm");

profilePill.textContent = `${savedUser?.name || "User"} • Follow-ups`;

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function money(value = 0) { return `₹${Number(value || 0).toLocaleString("en-IN")}`; }
function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function label(value = "") { return String(value).replaceAll("_", " "); }
function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function urgencyText(lead) {
  if (lead.urgency === "missed") return `Missed ${Math.abs(lead.daysLeft || 0)}d`;
  if (lead.urgency === "today") return "Today";
  if (lead.urgency === "needs_schedule") return "Need schedule";
  if (lead.urgency === "upcoming") return `${lead.daysLeft}d left`;
  if (lead.urgency === "closed") return "Closed";
  return "Scheduled";
}

function queryParams() {
  const params = new URLSearchParams();
  const map = { search: "searchInput", counsellor: "counsellorFilter", view: "viewFilter" };
  Object.entries(map).forEach(([key, id]) => {
    const value = getValue(id);
    if (value) params.set(key, value);
  });
  return params.toString();
}

function renderStats(data) {
  const cards = [
    { title: "Today", value: data.todayFollowUps || 0, label: `${data.missedFollowUps || 0} missed follow-ups`, icon: "⏰" },
    { title: "Hot Board", value: data.hotLeadPriority || 0, label: `${data.unscheduledLeads || 0} leads need schedule`, icon: "🔥" },
    { title: "Upcoming", value: data.upcomingFollowUps || 0, label: "Next 7 days pipeline", icon: "📅" },
    { title: "Pipeline", value: money(data.activePipelineValue || 0), label: `${data.conversionPercent || 0}% converted`, icon: "🎯" },
  ];
  followupStats.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <div class="stat-icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <div class="stat-value">${card.value}</div>
      <p class="stat-label">${card.label}</p>
    </article>
  `).join("");
}

let currentLeads = [];

function renderLeads(leads) {
  if (!leads.length) {
    followupList.innerHTML = `<p class="empty-state">Is view me leads nahi hain. Enquiries page se lead add karo ya filter change karo.</p>`;
    return;
  }

  followupList.innerHTML = leads.map((lead) => `
    <article class="data-card followup-card" data-id="${lead.id}">
      <div class="data-top">
        <div>
          <h3>${escapeHtml(lead.studentName)} <span class="enquiry-temp ${escapeHtml(lead.leadTemperature)}">${escapeHtml(lead.leadTemperature)}</span></h3>
          <p>${escapeHtml(lead.interestedCourse || "Course not set")} • ${escapeHtml(lead.city || "No city")} • ${escapeHtml(lead.phone || "No phone")}</p>
        </div>
        <div class="data-tags">
          <span class="lead-urgency ${escapeHtml(lead.urgency)}">${escapeHtml(urgencyText(lead))}</span>
          <span class="tag gold">${escapeHtml(label(lead.status))}</span>
        </div>
      </div>
      <div class="priority-strip">
        <div><span>Next Follow-up</span><b>${formatDate(lead.nextFollowUpDate)}</b></div>
        <div><span>Counsellor</span><b>${escapeHtml(lead.counsellorName || "Unassigned")}</b></div>
        <div><span>Pipeline Value</span><b>${money(lead.finalFee || 0)}</b></div>
        <div><span>Follow-up Done</span><b>${lead.followUpCount || 0}</b></div>
      </div>
      ${lead.lastFollowUp ? `<div class="last-note"><b>Last ${formatDate(lead.lastFollowUp.date)} • ${escapeHtml(label(lead.lastFollowUp.mode))}</b><br>${escapeHtml(label(lead.lastFollowUp.outcome))}: ${escapeHtml(lead.lastFollowUp.note || "No note")}</div>` : `<div class="last-note"><b>No follow-up log yet</b><br>First call/WhatsApp note save karo.</div>`}
      ${lead.notes ? `<div class="solution-box"><b>Lead Notes:</b> ${escapeHtml(lead.notes)}</div>` : ""}
      <div class="card-actions">
        <button class="edit-btn" data-action="log">Log Follow-up</button>
        <button class="edit-btn" data-action="snooze1">Tomorrow</button>
        <button class="edit-btn" data-action="snooze3">3 Days</button>
        <button class="edit-btn" data-action="hot">Hot</button>
        <button class="edit-btn" data-action="converted">Converted</button>
        <button class="delete-btn" data-action="lost">Lost</button>
      </div>
    </article>
  `).join("");
}

function renderPerformance(items) {
  if (!items.length) {
    performanceList.innerHTML = `<p class="empty-state">Counsellor report empty hai.</p>`;
    return;
  }
  performanceList.innerHTML = items.map((item) => `
    <article class="performance-card">
      <h3>${escapeHtml(item.counsellorName)}</h3>
      <p>${item.conversionPercent || 0}% conversion • ${money(item.pipelineValue || 0)} active pipeline</p>
      <div class="performance-metrics">
        <span>Total Leads<b>${item.totalLeads || 0}</b></span>
        <span>Hot Leads<b>${item.hotLeads || 0}</b></span>
        <span>Follow-ups Done<b>${item.followUpsDone || 0}</b></span>
        <span>Missed<b>${item.missed || 0}</b></span>
      </div>
    </article>
  `).join("");
}

async function loadFollowups() {
  message.textContent = "Follow-up board loading…";
  try {
    const response = await fetch(`${API}/followups?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Follow-ups load failed");
    currentLeads = data.leads || [];
    renderStats(data);
    renderLeads(currentLeads);
    renderPerformance(data.performance || []);
    message.textContent = "✅ Lead Follow-up Automation backend se connected hai.";
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.clear();
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}

function openLogDialog(id) {
  const lead = currentLeads.find((item) => item.id === id);
  document.querySelector("#leadId").value = id;
  document.querySelector("#leadTitle").textContent = lead ? `${lead.studentName} • ${lead.phone} • ${lead.interestedCourse}` : "Lead";
  document.querySelector("#followMode").value = "call";
  document.querySelector("#followOutcome").value = "callback";
  document.querySelector("#followNextDate").value = "";
  document.querySelector("#followNote").value = "";
  logDialog.showModal();
}

async function saveLog(event) {
  event.preventDefault();
  const id = getValue("leadId");
  const payload = {
    mode: getValue("followMode"),
    outcome: getValue("followOutcome"),
    nextFollowUpDate: getValue("followNextDate"),
    note: getValue("followNote"),
  };
  try {
    const response = await fetch(`${API}/followups/${id}/log`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Follow-up log save failed");
    logDialog.close();
    message.textContent = `✅ ${data.message}`;
    await loadFollowups();
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
}

async function snoozeLead(id, days) {
  const response = await fetch(`${API}/followups/${id}/snooze`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ days }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Snooze failed");
  message.textContent = `✅ ${data.message}`;
  await loadFollowups();
}

async function patchLead(id, payload) {
  const response = await fetch(`${API}/followups/${id}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Lead update failed");
  message.textContent = `✅ ${data.message}`;
  await loadFollowups();
}

logForm.addEventListener("submit", saveLog);
document.querySelector("#closeLogBtn").addEventListener("click", () => logDialog.close());
document.querySelector("#refreshBtn").addEventListener("click", loadFollowups);
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

["searchInput", "counsellorFilter"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", () => loadFollowups());
});
document.querySelector("#viewFilter").addEventListener("change", loadFollowups);

followupList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const card = event.target.closest(".data-card");
  const id = card?.dataset.id;
  const action = button.dataset.action;
  try {
    if (action === "log") openLogDialog(id);
    if (action === "snooze1") await snoozeLead(id, 1);
    if (action === "snooze3") await snoozeLead(id, 3);
    if (action === "hot") await patchLead(id, { leadTemperature: "hot", status: "follow_up" });
    if (action === "converted") await patchLead(id, { status: "converted", leadTemperature: "hot" });
    if (action === "lost") await patchLead(id, { status: "lost", leadTemperature: "cold" });
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
});

loadFollowups();
