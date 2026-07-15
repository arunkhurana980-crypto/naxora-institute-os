const $ = (id) => document.getElementById(id);

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.replyText || data.message || `${res.status} ${res.statusText}`), { data });
  return data;
}

function item(title, text, tag = "") {
  return `<div class="item"><strong>${title}</strong><p>${text}</p>${tag ? `<span class="tag ${tag}">${tag}</span>` : ""}</div>`;
}

function renderResult(data) {
  const room = data.room || {};
  const device = data.deviceReadiness || {};
  const network = data.networkReadiness || {};
  const policy = data.participantPolicy || {};
  const join = data.joinTokenPreview || {};
  const launch = data.launchPreview || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    canHost: data.access?.canHost,
    viewOnly: data.access?.viewOnly,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("roomBox").innerHTML = [
    item("Room", room.title || "Pending", "safe"),
    item("Batch", room.batchId || "Pending"),
    item("Teacher", room.teacherId || "Pending"),
    item("Schedule", room.schedule || "Pending", "warn"),
    item("Status", room.status || "preview", "safe")
  ].join("");

  $("deviceBox").innerHTML = (device.checks || []).map((c) => item(c.key, c.message, c.status?.includes("pending") ? "warn" : "safe")).join("");

  $("networkBox").innerHTML = [
    item("Teacher Upload", network.recommendedMinimum?.teacherUpload || "3 Mbps+", "safe"),
    item("Teacher Download", network.recommendedMinimum?.teacherDownload || "5 Mbps+", "safe"),
    item("Student Download", network.recommendedMinimum?.studentDownload || "2 Mbps+", "safe"),
    item("Latency", network.recommendedMinimum?.latency || "Under 150ms", "warn")
  ].join("");

  const perms = policy.permissions || {};
  $("policyBox").innerHTML = Object.entries(perms).map(([k,v]) => item(k, v ? "Allowed" : "Not allowed", v ? "safe" : "block")).join("");

  $("joinBox").innerHTML = [
    item("Join Token", join.tokenId || "Preview unavailable", join.allowed ? "safe" : "block"),
    item("Token Policy", join.safety || "Preview only", "warn"),
    item("Launch", launch.canLaunchNow ? "Teacher can launch preview" : "Launch not allowed for this role", launch.canLaunchNow ? "safe" : "block"),
    item("Pending Parts", launch.note || "Part 95-97 will add full tools.", "warn")
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part94/status");
    $("statusText").textContent = data.status === "active" ? "Classroom Active" : "Status Loaded";
    $("statusSub").textContent = "Native live foundation ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadRooms() {
  const data = await getJSON("/api/part94/demo-rooms");
  $("roomsBox").innerHTML = data.rooms.map((r) => item(
    r.title,
    `${r.batchId} • ${r.schedule} • expected students ${r.expectedStudents}`,
    "safe"
  )).join("");
}

async function startVani() {
  try {
    const data = await getJSON("/api/part94/vani/greeting");
    $("vaniOutput").textContent = data.greeting;
    const result = window.NaxoraVaniVoice?.speak(data.greeting);
    if (result?.spoken === false) $("vaniOutput").textContent = `Voice not started: ${result.reason}`;
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

async function previewRoom(command) {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part94/vani/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: $("roleSelect").value,
        instituteId: $("instituteId").value,
        branchId: $("branchId").value,
        batchId: $("batchId").value,
        teacherId: $("teacherId").value,
        command: command || $("vaniCommand").value
      })
    });
    renderResult(data);
  } catch (err) {
    $("vaniOutput").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
    if (err.data) renderResult(err.data);
  }
}

async function listenAndReply() {
  $("vaniOutput").textContent = "Listening...";
  try {
    if (!window.NaxoraVaniVoice?.listenSupported()) {
      $("vaniOutput").textContent = "Mic speech recognition supported nahi hai. Command type karke Preview Room dabao.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nThinking...`;
    await previewRoom(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type command and press Preview Room.`;
  }
}

function demo() {
  const command = "VANI, Class 10 Maths live classroom preview dikhao";
  $("vaniCommand").value = command;
  previewRoom(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => previewRoom());
$("demoBtn").addEventListener("click", demo);
$("roleSelect").addEventListener("change", () => previewRoom());

loadStatus();
loadRooms().catch(console.error);
demo();
