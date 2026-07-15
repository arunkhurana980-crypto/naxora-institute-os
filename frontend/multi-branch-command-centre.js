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

function metric(label, value) {
  return `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`;
}

function basePayload(extra = {}) {
  return {
    role: $("roleSelect").value,
    instituteId: $("instituteId").value,
    branchId: $("branchId").value,
    assignedBranchId: $("assignedBranchId").value,
    teacherId: $("teacherId").value,
    studentId: $("studentId").value,
    ...extra
  };
}

function renderResult(data) {
  const dashboard = data.dashboard || {};
  const totals = dashboard.totals || {};
  const branches = data.branches || [];
  const comparison = data.comparison || {};
  const alerts = data.alerts || {};
  const action = data.actionPlan || {};
  const scope = data.roleScopedSummary || {};
  const privacy = data.privacyPolicy || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    privateScreenFirst: data.privateScreenFirst,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("kpiBox").innerHTML = [
    metric("Visible Branches", dashboard.branchCount || 0),
    metric("Students", totals.students || 0),
    metric("Admissions This Month", totals.admissionsThisMonth || 0),
    metric("Pending Follow-ups", totals.pendingFollowups || 0),
    metric("Avg Fee Collection", `${totals.avgFeeCollectionPercent || 0}%`),
    metric("Avg Attendance", `${totals.avgAttendancePercent || 0}%`)
  ].join("");

  $("branchesBox").innerHTML = branches.map((b) => item(
    `${b.branchName} — ${b.city}`,
    `Students ${b.students} • Fees ${b.feeCollectionPercent}% • Attendance ${b.attendancePercent}% • Devices ${b.deviceReadinessPercent}%`,
    b.status?.includes("needs") ? "warn" : "safe"
  )).join("");

  $("comparisonBox").innerHTML = [
    item("Can Compare", comparison.canCompare ? "Yes" : "No", comparison.canCompare ? "safe" : "warn"),
    item("Best Branch", comparison.bestBranch ? `${comparison.bestBranch.branchName} • Score ${comparison.bestBranch.health.healthScore}` : "Not enough data", "safe"),
    ...((comparison.rankedBranches || []).map((b, i) => item(`#${i + 1} ${b.branchName}`, `Score ${b.health.healthScore} • Grade ${b.health.grade} • Issues: ${b.health.issues.join(", ") || "none"}`, b.health.issues.length ? "warn" : "safe")))
  ].join("");

  $("alertsBox").innerHTML = [
    item("Alert Count", `${alerts.alertCount || 0} total • ${alerts.highPriorityCount || 0} high priority`, (alerts.highPriorityCount || 0) ? "warn" : "safe"),
    ...((alerts.alerts || []).map((a) => item(`${a.branchName} — ${a.type}`, a.message, a.level === "high" ? "block" : "warn")))
  ].join("");

  $("actionBox").innerHTML = [
    item("Can Create Plan", action.canCreateActionPlan ? "Yes" : "No", action.canCreateActionPlan ? "safe" : "block"),
    item("Branch", action.branchName || "Pending", "info"),
    item("Health", action.health ? `${action.health.healthScore}/100 • Grade ${action.health.grade}` : "Pending", "warn"),
    ...((action.actionPlan || []).map((a, i) => item(`Step ${i + 1}`, a, "info"))),
    item("Auto Send", action.autoSend ? "On" : "Off", action.autoSend ? "block" : "safe")
  ].join("");

  $("scopeBox").innerHTML = [
    item("Scope", scope.scope || "Pending", "info"),
    item("Visible Records", `${scope.visibleData?.length || 0}`, "safe"),
    ...((scope.hiddenData || []).slice(0, 4).map((h) => item("Hidden data", h, "warn")))
  ].join("");

  $("privacyBox").innerHTML = [
    item("Private Screen First", privacy.privateScreenFirst ? "Yes" : "No", privacy.privateScreenFirst ? "safe" : "block"),
    item("Safety", privacy.safety || "Sensitive details private", "warn"),
    ...((privacy.sensitiveDataNotSpokenLoudly || []).slice(0, 5).map((x) => item("Not spoken loudly", x, "block"))),
    ...((privacy.allowedVoiceSummary || []).slice(0, 3).map((x) => item("Voice allowed", x, "safe")))
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part102/status");
    $("statusText").textContent = data.status === "active" ? "Branch Centre Active" : "Status Loaded";
    $("statusSub").textContent = "Branch KPIs, alerts and comparison preview ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part102/vani/greeting");
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
    const data = await getJSON("/api/part102/vani/command", {
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
  const command = "VANI, branches compare karo aur high priority alerts batao";
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
