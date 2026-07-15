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
  const boards = data.boards || [];
  const health = data.boardHealth || {};
  const connector = data.connectorReadiness || {};
  const cast = data.castPreview || {};
  const wb = data.whiteboardSyncPreview || {};
  const lesson = data.lessonModePreview || {};
  const privacy = data.privacyPolicy || {};
  const asset = data.assetSummary || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    vendorApiConnected: data.vendorApiConnected,
    realHardwareConnected: data.realHardwareConnected,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("boardsBox").innerHTML = boards.map((b) => item(
    `${b.boardName} — ${b.classroomName}`,
    `${b.vendor} • ${b.model} • ${b.status} • ${b.connectionMode}`,
    b.status?.includes("online") ? "safe" : "warn"
  )).join("");

  $("healthBox").innerHTML = [
    item("Health Score", `${health.healthScorePreview || 0}/100`, (health.healthScorePreview || 0) >= 80 ? "safe" : "warn"),
    item("Online", health.onlinePreview ? "Yes" : "Needs check", health.onlinePreview ? "safe" : "block"),
    item("Touch", health.touchReady ? "Ready" : "Not ready", health.touchReady ? "safe" : "warn"),
    item("Stylus", health.stylusReady ? "Ready" : "Needs setup", health.stylusReady ? "safe" : "warn"),
    item("Recommendation", health.recommendation || "Check board", "info"),
    ...((health.issues || []).map((issue) => item("Issue", issue, "warn")))
  ].join("");

  $("connectorBox").innerHTML = [
    item("Vendor", connector.vendor || "Pending", "info"),
    item("Mode", connector.connectionMode || "pending", "warn"),
    item("Browser Cast", connector.readiness?.browserCast || "pending", "info"),
    item("Vendor API", connector.readiness?.vendorApi || "pending", "warn"),
    item("Secrets in Chat", connector.secretsInChatAllowed ? "Allowed" : "Not allowed", connector.secretsInChatAllowed ? "block" : "safe")
  ].join("");

  $("castBox").innerHTML = [
    item("Can Cast", cast.canCast ? "Yes" : "No", cast.canCast ? "safe" : "block"),
    item("Cast Session", cast.castSessionId || "Pending", "info"),
    item("Browser Permission", cast.browserPermissionRequired ? "Required" : "Not required", "warn"),
    item("Final Display", cast.finalDisplayRequiresConfirmation ? "Confirmation required" : "Pending", "warn")
  ].join("");

  $("whiteboardBox").innerHTML = [
    item("Can Sync", wb.canSync ? "Yes" : "No", wb.canSync ? "safe" : "block"),
    item("Source", wb.source || "Part95 whiteboard", "info"),
    item("Pages", `${wb.pages || 0}`, "info"),
    item("Strokes", `${wb.strokes || 0}`, "info"),
    item("Final Sync", wb.confirmationRequired ? "Confirmation required" : "Pending", "warn")
  ].join("");

  $("lessonBox").innerHTML = [
    item("Lesson", lesson.title || "Pending", "safe"),
    item("Layout", `${lesson.layoutPreview?.leftPanel || ""} | ${lesson.layoutPreview?.centerPanel || ""} | ${lesson.layoutPreview?.rightPanel || ""}`, "info"),
    ...((lesson.slidesPreview || []).map((s) => item(`Slide ${s.slideNo}: ${s.title}`, s.content, "info"))),
    item("Confirmation", lesson.confirmationRequired ? "Required" : "Pending", "warn")
  ].join("");

  $("privacyBox").innerHTML = [
    item("Asset Summary", `${asset.boardName || "Board"} • ${asset.status || "status"}`, "info"),
    item("Cost Data", asset.costSensitiveDataHidden ? "Hidden" : "Visible", asset.costSensitiveDataHidden ? "safe" : "warn"),
    item("Public Display Safety", privacy.publicDisplaySafety ? "On" : "Off", privacy.publicDisplaySafety ? "safe" : "block"),
    item("Safety", privacy.safety || "Private screen first", "warn"),
    ...((privacy.sensitiveDataBlockedOnBoard || []).slice(0, 4).map((x) => item("Blocked on board", x, "block")))
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part100/status");
    $("statusText").textContent = data.status === "active" ? "Digital Board Active" : "Status Loaded";
    $("statusSub").textContent = "Board health, cast and lesson mode preview ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part100/vani/greeting");
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
    const data = await getJSON("/api/part100/vani/command", {
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
  const command = "VANI, digital board health check karo aur lesson mode preview ready karo";
  $("vaniCommand").value = command;
  ask(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => ask());
$("demoBtn").addEventListener("click", demo);
$("roleSelect").addEventListener("change", () => ask());

loadStatus();
demo();
