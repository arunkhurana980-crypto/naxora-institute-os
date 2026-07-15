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
    parentId: $("parentId").value,
    childId: $("childId").value,
    childName: $("childName").value
  }).toString();
}

function renderMetrics(today = {}) {
  const rows = [
    ["Attendance", `${today.attendancePercent || 0}%`],
    ["Classes", today.classesToday || 0],
    ["Homework", today.homeworkPending || 0],
    ["Tests", today.upcomingTests || 0],
    ["Messages", today.teacherMessages || 0],
    ["Notices", today.notices || 0]
  ];
  $("metrics").innerHTML = rows.map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderProgress(dashboard = {}) {
  const results = dashboard.results || [];
  const attendance = dashboard.attendance || {};
  const fees = dashboard.feesSafeView || {};
  $("progressList").innerHTML = `
    <div class="item">
      <strong>Attendance</strong>
      <p>${attendance.monthPercent || 0}% • ${attendance.note || ""}</p>
      <span class="tag">attendance</span>
    </div>
    <div class="item">
      <strong>Fee Summary</strong>
      <p>Due: ₹${fees.dueAmount || 0} • Date: ${fees.dueDate || "N/A"}</p>
      <span class="tag private">Private screen</span>
    </div>
    ${results.map((r) => `<div class="item"><strong>${r.test}</strong><p>${r.score} • Weak: ${r.weakTopic}</p><span class="tag">result</span></div>`).join("")}
  `;
}

function renderMessages(messages = []) {
  $("messagesList").innerHTML = messages.map((m) => `
    <div class="item">
      <strong>${m.from}</strong>
      <p>${m.message}</p>
      <span class="tag private">Private screen</span>
    </div>
  `).join("");
}

function renderWeekly(summary = {}) {
  $("weeklySummary").innerHTML = Object.entries(summary).map(([key, value]) => `
    <div class="item">
      <strong>${key}</strong>
      <p>${value}</p>
    </div>
  `).join("");
}

async function loadFeatures() {
  const data = await getJSON("/api/part83/features");
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
    const data = await getJSON("/api/part83/status");
    $("statusText").textContent = data.status === "active" ? "Parent App Active" : "Status Loaded";
    $("statusSub").textContent = data.vaniListenReplyFoundation ? "VANI can listen and reply on supported browsers." : "Parent app ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadParentApp() {
  $("accessBox").textContent = "Loading...";
  try {
    const data = await getJSON(`/api/part83/dashboard?${queryParams()}`);
    $("accessBox").textContent = JSON.stringify(data.access, null, 2);
    renderMetrics(data.dashboard.today);
    renderProgress(data.dashboard);
    renderMessages(data.dashboard.teacherMessages);
    renderWeekly(data.dashboard.weeklySummary);
  } catch (err) {
    $("accessBox").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
    renderMetrics({});
    renderProgress({});
    renderMessages([]);
    renderWeekly({});
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part83/vani/greeting");
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
  const data = await getJSON("/api/part83/vani/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: $("roleSelect").value,
      instituteId: $("instituteId").value,
      parentId: $("parentId").value,
      childId: $("childId").value,
      childName: $("childName").value,
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

$("loadBtn").addEventListener("click", loadParentApp);
$("roleSelect").addEventListener("change", loadParentApp);
$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", askVani);

loadStatus();
loadParentApp();
loadFeatures().catch(console.error);
