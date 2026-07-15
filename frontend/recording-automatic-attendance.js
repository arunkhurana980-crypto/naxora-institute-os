const $ = (id) => document.getElementById(id);

let localStream = null;
let mediaRecorder = null;
let recordedChunks = [];

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.replyText || data.message || `${res.status} ${res.statusText}`), { data });
  return data;
}

function item(title, text, tag = "") {
  return `<div class="item"><strong>${title}</strong><p>${text}</p>${tag ? `<span class="tag ${tag}">${tag}</span>` : ""}</div>`;
}

function basePayload(extra = {}) {
  return {
    role: $("roleSelect").value,
    instituteId: $("instituteId").value,
    branchId: $("branchId").value,
    batchId: $("batchId").value,
    teacherId: $("teacherId").value,
    studentId: $("studentId").value,
    ...extra
  };
}

function renderResult(data) {
  const session = data.session || {};
  const policy = data.recordingPolicy || {};
  const capability = data.recordingCapability || {};
  const attendance = data.attendancePreview || {};
  const review = data.manualReviewQueue || {};
  const parent = data.parentSummaryDraft || {};
  const start = data.recordingStartPreview || {};
  const stop = data.recordingStopPreview || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    productionRecordingUploadPending: data.productionRecordingUploadPending,
    productionAttendancePersistencePending: data.productionAttendancePersistencePending
  }, null, 2);

  $("sessionBox").innerHTML = [
    item("Session", session.title || "Pending", "safe"),
    item("Batch", session.batchId || "Pending"),
    item("Recording", session.recordingStatus || "preview", "warn"),
    item("Attendance", session.attendanceStatus || "draft", "info"),
    item("Storage", session.storageMode || "local preview", "warn")
  ].join("");

  $("recordingBox").innerHTML = [
    item("Can Start Recording", policy.canStartRecording ? "Yes" : "No", policy.canStartRecording ? "safe" : "block"),
    item("Consent", policy.consentMessage || "Consent required", "warn"),
    item("Start Preview", start.status || "pending", start.canStart ? "safe" : "block"),
    item("Stop Preview", stop.status || "pending", stop.canStop ? "safe" : "block"),
    item("Export", policy.canExportRecording ? "Owner can export after verification" : "Not allowed for this role", policy.canExportRecording ? "warn" : "block")
  ].join("");

  $("capabilityBox").innerHTML = (capability.checks || []).map((c) => item(c.key, c.message, c.status === "pending" ? "warn" : "info")).join("");

  const entries = attendance.entries || [];
  $("attendanceBox").innerHTML = [
    item("Summary", `Present: ${attendance.summary?.present || 0}, Partial: ${attendance.summary?.partialPresent || 0}, Review: ${attendance.summary?.manualReview || 0}, Absent: ${attendance.summary?.absent || 0}`, "safe"),
    ...entries.map((e) => item(`${e.studentName} — ${e.status}`, `${e.attendancePercent}% joined • ${e.reasons.join(", ")}`, e.reviewRequired ? "warn" : (e.status === "absent" ? "block" : "safe")))
  ].join("");

  $("reviewBox").innerHTML = [
    item("Teacher Review Required", review.teacherReviewRequired ? "Yes" : "No", review.teacherReviewRequired ? "warn" : "safe"),
    ...(review.queue || []).map((e) => item(`${e.studentName}`, `${e.status} • ${e.reasons.join(", ")}`, "warn"))
  ].join("");

  $("parentBox").innerHTML = [
    item("Auto Send", parent.autoSend ? "On" : "Off", parent.autoSend ? "warn" : "safe"),
    item("Draft", parent.draft || "Pending", "info"),
    item("Safety", parent.safety || "Confirmation required", "warn")
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part97/status");
    $("statusText").textContent = data.status === "active" ? "Recording Active" : "Status Loaded";
    $("statusSub").textContent = "Recording and attendance preview ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part97/vani/greeting");
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

async function ask(command) {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part97/vani/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(basePayload({ command: command || $("vaniCommand").value }))
    });
    renderResult(data);
  } catch (err) {
    $("vaniOutput").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
    if (err.data) renderResult(err.data);
  }
}

async function startLocalRecording() {
  $("vaniOutput").textContent = "Requesting camera/mic permission...";
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      $("vaniOutput").textContent = "MediaRecorder ya camera/mic browser support nahi mila.";
      return;
    }
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    $("previewVideo").srcObject = localStream;
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(localStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      $("recordingDownload").href = url;
      $("recordingDownload").style.display = "inline-block";
      $("vaniOutput").textContent = "Local recording preview ready. Cloud upload nahi hua.";
      window.NaxoraVaniVoice?.speak("Local recording preview ready hai. Cloud upload nahi hua.");
    };
    mediaRecorder.start();
    $("vaniOutput").textContent = "Local recording test started. Stop Local Test dabao.";
  } catch (err) {
    $("vaniOutput").textContent = `Local recording failed: ${err.message}`;
  }
}

function stopLocalRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (localStream) localStream.getTracks().forEach((track) => track.stop());
    $("previewVideo").srcObject = null;
  } catch (err) {
    $("vaniOutput").textContent = `Stop failed: ${err.message}`;
  }
}

async function listenAndReply() {
  $("vaniOutput").textContent = "Listening...";
  try {
    if (!window.NaxoraVaniVoice?.listenSupported()) {
      $("vaniOutput").textContent = "Mic speech recognition supported nahi hai. Command type karke Ask VANI dabao.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nThinking...`;
    await ask(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type command and press Ask VANI.`;
  }
}

function demo() {
  const command = "VANI, automatic attendance draft dikhao";
  $("vaniCommand").value = command;
  ask(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => ask());
$("demoBtn").addEventListener("click", demo);
$("startLocalRecBtn").addEventListener("click", startLocalRecording);
$("stopLocalRecBtn").addEventListener("click", stopLocalRecording);
$("roleSelect").addEventListener("change", () => ask());

loadStatus();
demo();
