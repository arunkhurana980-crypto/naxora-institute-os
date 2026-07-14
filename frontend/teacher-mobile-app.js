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
    teacherId: $("teacherId").value
  }).toString();
}

function renderMetrics(today = {}) {
  const rows = [
    ["Classes", today.classesToday || 0],
    ["Attendance Pending", today.attendancePending || 0],
    ["Homework Review", today.assignmentsToReview || 0],
    ["Tests", today.testsToEvaluate || 0],
    ["Doubts", today.doubtsPending || 0],
    ["Live", today.liveClassesToday || 0]
  ];
  $("metrics").innerHTML = rows.map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderBatches(batches = []) {
  $("batches").innerHTML = batches.map((b) => `
    <div class="item">
      <strong>${b.name}</strong>
      <p>${b.subject} • ${b.students} students • Next: ${b.nextClass}</p>
      <span class="tag">${b.attendanceMarked ? "Attendance marked" : "Attendance pending"}</span>
    </div>
  `).join("");
}

function renderSupport(alerts = []) {
  $("supportAlerts").innerHTML = alerts.map((a) => `
    <div class="item">
      <strong>${a.student} • ${a.batch}</strong>
      <p>${a.reason}</p>
      <span class="tag private">Private screen</span>
    </div>
  `).join("");
}

async function loadFeatures() {
  const data = await getJSON("/api/part81/features");
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
    const data = await getJSON("/api/part81/status");
    $("statusText").textContent = data.status === "active" ? "Teacher App Active" : "Status Loaded";
    $("statusSub").textContent = data.vaniVoiceStarter ? "VANI voice starter included." : "Teacher app ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadTeacherApp() {
  $("accessBox").textContent = "Loading...";
  try {
    const data = await getJSON(`/api/part81/dashboard?${queryParams()}`);
    $("accessBox").textContent = JSON.stringify(data.access, null, 2);
    renderMetrics(data.dashboard.today);
    renderBatches(data.dashboard.assignedBatches);
    renderSupport(data.dashboard.supportAlerts);
  } catch (err) {
    $("accessBox").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
    renderMetrics({});
    renderBatches([]);
    renderSupport([]);
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part81/vani/greeting");
    const result = window.NaxoraVaniVoice?.speak(data.greeting);
    if (result && result.spoken === false) {
      $("vaniOutput").textContent = `Voice not started: ${result.reason}`;
    } else {
      $("vaniOutput").textContent = data.greeting;
    }
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

async function askVani() {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part81/vani/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: $("roleSelect").value,
        instituteId: $("instituteId").value,
        teacherId: $("teacherId").value,
        command: $("vaniCommand").value
      })
    });
    $("vaniOutput").textContent = JSON.stringify(data, null, 2);
    window.NaxoraVaniVoice?.speak(data.spokenSafeSummary);
  } catch (err) {
    $("vaniOutput").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
  }
}

$("loadBtn").addEventListener("click", loadTeacherApp);
$("roleSelect").addEventListener("change", loadTeacherApp);
$("startVaniBtn").addEventListener("click", startVani);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", askVani);

loadStatus();
loadTeacherApp();
loadFeatures().catch(console.error);
