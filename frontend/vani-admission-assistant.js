const $ = (id) => document.getElementById(id);

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || `${res.status} ${res.statusText}`), { data });
  return data;
}

function basePayload(command) {
  return {
    role: $("roleSelect").value,
    instituteId: $("instituteId").value,
    branchId: $("branchId").value,
    command
  };
}

function renderPreview(screenPreview = {}) {
  const missing = screenPreview.missing || [];
  const details = screenPreview.details || {};
  const qualification = screenPreview.qualification || {};
  $("previewCards").innerHTML = `
    <div class="item">
      <strong>Mode</strong>
      <p>${screenPreview.mode || "waiting"}</p>
      <span class="tag ${missing.length ? "warn" : "ok"}">${missing.length ? "Needs details" : "Preview ready"}</span>
    </div>
    <div class="item">
      <strong>Student</strong>
      <p>${details.studentName || "Missing"} • ${details.course || details.className || "Course missing"}</p>
    </div>
    <div class="item">
      <strong>Parent Phone</strong>
      <p>${details.parentPhone || "Missing"}</p>
    </div>
    <div class="item">
      <strong>Lead Qualification</strong>
      <p>${qualification.type || "unknown"} • Score ${qualification.score || 0}</p>
      <span class="tag">${qualification.reason || ""}</span>
    </div>
    <div class="item">
      <strong>Next Question</strong>
      <p>${screenPreview.nextQuestion || "No question yet"}</p>
    </div>
  `;
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part85/status");
    $("statusText").textContent = data.status === "active" ? "Admission Assistant Active" : "Status Loaded";
    $("statusSub").textContent = data.vaniAdmissionAssistant ? "VANI admission workflow ready." : "Ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function checkAccess() {
  $("accessBox").textContent = "Checking...";
  try {
    const params = new URLSearchParams({
      role: $("roleSelect").value,
      instituteId: $("instituteId").value,
      branchId: $("branchId").value
    });
    const data = await getJSON(`/api/part85/access-check?${params.toString()}`);
    $("accessBox").textContent = JSON.stringify(data.access, null, 2);
  } catch (err) {
    $("accessBox").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
  }
}

async function loadFeatures() {
  const data = await getJSON("/api/part85/features");
  $("features").innerHTML = data.features.map((f) => `
    <div class="item">
      <strong>${f.name}</strong>
      <p>${f.summary}</p>
      <span class="tag">${f.problemSolved}</span>
    </div>
  `).join("");
}

async function startVani() {
  try {
    const data = await getJSON("/api/part85/vani/greeting");
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
  const data = await getJSON("/api/part85/vani/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(basePayload(command))
  });
  $("vaniOutput").textContent = JSON.stringify(data, null, 2);
  renderPreview(data.screenPreview || {});
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
      $("vaniOutput").textContent = "Mic speech recognition is not supported in this browser. Type command and press Ask VANI.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nThinking...`;
    await sendVaniCommand(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type command and press Ask VANI.`;
  }
}

$("checkAccessBtn").addEventListener("click", checkAccess);
$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", askVani);
$("roleSelect").addEventListener("change", checkAccess);

loadStatus();
checkAccess();
loadFeatures().catch(console.error);
