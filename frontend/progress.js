const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

const form = document.querySelector("#progressForm");
const formHeading = document.querySelector("#formHeading");
const saveBtn = document.querySelector("#saveBtn");
const resetBtn = document.querySelector("#resetBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const formMessage = document.querySelector("#formMessage");
const listMessage = document.querySelector("#listMessage");
const progressList = document.querySelector("#progressList");
const refreshBtn = document.querySelector("#refreshBtn");
const addSubjectBtn = document.querySelector("#addSubjectBtn");
const subjectBox = document.querySelector("#subjectBox");

const searchInput = document.querySelector("#searchInput");
const overallFilter = document.querySelector("#overallFilter");
const reportFilter = document.querySelector("#reportFilter");
const batchFilter = document.querySelector("#batchFilter");
const courseFilter = document.querySelector("#courseFilter");

const totalReports = document.querySelector("#totalReports");
const avgScore = document.querySelector("#avgScore");
const excellentReports = document.querySelector("#excellentReports");
const needsAttention = document.querySelector("#needsAttention");

let records = new Map();

if (!token) window.location.href = "index.html";

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function setValue(id, value = "") {
  if (id === "nextReviewDate" && value) {
    document.querySelector(`#${id}`).value = String(value).slice(0, 10);
    return;
  }
  document.querySelector(`#${id}`).value = value ?? "";
}
function titleCase(value = "") { return String(value).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function dateLabel(value) { return value ? new Date(value).toLocaleDateString("en-IN") : "Not set"; }
function statusIcon(status) {
  if (status === "excellent") return "🏆";
  if (status === "good") return "✅";
  if (status === "needs_attention") return "⚠️";
  if (status === "critical") return "🚨";
  return "📈";
}
function scoreClass(score) {
  if (score >= 85) return "score-great";
  if (score >= 60) return "score-good";
  if (score >= 35) return "score-watch";
  return "score-risk";
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function subjectRowTemplate(row = {}) {
  const div = document.createElement("div");
  div.className = "subject-row";
  div.innerHTML = `
    <label>Subject *<input data-field="subject" value="${row.subject || ""}" placeholder="Math / Coding / Chemistry" /></label>
    <label>Current %<input data-field="currentScore" type="number" min="0" max="100" value="${row.currentScore ?? ""}" placeholder="78" /></label>
    <label>Previous %<input data-field="previousScore" type="number" min="0" max="100" value="${row.previousScore ?? ""}" placeholder="65" /></label>
    <label>Attendance %<input data-field="attendancePercent" type="number" min="0" max="100" value="${row.attendancePercent ?? ""}" placeholder="90" /></label>
    <label>Homework %<input data-field="homeworkCompletion" type="number" min="0" max="100" value="${row.homeworkCompletion ?? ""}" placeholder="85" /></label>
    <label>Test %<input data-field="testPerformance" type="number" min="0" max="100" value="${row.testPerformance ?? ""}" placeholder="72" /></label>
    <label>Status<select data-field="status">
      <option value="excellent">Excellent</option><option value="good">Good</option><option value="improving">Improving</option><option value="needs_attention">Needs Attention</option><option value="critical">Critical</option>
    </select></label>
    <label class="wide">Weak Areas<input data-field="weakAreas" value="${row.weakAreas || ""}" placeholder="Concept clarity / numericals / practice" /></label>
    <label class="wide">Improvement Plan<input data-field="improvementPlan" value="${row.improvementPlan || ""}" placeholder="Daily 30 min revision + weekly test" /></label>
    <button class="remove-row" type="button">Remove</button>
  `;
  div.querySelector('[data-field="status"]').value = row.status || "improving";
  div.querySelector(".remove-row").addEventListener("click", () => {
    div.remove();
    if (!subjectBox.children.length) addSubjectRow();
  });
  return div;
}

function addSubjectRow(row = {}) { subjectBox.appendChild(subjectRowTemplate(row)); }

function getSubjectProgress() {
  return [...subjectBox.querySelectorAll(".subject-row")].map((row) => {
    const item = {};
    row.querySelectorAll("[data-field]").forEach((input) => {
      item[input.dataset.field] = input.value.trim();
    });
    return item;
  }).filter((item) => item.subject);
}

function getPayload() {
  return {
    studentName: getValue("studentName"),
    rollNo: getValue("rollNo"),
    courseName: getValue("courseName"),
    batchName: getValue("batchName"),
    classLevel: getValue("classLevel"),
    reportMonth: getValue("reportMonth"),
    mentorName: getValue("mentorName"),
    overallScore: getValue("overallScore"),
    improvementPercent: getValue("improvementPercent"),
    overallStatus: getValue("overallStatus"),
    reportStatus: getValue("reportStatus"),
    nextReviewDate: getValue("nextReviewDate"),
    subjectProgress: getSubjectProgress(),
    strengths: getValue("strengths"),
    weakAreas: getValue("weakAreas"),
    improvementPlan: getValue("improvementPlan"),
    teacherNotes: getValue("teacherNotes"),
    parentMeetingNotes: getValue("parentMeetingNotes"),
    status: "active",
  };
}

function clearForm() {
  ["progressId", "studentName", "rollNo", "courseName", "batchName", "classLevel", "reportMonth", "mentorName", "overallScore", "improvementPercent", "nextReviewDate", "strengths", "weakAreas", "improvementPlan", "teacherNotes", "parentMeetingNotes"].forEach((id) => setValue(id, ""));
  setValue("overallStatus", "improving");
  setValue("reportStatus", "draft");
  subjectBox.innerHTML = "";
  addSubjectRow();
  formHeading.textContent = "Add Progress Report";
  saveBtn.textContent = "Save Progress";
}

function loadSample() {
  clearForm();
  setValue("studentName", "Aman Sharma");
  setValue("rollNo", "NX-101");
  setValue("courseName", "Full Stack + AI");
  setValue("batchName", "Evening Batch A");
  setValue("classLevel", "Beginner");
  setValue("reportMonth", "July 2026");
  setValue("mentorName", "Arun Sir");
  setValue("overallScore", "78");
  setValue("improvementPercent", "14");
  setValue("overallStatus", "good");
  setValue("reportStatus", "shared");
  setValue("strengths", "Student regular hai, coding logic improve ho raha hai aur class participation achhi hai.");
  setValue("weakAreas", "JavaScript DOM practice aur English technical terms par thoda focus chahiye.");
  setValue("improvementPlan", "Next 30 days: daily 45 min JS practice, weekly mini project, Sunday revision test.");
  setValue("teacherNotes", "Confidence build ho raha hai. Practical examples aur repeat practice se fast growth dikhegi.");
  setValue("parentMeetingNotes", "Parent ko attendance aur weekly practice plan share kar diya.");
  subjectBox.innerHTML = "";
  addSubjectRow({ subject: "HTML/CSS", currentScore: 86, previousScore: 74, attendancePercent: 92, homeworkCompletion: 88, testPerformance: 84, status: "excellent", weakAreas: "Responsive polish", improvementPlan: "2 landing pages practice" });
  addSubjectRow({ subject: "JavaScript", currentScore: 68, previousScore: 55, attendancePercent: 88, homeworkCompletion: 70, testPerformance: 64, status: "improving", weakAreas: "DOM events", improvementPlan: "Daily 10 JS tasks" });
}

function renderReports(data) {
  totalReports.textContent = data.total || 0;
  avgScore.textContent = `${data.avgScore || 0}%`;
  excellentReports.textContent = data.excellent || 0;
  needsAttention.textContent = data.needsAttention || 0;

  records = new Map((data.progressReports || []).map((item) => [item.id, item]));
  if (!data.progressReports?.length) {
    progressList.innerHTML = `<div class="empty-state">No progress report found. Pehla report add karo.</div>`;
    return;
  }

  progressList.innerHTML = data.progressReports.map((item) => {
    const subjects = (item.subjectProgress || []).map((row) => `<span class="subject-chip">${row.subject}: ${row.currentScore}%</span>`).join("");
    return `
      <article class="teacher-card progress-card" data-id="${item.id}">
        <div class="card-topline">
          <div class="teacher-avatar">${statusIcon(item.overallStatus)}</div>
          <div>
            <h3>${item.studentName}</h3>
            <p>${item.courseName || "Course not set"} • ${item.batchName || "Batch not set"}</p>
          </div>
          <span class="status-pill ${item.overallStatus}">${titleCase(item.overallStatus)}</span>
        </div>

        <div class="progress-score-box">
          <div class="score-ring ${scoreClass(item.overallScore)}">${item.overallScore}%</div>
          <div>
            <strong>${item.reportMonth || "Month not set"}</strong>
            <span>${item.improvementPercent >= 0 ? "+" : ""}${item.improvementPercent}% improvement • ${titleCase(item.reportStatus)}</span>
          </div>
        </div>

        <div class="subject-chip-row">${subjects || '<span class="subject-chip">No subject rows</span>'}</div>

        <div class="progress-meta-grid">
          <div><span>Roll No</span>${item.rollNo || "N/A"}</div>
          <div><span>Mentor</span>${item.mentorName || "N/A"}</div>
          <div><span>Next Review</span>${dateLabel(item.nextReviewDate)}</div>
          <div><span>Updated</span>${dateLabel(item.updatedAt)}</div>
        </div>

        <p class="teacher-bio"><b>Weak Areas:</b> ${item.weakAreas || "Not added"}</p>
        <p class="teacher-bio"><b>Plan:</b> ${item.improvementPlan || "Not added"}</p>

        <div class="card-actions">
          <button data-action="edit">Edit</button>
          <button data-action="share">Mark Shared</button>
          <button data-action="reviewed">Reviewed</button>
          <button data-action="delete" class="danger">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadReports() {
  listMessage.textContent = "Progress reports loading…";
  try {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
    if (overallFilter.value) params.set("overallStatus", overallFilter.value);
    if (reportFilter.value) params.set("reportStatus", reportFilter.value);
    if (batchFilter.value.trim()) params.set("batchName", batchFilter.value.trim());
    if (courseFilter.value.trim()) params.set("courseName", courseFilter.value.trim());
    const data = await apiRequest(`/progress?${params.toString()}`);
    renderReports(data);
    listMessage.textContent = `✅ ${data.count} progress reports loaded.`;
  } catch (error) {
    listMessage.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.removeItem("naxora_token");
      localStorage.removeItem("naxora_user");
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = getValue("progressId");
  const payload = getPayload();
  if (!payload.studentName) return (formMessage.textContent = "❌ Student name required hai");
  if (!payload.courseName && !payload.batchName) return (formMessage.textContent = "❌ Course ya batch me se ek required hai");
  if (!payload.subjectProgress.length) return (formMessage.textContent = "❌ Kam se kam ek subject row add karo");

  formMessage.textContent = id ? "Progress update ho raha hai…" : "Progress save ho raha hai…";
  try {
    const data = await apiRequest(id ? `/progress/${id}` : "/progress", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    formMessage.textContent = `✅ ${data.message}`;
    clearForm();
    await loadReports();
  } catch (error) {
    formMessage.textContent = `❌ ${error.message}`;
  }
});

progressList.addEventListener("click", async (event) => {
  const card = event.target.closest(".progress-card");
  const action = event.target.dataset.action;
  if (!card || !action) return;
  const id = card.dataset.id;
  const item = records.get(id);

  if (action === "edit") {
    setValue("progressId", item.id);
    ["studentName", "rollNo", "courseName", "batchName", "classLevel", "reportMonth", "mentorName", "overallScore", "improvementPercent", "overallStatus", "reportStatus", "nextReviewDate", "strengths", "weakAreas", "improvementPlan", "teacherNotes", "parentMeetingNotes"].forEach((field) => setValue(field, item[field]));
    subjectBox.innerHTML = "";
    (item.subjectProgress || []).forEach(addSubjectRow);
    if (!item.subjectProgress?.length) addSubjectRow();
    formHeading.textContent = "Update Progress Report";
    saveBtn.textContent = "Update Progress";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "share" || action === "reviewed") {
    try {
      const reportStatus = action === "share" ? "shared" : "reviewed";
      const data = await apiRequest(`/progress/${id}/status`, { method: "PATCH", body: JSON.stringify({ reportStatus }) });
      listMessage.textContent = `✅ ${data.message}`;
      await loadReports();
    } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
    return;
  }

  if (action === "delete") {
    if (!confirm("Progress report delete karna hai?")) return;
    try {
      const data = await apiRequest(`/progress/${id}`, { method: "DELETE" });
      listMessage.textContent = `✅ ${data.message}`;
      await loadReports();
    } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
  }
});

[searchInput, overallFilter, reportFilter, batchFilter, courseFilter].forEach((el) => el.addEventListener("input", loadReports));
refreshBtn.addEventListener("click", loadReports);
addSubjectBtn.addEventListener("click", () => addSubjectRow());
resetBtn.addEventListener("click", clearForm);
sampleBtn.addEventListener("click", loadSample);
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

clearForm();
loadReports();
