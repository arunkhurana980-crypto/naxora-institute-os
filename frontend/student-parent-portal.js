const state = {
  role: "student",
  activeModule: "attendance",
  config: null,
  data: null,
  timeline: []
};

const moduleMap = {
  attendance: { title: "Attendance", fields: ["date", "status", "batch", "note"] },
  fees: { title: "Fees", fields: ["title", "total", "paid", "pending", "dueDate", "status"] },
  tests: { title: "Tests", fields: ["title", "date", "maxMarks", "obtainedMarks", "status", "remark"] },
  reports: { title: "Reports", fields: ["title", "period", "result", "highlights"] },
  assignments: { title: "Assignments", fields: ["title", "subject", "dueDate", "status", "teacher"] },
  notes: { title: "Notes", fields: ["title", "subject", "type", "access"] },
  notices: { title: "Notices", fields: ["title", "audience", "date", "priority"] },
  liveClasses: { title: "Live Classes", fields: ["title", "dateTime", "teacher", "joinStatus", "recordingStatus"] }
};

const $ = (id) => document.getElementById(id);

function safe(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function money(value) {
  const num = Number(value || 0);
  return `₹${num.toLocaleString("en-IN")}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function setStatus(text, ok = true) {
  $("apiStatus").textContent = text;
  $("apiStatus").style.borderColor = ok ? "rgba(0,212,255,.38)" : "rgba(255,90,90,.45)";
}

function renderSummary() {
  const summary = state.data?.summary || {};
  const items = [
    ["Attendance", `${summary.attendancePercent ?? 0}%`],
    ["Pending Fees", money(summary.pendingFees)],
    ["Paid Fees", money(summary.paidFees)],
    ["Tests", summary.upcomingTests ?? 0],
    ["Assignments", summary.pendingAssignments ?? 0],
    ["Notices", summary.unreadNotices ?? 0],
    ["Live Classes", summary.upcomingLiveClasses ?? 0]
  ];
  $("summaryGrid").innerHTML = items.map(([label, value]) => `<div class="nx-summary-card"><b>${value}</b><span>${label}</span></div>`).join("");
}

function renderProfile() {
  const student = state.data?.student || {};
  $("portalRoleLabel").textContent = state.role === "parent" ? "Parent View" : "Student View";
  $("studentName").textContent = student.name || "Student";
  $("studentMeta").textContent = `${student.courseName || "Course"} · ${student.batchName || "Batch"} · ${state.role === "parent" ? `Parent: ${student.parentName || "Parent"}` : student.className || "Class"}`;
  $("studentIdBadge").textContent = student.studentId || "Student ID";
  $("modeBadge").textContent = state.data?.mode || "mode";
}

function renderTabs() {
  const modules = state.config?.modules || Object.keys(moduleMap).map((id) => ({ id, title: moduleMap[id].title }));
  $("moduleTabs").innerHTML = modules.map((module) => `<button class="nx-tab ${state.activeModule === module.id ? "active" : ""}" data-module="${module.id}">${module.title}</button>`).join("");
  document.querySelectorAll(".nx-tab").forEach((btn) => btn.addEventListener("click", () => {
    state.activeModule = btn.dataset.module;
    renderAll();
  }));
}

function renderModule() {
  const key = state.activeModule;
  const def = moduleMap[key] || { title: key, fields: [] };
  const rows = state.data?.[key] || [];
  $("activeModuleKicker").textContent = state.role === "parent" ? "Child Portal Section" : "Student Portal Section";
  $("activeModuleTitle").textContent = def.title;
  $("activeModuleCount").textContent = `${rows.length} Records`;
  if (!rows.length) {
    $("moduleContent").innerHTML = `<div class="nx-row"><h3>No records yet</h3><p>MongoDB me data add hoga to yahan show hoga. Abhi empty state safe hai.</p></div>`;
    return;
  }
  $("moduleContent").innerHTML = rows.map((row) => {
    const title = row.title || row.date || row.status || def.title;
    const grid = def.fields.map((field) => `<div class="nx-mini"><span>${field}</span>${field.toLowerCase().includes("fee") || ["total","paid","pending"].includes(field) ? money(row[field]) : safe(row[field])}</div>`).join("");
    return `<div class="nx-row"><h3>${safe(title)}</h3><div class="nx-row-grid">${grid}</div></div>`;
  }).join("");
}

function renderTimeline() {
  const rows = state.timeline || [];
  $("timelineList").innerHTML = rows.length ? rows.map((item) => `<div class="nx-time-item"><b>${safe(item.title)}</b><span>${safe(item.type)} · ${safe(item.date)}</span><p>${safe(item.detail)}</p></div>`).join("") : `<div class="nx-time-item"><b>No timeline yet</b><span>Load portal data</span></div>`;
}

function renderAll() {
  renderProfile();
  renderSummary();
  renderTabs();
  renderModule();
  renderTimeline();
}

async function loadPortal() {
  try {
    setStatus("Loading portal...");
    const studentId = encodeURIComponent($("studentIdInput").value.trim() || "NX-DEMO-STD-0001");
    state.config = await fetchJson("/api/part57/portal-config");
    state.data = await fetchJson(`/api/part57/portal-data?studentId=${studentId}&role=${state.role}`);
    const timeline = await fetchJson(`/api/part57/timeline/${studentId}?role=${state.role}`);
    state.timeline = timeline.timeline || [];
    setStatus("Part 57 API active", true);
    renderAll();
  } catch (error) {
    setStatus("API error", false);
    $("moduleContent").innerHTML = `<div class="nx-row"><h3>Portal load error</h3><p>${safe(error.message)}</p></div>`;
  }
}

$("studentModeBtn").addEventListener("click", () => { state.role = "student"; loadPortal(); });
$("parentModeBtn").addEventListener("click", () => { state.role = "parent"; loadPortal(); });
$("reloadBtn").addEventListener("click", loadPortal);
$("studentIdInput").addEventListener("keydown", (event) => { if (event.key === "Enter") loadPortal(); });

loadPortal();
