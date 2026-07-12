const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
if (!token) window.location.href = "index.html";

const form = document.querySelector("#emailForm");
const emailId = document.querySelector("#emailId");
const emailFormHeading = document.querySelector("#emailFormHeading");
const emailMessage = document.querySelector("#emailMessage");
const emailListMessage = document.querySelector("#emailListMessage");
const emailList = document.querySelector("#emailList");
const latestEmail = document.querySelector("#latestEmail");
const configBox = document.querySelector("#configBox");

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function setValue(id, value) { document.querySelector(`#${id}`).value = value || ""; }
function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function formatDate(value) {
  if (!value) return "No date";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function readPayload() {
  return {
    title: getValue("title"), subject: getValue("subject"), body: getValue("body"),
    provider: document.querySelector("#provider").value,
    templateType: document.querySelector("#templateType").value,
    targetAudience: document.querySelector("#targetAudience").value,
    targetName: getValue("targetName"), targetEmail: getValue("targetEmail"), targetBatch: getValue("targetBatch"),
    fromName: getValue("fromName"), fromEmail: getValue("fromEmail"), replyTo: getValue("replyTo"),
    estimatedRecipients: Number(getValue("estimatedRecipients") || 1),
    priority: document.querySelector("#priority").value,
    status: document.querySelector("#status").value,
    scheduledAt: getValue("scheduledAt"), tags: getValue("tags"), notes: getValue("notes"),
  };
}
function setStats(data) {
  document.querySelector("#totalEmails").textContent = data.totalEmails || 0;
  document.querySelector("#sentEmails").textContent = data.sentEmails || 0;
  document.querySelector("#scheduledEmails").textContent = data.scheduledEmails || 0;
  document.querySelector("#failedEmails").textContent = data.failedEmails || 0;
}
function formatEmail(item) {
  const logs = (item.deliveryLogs || []).slice(-5).map((log) => `${log.status} • ${log.email || "no email"} • ${formatDate(log.sentAt || log.createdAt)} • ${log.provider}`).join("\n");
  return `${item.title}\nSubject: ${item.subject}\nProvider: ${item.provider} | Status: ${item.status} | Priority: ${item.priority}\nAudience: ${item.targetAudience}${item.targetBatch ? ` | Batch: ${item.targetBatch}` : ""}${item.targetEmail ? ` | Email: ${item.targetEmail}` : ""}\nFrom: ${item.fromName || "NAXORA"} <${item.fromEmail || "no-reply@naxora.local"}>\nRecipients: ${item.estimatedRecipients} | Sent: ${item.sentCount || 0} | Failed: ${item.failedCount || 0}\n\nBody:\n${item.body}\n\nLast status:\n${item.lastSendStatus || "Not sent"}\n\nRecent logs:\n${logs || "No delivery logs yet"}`;
}
function fillForm(item) {
  emailId.value = item.id;
  emailFormHeading.textContent = "Edit Email Campaign";
  setValue("title", item.title); setValue("subject", item.subject); setValue("body", item.body);
  document.querySelector("#provider").value = item.provider || "mock";
  document.querySelector("#templateType").value = item.templateType || "general";
  document.querySelector("#targetAudience").value = item.targetAudience || "students";
  setValue("targetName", item.targetName); setValue("targetEmail", item.targetEmail); setValue("targetBatch", item.targetBatch);
  setValue("fromName", item.fromName); setValue("fromEmail", item.fromEmail); setValue("replyTo", item.replyTo);
  setValue("estimatedRecipients", item.estimatedRecipients || 1);
  document.querySelector("#priority").value = item.priority || "normal";
  document.querySelector("#status").value = item.status || "draft";
  setValue("scheduledAt", item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : "");
  setValue("tags", (item.tags || []).join(", ")); setValue("notes", item.notes);
  latestEmail.textContent = formatEmail(item);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function clearForm() {
  form.reset(); emailId.value = ""; emailFormHeading.textContent = "Create Email Campaign";
  document.querySelector("#provider").value = "mock"; document.querySelector("#templateType").value = "general";
  document.querySelector("#targetAudience").value = "students"; document.querySelector("#priority").value = "normal";
  document.querySelector("#status").value = "draft"; setValue("estimatedRecipients", "25");
}
function queryParams() {
  const params = new URLSearchParams();
  const map = { search: "emailSearch", provider: "providerFilter", status: "statusFilter", templateType: "templateFilter" };
  Object.entries(map).forEach(([key, id]) => { const value = document.querySelector(`#${id}`).value.trim(); if (value) params.set(key, value); });
  return params.toString();
}
function renderEmails(items) {
  if (!items.length) { emailList.innerHTML = `<p class="empty-state">Abhi email campaign library empty hai. Pehle campaign banao.</p>`; return; }
  emailList.innerHTML = items.map((item) => `
    <article class="data-card" data-id="${item.id}">
      <div class="data-top">
        <div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.subject)}</p><p class="muted">Updated: ${formatDate(item.updatedAt)} • Scheduled: ${formatDate(item.scheduledAt)}</p></div>
        <div class="data-tags"><span class="tag gold">${escapeHtml(item.provider)}</span><span class="tag gold">${escapeHtml(item.status)}</span><span class="tag gold">${escapeHtml(item.priority)}</span></div>
      </div>
      <div class="email-meta"><span class="tag">${escapeHtml(item.targetAudience)}</span><span class="tag">${escapeHtml(item.templateType)}</span><span class="tag">${item.estimatedRecipients} recipients</span><span class="tag">Sent ${item.sentCount || 0}</span><span class="tag">Failed ${item.failedCount || 0}</span></div>
      <p class="muted">To: ${escapeHtml(item.targetEmail || item.targetBatch || item.targetName || "Audience list")}</p>
      <p class="email-body">${escapeHtml(item.body).slice(0, 600)}</p>
      <p class="muted">${escapeHtml(item.lastSendStatus || "Not sent yet")}</p>
      <div class="card-actions">
        <button class="edit-btn" data-action="edit">Edit</button><button class="edit-btn" data-action="copy">Copy</button><button class="edit-btn" data-action="test">Send Test</button><button class="edit-btn" data-action="scheduled">Schedule</button><button class="edit-btn" data-action="sent">Mark Sent</button><button class="edit-btn" data-action="cancelled">Cancel</button><button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
}
let currentEmails = [];
async function loadConfig() {
  try {
    const response = await fetch(`${API}/email-notifications/config`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Config load failed");
    const cfg = data.config || {};
    const cards = [
      ["Mock Mode", cfg.mockMode ? "ON — safe testing" : "OFF — provider keys detected"],
      ["SMTP", cfg.smtpReady ? "Ready" : "Keys missing"],
      ["SendGrid", cfg.sendgridReady ? "Ready" : "Keys missing"],
      ["Mailgun", cfg.mailgunReady ? "Ready" : "Keys missing"],
      ["From", `${cfg.fromName || "NAXORA"} <${cfg.fromAddress || "no-reply@naxora.local"}>`],
      ["SMTP Host", cfg.smtpHost || "Not set"],
    ];
    configBox.innerHTML = cards.map(([k, v]) => `<div class="config-card"><strong>${escapeHtml(k)}</strong><span>${escapeHtml(v)}</span></div>`).join("");
  } catch (error) { configBox.innerHTML = `<p class="message">❌ ${escapeHtml(error.message)}</p>`; }
}
async function loadEmails() {
  emailListMessage.textContent = "Email campaigns loading…";
  try {
    const response = await fetch(`${API}/email-notifications?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Email campaigns load failed");
    currentEmails = data.emails || []; setStats(data); renderEmails(currentEmails);
    emailListMessage.textContent = "✅ Email backend connected hai.";
  } catch (error) {
    emailListMessage.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) { localStorage.clear(); setTimeout(() => (window.location.href = "index.html"), 800); }
  }
}
async function saveEmail(event) {
  event.preventDefault();
  const payload = readPayload(); const editing = Boolean(emailId.value);
  emailMessage.textContent = editing ? "Email update ho raha hai…" : "Email save ho raha hai…";
  try {
    const response = await fetch(editing ? `${API}/email-notifications/${emailId.value}` : `${API}/email-notifications`, { method: editing ? "PUT" : "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Email save failed");
    latestEmail.textContent = formatEmail(data.email); emailMessage.textContent = `✅ ${data.message}`; clearForm(); await loadEmails();
  } catch (error) { emailMessage.textContent = `❌ ${error.message}`; }
}
async function updateStatus(id, status) {
  const r = await fetch(`${API}/email-notifications/${id}/status`, { method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status }) });
  const d = await r.json(); if (!r.ok) throw new Error(d.message || "Status update failed");
}
async function testSend(id) {
  const target = prompt("Test email address likho", getValue("targetEmail") || "test@example.com");
  if (!target) return;
  const r = await fetch(`${API}/email-notifications/${id}/send-test`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ email: target }) });
  const d = await r.json(); if (!r.ok) throw new Error(d.message || "Test email failed");
  latestEmail.textContent = formatEmail(d.email); emailListMessage.textContent = `✅ ${d.message}`;
}
async function deleteEmail(id) { if (!confirm("Email campaign delete karna hai?")) return; const r = await fetch(`${API}/email-notifications/${id}`, { method: "DELETE", headers: authHeaders() }); const d = await r.json(); if (!r.ok) throw new Error(d.message || "Delete failed"); }
async function copyText(text) { try { await navigator.clipboard.writeText(text); emailListMessage.textContent = "✅ Email copy ho gaya."; } catch { emailListMessage.textContent = "Clipboard blocked hai. Manually copy karo."; } }
emailList.addEventListener("click", async (event) => {
  const button = event.target.closest("button"); const card = event.target.closest(".data-card"); if (!button || !card) return;
  const id = card.dataset.id; const item = currentEmails.find((x) => x.id === id);
  try {
    if (button.dataset.action === "edit") fillForm(item);
    if (button.dataset.action === "copy") await copyText(formatEmail(item));
    if (button.dataset.action === "test") { await testSend(id); await loadEmails(); }
    if (["scheduled", "sent", "cancelled"].includes(button.dataset.action)) { await updateStatus(id, button.dataset.action); await loadEmails(); }
    if (button.dataset.action === "delete") { await deleteEmail(id); await loadEmails(); }
  } catch (error) { emailListMessage.textContent = `❌ ${error.message}`; }
});
form.addEventListener("submit", saveEmail);
document.querySelector("#testSendBtn").addEventListener("click", async () => { if (!emailId.value) { emailMessage.textContent = "Pehle email campaign save karo, phir test send karo."; return; } try { await testSend(emailId.value); await loadEmails(); } catch (error) { emailMessage.textContent = `❌ ${error.message}`; } });
document.querySelector("#clearEmailBtn").addEventListener("click", clearForm);
document.querySelector("#refreshEmailsBtn").addEventListener("click", loadEmails);
document.querySelector("#refreshConfigBtn").addEventListener("click", loadConfig);
document.querySelector("#copyLatestEmailBtn").addEventListener("click", () => copyText(latestEmail.textContent));
document.querySelector("#sampleEmailBtn").addEventListener("click", () => {
  setValue("title", "Monthly Fees Reminder"); setValue("subject", "Fees reminder from NAXORA Institute"); document.querySelector("#provider").value = "mock"; document.querySelector("#templateType").value = "fees";
  document.querySelector("#targetAudience").value = "parents"; setValue("targetName", "Parents Group"); setValue("targetEmail", "parent@example.com"); setValue("targetBatch", "Web Batch A"); setValue("estimatedRecipients", "25");
  document.querySelector("#priority").value = "high"; document.querySelector("#status").value = "draft"; setValue("tags", "fees, reminder, parents");
  setValue("fromName", "NAXORA Institute OS"); setValue("fromEmail", "no-reply@naxora.local"); setValue("replyTo", "support@naxora.local");
  setValue("body", "Namaste {{parent_name}},\n\n{{student_name}} ki monthly fees pending hai. Kindly payment complete karein.\n\nRegards,\nNAXORA Institute");
  setValue("notes", "Demo/testing ke liye mock mode safe hai.");
});
["emailSearch", "providerFilter", "statusFilter", "templateFilter"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", loadEmails));
document.querySelector("#logoutBtn").addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
loadConfig(); loadEmails();
