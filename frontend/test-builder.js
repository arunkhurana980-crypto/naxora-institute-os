const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

document.querySelector("#profilePill").textContent = `${savedUser?.name || "User"} • Test Builder`;

const form = document.querySelector("#paperForm");
const formTitle = document.querySelector("#formTitle");
const paperId = document.querySelector("#paperId");
const questionBox = document.querySelector("#questionBox");
const papersList = document.querySelector("#papersList");
const builderStats = document.querySelector("#builderStats");
const message = document.querySelector("#message");
const previewDialog = document.querySelector("#previewDialog");
const previewContent = document.querySelector("#previewContent");

const searchInput = document.querySelector("#searchInput");
const subjectFilter = document.querySelector("#subjectFilter");
const batchFilter = document.querySelector("#batchFilter");
const statusFilter = document.querySelector("#statusFilter");
const paperTypeFilter = document.querySelector("#paperTypeFilter");
const modeFilter = document.querySelector("#modeFilter");

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function setMessage(text, ok = true) {
  message.textContent = `${ok ? "✅" : "❌"} ${text}`;
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
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN");
}

function getValue(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function questionRowTemplate(question = {}, index = 0) {
  const optionsText = Array.isArray(question.options) ? question.options.join("\n") : (question.options || "");
  return `
    <div class="question-row" data-index="${index}">
      <div class="question-row-head">
        <strong>Question ${index + 1}</strong>
        <button class="delete-btn remove-question" type="button">Remove</button>
      </div>
      <div class="question-grid">
        <label>Type
          <select class="q-type">
            <option value="mcq" ${question.questionType === "mcq" ? "selected" : ""}>MCQ</option>
            <option value="true_false" ${question.questionType === "true_false" ? "selected" : ""}>True / False</option>
            <option value="short_answer" ${question.questionType === "short_answer" ? "selected" : ""}>Short Answer</option>
            <option value="descriptive" ${question.questionType === "descriptive" ? "selected" : ""}>Descriptive</option>
            <option value="practical" ${question.questionType === "practical" ? "selected" : ""}>Practical</option>
          </select>
        </label>
        <label>Difficulty
          <select class="q-difficulty">
            <option value="easy" ${question.difficulty === "easy" ? "selected" : ""}>Easy</option>
            <option value="medium" ${!question.difficulty || question.difficulty === "medium" ? "selected" : ""}>Medium</option>
            <option value="hard" ${question.difficulty === "hard" ? "selected" : ""}>Hard</option>
          </select>
        </label>
        <label>Marks<input class="q-marks" type="number" min="0" value="${question.marks ?? 1}" /></label>
        <label>Negative Marks<input class="q-negative" type="number" min="0" step="0.25" value="${question.negativeMarks ?? 0}" /></label>
        <label>Topic<input class="q-topic" placeholder="Question topic" value="${escapeHtml(question.topic || "")}" /></label>
        <label>Correct Answer<input class="q-answer" placeholder="A / B / exact answer" value="${escapeHtml(question.correctAnswer || "")}" /></label>
        <label class="full">Question Text *
          <textarea class="q-text" rows="3" placeholder="Question yahan likho..." required>${escapeHtml(question.questionText || "")}</textarea>
        </label>
        <label class="full">Options <span class="hint">MCQ/True-False ke liye har line ek option</span>
          <textarea class="q-options" rows="3" placeholder="A. Option one\nB. Option two\nC. Option three\nD. Option four">${escapeHtml(optionsText)}</textarea>
        </label>
        <label class="full">Explanation
          <textarea class="q-explanation" rows="2" placeholder="Answer explanation / solution steps...">${escapeHtml(question.explanation || "")}</textarea>
        </label>
      </div>
    </div>
  `;
}

function refreshQuestionNumbers() {
  [...questionBox.querySelectorAll(".question-row")].forEach((row, index) => {
    row.dataset.index = index;
    row.querySelector(".question-row-head strong").textContent = `Question ${index + 1}`;
  });
}

function addQuestion(question = {}) {
  const index = questionBox.querySelectorAll(".question-row").length;
  questionBox.insertAdjacentHTML("beforeend", questionRowTemplate(question, index));
}

function readQuestions() {
  return [...questionBox.querySelectorAll(".question-row")].map((row) => ({
    questionType: row.querySelector(".q-type").value,
    questionText: row.querySelector(".q-text").value.trim(),
    options: row.querySelector(".q-options").value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    correctAnswer: row.querySelector(".q-answer").value.trim(),
    marks: Number(row.querySelector(".q-marks").value || 1),
    negativeMarks: Number(row.querySelector(".q-negative").value || 0),
    explanation: row.querySelector(".q-explanation").value.trim(),
    difficulty: row.querySelector(".q-difficulty").value,
    topic: row.querySelector(".q-topic").value.trim(),
  })).filter((question) => question.questionText);
}

function readPayload() {
  return {
    paperTitle: getValue("paperTitle"),
    courseName: getValue("courseName"),
    batchName: getValue("batchName"),
    subject: getValue("subject"),
    topic: getValue("topic"),
    teacherName: getValue("teacherName"),
    paperType: document.querySelector("#paperType").value,
    testMode: document.querySelector("#testMode").value,
    durationMinutes: Number(getValue("durationMinutes") || 60),
    totalMarks: getValue("totalMarks") ? Number(getValue("totalMarks")) : "",
    passingMarks: getValue("passingMarks") ? Number(getValue("passingMarks")) : "",
    scheduledDate: getValue("scheduledDate"),
    startTime: getValue("startTime"),
    endTime: getValue("endTime"),
    attemptsAllowed: Number(getValue("attemptsAllowed") || 1),
    shuffleQuestions: document.querySelector("#shuffleQuestions").checked,
    showResultInstant: document.querySelector("#showResultInstant").checked,
    status: document.querySelector("#status").value,
    instructions: getValue("instructions"),
    questions: readQuestions(),
  };
}

function fillForm(paper) {
  paperId.value = paper.id;
  formTitle.textContent = "Edit Question Paper";
  document.querySelector("#paperTitle").value = paper.paperTitle || "";
  document.querySelector("#courseName").value = paper.courseName || "";
  document.querySelector("#batchName").value = paper.batchName || "";
  document.querySelector("#subject").value = paper.subject || "";
  document.querySelector("#topic").value = paper.topic || "";
  document.querySelector("#teacherName").value = paper.teacherName || "";
  document.querySelector("#paperType").value = paper.paperType || "mixed";
  document.querySelector("#testMode").value = paper.testMode || "online";
  document.querySelector("#durationMinutes").value = paper.durationMinutes || 60;
  document.querySelector("#totalMarks").value = paper.totalMarks || "";
  document.querySelector("#passingMarks").value = paper.passingMarks || "";
  document.querySelector("#scheduledDate").value = paper.scheduledDate ? String(paper.scheduledDate).slice(0, 10) : "";
  document.querySelector("#startTime").value = paper.startTime || "";
  document.querySelector("#endTime").value = paper.endTime || "";
  document.querySelector("#attemptsAllowed").value = paper.attemptsAllowed || 1;
  document.querySelector("#shuffleQuestions").checked = Boolean(paper.shuffleQuestions);
  document.querySelector("#showResultInstant").checked = Boolean(paper.showResultInstant);
  document.querySelector("#status").value = paper.status || "draft";
  document.querySelector("#instructions").value = paper.instructions || "";
  questionBox.innerHTML = "";
  (paper.questions || []).forEach(addQuestion);
  if (!questionBox.children.length) addQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  form.reset();
  paperId.value = "";
  formTitle.textContent = "Build Question Paper";
  questionBox.innerHTML = "";
  addQuestion();
  document.querySelector("#durationMinutes").value = 60;
  document.querySelector("#attemptsAllowed").value = 1;
  document.querySelector("#shuffleQuestions").checked = true;
}

function renderStats(data) {
  const cards = [
    { title: "Question Papers", value: data.totalPapers || 0, label: `${data.publishedPapers || 0} published • ${data.draftPapers || 0} drafts`, icon: "🧪" },
    { title: "Questions", value: data.totalQuestions || 0, label: `${data.mcqQuestions || 0} MCQ • ${data.descriptiveQuestions || 0} written/practical`, icon: "❓" },
    { title: "Live Papers", value: data.livePapers || 0, label: `${data.assignedPapers || 0} assigned • ${data.closedPapers || 0} closed`, icon: "🟢" },
    { title: "Total Marks", value: data.totalMarks || 0, label: `${data.avgDuration || 0} min average duration`, icon: "🎯" },
  ];
  builderStats.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <div class="stat-icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <div class="stat-value">${card.value}</div>
      <p class="stat-label">${card.label}</p>
    </article>
  `).join("");
}

function renderPapers(papers) {
  if (!papers.length) {
    papersList.innerHTML = `<p class="empty-state">Abhi koi question paper nahi hai. Sample paper add karke start karo.</p>`;
    return;
  }

  papersList.innerHTML = papers.map((paper) => {
    const previewQuestions = (paper.questions || []).slice(0, 3);
    return `
      <article class="data-card" data-id="${paper.id}">
        <div class="data-top">
          <div>
            <h3>${escapeHtml(paper.paperTitle)}</h3>
            <p>${escapeHtml(paper.subject)} • ${escapeHtml(paper.topic || "No topic")} • ${escapeHtml(paper.batchName || paper.courseName || "No batch")}</p>
            <p class="muted">${formatDate(paper.scheduledDate)} • ${paper.paperType} • ${paper.testMode} • ${paper.durationMinutes} minutes</p>
          </div>
          <div class="data-tags">
            <span class="tag gold">${paper.status}</span>
            <span class="tag gold">${paper.questionCount || 0} Qs</span>
            <span class="tag gold">${paper.totalMarks} marks</span>
          </div>
        </div>
        <div class="data-details">
          <div><span>Passing</span><b>${paper.passingMarks}</b></div>
          <div><span>Attempts</span><b>${paper.attemptsAllowed || 1}</b></div>
          <div><span>MCQ</span><b>${paper.questionStats?.mcq || 0}</b></div>
          <div><span>Hard</span><b>${paper.questionStats?.hard || 0}</b></div>
        </div>
        ${previewQuestions.length ? `<div class="question-preview-list">${previewQuestions.map((q, index) => `
          <div class="question-preview">
            <h4>Q${index + 1}. ${escapeHtml(q.questionText)}</h4>
            <p class="muted">${q.questionType} • ${q.difficulty} • ${q.marks} marks</p>
          </div>
        `).join("")}</div>` : ""}
        <div class="card-actions">
          <button class="edit-btn" data-action="edit">Edit</button>
          <button class="edit-btn" data-action="preview">Preview</button>
          <button class="edit-btn" data-action="duplicate">Duplicate</button>
          <button class="edit-btn" data-action="published">Publish</button>
          <button class="edit-btn" data-action="live">Live</button>
          <button class="edit-btn" data-action="closed">Close</button>
          <button class="delete-btn" data-action="delete">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function paperPreviewHtml(paper) {
  return `
    <div class="paper-header">
      <h2>${escapeHtml(paper.paperTitle)}</h2>
      <p>${escapeHtml(paper.subject)} • ${escapeHtml(paper.topic || "")}</p>
      <p>${escapeHtml(paper.instituteName || "NAXORA Institute")}</p>
    </div>
    <div class="paper-meta">
      <div><b>Course:</b> ${escapeHtml(paper.courseName || "—")}</div>
      <div><b>Batch:</b> ${escapeHtml(paper.batchName || "—")}</div>
      <div><b>Teacher:</b> ${escapeHtml(paper.teacherName || "—")}</div>
      <div><b>Date:</b> ${formatDate(paper.scheduledDate)}</div>
      <div><b>Duration:</b> ${paper.durationMinutes} minutes</div>
      <div><b>Marks:</b> ${paper.totalMarks} | Passing: ${paper.passingMarks}</div>
    </div>
    ${paper.instructions ? `<p><b>Instructions:</b> ${escapeHtml(paper.instructions)}</p>` : ""}
    ${(paper.questions || []).map((q, index) => `
      <div class="paper-question">
        <p><b>Q${index + 1}.</b> ${escapeHtml(q.questionText)} <span>(${q.marks} marks)</span></p>
        ${q.options?.length ? `<ol type="A">${q.options.map((option) => `<li>${escapeHtml(option)}</li>`).join("")}</ol>` : ""}
        ${q.correctAnswer ? `<p class="answer"><b>Answer:</b> ${escapeHtml(q.correctAnswer)}</p>` : ""}
        ${q.explanation ? `<p class="answer"><b>Explanation:</b> ${escapeHtml(q.explanation)}</p>` : ""}
      </div>
    `).join("")}
  `;
}

function openPreview(paper = readPayload()) {
  const payload = paper.id ? paper : { ...paper, instituteName: "NAXORA Institute", questionCount: paper.questions.length };
  previewContent.innerHTML = paperPreviewHtml(payload);
  previewDialog.showModal();
}

async function loadPapers() {
  const params = new URLSearchParams({
    search: searchInput.value.trim(),
    subject: subjectFilter.value.trim(),
    batchName: batchFilter.value.trim(),
    status: statusFilter.value,
    paperType: paperTypeFilter.value,
    testMode: modeFilter.value,
  });

  try {
    const response = await fetch(`${API}/test-builder?${params.toString()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Question papers load failed");
    renderStats(data);
    renderPapers(data.papers || []);
    setMessage("Question papers backend se load ho gaye.");
  } catch (error) {
    setMessage(error.message, false);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = readPayload();
  const id = paperId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${API}/test-builder/${id}` : `${API}/test-builder`;

  try {
    const response = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Paper save failed");
    setMessage(data.message || "Paper save ho gaya");
    clearForm();
    loadPapers();
  } catch (error) {
    setMessage(error.message, false);
  }
});

papersList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  const card = event.target.closest(".data-card");
  if (!button || !card) return;
  const id = card.dataset.id;
  const action = button.dataset.action;

  try {
    if (["edit", "preview"].includes(action)) {
      const response = await fetch(`${API}/test-builder/${id}`, { headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Paper read failed");
      if (action === "edit") fillForm(data.paper);
      else openPreview(data.paper);
      return;
    }

    if (action === "duplicate") {
      const response = await fetch(`${API}/test-builder/${id}/duplicate`, { method: "POST", headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Duplicate failed");
      setMessage(data.message || "Duplicate created");
      loadPapers();
      return;
    }

    if (action === "delete") {
      if (!confirm("Ye question paper delete karna hai?")) return;
      const response = await fetch(`${API}/test-builder/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Delete failed");
      setMessage(data.message || "Deleted");
      loadPapers();
      return;
    }

    if (["published", "live", "closed"].includes(action)) {
      const response = await fetch(`${API}/test-builder/${id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Status update failed");
      setMessage(data.message || "Status update ho gaya");
      loadPapers();
    }
  } catch (error) {
    setMessage(error.message, false);
  }
});

questionBox.addEventListener("click", (event) => {
  if (!event.target.closest(".remove-question")) return;
  const rows = questionBox.querySelectorAll(".question-row");
  if (rows.length <= 1) {
    setMessage("Minimum ek question required hai", false);
    return;
  }
  event.target.closest(".question-row").remove();
  refreshQuestionNumbers();
});

document.querySelector("#addQuestionBtn").addEventListener("click", () => addQuestion());
document.querySelector("#clearBtn").addEventListener("click", clearForm);
document.querySelector("#previewBtn").addEventListener("click", () => openPreview());
document.querySelector("#refreshBtn").addEventListener("click", loadPapers);
document.querySelector("#closePreviewBtn").addEventListener("click", () => previewDialog.close());
document.querySelector("#printPreviewBtn").addEventListener("click", () => window.print());
document.querySelector("#sampleBtn").addEventListener("click", () => {
  fillForm({
    paperTitle: "HTML CSS Foundation Test",
    courseName: "Full Stack Web Development",
    batchName: "Evening Batch A",
    subject: "Web Development",
    topic: "HTML, CSS, Responsive Design",
    teacherName: savedUser?.name || "NAXORA Mentor",
    paperType: "mixed",
    testMode: "online",
    durationMinutes: 45,
    totalMarks: 30,
    passingMarks: 12,
    status: "draft",
    instructions: "All questions are compulsory. MCQ me correct option select karo. Descriptive answer clear points me likho.",
    questions: [
      { questionType: "mcq", questionText: "HTML ka full form kya hai?", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink Text Machine Language"], correctAnswer: "Hyper Text Markup Language", marks: 2, difficulty: "easy", topic: "HTML Basics", explanation: "HTML web page structure banane ki markup language hai." },
      { questionType: "mcq", questionText: "Responsive layout ke liye CSS me kaunsa feature best hai?", options: ["Flexbox/Grid", "Only tables", "Only margin", "Only color"], correctAnswer: "Flexbox/Grid", marks: 3, difficulty: "medium", topic: "CSS Layout" },
      { questionType: "descriptive", questionText: "Semantic HTML tags ka importance explain karo.", correctAnswer: "Meaningful structure, SEO aur accessibility improve hoti hai.", marks: 5, difficulty: "medium", topic: "Semantic HTML" },
      { questionType: "practical", questionText: "Ek responsive navbar ka HTML + CSS structure likho.", correctAnswer: "Navbar with flex/grid, links, CTA, media query.", marks: 10, difficulty: "hard", topic: "Project" },
    ],
  });
});

[searchInput, subjectFilter, batchFilter, statusFilter, paperTypeFilter, modeFilter].forEach((input) => input.addEventListener("input", loadPapers));
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

clearForm();
loadPapers();
