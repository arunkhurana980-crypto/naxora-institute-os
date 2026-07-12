const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
if (!token) window.location.href = "index.html";

const form = document.querySelector("#mockForm");
const mockId = document.querySelector("#mockId");
const mockFormHeading = document.querySelector("#mockFormHeading");
const mockMessage = document.querySelector("#mockMessage");
const mockListMessage = document.querySelector("#mockListMessage");
const mockList = document.querySelector("#mockList");
const latestMock = document.querySelector("#latestMock");

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
    title: getValue("title"), subject: getValue("subject"), topic: getValue("topic"),
    classLevel: getValue("classLevel"), courseName: getValue("courseName"), batchName: getValue("batchName"),
    questionCount: Number(getValue("questionCount") || 10), durationMinutes: Number(getValue("durationMinutes") || 30),
    testMode: document.querySelector("#testMode").value, language: document.querySelector("#language").value,
    difficulty: document.querySelector("#difficulty").value, examFocus: document.querySelector("#examFocus").value,
    status: document.querySelector("#status").value, tags: getValue("tags"), sourceInput: getValue("sourceInput"),
    instructions: getValue("instructions"),
  };
}
function setStats(data) {
  document.querySelector("#totalMockTests").textContent = data.totalMockTests || 0;
  document.querySelector("#publishedTests").textContent = data.publishedTests || 0;
  document.querySelector("#draftTests").textContent = data.draftTests || 0;
  document.querySelector("#pinnedTests").textContent = data.pinnedTests || 0;
}
function formatTest(test) {
  const questions = (test.questions || []).map((q, i) => {
    const opts = (q.options || []).length ? `\nOptions: ${(q.options || []).join(" | ")}` : "";
    return `${i + 1}. [${q.questionType}] (${q.marks} marks) ${q.question}${opts}\nAnswer: ${q.correctAnswer || "Pending"}\nExplanation: ${q.explanation || "-"}`;
  }).join("\n\n");
  return `${test.title}\nSubject: ${test.subject}\nTopic: ${test.topic}\nDuration: ${test.durationMinutes} min | Total Marks: ${test.totalMarks}\nMode: ${test.testMode} | Difficulty: ${test.difficulty}\n\nInstructions:\n${test.instructions || "-"}\n\nQuestions:\n${questions}\n\nAnswer Key:\n${(test.answerKey || []).join("\n")}`;
}
function fillForm(test) {
  mockId.value = test.id;
  mockFormHeading.textContent = "Edit AI Mock Test";
  setValue("title", test.title); setValue("subject", test.subject); setValue("topic", test.topic);
  setValue("classLevel", test.classLevel); setValue("courseName", test.courseName); setValue("batchName", test.batchName);
  setValue("questionCount", test.questionCount); setValue("durationMinutes", test.durationMinutes);
  document.querySelector("#testMode").value = test.testMode || "practice";
  document.querySelector("#language").value = test.language || "hinglish";
  document.querySelector("#difficulty").value = test.difficulty || "medium";
  document.querySelector("#examFocus").value = test.examFocus || "coding";
  document.querySelector("#status").value = test.status || "draft";
  setValue("tags", (test.tags || []).join(", "));
  setValue("sourceInput", test.sourceInput); setValue("instructions", test.instructions);
  latestMock.textContent = formatTest(test);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function clearForm() {
  form.reset(); mockId.value = ""; mockFormHeading.textContent = "Generate New Mock Test";
  document.querySelector("#language").value = "hinglish"; document.querySelector("#difficulty").value = "medium";
  document.querySelector("#examFocus").value = "coding"; document.querySelector("#status").value = "draft";
  setValue("questionCount", "10"); setValue("durationMinutes", "30");
}
function renderTests(tests) {
  if (!tests.length) { mockList.innerHTML = `<p class="empty-state">Abhi mock test library empty hai. Pehle AI mock test generate karo.</p>`; return; }
  mockList.innerHTML = tests.map((test) => `
    <article class="data-card" data-id="${test.id}">
      <div class="data-top">
        <div>
          <h3>${test.isPinned ? "📌 " : ""}${escapeHtml(test.title)}</h3>
          <p>${escapeHtml(test.subject)} • ${escapeHtml(test.topic)} • ${escapeHtml(test.classLevel || test.batchName || "General")}</p>
          <p class="muted">Updated: ${formatDate(test.updatedAt)} • ${escapeHtml(test.language)} • ${escapeHtml(test.examFocus)}</p>
        </div>
        <div class="data-tags">
          <span class="tag gold">${escapeHtml(test.status)}</span><span class="tag gold">${escapeHtml(test.testMode)}</span><span class="tag gold">${escapeHtml(test.difficulty)}</span>
        </div>
      </div>
      <div class="mock-meta">
        <span class="tag">${test.questionCount} Questions</span><span class="tag">${test.totalMarks} Marks</span><span class="tag">${test.durationMinutes} Min</span><span class="tag">${test.attempts || 0} Attempts</span>
      </div>
      <div class="questions-preview">${escapeHtml(formatTest(test).slice(0, 1400))}${formatTest(test).length > 1400 ? "..." : ""}</div>
      <div class="card-actions">
        <button class="edit-btn" data-action="edit">Edit</button>
        <button class="edit-btn" data-action="copy">Copy</button>
        <button class="edit-btn" data-action="pin">${test.isPinned ? "Unpin" : "Pin"}</button>
        <button class="edit-btn" data-action="published">Publish</button>
        <button class="edit-btn" data-action="archived">Archive</button>
        <button class="edit-btn" data-action="attempt">Mark Attempt</button>
        <button class="edit-btn" data-action="print">Print</button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
}
function queryParams() {
  const params = new URLSearchParams();
  const map = { search: "mockSearch", subject: "subjectFilter", testMode: "testModeFilter", status: "statusFilter" };
  Object.entries(map).forEach(([key, id]) => { const value = document.querySelector(`#${id}`).value.trim(); if (value) params.set(key, value); });
  return params.toString();
}
let currentTests = [];
async function loadTests() {
  mockListMessage.textContent = "AI mock tests loading…";
  try {
    const response = await fetch(`${API}/ai-mock-tests?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "AI mock tests load failed");
    currentTests = data.tests || []; setStats(data); renderTests(currentTests);
    mockListMessage.textContent = "✅ AI mock tests backend se connected hain.";
  } catch (error) {
    mockListMessage.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) { localStorage.clear(); setTimeout(() => (window.location.href = "index.html"), 800); }
  }
}
async function saveTest(event) {
  event.preventDefault();
  const payload = readPayload();
  const editing = Boolean(mockId.value);
  mockMessage.textContent = editing ? "Mock test update ho raha hai…" : "AI mock test generate ho raha hai…";
  try {
    const response = await fetch(editing ? `${API}/ai-mock-tests/${mockId.value}` : `${API}/ai-mock-tests/generate`, {
      method: editing ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "AI mock test save failed");
    latestMock.textContent = formatTest(data.test);
    mockMessage.textContent = `✅ ${data.message}`;
    clearForm(); await loadTests();
  } catch (error) { mockMessage.textContent = `❌ ${error.message}`; }
}
async function updateStatus(id, status) {
  const response = await fetch(`${API}/ai-mock-tests/${id}/status`, { method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.message || "Status update failed");
}
async function togglePin(id) { const r = await fetch(`${API}/ai-mock-tests/${id}/pin`, { method: "PATCH", headers: authHeaders() }); const d = await r.json(); if (!r.ok) throw new Error(d.message || "Pin update failed"); }
async function markAttempt(id) { const r = await fetch(`${API}/ai-mock-tests/${id}/attempt`, { method: "PATCH", headers: authHeaders() }); const d = await r.json(); if (!r.ok) throw new Error(d.message || "Attempt update failed"); }
async function deleteTest(id) { if (!confirm("AI mock test delete karna hai?")) return; const r = await fetch(`${API}/ai-mock-tests/${id}`, { method: "DELETE", headers: authHeaders() }); const d = await r.json(); if (!r.ok) throw new Error(d.message || "Delete failed"); }
async function copyText(text) { try { await navigator.clipboard.writeText(text); mockListMessage.textContent = "✅ Mock test copy ho gaya."; } catch { mockListMessage.textContent = "Browser clipboard blocked hai. Manually copy karo."; } }
function printText(text) { latestMock.textContent = text || latestMock.textContent; setTimeout(() => window.print(), 50); }
mockList.addEventListener("click", async (event) => {
  const button = event.target.closest("button"); const card = event.target.closest(".data-card"); if (!button || !card) return;
  const id = card.dataset.id; const test = currentTests.find((item) => item.id === id);
  try {
    if (button.dataset.action === "edit") fillForm(test);
    if (button.dataset.action === "copy") await copyText(formatTest(test));
    if (button.dataset.action === "pin") { await togglePin(id); await loadTests(); }
    if (button.dataset.action === "published") { await updateStatus(id, "published"); await loadTests(); }
    if (button.dataset.action === "archived") { await updateStatus(id, "archived"); await loadTests(); }
    if (button.dataset.action === "attempt") { await markAttempt(id); await loadTests(); }
    if (button.dataset.action === "print") printText(formatTest(test));
    if (button.dataset.action === "delete") { await deleteTest(id); await loadTests(); }
  } catch (error) { mockListMessage.textContent = `❌ ${error.message}`; }
});
form.addEventListener("submit", saveTest);
document.querySelector("#clearMockBtn").addEventListener("click", clearForm);
document.querySelector("#refreshMocksBtn").addEventListener("click", loadTests);
document.querySelector("#copyLatestBtn").addEventListener("click", () => copyText(latestMock.textContent));
document.querySelector("#printLatestBtn").addEventListener("click", () => printText(latestMock.textContent));
document.querySelector("#sampleMockBtn").addEventListener("click", () => {
  setValue("title", "JWT Authentication AI Mock Test"); setValue("subject", "Web Development"); setValue("topic", "JWT Authentication");
  setValue("classLevel", "Beginner to Intermediate"); setValue("courseName", "Full Stack Web Development"); setValue("batchName", "NAXORA Web Batch A");
  setValue("questionCount", "10"); setValue("durationMinutes", "30"); document.querySelector("#testMode").value = "practice";
  document.querySelector("#language").value = "hinglish"; document.querySelector("#difficulty").value = "medium"; document.querySelector("#examFocus").value = "coding";
  setValue("sourceInput", "JWT token login ke baad generate hota hai. Frontend token ko localStorage me save karke Authorization header me bhejta hai. Backend token verify karke protected routes allow karta hai.");
  setValue("tags", "jwt, auth, backend, nodejs");
});
["mockSearch", "subjectFilter", "testModeFilter", "statusFilter"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", loadTests));
document.querySelector("#logoutBtn").addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
loadTests();
