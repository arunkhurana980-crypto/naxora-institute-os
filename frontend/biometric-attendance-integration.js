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
    batchId: $("batchId").value,
    teacherId: $("teacherId").value,
    studentId: $("studentId").value,
    ...extra
  };
}

function renderResult(data) {
  const sync = data.syncPreview || {};
  const anomaly = data.anomalyReport || {};
  const merge = data.attendanceMergePreview || {};
  const summary = data.attendanceSummary || {};
  const connector = data.connectorReadiness || {};
  const privacy = data.privacyPolicy || {};
  const devices = data.devices || [];

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    vendorApiConnected: data.vendorApiConnected,
    rawBiometricStored: data.rawBiometricStored,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("devicesBox").innerHTML = devices.map((d) => item(
    `${d.deviceId} — ${d.location}`,
    `${d.vendor} • ${d.model} • ${d.status} • raw templates in NAXORA: ${d.storesRawTemplatesInNaxora ? "yes" : "no"}`,
    d.status?.includes("needed") ? "warn" : "safe"
  )).join("");

  $("syncBox").innerHTML = [
    item("Can Sync", sync.canSync ? "Yes" : "No", sync.canSync ? "safe" : "block"),
    item("Fetched Logs", `${sync.fetchedLogCountPreview || 0}`, "info"),
    item("Clean Logs", `${sync.cleanLogCountPreview || 0}`, "safe"),
    item("Anomalies", `${sync.anomalyCountPreview || 0}`, (sync.anomalyCountPreview || 0) ? "warn" : "safe"),
    item("Final Save", sync.finalSaveRequiresConfirmation ? "Confirmation required" : "Pending", "warn")
  ].join("");

  $("anomalyBox").innerHTML = [
    item("Manual Review", anomaly.manualReviewRequired ? "Required" : "Not required", anomaly.manualReviewRequired ? "warn" : "safe"),
    ...((anomaly.anomalies || []).map((a) => item(`${a.type} — ${a.level}`, a.message, a.level === "high" ? "block" : "warn")))
  ].join("");

  $("mergeBox").innerHTML = [
    item("Can Merge", merge.canMerge ? "Yes" : "No", merge.canMerge ? "safe" : "block"),
    item("Summary", `Present: ${merge.summary?.present || 0}, Late: ${merge.summary?.latePresent || 0}, Review: ${merge.summary?.reviewRequired || 0}, Blocked anomalies: ${merge.summary?.anomaliesBlocked || 0}`, "info"),
    ...((merge.entries || []).map((e) => item(`${e.name} — ${e.attendanceStatus}`, `${e.role} • ${e.punchTime} • ${e.reasons.join(", ")}`, e.reviewRequired ? "warn" : "safe")))
  ].join("");

  $("summaryBox").innerHTML = [
    item("Scope", summary.scope || "authorised", "info"),
    item("Visible Entries", `${summary.visibleEntries?.length || 0}`, "safe"),
    item("Private Screen", summary.privateScreenFirst ? "Yes" : "No", "warn"),
    ...((summary.visibleEntries || []).map((e) => item(e.name, `${e.attendanceStatus} • ${e.punchTime}`, e.reviewRequired ? "warn" : "safe")))
  ].join("");

  $("connectorBox").innerHTML = [
    item("Vendor", connector.vendor || "Pending", "info"),
    item("Mode", connector.connectionMode || "vendor_api_pending", "warn"),
    ...((connector.requiredSetup || []).map((s, i) => item(`Setup ${i + 1}`, s, "warn"))),
    item("Secrets in Chat", connector.secretsInChatAllowed ? "Allowed" : "Not allowed", connector.secretsInChatAllowed ? "block" : "safe")
  ].join("");

  $("privacyBox").innerHTML = [
    item("Raw Fingerprint Template", privacy.storesRawFingerprintTemplate ? "Stored" : "Not stored", privacy.storesRawFingerprintTemplate ? "block" : "safe"),
    item("Raw Face Template", privacy.storesRawFaceTemplate ? "Stored" : "Not stored", privacy.storesRawFaceTemplate ? "block" : "safe"),
    item("Consent", privacy.consentRequired ? "Required" : "Pending", "warn"),
    item("Safety", privacy.safety || "Privacy-first", "safe"),
    ...((privacy.safeDataStoredPreview || []).slice(0, 4).map((s) => item("Safe data", s, "info")))
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part99/status");
    $("statusText").textContent = data.status === "active" ? "Biometric Active" : "Status Loaded";
    $("statusSub").textContent = "Device sync and attendance merge preview ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part99/vani/greeting");
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
    const data = await getJSON("/api/part99/vani/command", {
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
  const command = "VANI, device sync preview banao aur duplicate anomaly check karo";
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
