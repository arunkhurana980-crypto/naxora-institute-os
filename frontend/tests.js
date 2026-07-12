const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

document.querySelector("#profilePill").textContent = `${savedUser?.name || "User"} • Tests`;

const form = document.querySelector("#testForm");
const formTitle = document.querySelector("#formTitle");
const testId = document.querySelector("#testId");
const message = document.querySelector("#message");
const testsList = document.querySelector("#testsList");
const testStats = document.querySelector("#testStats");
const searchInput = document.querySelector("#searchInput");
const subjectFilter = document.querySelector("#subjectFilter");
const statusFilter = document.querySelector("#statusFilter");
const difficultyFilter = document.querySelector("#difficultyFilter");
const modeFilter = document.querySelector("#modeFilter");

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function setMessage(text, ok = true) {
  message.textContent = `${ok ? "✅" : "❌"} ${text}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN");
}

function percent(marks, total) {
  return total ? Math.round((Number(marks || 0) / Number(total || 1)) * 100) : 0;
}

function readPayload() {
  return {
    testTitle: document.querySelector("#testTitle").value.trim(),
    testType: document.querySelector("#testType").value,
    subject: document.querySelector("#subject").value.trim(),
    topic: document.querySelector("#topic").value.trim(),
    batchName: document.querySelector("#batchName").value.trim(),
    teacherName: document.querySelector("#teacherName").value.trim(),
    examDate: document.querySelector("#examDate").value,
    durationMinutes: Number(document.querySelector("#durationMinutes").value || 0),
    totalMarks: Number(document.querySelector("#totalMarks").value || 100),
    passingMarks: Number(document.querySelector("#passingMarks").value || 33),
    mode: document.querySelector("#mode").value,
    difficulty: document.querySelector("#difficulty").value,
    status: document.querySelector("#status").value,
    instructions: document.querySelector("#instructions").value.trim(),
    resultsText: document.querySelector("#resultsText").value.trim(),
  };
}

function fillForm(test) {
  testId.value = test.id;
  formTitle.textContent = "Edit Test / Result";
  document.querySelector("#testTitle").value = test.testTitle || "";
  document.querySelector("#testType").value = test.testType || "mixed";
  document.querySelector("#subject").value = test.subject || "";
  document.querySelector("#topic").value = test.topic || "";
  document.querySelector("#batchName").value = test.batchName || "";
  document.querySelector("#teacherName").value = test.teacherName || "";
  document.querySelector("#examDate").value = test.examDate ? String(test.examDate).slice(0, 10) : "";
  document.querySelector("#durationMinutes").value = test.durationMinutes || 60;
  document.querySelector("#totalMarks").value = test.totalMarks || 100;
  document.querySelector("#passingMarks").value = test.passingMarks || 33;
  document.querySelector("#mode").value = test.mode || "offline";
  document.querySelector("#difficulty").value = test.difficulty || "medium";
  document.querySelector("#status").value = test.status || "scheduled";
  document.querySelector("#instructions").value = test.instructions || "";
  document.querySelector("#resultsText").value = (test.results || [])
    .map((row) => `${row.studentName}, ${row.marksObtained || 0}, ${row.remarks || ""}`)
    .join("\n");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  form.reset();
  testId.value = "";
  formTitle.textContent = "Create Test / Result";
  document.querySelector("#durationMinutes").value = 60;
  document.querySelector("#totalMarks").value = 100;
  document.querySelector("#passingMarks").value = 33;
}

function renderStats(data) {
  const cards = [
    { title: "Total Tests", value: data.totalTests || 0, label: `${data.scheduledTests || 0} scheduled • ${data.completedTests || 0} completed`, icon: "🏆" },
    { title: "Published", value: data.publishedTests || 0, label: `${data.draftTests || 0} drafts`, icon: "📢" },
    { title: "Result Rows", value: data.totalResultRows || 0, label: `${data.totalPassRows || 0} pass • ${data.totalFailRows || 0} fail`, icon: "📊" },
    { title: "Subjects", value: data.subjectCount || 0, label: `${data.totalAbsentRows || 0} absent rows`, icon: "📚" },
  ];
  testStats.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <div class="stat-icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <div class="stat-value">${card.value}</div>
      <p class="stat-label">${card.label}</p>
    </article>
  `).join("");
}

function renderTests(tests) {
  if (!tests.length) {
    testsList.innerHTML = `<p class="empty-state">Abhi koi test/result record nahi hai.</p>`;
    return;
  }

  testsList.innerHTML = tests.map((test) => {
    const topRows = [...(test.results || [])]
      .filter((row) => row.resultStatus !== "absent")
      .sort((a, b) => Number(b.marksObtained || 0) - Number(a.marksObtained || 0))
      .slice(0, 5);

    return `
      <article class="data-card" data-id="${test.id}">
        <div class="data-top">
          <div>
            <h3>${test.testTitle}</h3>
            <p>${test.subject} • ${test.topic || "No topic"} • ${test.batchName}</p>
            <p class="muted">${formatDate(test.examDate)} • ${test.testType} • ${test.mode} • ${test.difficulty}</p>
          </div>
          <div class="data-tags">
            <span class="tag gold">${test.status}</span>
            <span class="tag gold">Pass: ${test.passPercent || 0}%</span>
            <span class="tag gold">Avg: ${test.averageMarks || 0}/${test.totalMarks}</span>
          </div>
        </div>
        <div class="data-details">
          <div><span>Total Marks</span><b>${test.totalMarks}</b></div>
          <div><span>Passing</span><b>${test.passingMarks}</b></div>
          <div><span>Students</span><b>${test.studentCount || 0}</b></div>
          <div><span>Pass</span><b>${test.passCount || 0}</b></div>
          <div><span>Fail</span><b>${test.failCount || 0}</b></div>
          <div><span>Highest</span><b>${test.highestMarks || 0}</b></div>
        </div>
        ${topRows.length ? `
          <table class="result-table">
            <thead><tr><th>Top student</th><th>Marks</th><th>%</th><th>Status</th></tr></thead>
            <tbody>${topRows.map((row, index) => `
              <tr><td><span class="rank-pill">#${index + 1}</span> ${row.studentName}</td><td>${row.marksObtained}/${test.totalMarks}</td><td>${percent(row.marksObtained, test.totalMarks)}%</td><td>${row.resultStatus}</td></tr>
            `).join("")}</tbody>
          </table>
        ` : ""}
        ${test.instructions ? `<p class="data-note">${test.instructions}</p>` : ""}
        <div class="card-actions">
          <button class="edit-btn" data-action="edit">Edit</button>
          <button class="edit-btn" data-action="completed">Completed</button>
          <button class="edit-btn" data-action="published">Publish</button>
          <button class="delete-btn" data-action="delete">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadTests() {
  const params = new URLSearchParams({
    search: searchInput.value.trim(),
    subject: subjectFilter.value.trim(),
    status: statusFilter.value,
    difficulty: difficultyFilter.value,
    mode: modeFilter.value,
  });

  try {
    const response = await fetch(`${API}/tests?${params.toString()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Tests load failed");
    renderStats(data);
    renderTests(data.tests || []);
    setMessage("Tests & results backend se load ho gaye.");
  } catch (error) {
    setMessage(error.message, false);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = readPayload();
  const id = testId.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${API}/tests/${id}` : `${API}/tests`;

  try {
    const response = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Save failed");
    setMessage(data.message || "Test save ho gaya");
    clearForm();
    loadTests();
  } catch (error) {
    setMessage(error.message, false);
  }
});

testsList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  const card = event.target.closest(".data-card");
  if (!button || !card) return;
  const id = card.dataset.id;
  const action = button.dataset.action;

  try {
    if (action === "edit") {
      const response = await fetch(`${API}/tests/${id}`, { headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Test read failed");
      fillForm(data.test);
      return;
    }

    if (action === "delete") {
      if (!confirm("Ye test/result delete karna hai?")) return;
      const response = await fetch(`${API}/tests/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Delete failed");
      setMessage(data.message || "Deleted");
      loadTests();
      return;
    }

    if (["completed", "published"].includes(action)) {
      const response = await fetch(`${API}/tests/${id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Status update failed");
      setMessage(data.message || "Status update ho gaya");
      loadTests();
    }
  } catch (error) {
    setMessage(error.message, false);
  }
});

[searchInput, subjectFilter, statusFilter, difficultyFilter, modeFilter].forEach((input) => input.addEventListener("input", loadTests));
document.querySelector("#refreshBtn").addEventListener("click", loadTests);
document.querySelector("#clearBtn").addEventListener("click", clearForm);
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

loadTests();
