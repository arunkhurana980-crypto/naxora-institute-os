const $ = (id) => document.getElementById(id);

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || `${res.status} ${res.statusText}`), { data });
  return data;
}

function queryParams() {
  return new URLSearchParams({
    role: $("roleSelect").value,
    instituteId: $("instituteId").value,
    studentId: $("studentId").value,
    studentName: $("studentName").value
  }).toString();
}

function renderMetrics(today = {}) {
  const rows = [
    ["Classes", today.classesToday || 0],
    ["Homework", today.homeworkPending || 0],
    ["Tests", today.upcomingTests || 0],
    ["Notes", today.notesAvailable || 0],
    ["Attendance", `${today.attendancePercent || 0}%`],
    ["AI Tasks", today.aiStudyTasks || 0]
  ];
  $("metrics").innerHTML = rows.map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderTimetable(timetable = []) {
  $("timetable").innerHTML = timetable.map((c) => `
    <div class="item">
      <strong>${c.time} • ${c.subject}</strong>
      <p>${c.topic}</p>
      <span class="tag">${c.mode}</span>
    </div>
  `).join("");
}

function renderTasks(assignments = [], tests = []) {
  const rows = [
    ...assignments.map((a) => ({ title: a.title, meta: `Due: ${a.due}`, tag: a.status })),
    ...tests.map((t) => ({ title: t.topic, meta: `Test: ${t.date}`, tag: "test" }))
  ];
  $("tasks").innerHTML = rows.map((x) => `
    <div class="item">
      <strong>${x.title}</strong>
      <p>${x.meta}</p>
      <span class="tag">${x.tag}</span>
    </div>
  `).join("");
}

function renderStudyPlan(plan = {}) {
  $("studyPlan").innerHTML = `
    <div class="item">
      <strong>Weak topic: ${plan.weakTopic || "Not set"}</strong>
      <p>${plan.safeMotivation || ""}</p>
      <span class="tag private">AI Plan</span>
    </div>
    ${(plan.todayPlan || []).map((step, i) => `<div class="item"><strong>Step ${i + 1}</strong><p>${step}</p></div>`).join("")}
  `;
}

async function loadFeatures() {
  const data = await getJSON("/api/part82/features");
  $("features").innerHTML = data.features.map((f) => `
    <div class="item">
      <strong>${f.name}</strong>
      <p>${f.summary}</p>
      <span class="tag">${f.problemSolved}</span>
    </div>
  `).join("");
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part82/status");
    $("statusText").textContent = data.status === "active" ? "Student App Active" : "Status Loaded";
    $("statusSub").textContent = data.vaniListenReplyFoundation ? "VANI can listen and reply on supported browsers." : "Student app ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadStudentApp() {
  $("accessBox").textContent = "Loading...";
  try {
    const data = await getJSON(`/api/part82/dashboard?${queryParams()}`);
    $("accessBox").textContent = JSON.stringify(data.access, null, 2);
    renderMetrics(data.dashboard.today);
    renderTimetable(data.dashboard.timetable);
    renderTasks(data.dashboard.assignments, data.dashboard.tests);
    renderStudyPlan(data.dashboard.aiStudyPlan);
  } catch (err) {
    $("accessBox").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
    renderMetrics({});
    renderTimetable([]);
    renderTasks([], []);
    renderStudyPlan({});
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part82/vani/greeting");
    const result = window.NaxoraVaniVoice?.speak(data.greeting);
    $("vaniOutput").textContent = result?.spoken === false ? `Voice not started: ${result.reason}` : data.greeting;
  } catch (err) {
    $("vaniOutput").textContent = err.message;
  }
}

function toggleMute() {
  const next = !window.NaxoraVaniVoice?.isMuted();
  window.NaxoraVaniVoice?.setMuted(next);
  $("muteVaniBtn").textContent = next ? "Unmute" : "Mute";
  $("vaniOutput").textContent = next ? "VANI muted." : "VANI unmuted.";
}

async function sendVaniCommand(command) {
  const data = await getJSON("/api/part82/vani/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: $("roleSelect").value,
      instituteId: $("instituteId").value,
      studentId: $("studentId").value,
      studentName: $("studentName").value,
      command
    })
  });
  $("vaniOutput").textContent = JSON.stringify(data, null, 2);
  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary);
}

async function askVani() {
  $("vaniOutput").textContent = "Thinking...";
  try {
    await sendVaniCommand($("vaniCommand").value);
  } catch (err) {
    $("vaniOutput").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
  }
}

async function listenAndReply() {
  $("vaniOutput").textContent = "Listening...";
  try {
    if (!window.NaxoraVaniVoice?.listenSupported()) {
      $("vaniOutput").textContent = "Mic speech recognition is not supported in this browser. Type your command and press Ask VANI.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nThinking...`;
    await sendVaniCommand(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type your command and press Ask VANI.`;
  }
}

$("loadBtn").addEventListener("click", loadStudentApp);
$("roleSelect").addEventListener("change", loadStudentApp);
$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", askVani);

loadStatus();
loadStudentApp();
loadFeatures().catch(console.error);
