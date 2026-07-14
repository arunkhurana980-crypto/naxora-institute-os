const API = "/api/part64";
const $ = (id) => document.getElementById(id);

function toLocalInput(iso) {
  const date = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.message || "Request failed");
  return data;
}

async function loadDashboard() {
  const [classesData, analyticsData, checklistData] = await Promise.all([
    api("/classes"),
    api("/analytics"),
    api("/checklist")
  ]);
  const a = analyticsData.analytics || {};
  $("totalClasses").textContent = a.totalClasses || 0;
  $("scheduledClasses").textContent = a.scheduled || 0;
  $("joinLinksReady").textContent = a.joinLinksReady || 0;
  $("recordingsAttached").textContent = a.recordingsAttached || 0;
  renderClasses(classesData.classes || []);
  $("checklist").innerHTML = (checklistData.checklist || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderClasses(classes) {
  if (!classes.length) {
    $("classesList").innerHTML = `<div class="p64-class"><strong>No live classes yet.</strong><span class="p64-mini">Create first class from the form above.</span></div>`;
    return;
  }
  $("classesList").innerHTML = classes.map((item) => {
    const join = item.meetingLink ? `<a class="p64-btn" href="${escapeHtml(item.meetingLink)}" target="_blank">Join Class</a>` : `<button class="p64-btn ghost" disabled>No Link</button>`;
    return `<article class="p64-class">
      <div class="p64-class-top">
        <div>
          <span class="p64-pill">${escapeHtml(item.status)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="p64-mini">${escapeHtml(item.batchName)} • ${escapeHtml(item.subject)} • ${escapeHtml(item.teacherName)}</div>
          <div class="p64-mini">${new Date(item.startTime).toLocaleString()} → ${new Date(item.endTime).toLocaleString()}</div>
        </div>
        <div class="p64-mini">Attendance: ${item.attendanceCount || 0}<br/>Reminder: ${escapeHtml(item.reminderStatus)}</div>
      </div>
      <div class="p64-class-actions">
        ${join}
        <button class="p64-btn ghost" onclick="queueReminder('${escapeHtml(item.classId)}')">Queue Reminder</button>
        <button class="p64-btn ghost" onclick="markAttendance('${escapeHtml(item.classId)}')">Mark Demo Attendance</button>
        ${item.recordingUrl ? `<a class="p64-btn ghost" href="${escapeHtml(item.recordingUrl)}" target="_blank">Recording</a>` : ""}
        ${item.notesUrl ? `<a class="p64-btn ghost" href="${escapeHtml(item.notesUrl)}" target="_blank">Notes</a>` : ""}
      </div>
    </article>`;
  }).join("");
}

async function queueReminder(classId) {
  await api(`/classes/${classId}/reminder`, { method: "POST", body: JSON.stringify({ channel: "in_app" }) });
  await loadDashboard();
}

async function markAttendance(classId) {
  await api(`/classes/${classId}/attendance`, { method: "POST", body: JSON.stringify({ studentName: "Demo Student", status: "joined", durationMinutes: 45 }) });
  await loadDashboard();
}

function initFormDefaults() {
  const form = $("classForm");
  form.startTime.value = toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString());
  form.endTime.value = toLocalInput(new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString());
}

$("classForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.startTime = new Date(data.startTime).toISOString();
  data.endTime = new Date(data.endTime).toISOString();
  $("formMsg").textContent = "Saving...";
  try {
    await api("/classes", { method: "POST", body: JSON.stringify(data) });
    $("formMsg").textContent = "Live class saved.";
    form.reset();
    initFormDefaults();
    await loadDashboard();
  } catch (error) {
    $("formMsg").textContent = error.message;
  }
});

$("refreshBtn").addEventListener("click", loadDashboard);
initFormDefaults();
loadDashboard().catch((error) => { $("classesList").innerHTML = `<div class="p64-class">${escapeHtml(error.message)}</div>`; });
