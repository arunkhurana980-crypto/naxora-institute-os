const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

document.querySelector("#profilePill").textContent = `${savedUser?.name || "User"} • Library`;

const form = document.querySelector("#libraryForm");
const issueForm = document.querySelector("#issueForm");
const itemId = document.querySelector("#itemId");
const formTitle = document.querySelector("#formTitle");
const statsBox = document.querySelector("#libraryStats");
const list = document.querySelector("#libraryList");
const pageMessage = document.querySelector("#pageMessage");
const issueItemId = document.querySelector("#issueItemId");

let currentItems = [];

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function setMessage(text, ok = true) {
  pageMessage.textContent = `${ok ? "✅" : "❌"} ${text}`;
}

function value(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function dateText(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function statCard(title, value, label, icon) {
  return `
    <article class="stat-card">
      <div class="stat-icon">${icon}</div>
      <h3>${title}</h3>
      <div class="stat-value">${value}</div>
      <p class="stat-label">${label}</p>
    </article>
  `;
}

function getPayload() {
  return {
    materialType: value("materialType"),
    title: value("title"),
    subject: value("subject"),
    topic: value("topic"),
    author: value("author"),
    courseName: value("courseName"),
    batchName: value("batchName"),
    classLevel: value("classLevel"),
    language: value("language"),
    difficulty: value("difficulty"),
    format: value("format"),
    materialUrl: value("materialUrl"),
    storageLocation: value("storageLocation"),
    totalCopies: Number(value("totalCopies") || 0),
    availableCopies: Number(value("availableCopies") || 0),
    tags: value("tags"),
    status: value("status"),
    accessLevel: value("accessLevel"),
    description: value("description"),
  };
}

function setForm(item) {
  itemId.value = item.id;
  for (const key of ["materialType", "title", "subject", "topic", "author", "courseName", "batchName", "classLevel", "language", "difficulty", "format", "materialUrl", "storageLocation", "totalCopies", "availableCopies", "tags", "status", "accessLevel", "description"]) {
    const el = document.querySelector(`#${key}`);
    if (el) el.value = item[key] ?? "";
  }
  formTitle.textContent = "Edit Study Material";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  form.reset();
  itemId.value = "";
  document.querySelector("#format").value = "digital";
  document.querySelector("#totalCopies").value = "1";
  document.querySelector("#availableCopies").value = "1";
  formTitle.textContent = "Add Study Material";
}

function renderStats(data) {
  statsBox.innerHTML = [
    statCard("Materials", data.totalMaterials || 0, `${data.activeCount || 0} active • ${data.subjectCount || 0} subjects`, "📖"),
    statCard("Digital", data.digitalCount || 0, `${data.pdfCount || 0} PDFs • ${data.videoCount || 0} videos`, "💻"),
    statCard("Books", data.bookCount || 0, `${data.availableCopies || 0}/${data.totalCopies || 0} copies available`, "📚"),
    statCard("Issued", data.issuedCount || 0, `${data.overdueCount || 0} overdue • ${data.returnedCount || 0} returned`, "🧾"),
  ].join("");
}

function typeIcon(type) {
  return { book: "📚", pdf: "📄", video: "🎬", link: "🔗", notes: "📝", assignment: "📌", other: "📦" }[type] || "📖";
}

function renderIssueOptions(items) {
  issueItemId.innerHTML = `<option value="">Select material</option>` + items.map((item) => `
    <option value="${item.id}">${item.title} • ${item.availableCopies ?? 0}/${item.totalCopies ?? 0} copies</option>
  `).join("");
}

function renderItems(items = []) {
  currentItems = items;
  renderIssueOptions(items);

  if (!items.length) {
    list.innerHTML = `<p class="empty-state">Abhi library material available nahi hai.</p>`;
    return;
  }

  list.innerHTML = items.map((item) => {
    const issueRows = (item.issueRecords || []).slice(0, 4).map((record) => `
      <div class="issue-row">
        <span>${record.studentName || "Student"}</span>
        <b>${record.status}</b>
        <small>${dateText(record.issueDate)} → ${dateText(record.returnDate)}</small>
        ${record.status !== "returned" ? `<button data-action="return" data-id="${item.id}" data-record="${record.id}">Return</button>` : ""}
      </div>
    `).join("");

    return `
      <article class="data-card library-card">
        <div class="data-top">
          <div class="data-title">
            <div class="data-avatar">${typeIcon(item.materialType)}</div>
            <div>
              <h3>${item.title}</h3>
              <p>${item.subject} ${item.topic ? `• ${item.topic}` : ""}</p>
            </div>
          </div>
          <div class="data-tags">
            <span class="tag gold">${item.materialType}</span>
            <span class="tag blue">${item.format}</span>
            <span class="tag">${item.status}</span>
            <span class="tag">${item.difficulty}</span>
          </div>
        </div>
        <p class="data-note">${item.description || "No description"}</p>
        <div class="data-details">
          <div><span>Course / Batch</span>${item.courseName || "—"} • ${item.batchName || "—"}</div>
          <div><span>Author / Source</span>${item.author || "—"}</div>
          <div><span>Copies</span>${item.availableCopies ?? 0}/${item.totalCopies ?? 0} available</div>
          <div><span>Location</span>${item.storageLocation || "—"}</div>
          <div><span>Access</span>${item.accessLevel || "students"}</div>
          <div><span>Tags</span>${item.tags || "—"}</div>
        </div>
        ${item.materialUrl ? `<a class="resource-link" href="${item.materialUrl}" target="_blank" rel="noreferrer">Open digital resource ↗</a>` : ""}
        ${issueRows ? `<div class="issue-history"><h4>Recent Issue Records</h4>${issueRows}</div>` : ""}
        <div class="card-actions">
          <button class="edit-btn" data-action="edit" data-id="${item.id}">Edit</button>
          <button class="edit-btn" data-action="active" data-id="${item.id}">Active</button>
          <button class="edit-btn" data-action="archive" data-id="${item.id}">Archive</button>
          <button class="delete-btn" data-action="delete" data-id="${item.id}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function getFilters() {
  const params = new URLSearchParams();
  const search = value("searchInput");
  const materialType = value("typeFilter");
  const status = value("statusFilter");
  const format = value("formatFilter");
  const difficulty = value("difficultyFilter");
  if (search) params.set("search", search);
  if (materialType) params.set("materialType", materialType);
  if (status) params.set("status", status);
  if (format) params.set("format", format);
  if (difficulty) params.set("difficulty", difficulty);
  return params.toString();
}

async function loadLibrary() {
  try {
    const query = getFilters();
    const response = await fetch(`${API}/library${query ? `?${query}` : ""}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Library load failed");
    renderStats(data);
    renderItems(data.items || []);
    setMessage("Library data load ho gaya.");
  } catch (error) {
    setMessage(error.message, false);
  }
}

async function saveMaterial(event) {
  event.preventDefault();
  try {
    const id = itemId.value;
    const response = await fetch(`${API}/library${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      headers: authHeaders(),
      body: JSON.stringify(getPayload()),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Save failed");
    setMessage(data.message || "Material save ho gaya");
    clearForm();
    await loadLibrary();
  } catch (error) {
    setMessage(error.message, false);
  }
}

async function issueMaterial(event) {
  event.preventDefault();
  try {
    const id = value("issueItemId");
    if (!id) throw new Error("Pehle material select karo");
    const response = await fetch(`${API}/library/${id}/issue`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        studentName: value("issueStudentName"),
        studentEmail: value("issueStudentEmail"),
        rollNo: value("issueRollNo"),
        issueDate: value("issueDate"),
        returnDate: value("returnDate"),
        note: value("issueNote"),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Issue failed");
    setMessage(data.message || "Material issue ho gaya");
    issueForm.reset();
    await loadLibrary();
  } catch (error) {
    setMessage(error.message, false);
  }
}

async function updateStatus(id, status) {
  const response = await fetch(`${API}/library/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Status update failed");
  setMessage(data.message);
}

async function markReturned(id, recordId) {
  const response = await fetch(`${API}/library/${id}/issue/${recordId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status: "returned", returnDate: new Date().toISOString().slice(0, 10) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Return update failed");
  setMessage(data.message);
}

async function deleteItem(id) {
  const response = await fetch(`${API}/library/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Delete failed");
  setMessage(data.message);
}

form.addEventListener("submit", saveMaterial);
issueForm.addEventListener("submit", issueMaterial);
document.querySelector("#clearBtn").addEventListener("click", clearForm);
document.querySelector("#refreshBtn").addEventListener("click", loadLibrary);
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

for (const id of ["searchInput", "typeFilter", "statusFilter", "formatFilter", "difficultyFilter"]) {
  document.querySelector(`#${id}`).addEventListener("input", () => setTimeout(loadLibrary, 150));
}

list.addEventListener("click", async (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  try {
    if (action === "edit") {
      const item = currentItems.find((x) => x.id === id);
      if (item) setForm(item);
      return;
    }
    if (action === "active") await updateStatus(id, "active");
    if (action === "archive") await updateStatus(id, "archived");
    if (action === "return") await markReturned(id, btn.dataset.record);
    if (action === "delete") {
      const ok = confirm("Delete this library material?");
      if (!ok) return;
      await deleteItem(id);
    }
    await loadLibrary();
  } catch (error) {
    setMessage(error.message, false);
  }
});

document.querySelector("#issueDate").value = new Date().toISOString().slice(0, 10);
loadLibrary();
