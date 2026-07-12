const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

const form = document.querySelector("#questionForm");
const questionId = document.querySelector("#questionId");
const formTitle = document.querySelector("#formTitle");
const message = document.querySelector("#message");
const questionsList = document.querySelector("#questionsList");
const bankStats = document.querySelector("#bankStats");
const profilePill = document.querySelector("#profilePill");

profilePill.textContent = `${savedUser?.name || "User"} • Question Bank`;

function getValue(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Not used yet";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

function readPayload() {
  return {
    questionText: getValue("questionText"),
    questionType: document.querySelector("#questionType").value,
    subject: getValue("subject"),
    chapter: getValue("chapter"),
    topic: getValue("topic"),
    courseName: getValue("courseName"),
    batchName: getValue("batchName"),
    classLevel: getValue("classLevel"),
    examTag: document.querySelector("#examTag").value,
    difficulty: document.querySelector("#difficulty").value,
    language: document.querySelector("#language").value,
    options: getValue("options").split("\n").map((item) => item.trim()).filter(Boolean),
    correctAnswer: getValue("correctAnswer"),
    explanation: getValue("explanation"),
    marks: Number(getValue("marks") || 1),
    negativeMarks: Number(getValue("negativeMarks") || 0),
    sourceType: document.querySelector("#sourceType").value,
    tags: getValue("tags"),
    status: document.querySelector("#status").value,
  };
}

function fillForm(question) {
  questionId.value = question.id;
  formTitle.textContent = "Edit Question";
  document.querySelector("#questionText").value = question.questionText || "";
  document.querySelector("#questionType").value = question.questionType || "mcq";
  document.querySelector("#subject").value = question.subject || "";
  document.querySelector("#chapter").value = question.chapter || "";
  document.querySelector("#topic").value = question.topic || "";
  document.querySelector("#courseName").value = question.courseName || "";
  document.querySelector("#batchName").value = question.batchName || "";
  document.querySelector("#classLevel").value = question.classLevel || "";
  document.querySelector("#examTag").value = question.examTag || "coding";
  document.querySelector("#difficulty").value = question.difficulty || "medium";
  document.querySelector("#language").value = question.language || "hinglish";
  document.querySelector("#options").value = (question.options || []).join("\n");
  document.querySelector("#correctAnswer").value = question.correctAnswer || "";
  document.querySelector("#explanation").value = question.explanation || "";
  document.querySelector("#marks").value = question.marks ?? 1;
  document.querySelector("#negativeMarks").value = question.negativeMarks ?? 0;
  document.querySelector("#sourceType").value = question.sourceType || "manual";
  document.querySelector("#tags").value = (question.tags || []).join(", ");
  document.querySelector("#status").value = question.status || "draft";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  form.reset();
  questionId.value = "";
  formTitle.textContent = "Add Question";
  document.querySelector("#marks").value = 1;
  document.querySelector("#negativeMarks").value = 0;
  document.querySelector("#difficulty").value = "medium";
  document.querySelector("#language").value = "hinglish";
}

function renderStats(data) {
  const subjectLine = (data.topSubjects || []).slice(0, 3).map((item) => `${item.subject}: ${item.total}`).join(" • ") || "No subject yet";
  const cards = [
    { title: "Bank Questions", value: data.totalQuestions || 0, label: `${data.approvedQuestions || 0} approved • ${data.draftQuestions || 0} drafts`, icon: "🏦" },
    { title: "Question Types", value: data.mcqQuestions || 0, label: `${data.subjectiveQuestions || 0} subjective/case/practical`, icon: "❓" },
    { title: "Difficulty", value: data.hardQuestions || 0, label: `${data.mediumQuestions || 0} medium • ${data.easyQuestions || 0} easy`, icon: "🎯" },
    { title: "Reuse Power", value: data.totalUsage || 0, label: subjectLine, icon: "♻️" },
  ];

  bankStats.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <div class="stat-icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <div class="stat-value">${card.value}</div>
      <p class="stat-label">${card.label}</p>
    </article>
  `).join("");
}

function questionBankToTestBuilderCopy(question) {
  const options = (question.options || []).join("\n");
  return `Type: ${question.questionType}\nDifficulty: ${question.difficulty}\nMarks: ${question.marks}\nTopic: ${question.topic || question.chapter}\n\nQuestion:\n${question.questionText}\n\nOptions:\n${options}\n\nCorrect Answer:\n${question.correctAnswer}\n\nExplanation:\n${question.explanation}`;
}

async function copyQuestion(question) {
  try {
    await navigator.clipboard.writeText(questionBankToTestBuilderCopy(question));
    message.textContent = "✅ Question copy ho gaya. Test Builder me paste/reuse kar sakte ho.";
  } catch {
    message.textContent = "ℹ️ Browser clipboard blocked hai. Question text manually select karke copy karo.";
  }
}

function renderQuestions(questions) {
  if (!questions.length) {
    questionsList.innerHTML = `<p class="empty-state">Abhi question bank empty hai. Sample question add karke start karo.</p>`;
    return;
  }

  questionsList.innerHTML = questions.map((question) => `
    <article class="data-card" data-id="${question.id}">
      <div class="data-top">
        <div>
          <h3>${escapeHtml(question.subject)} • ${escapeHtml(question.chapter)}</h3>
          <p>${escapeHtml(question.topic || "No topic")} • ${escapeHtml(question.classLevel || "No level")} • ${escapeHtml(question.examTag)}</p>
          <p class="muted">Last used: ${formatDate(question.lastUsedAt)} • Used ${question.usageCount || 0} times</p>
        </div>
        <div class="data-tags">
          <span class="tag gold">${question.status}</span>
          <span class="tag gold">${question.questionType}</span>
          <span class="tag gold">${question.difficulty}</span>
        </div>
      </div>

      <div class="question-text-preview">${escapeHtml(question.questionText)}</div>

      ${(question.options || []).length ? `<div class="option-list">${question.options.map((option) => `<span class="option-pill">${escapeHtml(option)}</span>`).join("")}</div>` : ""}

      <div class="data-details">
        <div><span>Marks</span><b>${question.marks}</b></div>
        <div><span>Negative</span><b>${question.negativeMarks || 0}</b></div>
        <div><span>Source</span><b>${escapeHtml(question.sourceType)}</b></div>
        <div><span>Lang</span><b>${escapeHtml(question.language)}</b></div>
      </div>

      <div class="solution-box"><b>Answer:</b> ${escapeHtml(question.correctAnswer || "Not added")}<br><b>Explanation:</b> ${escapeHtml(question.explanation || "Not added")}</div>
      ${(question.tags || []).length ? `<div class="bank-meta-row">${question.tags.map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join("")}</div>` : ""}

      <div class="card-actions">
        <button class="edit-btn" data-action="edit">Edit</button>
        <button class="edit-btn" data-action="copy">Copy</button>
        <button class="edit-btn" data-action="used">Mark Used</button>
        <button class="edit-btn" data-action="reviewed">Reviewed</button>
        <button class="edit-btn" data-action="approved">Approve</button>
        <button class="edit-btn" data-action="archived">Archive</button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
}

function queryParams() {
  const params = new URLSearchParams();
  const map = {
    search: "searchInput",
    subject: "subjectFilter",
    chapter: "chapterFilter",
    questionType: "questionTypeFilter",
    difficulty: "difficultyFilter",
    status: "statusFilter",
    examTag: "examTagFilter",
  };
  Object.entries(map).forEach(([key, id]) => {
    const value = document.querySelector(`#${id}`).value.trim();
    if (value) params.set(key, value);
  });
  return params.toString();
}

let currentQuestions = [];

async function loadQuestions() {
  message.textContent = "Question bank loading…";
  try {
    const response = await fetch(`${API}/question-bank?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Question bank load failed");
    currentQuestions = data.questions || [];
    renderStats(data);
    renderQuestions(currentQuestions);
    message.textContent = "✅ Question bank connected with backend.";
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.clear();
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}

async function saveQuestion(event) {
  event.preventDefault();
  const payload = readPayload();
  const id = questionId.value;

  try {
    const response = await fetch(id ? `${API}/question-bank/${id}` : `${API}/question-bank`, {
      method: id ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Question save failed");
    message.textContent = `✅ ${data.message}`;
    clearForm();
    await loadQuestions();
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
}

async function updateStatus(id, status) {
  const response = await fetch(`${API}/question-bank/${id}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Status update failed");
  return data;
}

async function markUsed(id) {
  const response = await fetch(`${API}/question-bank/${id}/used`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Usage update failed");
  return data;
}

async function deleteQuestion(id) {
  if (!confirm("Delete this question permanently?")) return;
  const response = await fetch(`${API}/question-bank/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Delete failed");
  message.textContent = `✅ ${data.message}`;
  await loadQuestions();
}

function sampleQuestion() {
  clearForm();
  document.querySelector("#subject").value = "Web Development";
  document.querySelector("#chapter").value = "HTML Forms";
  document.querySelector("#topic").value = "Input Types";
  document.querySelector("#questionType").value = "mcq";
  document.querySelector("#difficulty").value = "medium";
  document.querySelector("#examTag").value = "coding";
  document.querySelector("#questionText").value = "HTML form me user ka email input lene ke liye kaunsa input type best hota hai?";
  document.querySelector("#options").value = "A. type=\"text\"\nB. type=\"email\"\nC. type=\"password\"\nD. type=\"number\"";
  document.querySelector("#correctAnswer").value = "B. type=\"email\"";
  document.querySelector("#explanation").value = "type=\"email\" browser ko email validation aur mobile keyboard support provide karta hai.";
  document.querySelector("#tags").value = "html, forms, important";
  document.querySelector("#status").value = "approved";
}

form.addEventListener("submit", saveQuestion);
document.querySelector("#clearBtn").addEventListener("click", clearForm);
document.querySelector("#sampleBtn").addEventListener("click", sampleQuestion);
document.querySelector("#refreshBtn").addEventListener("click", loadQuestions);
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

["searchInput", "subjectFilter", "chapterFilter", "questionTypeFilter", "difficultyFilter", "statusFilter", "examTagFilter"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", () => {
    clearTimeout(window.__bankTimer);
    window.__bankTimer = setTimeout(loadQuestions, 350);
  });
});

questionsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const card = event.target.closest(".data-card");
  const id = card?.dataset.id;
  const question = currentQuestions.find((item) => item.id === id);
  if (!id || !question) return;

  try {
    if (button.dataset.action === "edit") fillForm(question);
    if (button.dataset.action === "copy") await copyQuestion(question);
    if (button.dataset.action === "used") {
      const data = await markUsed(id);
      message.textContent = `✅ ${data.message}`;
      await loadQuestions();
    }
    if (["reviewed", "approved", "archived"].includes(button.dataset.action)) {
      const data = await updateStatus(id, button.dataset.action);
      message.textContent = `✅ ${data.message}`;
      await loadQuestions();
    }
    if (button.dataset.action === "delete") await deleteQuestion(id);
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
});

loadQuestions();
