const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

if (!token) window.location.href = "index.html";

const $ = (selector) => document.querySelector(selector);
const getValue = (id) => $(`#${id}`).value.trim();
const setValue = (id, value = "") => { $(`#${id}`).value = value ?? ""; };

const attendanceForm = $("#attendanceForm");
const studentRows = $("#studentRows");
const attendanceList = $("#attendanceList");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isoDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function dateText(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function safeData(value) {
  return JSON.stringify(value).replaceAll("'", "&apos;");
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusLabel(status) {
  const labels = {
    present: "Present",
    absent: "Absent",
    late: "Late",
    leave: "Leave",
  };
  return labels[status] || status;
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

function createStudentRow(record = {}) {
  const row = document.createElement("div");
  row.className = "student-row";
  row.innerHTML = `
    <input class="student-name" placeholder="Student name" value="${escapeHTML(record.studentName || "")}" />
    <input class="student-phone" placeholder="Phone optional" value="${escapeHTML(record.phone || "")}" />
    <select class="student-status">
      <option value="present" ${record.status === "present" ? "selected" : ""}>Present</option>
      <option value="absent" ${record.status === "absent" ? "selected" : ""}>Absent</option>
      <option value="late" ${record.status === "late" ? "selected" : ""}>Late</option>
      <option value="leave" ${record.status === "leave" ? "selected" : ""}>Leave</option>
    </select>
    <input class="student-remarks" placeholder="Remarks" value="${escapeHTML(record.remarks || "")}" />
    <button class="remove-row-btn" type="button">✕</button>
  `;
  studentRows.appendChild(row);
}

function ensureRows(count = 3) {
  for (let i = 0; i < count; i += 1) createStudentRow({ status: "present" });
}

function getAttendanceRecords() {
  return [...studentRows.querySelectorAll(".student-row")]
    .map((row) => ({
      studentName: row.querySelector(".student-name").value.trim(),
      phone: row.querySelector(".student-phone").value.trim(),
      status: row.querySelector(".student-status").value,
      remarks: row.querySelector(".student-remarks").value.trim(),
    }))
    .filter((record) => record.studentName.length > 0);
}

function attendancePayload() {
  return {
    batchName: getValue("batchName"),
    courseName: getValue("courseName"),
    teacherName: getValue("teacherName"),
    attendanceDate: getValue("attendanceDate"),
    classTiming: getValue("classTiming"),
    topicCovered: getValue("topicCovered"),
    sessionStatus: getValue("sessionStatus") || "completed",
    records: getAttendanceRecords(),
    notes: getValue("sessionNotes"),
  };
}

function clearAttendanceForm() {
  [
    "attendanceId",
    "batchName",
    "courseName",
    "teacherName",
    "classTiming",
    "topicCovered",
    "sessionNotes",
  ].forEach((id) => setValue(id, ""));
  setValue("attendanceDate", todayISO());
  setValue("sessionStatus", "completed");
  studentRows.innerHTML = "";
  ensureRows(3);
  $("#attendanceFormHeading").textContent = "Mark New Attendance";
  $("#saveAttendanceBtn").textContent = "Save Attendance";
  $("#attendanceMessage").textContent = "";
}

function renderStats(data) {
  $("#totalSessions").textContent = data.totalSessions ?? 0;
  $("#totalPresent").textContent = (data.present ?? 0) + (data.late ?? 0);
  $("#totalAbsent").textContent = data.absent ?? 0;
  $("#attendancePercent").textContent = `${data.percentage ?? 0}%`;
}

function renderAttendanceList(data) {
  renderStats(data);

  if (!data.attendance.length) {
    attendanceList.innerHTML = `<div class="empty-state"><strong>No attendance found.</strong><br>Upar se first attendance session save karo.</div>`;
    return;
  }

  attendanceList.innerHTML = data.attendance.map((session) => {
    const previewRecords = session.records.slice(0, 5).map((record) => `
      <div>
        <span><strong>${escapeHTML(record.studentName)}</strong>${record.phone ? ` • ${escapeHTML(record.phone)}` : ""}</span>
        <span class="status-pill status-${record.status}">${statusLabel(record.status)}</span>
      </div>
    `).join("");

    const moreText = session.records.length > 5
      ? `<div><span>+${session.records.length - 5} more students</span><span></span></div>`
      : "";

    return `
      <article class="data-card" data-id="${session.id}">
        <div class="data-top">
          <div class="data-title">
            <div class="data-avatar">✅</div>
            <div>
              <h3>${escapeHTML(session.batchName)}</h3>
              <p>${escapeHTML(session.courseName || "No course")} • ${dateText(session.attendanceDate)}</p>
            </div>
          </div>
          <div class="data-tags">
            <span class="tag blue">${session.sessionStatus.replace("_", " ")}</span>
            <span class="tag gold">${session.attendancePercentage}%</span>
          </div>
        </div>
        <div class="data-details">
          <div><span>Teacher</span>${escapeHTML(session.teacherName || "Not set")}</div>
          <div><span>Timing</span>${escapeHTML(session.classTiming || "Not set")}</div>
          <div><span>Topic</span>${escapeHTML(session.topicCovered || "Not set")}</div>
          <div><span>Total</span>${session.totalStudents}</div>
          <div><span>Present + Late</span>${(session.presentCount || 0) + (session.lateCount || 0)}</div>
          <div><span>Absent</span>${session.absentCount || 0}</div>
        </div>
        <div class="attendance-summary-line">
          <span class="status-pill status-present">Present ${session.presentCount || 0}</span>
          <span class="status-pill status-absent">Absent ${session.absentCount || 0}</span>
          <span class="status-pill status-late">Late ${session.lateCount || 0}</span>
          <span class="status-pill status-leave">Leave ${session.leaveCount || 0}</span>
        </div>
        <div class="student-mini-list">${previewRecords}${moreText}</div>
        ${session.notes ? `<p class="data-note">${escapeHTML(session.notes)}</p>` : ""}
        <div class="card-actions">
          <button class="edit-btn" data-action="edit-attendance" data-attendance='${safeData(session)}'>Edit</button>
          <button class="delete-btn" data-action="delete-attendance">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadAttendance() {
  $("#attendanceListMessage").textContent = "Attendance loading…";
  try {
    const params = new URLSearchParams();
    if (getValue("attendanceSearch")) params.set("search", getValue("attendanceSearch"));
    if (getValue("dateFilter")) params.set("date", getValue("dateFilter"));
    if (getValue("statusFilter")) params.set("status", getValue("statusFilter"));
    const data = await apiRequest(`/attendance?${params.toString()}`);
    renderAttendanceList(data);
    $("#attendanceListMessage").textContent = `✅ ${data.count} attendance record loaded.`;
  } catch (error) {
    $("#attendanceListMessage").textContent = `❌ ${error.message}`;
    logoutOnAuthError(error);
  }
}

attendanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = getValue("attendanceId");
  const payload = attendancePayload();

  if (!payload.batchName) return ($("#attendanceMessage").textContent = "❌ Batch name required hai");
  if (!payload.attendanceDate) return ($("#attendanceMessage").textContent = "❌ Attendance date required hai");
  if (!payload.records.length) return ($("#attendanceMessage").textContent = "❌ Kam se kam 1 student ka name add karo");

  $("#attendanceMessage").textContent = id ? "Attendance update ho rahi hai…" : "Attendance save ho rahi hai…";
  try {
    const data = await apiRequest(id ? `/attendance/${id}` : "/attendance", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    $("#attendanceMessage").textContent = `✅ ${data.message}`;
    clearAttendanceForm();
    await loadAttendance();
  } catch (error) {
    $("#attendanceMessage").textContent = `❌ ${error.message}`;
  }
});

studentRows.addEventListener("click", (event) => {
  if (!event.target.classList.contains("remove-row-btn")) return;
  const rows = studentRows.querySelectorAll(".student-row");
  if (rows.length <= 1) {
    $("#attendanceMessage").textContent = "❌ Kam se kam 1 row rehni chahiye";
    return;
  }
  event.target.closest(".student-row").remove();
});

attendanceList.addEventListener("click", async (event) => {
  const card = event.target.closest(".data-card");
  const action = event.target.dataset.action;
  if (!card || !action) return;

  if (action === "edit-attendance") {
    const session = JSON.parse(event.target.dataset.attendance.replaceAll("&apos;", "'"));
    setValue("attendanceId", session.id);
    setValue("batchName", session.batchName);
    setValue("courseName", session.courseName);
    setValue("teacherName", session.teacherName);
    setValue("attendanceDate", isoDate(session.attendanceDate));
    setValue("classTiming", session.classTiming);
    setValue("topicCovered", session.topicCovered);
    setValue("sessionStatus", session.sessionStatus);
    setValue("sessionNotes", session.notes);
    studentRows.innerHTML = "";
    session.records.forEach(createStudentRow);
    $("#attendanceFormHeading").textContent = "Edit Attendance";
    $("#saveAttendanceBtn").textContent = "Update Attendance";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "delete-attendance") {
    if (!confirm("Attendance record delete karna hai?")) return;
    try {
      const data = await apiRequest(`/attendance/${card.dataset.id}`, { method: "DELETE" });
      $("#attendanceListMessage").textContent = `✅ ${data.message}`;
      await loadAttendance();
    } catch (error) {
      $("#attendanceListMessage").textContent = `❌ ${error.message}`;
    }
  }
});

$("#addStudentRowBtn").addEventListener("click", () => createStudentRow({ status: "present" }));
$("#addThreeRowsBtn").addEventListener("click", () => ensureRows(3));
$("#markAllPresentBtn").addEventListener("click", () => {
  studentRows.querySelectorAll(".student-status").forEach((select) => { select.value = "present"; });
});
$("#clearAttendanceBtn").addEventListener("click", clearAttendanceForm);
$("#refreshAttendanceBtn").addEventListener("click", loadAttendance);
$("#attendanceSearch").addEventListener("input", loadAttendance);
$("#dateFilter").addEventListener("change", loadAttendance);
$("#statusFilter").addEventListener("change", loadAttendance);
$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

clearAttendanceForm();
loadAttendance();
