const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
if (!token) window.location.href = "index.html";

const form = document.querySelector("#notificationForm");
const notificationId = document.querySelector("#notificationId");
const notificationFormHeading = document.querySelector("#notificationFormHeading");
const notificationMessage = document.querySelector("#notificationMessage");
const notificationListMessage = document.querySelector("#notificationListMessage");
const notificationList = document.querySelector("#notificationList");
const latestNotification = document.querySelector("#latestNotification");
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
    title: getValue("title"),
    message: getValue("message"),
    channel: document.querySelector("#channel").value,
    provider: document.querySelector("#provider").value,
    templateType: document.querySelector("#templateType").value,
    targetAudience: document.querySelector("#targetAudience").value,
    targetName: getValue("targetName"),
    targetPhone: getValue("targetPhone"),
    targetBatch: getValue("targetBatch"),
    estimatedRecipients: Number(getValue("estimatedRecipients") || 1),
    priority: document.querySelector("#priority").value,
    status: document.querySelector("#status").value,
    scheduledAt: getValue("scheduledAt"),
    tags: getValue("tags"),
    notes: getValue("notes"),
  };
}
function setStats(data) {
  document.querySelector("#totalNotifications").textContent = data.totalNotifications || 0;
  document.querySelector("#sentNotifications").textContent = data.sentNotifications || 0;
  document.querySelector("#scheduledNotifications").textContent = data.scheduledNotifications || 0;
  document.querySelector("#failedNotifications").textContent = data.failedNotifications || 0;
}
function formatNotification(item) {
  const logs = (item.deliveryLogs || []).slice(-5).map((log) => `${log.channel.toUpperCase()} • ${log.status} • ${log.phone || "no phone"} • ${formatDate(log.sentAt || log.createdAt)} • ${log.provider}`).join("\n");
  return `${item.title}\nChannel: ${item.channel} | Provider: ${item.provider} | Status: ${item.status}\nAudience: ${item.targetAudience}${item.targetBatch ? ` | Batch: ${item.targetBatch}` : ""}${item.targetPhone ? ` | Phone: ${item.targetPhone}` : ""}\nPriority: ${item.priority} | Template: ${item.templateType}\nRecipients: ${item.estimatedRecipients} | Sent: ${item.sentCount} | Failed: ${item.failedCount}\n\nMessage:\n${item.message}\n\nLast status:\n${item.lastSendStatus || "Not sent"}\n\nRecent logs:\n${logs || "No delivery logs yet"}`;
}
function fillForm(item) {
  notificationId.value = item.id;
  notificationFormHeading.textContent = "Edit Notification Campaign";
  setValue("title", item.title); setValue("message", item.message);
  document.querySelector("#channel").value = item.channel || "whatsapp";
  document.querySelector("#provider").value = item.provider || "mock";
  document.querySelector("#templateType").value = item.templateType || "general";
  document.querySelector("#targetAudience").value = item.targetAudience || "students";
  setValue("targetName", item.targetName); setValue("targetPhone", item.targetPhone); setValue("targetBatch", item.targetBatch);
  setValue("estimatedRecipients", item.estimatedRecipients || 1);
  document.querySelector("#priority").value = item.priority || "normal";
  document.querySelector("#status").value = item.status || "draft";
  setValue("scheduledAt", item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : "");
  setValue("tags", (item.tags || []).join(", ")); setValue("notes", item.notes);
  latestNotification.textContent = formatNotification(item);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function clearForm() {
  form.reset(); notificationId.value = ""; notificationFormHeading.textContent = "Create Notification Campaign";
  document.querySelector("#channel").value = "whatsapp"; document.querySelector("#provider").value = "mock";
  document.querySelector("#templateType").value = "general"; document.querySelector("#targetAudience").value = "students";
  document.querySelector("#priority").value = "normal"; document.querySelector("#status").value = "draft"; setValue("estimatedRecipients", "25");
}
function queryParams() {
  const params = new URLSearchParams();
  const map = { search: "notificationSearch", channel: "channelFilter", status: "statusFilter", templateType: "templateFilter" };
  Object.entries(map).forEach(([key, id]) => { const value = document.querySelector(`#${id}`).value.trim(); if (value) params.set(key, value); });
  return params.toString();
}
function renderNotifications(items) {
  if (!items.length) { notificationList.innerHTML = `<p class="empty-state">Abhi notification library empty hai. Pehle WhatsApp/SMS campaign banao.</p>`; return; }
  notificationList.innerHTML = items.map((item) => `
    <article class="data-card" data-id="${item.id}">
      <div class="data-top">
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.targetAudience)} • ${escapeHtml(item.targetBatch || item.targetName || item.targetPhone || "General audience")}</p>
          <p class="muted">Updated: ${formatDate(item.updatedAt)} • Scheduled: ${formatDate(item.scheduledAt)}</p>
        </div>
        <div class="data-tags">
          <span class="tag gold">${escapeHtml(item.channel)}</span><span class="tag gold">${escapeHtml(item.status)}</span><span class="tag gold">${escapeHtml(item.priority)}</span>
        </div>
      </div>
      <div class="notification-meta">
        <span class="tag">${escapeHtml(item.provider)}</span><span class="tag">${escapeHtml(item.templateType)}</span><span class="tag">${item.estimatedRecipients} recipients</span><span class="tag">Sent ${item.sentCount || 0}</span><span class="tag">Failed ${item.failedCount || 0}</span>
      </div>
      <p class="message-text">${escapeHtml(item.message)}</p>
      <p class="muted">${escapeHtml(item.lastSendStatus || "Not sent yet")}</p>
      <div class="card-actions">
        <button class="edit-btn" data-action="edit">Edit</button>
        <button class="edit-btn" data-action="copy">Copy</button>
        <button class="edit-btn" data-action="test">Send Test</button>
        <button class="edit-btn" data-action="scheduled">Schedule</button>
        <button class="edit-btn" data-action="sent">Mark Sent</button>
        <button class="edit-btn" data-action="cancelled">Cancel</button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
}
let currentNotifications = [];
async function loadConfig() {
  try {
    const response = await fetch(`${API}/notifications/config`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Config load failed");
    const cfg = data.config || {};
    const cards = [
      ["Mock Mode", cfg.mockMode ? "ON — safe testing" : "OFF — provider keys detected"],
      ["WhatsApp Cloud", cfg.whatsappCloudReady ? "Ready" : "Keys missing"],
      ["Twilio", cfg.twilioReady ? "Ready" : "Keys missing"],
      ["MSG91", cfg.msg91Ready ? "Ready" : "Keys missing"],
      ["Fast2SMS", cfg.fast2smsReady ? "Ready" : "Keys missing"],
      ["Company", cfg.companyName || "NAXORA Institute OS"],
    ];
    configBox.innerHTML = cards.map(([k, v]) => `<div class="config-card"><strong>${escapeHtml(k)}</strong><span>${escapeHtml(v)}</span></div>`).join("");
  } catch (error) {
    configBox.innerHTML = `<p class="message">❌ ${escapeHtml(error.message)}</p>`;
  }
}
async function loadNotifications() {
  notificationListMessage.textContent = "Notifications loading…";
  try {
    const response = await fetch(`${API}/notifications?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Notifications load failed");
    currentNotifications = data.notifications || []; setStats(data); renderNotifications(currentNotifications);
    notificationListMessage.textContent = "✅ WhatsApp/SMS backend connected hai.";
  } catch (error) {
    notificationListMessage.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) { localStorage.clear(); setTimeout(() => (window.location.href = "index.html"), 800); }
  }
}
async function saveNotification(event) {
  event.preventDefault();
  const payload = readPayload();
  const editing = Boolean(notificationId.value);
  notificationMessage.textContent = editing ? "Notification update ho rahi hai…" : "Notification save ho rahi hai…";
  try {
    const response = await fetch(editing ? `${API}/notifications/${notificationId.value}` : `${API}/notifications`, {
      method: editing ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Notification save failed");
    latestNotification.textContent = formatNotification(data.notification);
    notificationMessage.textContent = `✅ ${data.message}`;
    clearForm(); await loadNotifications();
  } catch (error) { notificationMessage.textContent = `❌ ${error.message}`; }
}
async function updateStatus(id, status) {
  const r = await fetch(`${API}/notifications/${id}/status`, { method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status }) });
  const d = await r.json(); if (!r.ok) throw new Error(d.message || "Status update failed");
}
async function testSend(id) {
  const phone = prompt("Test WhatsApp/SMS phone number likho, country code ke saath", getValue("targetPhone") || "91");
  if (!phone) return;
  const r = await fetch(`${API}/notifications/${id}/send-test`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ phone }) });
  const d = await r.json(); if (!r.ok) throw new Error(d.message || "Test send failed");
  latestNotification.textContent = formatNotification(d.notification); notificationListMessage.textContent = `✅ ${d.message}`;
}
async function deleteNotification(id) { if (!confirm("Notification delete karna hai?")) return; const r = await fetch(`${API}/notifications/${id}`, { method: "DELETE", headers: authHeaders() }); const d = await r.json(); if (!r.ok) throw new Error(d.message || "Delete failed"); }
async function copyText(text) { try { await navigator.clipboard.writeText(text); notificationListMessage.textContent = "✅ Notification copy ho gayi."; } catch { notificationListMessage.textContent = "Clipboard blocked hai. Manually copy karo."; } }
notificationList.addEventListener("click", async (event) => {
  const button = event.target.closest("button"); const card = event.target.closest(".data-card"); if (!button || !card) return;
  const id = card.dataset.id; const item = currentNotifications.find((x) => x.id === id);
  try {
    if (button.dataset.action === "edit") fillForm(item);
    if (button.dataset.action === "copy") await copyText(formatNotification(item));
    if (button.dataset.action === "test") { await testSend(id); await loadNotifications(); }
    if (["scheduled", "sent", "cancelled"].includes(button.dataset.action)) { await updateStatus(id, button.dataset.action); await loadNotifications(); }
    if (button.dataset.action === "delete") { await deleteNotification(id); await loadNotifications(); }
  } catch (error) { notificationListMessage.textContent = `❌ ${error.message}`; }
});
form.addEventListener("submit", saveNotification);
document.querySelector("#testSendBtn").addEventListener("click", async () => {
  if (!notificationId.value) { notificationMessage.textContent = "Pehle notification save karo, phir test send karo."; return; }
  try { await testSend(notificationId.value); await loadNotifications(); } catch (error) { notificationMessage.textContent = `❌ ${error.message}`; }
});
document.querySelector("#clearNotificationBtn").addEventListener("click", clearForm);
document.querySelector("#refreshNotificationsBtn").addEventListener("click", loadNotifications);
document.querySelector("#refreshConfigBtn").addEventListener("click", loadConfig);
document.querySelector("#copyLatestNotificationBtn").addEventListener("click", () => copyText(latestNotification.textContent));
document.querySelector("#sampleNotificationBtn").addEventListener("click", () => {
  setValue("title", "Monthly Fees Reminder"); document.querySelector("#channel").value = "whatsapp"; document.querySelector("#provider").value = "mock"; document.querySelector("#templateType").value = "fees";
  document.querySelector("#targetAudience").value = "parents"; setValue("targetName", "Parents Group"); setValue("targetPhone", "919999999999"); setValue("targetBatch", "Web Batch A"); setValue("estimatedRecipients", "25");
  document.querySelector("#priority").value = "high"; document.querySelector("#status").value = "draft"; setValue("tags", "fees, reminder, parents");
  setValue("message", "Namaste {parent_name}, {student_name} ki monthly fees pending hai. Kindly payment complete karein. - NAXORA Institute");
  setValue("notes", "Demo/testing ke liye mock mode safe hai.");
});
["notificationSearch", "channelFilter", "statusFilter", "templateFilter"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", loadNotifications));
document.querySelector("#logoutBtn").addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
loadConfig(); loadNotifications();
