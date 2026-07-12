const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };

const form = document.querySelector("#slotForm");
const slotId = document.querySelector("#slotId");
const formTitle = document.querySelector("#formTitle");
const message = document.querySelector("#message");
const timetableStats = document.querySelector("#timetableStats");
const weeklyGrid = document.querySelector("#weeklyGrid");
const slotsList = document.querySelector("#slotsList");
const profilePill = document.querySelector("#profilePill");

profilePill.textContent = `${savedUser?.name || "User"} • Timetable`;

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function readPayload() {
  return {
    title: getValue("title"),
    subject: getValue("subject"),
    batchName: getValue("batchName"),
    courseName: getValue("courseName"),
    teacherName: getValue("teacherName"),
    room: getValue("room"),
    dayOfWeek: document.querySelector("#dayOfWeek").value,
    startTime: getValue("startTime"),
    endTime: getValue("endTime"),
    timetableType: document.querySelector("#timetableType").value,
    classMode: document.querySelector("#classMode").value,
    status: document.querySelector("#status").value,
    priority: document.querySelector("#priority").value,
    recurringFrom: getValue("recurringFrom"),
    recurringTo: getValue("recurringTo"),
    meetingLink: getValue("meetingLink"),
    notes: getValue("notes"),
  };
}

function fillForm(slot) {
  slotId.value = slot.id;
  formTitle.textContent = "Edit Timetable Slot";
  ["title", "subject", "batchName", "courseName", "teacherName", "room", "startTime", "endTime", "meetingLink", "notes"].forEach((id) => {
    document.querySelector(`#${id}`).value = slot[id] || "";
  });
  document.querySelector("#dayOfWeek").value = slot.dayOfWeek || "monday";
  document.querySelector("#timetableType").value = slot.timetableType || "batch";
  document.querySelector("#classMode").value = slot.classMode || "offline";
  document.querySelector("#status").value = slot.status || "active";
  document.querySelector("#priority").value = slot.priority || "normal";
  document.querySelector("#recurringFrom").value = slot.recurringFrom ? slot.recurringFrom.slice(0, 10) : "";
  document.querySelector("#recurringTo").value = slot.recurringTo ? slot.recurringTo.slice(0, 10) : "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  form.reset();
  slotId.value = "";
  formTitle.textContent = "Add Timetable Slot";
  document.querySelector("#dayOfWeek").value = "monday";
  document.querySelector("#startTime").value = "16:00";
  document.querySelector("#endTime").value = "17:00";
  document.querySelector("#status").value = "active";
  document.querySelector("#priority").value = "normal";
}

function renderStats(data) {
  const cards = [
    { title: "Total Slots", value: data.totalSlots || 0, label: `${data.activeSlots || 0} active • ${data.draftSlots || 0} drafts`, icon: "🗓️" },
    { title: "Class Mode", value: data.offlineSlots || 0, label: `${data.onlineSlots || 0} online classes`, icon: "🏫" },
    { title: "Coverage", value: data.batchCount || 0, label: `${data.teacherCount || 0} teachers • ${data.roomCount || 0} rooms`, icon: "📌" },
    { title: "Priority", value: data.prioritySlots || 0, label: `${data.cancelledSlots || 0} cancelled slots`, icon: "⚡" },
  ];
  timetableStats.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <div class="stat-icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <div class="stat-value">${card.value}</div>
      <p class="stat-label">${card.label}</p>
    </article>
  `).join("");
}

function renderWeeklyGrid(slots) {
  weeklyGrid.innerHTML = DAYS.map((day) => {
    const daySlots = slots.filter((slot) => slot.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return `
      <div class="day-column">
        <h3>${DAY_LABELS[day]}</h3>
        ${daySlots.length ? daySlots.map((slot) => `
          <div class="mini-slot">
            <b>${escapeHtml(slot.startTime)}-${escapeHtml(slot.endTime)} • ${escapeHtml(slot.subject)}</b>
            <span>${escapeHtml(slot.batchName || slot.title)}</span>
            <span>${escapeHtml(slot.teacherName || "No teacher")} • ${escapeHtml(slot.room || slot.classMode)}</span>
          </div>
        `).join("") : `<p class="empty-day">No class scheduled</p>`}
      </div>
    `;
  }).join("");
}

function renderSlots(slots) {
  if (!slots.length) {
    slotsList.innerHTML = `<p class="empty-state">Abhi timetable empty hai. Sample slot add karke start karo.</p>`;
    renderWeeklyGrid([]);
    return;
  }
  renderWeeklyGrid(slots);
  slotsList.innerHTML = slots.map((slot) => `
    <article class="data-card" data-id="${slot.id}">
      <div class="data-top">
        <div>
          <h3>${escapeHtml(slot.title)} • ${escapeHtml(slot.subject)}</h3>
          <p class="timetable-time">${DAY_LABELS[slot.dayOfWeek]} • ${escapeHtml(slot.startTime)} - ${escapeHtml(slot.endTime)} • ${slot.durationMinutes || 0} min</p>
          <p>${escapeHtml(slot.batchName || "No batch")} • ${escapeHtml(slot.courseName || "No course")}</p>
        </div>
        <div class="data-tags">
          <span class="tag gold">${escapeHtml(slot.status)}</span>
          <span class="tag gold">${escapeHtml(slot.classMode)}</span>
          <span class="tag gold">${escapeHtml(slot.priority)}</span>
        </div>
      </div>
      <div class="data-details">
        <div><span>Teacher</span><b>${escapeHtml(slot.teacherName || "Not set")}</b></div>
        <div><span>Room</span><b>${escapeHtml(slot.room || "Not set")}</b></div>
        <div><span>Type</span><b>${escapeHtml(slot.timetableType)}</b></div>
        <div><span>Valid</span><b>${formatDate(slot.recurringFrom)} → ${formatDate(slot.recurringTo)}</b></div>
      </div>
      ${slot.meetingLink ? `<div class="solution-box"><b>Meeting:</b> ${escapeHtml(slot.meetingLink)}</div>` : ""}
      ${slot.notes ? `<div class="solution-box"><b>Notes:</b> ${escapeHtml(slot.notes)}</div>` : ""}
      <div class="card-actions">
        <button class="edit-btn" data-action="edit">Edit</button>
        <button class="edit-btn" data-action="active">Active</button>
        <button class="edit-btn" data-action="completed">Complete</button>
        <button class="edit-btn" data-action="cancelled">Cancel</button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
}

function queryParams() {
  const params = new URLSearchParams();
  const map = {
    search: "searchInput",
    teacherName: "teacherFilter",
    batchName: "batchFilter",
    dayOfWeek: "dayFilter",
    classMode: "modeFilter",
    status: "statusFilter",
  };
  Object.entries(map).forEach(([key, id]) => {
    const value = document.querySelector(`#${id}`).value.trim();
    if (value) params.set(key, value);
  });
  return params.toString();
}

let currentSlots = [];

async function loadSlots() {
  message.textContent = "Timetable loading…";
  try {
    const response = await fetch(`${API}/timetable?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Timetable load failed");
    currentSlots = data.slots || [];
    renderStats(data);
    renderSlots(currentSlots);
    message.textContent = "✅ Timetable backend se connected hai.";
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.clear();
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}

async function saveSlot(event) {
  event.preventDefault();
  const payload = readPayload();
  const id = slotId.value;
  try {
    const response = await fetch(id ? `${API}/timetable/${id}` : `${API}/timetable`, {
      method: id ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Timetable save failed");
    message.textContent = data.conflictCount ? `⚠️ ${data.message}. Conflicts: ${data.conflictCount}` : `✅ ${data.message}`;
    clearForm();
    await loadSlots();
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
}

async function updateStatus(id, status) {
  const response = await fetch(`${API}/timetable/${id}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Status update failed");
  message.textContent = `✅ ${data.message}`;
  await loadSlots();
}

async function deleteSlot(id) {
  if (!confirm("Delete this timetable slot?")) return;
  const response = await fetch(`${API}/timetable/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Delete failed");
  message.textContent = `✅ ${data.message}`;
  await loadSlots();
}

function sampleSlot() {
  clearForm();
  document.querySelector("#title").value = "Full Stack + AI Live Class";
  document.querySelector("#subject").value = "JavaScript DOM";
  document.querySelector("#batchName").value = "Evening Batch A";
  document.querySelector("#courseName").value = "Full Stack Web Development";
  document.querySelector("#teacherName").value = "Arun Sir";
  document.querySelector("#room").value = "Computer Lab 1";
  document.querySelector("#dayOfWeek").value = "monday";
  document.querySelector("#startTime").value = "16:00";
  document.querySelector("#endTime").value = "17:30";
  document.querySelector("#classMode").value = "offline";
  document.querySelector("#priority").value = "high";
  document.querySelector("#notes").value = "DOM selectors, events aur mini project practice.";
}

form.addEventListener("submit", saveSlot);
document.querySelector("#clearBtn").addEventListener("click", clearForm);
document.querySelector("#sampleBtn").addEventListener("click", sampleSlot);
document.querySelector("#refreshBtn").addEventListener("click", loadSlots);
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

["searchInput", "teacherFilter", "batchFilter", "dayFilter", "modeFilter", "statusFilter"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", () => {
    clearTimeout(window.__timetableTimer);
    window.__timetableTimer = setTimeout(loadSlots, 350);
  });
});

slotsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const card = event.target.closest(".data-card");
  const id = card?.dataset.id;
  const slot = currentSlots.find((item) => item.id === id);
  if (!id || !slot) return;

  try {
    if (button.dataset.action === "edit") fillForm(slot);
    if (["active", "completed", "cancelled"].includes(button.dataset.action)) await updateStatus(id, button.dataset.action);
    if (button.dataset.action === "delete") await deleteSlot(id);
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
});

loadSlots();
