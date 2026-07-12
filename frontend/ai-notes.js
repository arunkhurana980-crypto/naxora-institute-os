const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

const form = document.querySelector("#notesForm");
const noteId = document.querySelector("#noteId");
const noteFormHeading = document.querySelector("#noteFormHeading");
const noteMessage = document.querySelector("#noteMessage");
const notesListMessage = document.querySelector("#notesListMessage");
const notesList = document.querySelector("#notesList");
const latestNotes = document.querySelector("#latestNotes");

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function setValue(id, value) { document.querySelector(`#${id}`).value = value || ""; }
function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function formatDate(value) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function readPayload() {
  return {
    title: getValue("title"),
    subject: getValue("subject"),
    topic: getValue("topic"),
    classLevel: getValue("classLevel"),
    courseName: getValue("courseName"),
    batchName: getValue("batchName"),
    noteType: document.querySelector("#noteType").value,
    language: document.querySelector("#language").value,
    difficulty: document.querySelector("#difficulty").value,
    examFocus: document.querySelector("#examFocus").value,
    status: document.querySelector("#status").value,
    tags: getValue("tags"),
    sourceInput: getValue("sourceInput"),
    keyPoints: getValue("keyPoints"),
    generatedNotes: getValue("generatedNotes"),
  };
}
function fillForm(note) {
  noteId.value = note.id;
  noteFormHeading.textContent = "Edit AI Notes";
  setValue("title", note.title);
  setValue("subject", note.subject);
  setValue("topic", note.topic);
  setValue("classLevel", note.classLevel);
  setValue("courseName", note.courseName);
  setValue("batchName", note.batchName);
  document.querySelector("#noteType").value = note.noteType || "class_notes";
  document.querySelector("#language").value = note.language || "hinglish";
  document.querySelector("#difficulty").value = note.difficulty || "medium";
  document.querySelector("#examFocus").value = note.examFocus || "coding";
  document.querySelector("#status").value = note.status || "draft";
  setValue("tags", (note.tags || []).join(", "));
  setValue("sourceInput", note.sourceInput);
  setValue("keyPoints", (note.keyPoints || []).join("\n"));
  setValue("generatedNotes", note.generatedNotes);
  latestNotes.textContent = note.generatedNotes || "No notes";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function clearForm() {
  form.reset();
  noteId.value = "";
  noteFormHeading.textContent = "Generate New Notes";
  document.querySelector("#language").value = "hinglish";
  document.querySelector("#difficulty").value = "medium";
  document.querySelector("#examFocus").value = "coding";
  document.querySelector("#status").value = "draft";
}
function setStats(data) {
  document.querySelector("#totalNotes").textContent = data.totalNotes || 0;
  document.querySelector("#publishedNotes").textContent = data.publishedNotes || 0;
  document.querySelector("#draftNotes").textContent = data.draftNotes || 0;
  document.querySelector("#pinnedNotes").textContent = data.pinnedNotes || 0;
}
function noteTypeLabel(type) {
  return String(type || "class_notes").replaceAll("_", " ");
}
function renderNotes(notes) {
  if (!notes.length) {
    notesList.innerHTML = `<p class="empty-state">Abhi notes library empty hai. Pehle AI notes generate karo.</p>`;
    return;
  }
  notesList.innerHTML = notes.map((note) => `
    <article class="data-card" data-id="${note.id}">
      <div class="data-top">
        <div>
          <h3>${note.isPinned ? "📌 " : ""}${escapeHtml(note.title)}</h3>
          <p>${escapeHtml(note.subject)} • ${escapeHtml(note.topic)} • ${escapeHtml(note.classLevel || note.batchName || "General")}</p>
          <p class="muted">Updated: ${formatDate(note.updatedAt)} • ${escapeHtml(note.language)} • ${escapeHtml(note.examFocus)}</p>
        </div>
        <div class="data-tags">
          <span class="tag gold status-${note.status}">${escapeHtml(note.status)}</span>
          <span class="tag gold">${escapeHtml(noteTypeLabel(note.noteType))}</span>
          <span class="tag gold">${escapeHtml(note.difficulty)}</span>
        </div>
      </div>
      <p>${escapeHtml(note.summary || "No summary")}</p>
      <div class="notes-preview">${escapeHtml((note.generatedNotes || "").slice(0, 1200))}${(note.generatedNotes || "").length > 1200 ? "..." : ""}</div>
      ${(note.tags || []).length ? `<div class="note-meta-row">${note.tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="card-actions">
        <button class="edit-btn" data-action="edit">Edit</button>
        <button class="edit-btn" data-action="copy">Copy</button>
        <button class="edit-btn" data-action="pin">${note.isPinned ? "Unpin" : "Pin"}</button>
        <button class="edit-btn" data-action="published">Publish</button>
        <button class="edit-btn" data-action="archived">Archive</button>
        <button class="edit-btn" data-action="print">Print</button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
}
function queryParams() {
  const params = new URLSearchParams();
  const map = { search: "notesSearch", subject: "subjectFilter", noteType: "noteTypeFilter", status: "statusFilter" };
  Object.entries(map).forEach(([key, id]) => {
    const value = document.querySelector(`#${id}`).value.trim();
    if (value) params.set(key, value);
  });
  return params.toString();
}
let currentNotes = [];
async function loadNotes() {
  notesListMessage.textContent = "AI notes loading…";
  try {
    const response = await fetch(`${API}/ai-notes?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "AI notes load failed");
    currentNotes = data.notes || [];
    setStats(data);
    renderNotes(currentNotes);
    notesListMessage.textContent = "✅ AI notes backend se connected hain.";
  } catch (error) {
    notesListMessage.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.clear();
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}
async function saveNote(event) {
  event.preventDefault();
  const payload = readPayload();
  const editing = Boolean(noteId.value);
  noteMessage.textContent = editing ? "Notes update ho rahe hain…" : "AI notes generate ho rahe hain…";
  try {
    const response = await fetch(editing ? `${API}/ai-notes/${noteId.value}` : `${API}/ai-notes/generate`, {
      method: editing ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "AI notes save failed");
    latestNotes.textContent = data.note?.generatedNotes || "Notes generated";
    setValue("generatedNotes", data.note?.generatedNotes || "");
    noteMessage.textContent = `✅ ${data.message}`;
    clearForm();
    await loadNotes();
  } catch (error) {
    noteMessage.textContent = `❌ ${error.message}`;
  }
}
async function updateStatus(id, status) {
  const response = await fetch(`${API}/ai-notes/${id}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Status update failed");
}
async function togglePin(id) {
  const response = await fetch(`${API}/ai-notes/${id}/pin`, { method: "PATCH", headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Pin update failed");
}
async function deleteNote(id) {
  if (!confirm("AI note delete karna hai?")) return;
  const response = await fetch(`${API}/ai-notes/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Delete failed");
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    notesListMessage.textContent = "✅ Notes copy ho gaye.";
  } catch {
    notesListMessage.textContent = "Browser clipboard blocked hai. Manually select karke copy karo.";
  }
}
function printText(text) {
  latestNotes.textContent = text || latestNotes.textContent;
  setTimeout(() => window.print(), 50);
}
notesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  const card = event.target.closest(".data-card");
  if (!button || !card) return;
  const id = card.dataset.id;
  const note = currentNotes.find((item) => item.id === id);
  try {
    if (button.dataset.action === "edit") fillForm(note);
    if (button.dataset.action === "copy") await copyText(note.generatedNotes || "");
    if (button.dataset.action === "pin") { await togglePin(id); await loadNotes(); }
    if (button.dataset.action === "published") { await updateStatus(id, "published"); await loadNotes(); }
    if (button.dataset.action === "archived") { await updateStatus(id, "archived"); await loadNotes(); }
    if (button.dataset.action === "print") printText(note.generatedNotes || "");
    if (button.dataset.action === "delete") { await deleteNote(id); await loadNotes(); }
  } catch (error) {
    notesListMessage.textContent = `❌ ${error.message}`;
  }
});
form.addEventListener("submit", saveNote);
document.querySelector("#clearNoteBtn").addEventListener("click", clearForm);
document.querySelector("#refreshNotesBtn").addEventListener("click", loadNotes);
document.querySelector("#copyLatestBtn").addEventListener("click", () => copyText(latestNotes.textContent));
document.querySelector("#printLatestBtn").addEventListener("click", () => printText(latestNotes.textContent));
document.querySelector("#sampleNoteBtn").addEventListener("click", () => {
  setValue("title", "JWT Authentication Complete Notes");
  setValue("subject", "Web Development");
  setValue("topic", "JWT Authentication");
  setValue("classLevel", "Beginner to Intermediate");
  setValue("courseName", "Full Stack Web Development");
  setValue("batchName", "NAXORA Web Batch A");
  document.querySelector("#noteType").value = "class_notes";
  document.querySelector("#language").value = "hinglish";
  document.querySelector("#difficulty").value = "medium";
  document.querySelector("#examFocus").value = "coding";
  setValue("sourceInput", "JWT token login ke baad generate hota hai. Frontend token ko localStorage me save karke protected routes par Authorization header me bhejta hai. Backend token verify karke user ko allow karta hai.");
  setValue("keyPoints", "Token generation\nToken storage\nProtected route\nAuthorization header\nToken expiry");
  setValue("tags", "jwt, auth, backend, nodejs");
});
["notesSearch", "subjectFilter", "noteTypeFilter", "statusFilter"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", loadNotes));
document.querySelector("#logoutBtn").addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
loadNotes();
