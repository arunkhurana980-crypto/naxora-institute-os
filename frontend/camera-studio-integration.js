const $ = (id) => document.getElementById(id);
let localCameraStream = null;

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
    classroomId: $("classroomId").value,
    batchId: $("batchId").value,
    teacherId: $("teacherId").value,
    ...extra
  };
}

function renderResult(data) {
  const devices = data.devices || [];
  const readiness = data.studioReadiness || {};
  const quality = data.streamQualityPreview || {};
  const audio = data.audioCheckPreview || {};
  const scene = data.studioScenePreview || {};
  const preset = data.recordingPresetPreview || {};
  const privacy = data.privacyPolicy || {};
  const asset = data.assetSummary || {};
  const cameraPolicy = data.cameraPreviewPolicy || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    browserPermissionRequired: data.browserPermissionRequired,
    vendorApiConnected: data.vendorApiConnected,
    realHardwareConnected: data.realHardwareConnected,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("devicesBox").innerHTML = devices.map((d) => item(
    `${d.deviceName} — ${d.deviceType}`,
    `${d.vendor} • ${d.model} • ${d.status} • permission: ${d.needsPermission ? "required" : "no"}`,
    d.status?.includes("ready") ? "safe" : "warn"
  )).join("");

  $("readinessBox").innerHTML = [
    item("Readiness Score", `${readiness.readinessScorePreview || 0}/100`, (readiness.readinessScorePreview || 0) >= 80 ? "safe" : "warn"),
    item("Ready Devices", `${readiness.readyDevices || 0}/${readiness.totalDevices || 0}`, "info"),
    ...(readiness.checklist || []).map((c) => item(c.key, c.message, c.status?.includes("ready") ? "safe" : "warn")),
    item("Camera Auto Start", cameraPolicy.noAutoStart ? "Off" : "On", cameraPolicy.noAutoStart ? "safe" : "block")
  ].join("");

  $("qualityBox").innerHTML = [
    item("Audio Check", audio.canCheck ? "Allowed" : "Not allowed", audio.canCheck ? "safe" : "block"),
    item("Mic Permission", audio.micPermissionRequired ? "Required" : "Not required", "warn"),
    item("Recommended Quality", quality.recommendedQuality || "720p", "safe"),
    item("Upload Preview", `${quality.uploadMbpsPreview || 0} Mbps`, "info"),
    ...(quality.presets || []).map((p) => item(p.quality, `Min upload: ${p.minUploadMbps} Mbps • ${p.recommendedFor}`, "info"))
  ].join("");

  $("sceneBox").innerHTML = [
    item("Can Prepare Scene", scene.canPrepareScene ? "Yes" : "No", scene.canPrepareScene ? "safe" : "block"),
    item("Scene", scene.scene?.title || "Pending", "safe"),
    ...(scene.scene?.layers || []).map((l) => item(l.layer, `${l.position} • ${l.visibility}`, "info")),
    item("Final Start", scene.finalStartPending ? "Pending confirmation" : "Ready", "warn")
  ].join("");

  $("presetBox").innerHTML = [
    item("Can Apply Preset", preset.canApplyPreset ? "Yes" : "No", preset.canApplyPreset ? "safe" : "block"),
    item("Quality", preset.quality || "720p", "info"),
    item("Camera", preset.settings?.camera || "preview", "info"),
    item("Recording", preset.noAutoRecording ? "Auto recording off" : "Auto recording on", preset.noAutoRecording ? "safe" : "block"),
    item("Streaming", preset.noAutoStreaming ? "Auto streaming off" : "Auto streaming on", preset.noAutoStreaming ? "safe" : "block")
  ].join("");

  $("privacyBox").innerHTML = [
    item("Asset Summary", `${asset.deviceName || "Studio device"} • ${asset.status || "status"}`, "info"),
    item("Cost Data", asset.costSensitiveDataHidden ? "Hidden" : "Visible", asset.costSensitiveDataHidden ? "safe" : "warn"),
    item("Camera Auto Start", privacy.cameraAutoStart ? "On" : "Off", privacy.cameraAutoStart ? "block" : "safe"),
    item("Mic Auto Start", privacy.microphoneAutoStart ? "On" : "Off", privacy.microphoneAutoStart ? "block" : "safe"),
    item("Safety", privacy.safety || "Private screen first", "warn"),
    ...((privacy.blockedOnStream || []).slice(0, 4).map((x) => item("Blocked on stream", x, "block")))
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part101/status");
    $("statusText").textContent = data.status === "active" ? "Camera Studio Active" : "Status Loaded";
    $("statusSub").textContent = "Camera, mic and studio preview ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startLocalCamera() {
  $("vaniOutput").textContent = "Requesting browser camera/mic permission...";
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      $("vaniOutput").textContent = "Browser camera API supported nahi hai.";
      return;
    }
    localCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    });
    $("cameraPreview").srcObject = localCameraStream;
    $("vaniOutput").textContent = "Local camera preview started. Cloud stream/recording start nahi hua.";
    window.NaxoraVaniVoice?.speak("Local camera preview started. Cloud stream nahi hua.");
  } catch (err) {
    $("vaniOutput").textContent = `Camera preview failed: ${err.message}`;
  }
}

function stopLocalCamera() {
  if (localCameraStream) localCameraStream.getTracks().forEach((track) => track.stop());
  localCameraStream = null;
  $("cameraPreview").srcObject = null;
  $("vaniOutput").textContent = "Local camera preview stopped.";
}

async function startVani() {
  try {
    const data = await getJSON("/api/part101/vani/greeting");
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
    const data = await getJSON("/api/part101/vani/command", {
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
  const command = "VANI, camera readiness check karo aur studio scene layout ready karo";
  $("vaniCommand").value = command;
  ask(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => ask());
$("demoBtn").addEventListener("click", demo);
$("startCameraBtn").addEventListener("click", startLocalCamera);
$("stopCameraBtn").addEventListener("click", stopLocalCamera);
$("roleSelect").addEventListener("change", () => ask());

loadStatus();
demo();
