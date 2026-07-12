const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

document.querySelector("#profilePill").textContent = `${savedUser?.name || "User"} • Reports`;

const overviewStats = document.querySelector("#overviewStats");
const feesReport = document.querySelector("#feesReport");
const attendanceReport = document.querySelector("#attendanceReport");
const testReport = document.querySelector("#testReport");
const subjectPerformance = document.querySelector("#subjectPerformance");
const batchPerformance = document.querySelector("#batchPerformance");
const topStudents = document.querySelector("#topStudents");
const weakStudents = document.querySelector("#weakStudents");
const recentActivity = document.querySelector("#recentActivity");
const message = document.querySelector("#message");

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function pct(value) {
  return `${Number(value || 0)}%`;
}

function dateText(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function setMessage(text, ok = true) {
  message.textContent = `${ok ? "✅" : "❌"} ${text}`;
}

function progress(label, value, extra = "") {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return `
    <div class="progress-row">
      <div><b>${label}</b><span>${extra}</span></div>
      <strong>${safe}%</strong>
    </div>
    <div class="progress"><span style="width:${safe}%"></span></div>
  `;
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

function simpleTable(headers, rows, emptyText = "Abhi report data available nahi hai.") {
  if (!rows.length) return `<p class="empty-state">${emptyText}</p>`;
  return `
    <table class="report-table">
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function renderReports(data) {
  const overview = data.overview || {};
  const fees = data.feesReport || {};
  const attendance = data.attendanceReport || {};
  const tests = data.testReport || {};

  overviewStats.innerHTML = [
    statCard("Students", overview.totalStudents || 0, `${overview.activeStudents || 0} active • ${pct(overview.activePercent)} active rate`, "👨‍🎓"),
    statCard("Teachers", overview.totalTeachers || 0, `${overview.activeTeachers || 0} active`, "👨‍🏫"),
    statCard("Fees Paid", money(fees.paidAmount), `${money(fees.pendingAmount)} pending • ${pct(fees.collectionPercent)} collection`, "💰"),
    statCard("Attendance", pct(attendance.attendancePercent), `${attendance.sessions || 0} sessions`, "✅"),
    statCard("Tests", tests.totalTests || 0, `${pct(tests.passPercent)} pass • ${pct(tests.averagePercent)} avg`, "🏆"),
    statCard("Courses", overview.totalCourses || 0, `${overview.totalBatches || 0} batches`, "📚"),
  ].join("");

  feesReport.innerHTML = `
    <div class="mini-stats">
      <div><span>Total</span><b>${money(fees.totalAmount)}</b></div>
      <div><span>Paid</span><b>${money(fees.paidAmount)}</b></div>
      <div><span>Pending</span><b>${money(fees.pendingAmount)}</b></div>
      <div><span>This Month</span><b>${money(fees.currentMonthPaid)}</b></div>
    </div>
    ${progress("Collection percentage", fees.collectionPercent, `${fees.records || 0} fee records`)}
    <p class="muted-line">Paid: ${fees.status?.paid || 0} • Partial: ${fees.status?.partial || 0} • Pending: ${fees.status?.pending || 0} • Overdue: ${fees.status?.overdue || 0}</p>
  `;

  attendanceReport.innerHTML = `
    <div class="mini-stats">
      <div><span>Sessions</span><b>${attendance.sessions || 0}</b></div>
      <div><span>Present</span><b>${attendance.present || 0}</b></div>
      <div><span>Absent</span><b>${attendance.absent || 0}</b></div>
      <div><span>Late</span><b>${attendance.late || 0}</b></div>
    </div>
    ${progress("Attendance percentage", attendance.attendancePercent, `${attendance.totalStudentsMarked || 0} total marked rows`)}
  `;

  testReport.innerHTML = `
    <div class="mini-stats wide">
      <div><span>Result Rows</span><b>${tests.totalResultRows || 0}</b></div>
      <div><span>Pass</span><b>${tests.passRows || 0}</b></div>
      <div><span>Fail</span><b>${tests.failRows || 0}</b></div>
      <div><span>Absent</span><b>${tests.absentRows || 0}</b></div>
      <div><span>Average</span><b>${pct(tests.averagePercent)}</b></div>
    </div>
    ${progress("Pass percentage", tests.passPercent, "Pass vs fail rows")}
  `;

  subjectPerformance.innerHTML = simpleTable(
    ["Subject", "Rows", "Average", "Pass %"],
    (tests.subjectPerformance || []).map((item) => `
      <tr><td>${item.subject}</td><td>${item.rows}</td><td>${pct(item.averagePercent)}</td><td>${pct(item.passPercent)}</td></tr>
    `)
  );

  batchPerformance.innerHTML = simpleTable(
    ["Batch", "Sessions", "Present", "Attendance"],
    (attendance.byBatch || []).map((item) => `
      <tr><td>${item.batchName}</td><td>${item.sessions}</td><td>${item.present}/${item.totalStudents}</td><td>${pct(item.attendancePercent)}</td></tr>
    `)
  );

  topStudents.innerHTML = simpleTable(
    ["Student", "Subject", "Marks", "%"],
    (tests.topStudents || []).map((row) => `
      <tr><td>${row.studentName}</td><td>${row.subject}</td><td>${row.marksObtained}/${row.totalMarks}</td><td>${pct(row.percentage)}</td></tr>
    `),
    "Top students tab dikhenge jab tests me marks add honge."
  );

  weakStudents.innerHTML = simpleTable(
    ["Student", "Subject", "Marks", "%"],
    (tests.weakStudents || []).map((row) => `
      <tr><td>${row.studentName}</td><td>${row.subject}</td><td>${row.marksObtained}/${row.totalMarks}</td><td>${pct(row.percentage)}</td></tr>
    `),
    "Weak students tab dikhenge jab low score/fail rows honge."
  );

  recentActivity.innerHTML = (data.recentActivity || []).length
    ? data.recentActivity.map((item) => `
      <article class="activity-item">
        <span>${item.type}</span>
        <div><b>${item.title}</b><p>${item.detail}</p></div>
        <time>${dateText(item.date)}</time>
      </article>
    `).join("")
    : `<p class="empty-state">Abhi recent activity nahi hai.</p>`;
}

async function loadReports() {
  try {
    const response = await fetch(`${API}/reports`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Reports load failed");
    renderReports(data);
    setMessage("Reports backend se load ho gaye.");
  } catch (error) {
    setMessage(error.message, false);
  }
}

document.querySelector("#refreshBtn").addEventListener("click", loadReports);
document.querySelector("#printBtn").addEventListener("click", () => window.print());
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

loadReports();
