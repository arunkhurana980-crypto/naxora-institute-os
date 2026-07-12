const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
if (!token) window.location.href = "index.html";

const form = document.querySelector("#roadmapForm");
const roadmapId = document.querySelector("#roadmapId");
const roadmapFormHeading = document.querySelector("#roadmapFormHeading");
const roadmapMessage = document.querySelector("#roadmapMessage");
const roadmapListMessage = document.querySelector("#roadmapListMessage");
const roadmapList = document.querySelector("#roadmapList");
const latestRoadmap = document.querySelector("#latestRoadmap");

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function setValue(id, value) { document.querySelector(`#${id}`).value = value ?? ""; }
function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function formatDate(value) { return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "No date"; }
function listText(value) { return String(value || "").split(/[\n|,]/).map(v => v.trim()).filter(Boolean); }
function setStats(data) {
  document.querySelector("#totalRoadmaps").textContent = data.totalRoadmaps || 0;
  document.querySelector("#activeRoadmaps").textContent = data.activeRoadmaps || 0;
  document.querySelector("#completedRoadmaps").textContent = data.completedRoadmaps || 0;
  document.querySelector("#averageProgress").textContent = `${data.averageProgress || 0}%`;
}
function readPayload() {
  return {
    studentName: getValue("studentName"), goal: getValue("goal"), subject: getValue("subject"),
    courseName: getValue("courseName"), batchName: getValue("batchName"),
    durationWeeks: Number(getValue("durationWeeks") || 12), weeklyHours: Number(getValue("weeklyHours") || 8),
    currentLevel: document.querySelector("#currentLevel").value, targetLevel: document.querySelector("#targetLevel").value,
    language: document.querySelector("#language").value, learningStyle: document.querySelector("#learningStyle").value,
    priority: document.querySelector("#priority").value, status: document.querySelector("#status").value,
    progressPercent: Number(getValue("progressPercent") || 0),
    weakAreas: listText(getValue("weakAreas")), strengths: listText(getValue("strengths")), notes: getValue("notes"),
  };
}
function formatRoadmap(roadmap) {
  const weeks = (roadmap.weeklyPlan || []).map((week) => {
    const tasks = (week.tasks || []).map((task) => `  • ${task}`).join("\n");
    return `Week ${week.weekNo}: ${week.title}\nFocus: ${week.focus}\nTasks:\n${tasks}\nMilestone: ${week.milestone}\nHours: ${week.expectedHours}`;
  }).join("\n\n");
  return `${roadmap.studentName} — AI Roadmap\nGoal: ${roadmap.goal}\nLevel: ${roadmap.currentLevel} → ${roadmap.targetLevel}\nDuration: ${roadmap.durationWeeks} weeks | Weekly Hours: ${roadmap.weeklyHours}\nSubject: ${roadmap.subject || "General"}\nProgress: ${roadmap.progressPercent || 0}%\n\nWeak Areas:\n${(roadmap.weakAreas || []).map(v => `• ${v}`).join("\n") || "-"}\n\nRecommendations:\n${(roadmap.recommendations || []).map(v => `• ${v}`).join("\n") || "-"}\n\nWeekly Plan:\n${weeks}\n\nMilestones:\n${(roadmap.milestones || []).map(v => `• ${v}`).join("\n") || "-"}\n\nNotes:\n${roadmap.notes || "-"}`;
}
function fillForm(roadmap) {
  roadmapId.value = roadmap.id;
  roadmapFormHeading.textContent = "Edit Student Roadmap";
  setValue("studentName", roadmap.studentName); setValue("goal", roadmap.goal); setValue("subject", roadmap.subject);
  setValue("courseName", roadmap.courseName); setValue("batchName", roadmap.batchName);
  setValue("durationWeeks", roadmap.durationWeeks); setValue("weeklyHours", roadmap.weeklyHours);
  document.querySelector("#currentLevel").value = roadmap.currentLevel || "beginner";
  document.querySelector("#targetLevel").value = roadmap.targetLevel || "job_ready";
  document.querySelector("#language").value = roadmap.language || "hinglish";
  document.querySelector("#learningStyle").value = roadmap.learningStyle || "mixed";
  document.querySelector("#priority").value = roadmap.priority || "normal";
  document.querySelector("#status").value = roadmap.status || "active";
  setValue("progressPercent", roadmap.progressPercent || 0);
  setValue("weakAreas", (roadmap.weakAreas || []).join(", "));
  setValue("strengths", (roadmap.strengths || []).join(", "));
  setValue("notes", roadmap.notes);
  latestRoadmap.textContent = formatRoadmap(roadmap);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function clearForm() {
  form.reset(); roadmapId.value = ""; roadmapFormHeading.textContent = "Generate New Student Roadmap";
  setValue("durationWeeks", "12"); setValue("weeklyHours", "8"); setValue("progressPercent", "0");
  document.querySelector("#currentLevel").value = "beginner";
  document.querySelector("#targetLevel").value = "job_ready";
  document.querySelector("#language").value = "hinglish";
  document.querySelector("#learningStyle").value = "mixed";
  document.querySelector("#priority").value = "normal";
  document.querySelector("#status").value = "active";
}
function renderRoadmaps(roadmaps) {
  if (!roadmaps.length) {
    roadmapList.innerHTML = `<p class="empty-state">Abhi roadmap library empty hai. Pehle AI roadmap generate karo.</p>`;
    return;
  }
  roadmapList.innerHTML = roadmaps.map((roadmap) => {
    const weeksPreview = (roadmap.weeklyPlan || []).slice(0, 3).map(week => `<div class="week-box"><strong>Week ${week.weekNo}: ${escapeHtml(week.title)}</strong><p>${escapeHtml(week.focus || "")}</p></div>`).join("");
    return `
      <article class="roadmap-card data-card" data-id="${roadmap.id}">
        <div class="data-top">
          <div>
            <h3>${roadmap.isPinned ? "📌 " : ""}${escapeHtml(roadmap.studentName)}</h3>
            <p>${escapeHtml(roadmap.goal)} • ${escapeHtml(roadmap.subject || "General")}</p>
            <p class="muted">Updated: ${formatDate(roadmap.updatedAt)} • ${escapeHtml(roadmap.currentLevel)} → ${escapeHtml(roadmap.targetLevel)}</p>
          </div>
          <div class="data-tags">
            <span class="tag gold">${escapeHtml(roadmap.status)}</span><span class="tag gold">${escapeHtml(roadmap.priority)}</span><span class="tag gold">${roadmap.durationWeeks} weeks</span>
          </div>
        </div>
        <div class="progress-track"><span style="width:${Math.max(0, Math.min(100, Number(roadmap.progressPercent || 0)))}%"></span></div>
        <div class="roadmap-meta"><span class="tag">${roadmap.progressPercent || 0}% Progress</span><span class="tag">${roadmap.weeklyHours} hrs/week</span><span class="tag">${(roadmap.weakAreas || []).slice(0, 2).join(", ") || "No weak area"}</span></div>
        <div class="week-list">${weeksPreview}</div>
        <div class="progress-row">
          <input class="progress-input" type="number" min="0" max="100" value="${roadmap.progressPercent || 0}" data-progress-input />
          <button class="edit-btn" data-action="progress">Update Progress</button>
        </div>
        <div class="card-actions">
          <button class="edit-btn" data-action="edit">Edit</button>
          <button class="edit-btn" data-action="copy">Copy</button>
          <button class="edit-btn" data-action="pin">${roadmap.isPinned ? "Unpin" : "Pin"}</button>
          <button class="edit-btn" data-action="active">Active</button>
          <button class="edit-btn" data-action="completed">Complete</button>
          <button class="edit-btn" data-action="archived">Archive</button>
          <button class="edit-btn" data-action="print">Print</button>
          <button class="delete-btn" data-action="delete">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}
function queryParams() {
  const params = new URLSearchParams();
  const map = { search: "roadmapSearch", subject: "subjectFilter", status: "statusFilter", priority: "priorityFilter" };
  Object.entries(map).forEach(([key, id]) => { const value = document.querySelector(`#${id}`).value.trim(); if (value) params.set(key, value); });
  return params.toString();
}
let currentRoadmaps = [];
async function loadRoadmaps() {
  roadmapListMessage.textContent = "AI roadmaps loading…";
  try {
    const response = await fetch(`${API}/ai-roadmaps?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "AI roadmaps load failed");
    currentRoadmaps = data.roadmaps || []; setStats(data); renderRoadmaps(currentRoadmaps);
    roadmapListMessage.textContent = "✅ AI roadmaps backend se connected hain.";
  } catch (error) {
    roadmapListMessage.innerHTML = `❌ ${escapeHtml(error.message)}<div class="route-fix-box">Route error fix: browser me <b>http://127.0.0.1:5000/api/route-check</b> open karo. Agar Part 33 nahi dikhe, old backend band karke Part 33 backend se <b>npm run dev</b> chalao.</div>`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) { localStorage.clear(); setTimeout(() => (window.location.href = "index.html"), 800); }
  }
}
async function saveRoadmap(event) {
  event.preventDefault();
  const payload = readPayload();
  const editing = Boolean(roadmapId.value);
  roadmapMessage.textContent = editing ? "Roadmap update ho raha hai…" : "AI roadmap generate ho raha hai…";
  try {
    const response = await fetch(editing ? `${API}/ai-roadmaps/${roadmapId.value}` : `${API}/ai-roadmaps/generate`, {
      method: editing ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "AI roadmap save failed");
    latestRoadmap.textContent = formatRoadmap(data.roadmap);
    roadmapMessage.textContent = `✅ ${data.message}`;
    clearForm(); await loadRoadmaps();
  } catch (error) { roadmapMessage.textContent = `❌ ${error.message}`; }
}
async function updateStatus(id, status) {
  const response = await fetch(`${API}/ai-roadmaps/${id}/status`, { method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.message || "Status update failed"); return data.roadmap;
}
async function togglePin(id) {
  const response = await fetch(`${API}/ai-roadmaps/${id}/pin`, { method: "PATCH", headers: authHeaders() });
  const data = await response.json(); if (!response.ok) throw new Error(data.message || "Pin update failed"); return data.roadmap;
}
async function updateProgress(id, progressPercent) {
  const response = await fetch(`${API}/ai-roadmaps/${id}/progress`, { method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ progressPercent }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.message || "Progress update failed"); return data.roadmap;
}
async function deleteRoadmap(id) {
  const response = await fetch(`${API}/ai-roadmaps/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await response.json(); if (!response.ok) throw new Error(data.message || "Delete failed");
}
function printText(text) { const w = window.open("", "_blank"); w.document.write(`<pre style="white-space:pre-wrap;font-family:Arial;line-height:1.6;padding:24px">${escapeHtml(text)}</pre>`); w.document.close(); w.print(); }

form.addEventListener("submit", saveRoadmap);
document.querySelector("#clearRoadmapBtn").addEventListener("click", clearForm);
document.querySelector("#sampleRoadmapBtn").addEventListener("click", () => {
  setValue("studentName", "Arun Khurana"); setValue("goal", "6 months me job-ready full stack developer banna"); setValue("subject", "Web Development");
  setValue("courseName", "Full Stack + AI SaaS Course"); setValue("batchName", "NAXORA Evening Batch");
  setValue("durationWeeks", "24"); setValue("weeklyHours", "12");
  document.querySelector("#learningStyle").value = "practice"; document.querySelector("#priority").value = "high";
  setValue("weakAreas", "Logic building, JavaScript practice, backend confidence, consistency");
  setValue("strengths", "Teaching mindset, creativity, daily learning attitude");
});
document.querySelector("#refreshRoadmapsBtn").addEventListener("click", loadRoadmaps);
document.querySelector("#copyLatestRoadmapBtn").addEventListener("click", async () => { await navigator.clipboard.writeText(latestRoadmap.textContent); roadmapMessage.textContent = "✅ Latest roadmap copied"; });
document.querySelector("#printLatestRoadmapBtn").addEventListener("click", () => printText(latestRoadmap.textContent));
["roadmapSearch", "subjectFilter", "statusFilter", "priorityFilter"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", loadRoadmaps));
roadmapList.addEventListener("click", async (event) => {
  const button = event.target.closest("button"); if (!button) return;
  const card = button.closest(".roadmap-card"); const id = card?.dataset.id; const action = button.dataset.action;
  const item = currentRoadmaps.find((roadmap) => roadmap.id === id); if (!id || !item) return;
  try {
    if (action === "edit") fillForm(item);
    if (action === "copy") { await navigator.clipboard.writeText(formatRoadmap(item)); roadmapListMessage.textContent = "✅ Roadmap copied"; }
    if (action === "print") printText(formatRoadmap(item));
    if (["active", "completed", "archived"].includes(action)) { await updateStatus(id, action); await loadRoadmaps(); }
    if (action === "pin") { await togglePin(id); await loadRoadmaps(); }
    if (action === "progress") { const value = card.querySelector("[data-progress-input]").value; await updateProgress(id, value); await loadRoadmaps(); }
    if (action === "delete") { if (confirm("Roadmap delete karna hai?")) { await deleteRoadmap(id); await loadRoadmaps(); } }
  } catch (error) { roadmapListMessage.textContent = `❌ ${error.message}`; }
});
document.querySelector("#logoutBtn")?.addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
loadRoadmaps();
