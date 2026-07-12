const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

if (!token) window.location.href = "index.html";

const $ = (selector) => document.querySelector(selector);
const getValue = (id) => $(`#${id}`).value.trim();
const setValue = (id, value = "") => { $(`#${id}`).value = value ?? ""; };

const doubtForm = $("#doubtForm");
const doubtsList = $("#doubtsList");
let currentDoubts = [];

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateText(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status) {
  const labels = { solved: "Solved", pending: "Pending", "teacher-review": "Teacher Review" };
  return labels[status] || status;
}

function difficultyLabel(value) {
  const labels = { easy: "Easy", medium: "Medium", hard: "Hard" };
  return labels[value] || value;
}

function logoutOnAuthError(error) {
  const message = String(error.message || "").toLowerCase();
  if (message.includes("token") || message.includes("login") || message.includes("authorized")) {
    localStorage.removeItem("naxora_token");
    localStorage.removeItem("naxora_user");
    setTimeout(() => (window.location.href = "index.html"), 900);
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function doubtPayload() {
  return {
    studentName: getValue("studentName"),
    studentClass: getValue("studentClass"),
    subject: getValue("subject"),
    topic: getValue("topic"),
    question: getValue("question"),
    difficulty: getValue("difficulty") || "medium",
    priority: getValue("priority") || "normal",
    status: getValue("status") || "solved",
    teacherReply: getValue("teacherReply"),
  };
}

function clearDoubtForm() {
  ["doubtId", "studentName", "studentClass", "subject", "topic", "question", "teacherReply"].forEach((id) => setValue(id, ""));
  setValue("difficulty", "medium");
  setValue("priority", "normal");
  setValue("status", "solved");
  $("#doubtFormHeading").textContent = "Ask New Doubt";
  $("#askDoubtBtn").textContent = "Generate AI Answer";
}

function fillSampleDoubt() {
  setValue("studentName", "Arun Khurana");
  setValue("studentClass", "Full Stack Batch A");
  setValue("subject", "Web Development");
  setValue("topic", "JWT Authentication");
  setValue("difficulty", "medium");
  setValue("priority", "normal");
  setValue("status", "solved");
  setValue("question", "JWT token login ke baad localStorage me save kyu karte hain aur protected route me Authorization header ka use kaise hota hai?");
  setValue("teacherReply", "");
}

function renderStats(data) {
  $("#totalDoubts").textContent = String(data.totalDoubts || 0);
  $("#solvedDoubts").textContent = String(data.solvedDoubts || 0);
  $("#reviewDoubts").textContent = String(data.reviewDoubts || 0);
  $("#subjectCount").textContent = String(data.subjectCount || 0);
}

function renderDoubts(data) {
  currentDoubts = data.doubts || [];
  renderStats(data);

  if (!currentDoubts.length) {
    doubtsList.innerHTML = `<div class="empty-state">Abhi koi doubt nahi mila. Pehla AI doubt generate karo.</div>`;
    return;
  }

  doubtsList.innerHTML = currentDoubts.map((doubt) => `
    <article class="data-card" data-id="${doubt.id}">
      <div class="data-top">
        <div class="data-title">
          <div class="data-avatar">🤖</div>
          <div>
            <h3>${escapeHTML(doubt.studentName)}</h3>
            <p>${escapeHTML(doubt.subject)} • ${escapeHTML(doubt.topic || "Topic not set")} • ${escapeHTML(doubt.studentClass || "Class not set")}</p>
          </div>
        </div>
        <div class="data-tags">
          <span class="tag gold status-${doubt.status}">${statusLabel(doubt.status)}</span>
          <span class="tag blue">${difficultyLabel(doubt.difficulty)}</span>
          <span class="tag priority-${doubt.priority}">${escapeHTML(doubt.priority)}</span>
        </div>
      </div>

      <p class="data-note"><strong>Question:</strong> ${escapeHTML(doubt.question)}</p>
      <p class="data-note"><strong>Short answer:</strong> ${escapeHTML(doubt.shortAnswer || "Not generated")}</p>

      <div class="data-details">
        <div><span>Source</span>${escapeHTML(doubt.source)}</div>
        <div><span>Created</span>${dateText(doubt.createdAt)}</div>
        <div><span>Updated</span>${dateText(doubt.updatedAt)}</div>
      </div>

      <div class="answer-preview">${escapeHTML(doubt.aiAnswer || "No AI answer")}</div>
      ${doubt.teacherReply ? `<p class="data-note"><strong>Teacher Reply:</strong> ${escapeHTML(doubt.teacherReply)}</p>` : ""}

      <div class="card-actions">
        <button class="edit-btn" data-action="edit-doubt">Edit</button>
        <button class="receipt-btn edit-btn" data-action="copy-answer">Copy Answer</button>
        <button class="delete-btn" data-action="delete-doubt">Delete</button>
      </div>
    </article>
  `).join("");
}

async function loadDoubts() {
  $("#doubtsListMessage").textContent = "Doubts loading…";
  try {
    const params = new URLSearchParams();
    if (getValue("doubtSearch")) params.set("search", getValue("doubtSearch"));
    if (getValue("subjectFilter")) params.set("subject", getValue("subjectFilter"));
    if (getValue("statusFilter")) params.set("status", getValue("statusFilter"));
    if (getValue("difficultyFilter")) params.set("difficulty", getValue("difficultyFilter"));

    const data = await apiRequest(`/doubts?${params.toString()}`);
    renderDoubts(data);
    $("#doubtsListMessage").textContent = `✅ ${data.count} doubts loaded.`;
  } catch (error) {
    $("#doubtsListMessage").textContent = `❌ ${error.message}`;
    logoutOnAuthError(error);
  }
}

function fillDoubtForEdit(doubt) {
  setValue("doubtId", doubt.id);
  setValue("studentName", doubt.studentName);
  setValue("studentClass", doubt.studentClass);
  setValue("subject", doubt.subject);
  setValue("topic", doubt.topic);
  setValue("difficulty", doubt.difficulty || "medium");
  setValue("priority", doubt.priority || "normal");
  setValue("status", doubt.status || "solved");
  setValue("question", doubt.question);
  setValue("teacherReply", doubt.teacherReply);
  $("#latestAnswer").textContent = doubt.aiAnswer || "No answer";
  $("#doubtFormHeading").textContent = "Update Doubt";
  $("#askDoubtBtn").textContent = "Update + Regenerate Answer";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

doubtForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = getValue("doubtId");
  $("#doubtMessage").textContent = id ? "Doubt update ho raha hai…" : "AI answer generate ho raha hai…";

  try {
    const data = await apiRequest(id ? `/doubts/${id}` : "/doubts/ask", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(doubtPayload()),
    });
    $("#latestAnswer").textContent = data.doubt.aiAnswer || "Answer generated.";
    $("#doubtMessage").textContent = `✅ ${data.message}`;
    clearDoubtForm();
    await loadDoubts();
  } catch (error) {
    $("#doubtMessage").textContent = `❌ ${error.message}`;
    logoutOnAuthError(error);
  }
});

doubtsList.addEventListener("click", async (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const card = btn.closest(".data-card");
  const id = card?.dataset.id;
  const doubt = currentDoubts.find((item) => item.id === id);
  if (!id || !doubt) return;

  if (btn.dataset.action === "edit-doubt") {
    fillDoubtForEdit(doubt);
    return;
  }

  if (btn.dataset.action === "copy-answer") {
    await navigator.clipboard.writeText(doubt.aiAnswer || doubt.shortAnswer || "");
    $("#doubtsListMessage").textContent = "✅ Answer clipboard me copy ho gaya.";
    return;
  }

  if (btn.dataset.action === "delete-doubt") {
    const ok = confirm(`${doubt.studentName} ka doubt delete karna hai?`);
    if (!ok) return;
    try {
      const data = await apiRequest(`/doubts/${id}`, { method: "DELETE" });
      $("#doubtsListMessage").textContent = `✅ ${data.message}`;
      await loadDoubts();
    } catch (error) {
      $("#doubtsListMessage").textContent = `❌ ${error.message}`;
      logoutOnAuthError(error);
    }
  }
});

["doubtSearch", "subjectFilter", "statusFilter", "difficultyFilter"].forEach((id) => {
  $(`#${id}`).addEventListener("input", () => loadDoubts());
  $(`#${id}`).addEventListener("change", () => loadDoubts());
});

$("#clearDoubtBtn").addEventListener("click", clearDoubtForm);
$("#sampleDoubtBtn").addEventListener("click", fillSampleDoubt);
$("#refreshDoubtsBtn").addEventListener("click", loadDoubts);
$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

loadDoubts();
