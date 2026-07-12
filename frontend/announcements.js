const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

document.querySelector("#profilePill").textContent = `${savedUser?.name || "User"} • Notices`;

const form = document.querySelector("#announcementForm");
const announcementId = document.querySelector("#announcementId");
const title = document.querySelector("#title");
const category = document.querySelector("#category");
const priority = document.querySelector("#priority");
const targetAudience = document.querySelector("#targetAudience");
const batchName = document.querySelector("#batchName");
const statusInput = document.querySelector("#status");
const publishAt = document.querySelector("#publishAt");
const expiryDate = document.querySelector("#expiryDate");
const actionLabel = document.querySelector("#actionLabel");
const actionLink = document.querySelector("#actionLink");
const messageText = document.querySelector("#messageText");
const formTitle = document.querySelector("#formTitle");
const statsBox = document.querySelector("#announcementStats");
const list = document.querySelector("#announcementsList");
const pageMessage = document.querySelector("#pageMessage");

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function setMessage(text, ok = true) {
  pageMessage.textContent = `${ok ? "✅" : "❌"} ${text}`;
}

function dateText(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function shortDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function statCard(titleText, value, label, icon) {
  return `
    <article class="stat-card">
      <div class="stat-icon">${icon}</div>
      <h3>${titleText}</h3>
      <div class="stat-value">${value}</div>
      <p class="stat-label">${label}</p>
    </article>
  `;
}

function getPayload() {
  return {
    title: title.value.trim(),
    message: messageText.value.trim(),
    category: category.value,
    priority: priority.value,
    targetAudience: targetAudience.value,
    batchName: batchName.value.trim(),
    status: statusInput.value,
    publishAt: publishAt.value || undefined,
    expiryDate: expiryDate.value || undefined,
    actionLabel: actionLabel.value.trim(),
    actionLink: actionLink.value.trim(),
  };
}

function clearForm() {
  form.reset();
  announcementId.value = "";
  statusInput.value = "published";
  category.value = "general";
  priority.value = "normal";
  targetAudience.value = "all";
  formTitle.textContent = "Create Announcement";
}

function fillForm(item) {
  announcementId.value = item.id;
  title.value = item.title || "";
  messageText.value = item.message || "";
  category.value = item.category || "general";
  priority.value = item.priority || "normal";
  targetAudience.value = item.targetAudience || "all";
  batchName.value = item.batchName || "";
  statusInput.value = item.status || "published";
  publishAt.value = toDateTimeLocal(item.publishAt);
  expiryDate.value = item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "";
  actionLabel.value = item.actionLabel || "";
  actionLink.value = item.actionLink || "";
  formTitle.textContent = "Edit Announcement";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderStats(data) {
  statsBox.innerHTML = [
    statCard("Total Notices", data.totalAnnouncements || 0, `${data.publishedAnnouncements || 0} published`, "🔔"),
    statCard("Urgent", data.urgentAnnouncements || 0, `${data.highAnnouncements || 0} high priority`, "🚨"),
    statCard("Drafts", data.draftAnnouncements || 0, `${data.archivedAnnouncements || 0} archived`, "📝"),
    statCard("Read Rows", data.readRows || 0, `${data.categoryCount || 0} categories`, "👁️"),
  ].join("");
}

function renderAnnouncements(items = []) {
  if (!items.length) {
    list.innerHTML = `<p class="empty-state">Abhi announcements available nahi hain.</p>`;
    return;
  }

  list.innerHTML = items.map((item) => `
    <article class="announcement-card ${item.priority}">
      <div class="announcement-top">
        <div>
          <span class="badge">${item.category}</span>
          <span class="badge ${item.priority}">${item.priority}</span>
          <span class="badge">${item.status}</span>
          <span class="badge">${item.targetAudience}${item.batchName ? ` • ${item.batchName}` : ""}</span>
        </div>
        <strong>${item.isRead ? "Read" : "Unread"}</strong>
      </div>
      <h3>${item.title}</h3>
      <p>${item.message}</p>
      <div class="announcement-meta">
        <span>Publish: ${dateText(item.publishAt)}</span>
        <span>Expiry: ${shortDate(item.expiryDate)}</span>
        <span>Read count: ${item.readCount || 0}</span>
      </div>
      ${item.actionLink ? `<a class="notice-link" href="${item.actionLink}" target="_blank" rel="noreferrer">${item.actionLabel || "Open link"}</a>` : ""}
      <div class="card-actions">
        <button data-action="edit" data-id="${item.id}">Edit</button>
        <button data-action="read" data-id="${item.id}">Mark read</button>
        <button data-action="publish" data-id="${item.id}">Publish</button>
        <button data-action="archive" data-id="${item.id}">Archive</button>
        <button data-action="delete" data-id="${item.id}" class="danger">Delete</button>
      </div>
    </article>
  `).join("");
}

function getFilters() {
  const params = new URLSearchParams();
  const search = document.querySelector("#searchInput").value.trim();
  const categoryFilter = document.querySelector("#categoryFilter").value;
  const priorityFilter = document.querySelector("#priorityFilter").value;
  const statusFilter = document.querySelector("#statusFilter").value;
  const audienceFilter = document.querySelector("#audienceFilter").value;
  if (search) params.set("search", search);
  if (categoryFilter) params.set("category", categoryFilter);
  if (priorityFilter) params.set("priority", priorityFilter);
  if (statusFilter) params.set("status", statusFilter);
  if (audienceFilter) params.set("targetAudience", audienceFilter);
  return params.toString();
}

async function loadAnnouncements() {
  try {
    const query = getFilters();
    const response = await fetch(`${API}/announcements${query ? `?${query}` : ""}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Announcements load failed");
    renderStats(data);
    renderAnnouncements(data.announcements || []);
    setMessage("Announcements load ho gaye.");
  } catch (error) {
    setMessage(error.message, false);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const id = announcementId.value;
    const response = await fetch(`${API}/announcements${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(getPayload()),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Save failed");
    clearForm();
    await loadAnnouncements();
    setMessage(data.message || "Announcement save ho gaya");
  } catch (error) {
    setMessage(error.message, false);
  }
});

list.addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  const itemCard = btn.closest(".announcement-card");

  if (action === "edit") {
    const response = await fetch(`${API}/announcements/${id}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Announcement read failed", false);
    fillForm(data.announcement);
    return;
  }

  if (action === "delete") {
    if (!confirm("Announcement delete karna hai?")) return;
    const response = await fetch(`${API}/announcements/${id}`, { method: "DELETE", headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) return setMessage(data.message || "Delete failed", false);
    await loadAnnouncements();
    return setMessage(data.message || "Deleted");
  }

  const endpoint = action === "read" ? "read" : "status";
  const body = action === "publish" ? { status: "published" } : action === "archive" ? { status: "archived" } : {};
  const response = await fetch(`${API}/announcements/${id}/${endpoint}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) return setMessage(data.message || "Action failed", false);
  await loadAnnouncements();
  setMessage(data.message || "Updated");
});

["#searchInput", "#categoryFilter", "#priorityFilter", "#statusFilter", "#audienceFilter"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", loadAnnouncements);
  document.querySelector(selector).addEventListener("change", loadAnnouncements);
});

document.querySelector("#refreshBtn").addEventListener("click", loadAnnouncements);
document.querySelector("#clearBtn").addEventListener("click", clearForm);
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

loadAnnouncements();
