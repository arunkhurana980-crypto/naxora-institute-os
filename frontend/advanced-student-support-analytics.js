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
    batchId: $("batchId").value,
    teacherId: $("teacherId").value,
    studentId: $("studentId").value,
    ...extra
  };
}

function renderResult(data) {
  const dashboard = data.dashboard || {};
  const bands = dashboard.bands || {};
  const students = data.students || [];
  const score = data.selectedScorecard || {};
  const components = score.components || {};
  const gap = data.academicGapAnalysis || {};
  const engagement = data.engagementAnalysis || {};
  const plan = data.supportPlan || {};
  const parent = data.parentSummaryDraft || {};
  const scope = data.roleScopedSummary || {};
  const privacy = data.privacyPolicy || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    privateScreenFirst: data.privateScreenFirst,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("dashboardBox").innerHTML = [
    metric("Visible Students", dashboard.studentCount || 0),
    metric("Avg Support Score", dashboard.avgSupportScore || 0),
    metric("Stable", bands.stable || 0),
    metric("Watch", bands.watch || 0),
    metric("Support Needed", bands.support_needed || 0),
    metric("Urgent Review", bands.urgent_review || 0)
  ].join("");

  $("studentsBox").innerHTML = students.map((s) => item(
    `${s.name} — ${s.className}`,
    `${s.subjectFocus} • Attendance ${s.attendancePercent}% • Test ${s.testAvgPercent}% • Homework ${s.homeworkCompletionPercent}%`,
    s.testAvgPercent < 65 || s.attendancePercent < 75 ? "warn" : "safe"
  )).join("");

  $("scoreBox").innerHTML = [
    item("Student", score.displayName || "Pending", "info"),
    item("Support Score", `${score.supportScore || 0}/100`, (score.supportScore || 0) >= 70 ? "safe" : "warn"),
    item("Private Band", score.band || "pending", score.band === "stable" ? "safe" : "warn"),
    item("Attendance", `${components.attendanceScore || 0}`, "info"),
    item("Academic", `${components.academicScore || 0}`, "info"),
    item("Homework", `${components.homeworkScore || 0}`, "info"),
    ...((score.signals || []).map((s) => item("Signal", s, "warn")))
  ].join("");

  $("gapBox").innerHTML = [
    item("Student", gap.name || "Pending", "info"),
    ...((gap.gaps || []).map((g) => item(g.type, g.message, g.priority === "high" ? "warn" : "info"))),
    item("Teacher Review", gap.teacherReviewRequired ? "Required" : "Pending", "warn")
  ].join("");

  $("engagementBox").innerHTML = (engagement.items || []).map((e) =>
    item(e.type, e.message, e.status === "stable" ? "safe" : "warn")
  ).join("");

  $("planBox").innerHTML = [
    item("Can Create Plan", plan.canCreateSupportPlan ? "Yes" : "No", plan.canCreateSupportPlan ? "safe" : "block"),
    item("Student", plan.studentName || "Pending", "info"),
    ...((plan.steps || []).map((s, i) => item(`Step ${i + 1}`, s, "info"))),
    item("Auto Assign", plan.autoAssign ? "On" : "Off", plan.autoAssign ? "block" : "safe"),
    item("Confirmation", plan.confirmationRequired ? "Required" : "Pending", "warn")
  ].join("");

  $("parentBox").innerHTML = [
    item("Auto Send", parent.autoSend ? "On" : "Off", parent.autoSend ? "block" : "safe"),
    item("Draft", parent.draft || "Pending", "info"),
    item("Safety", parent.safety || "Teacher review required", "warn")
  ].join("");

  $("scopeBox").innerHTML = [
    item("Scope", scope.scope || "Pending", "info"),
    item("Visible Data", JSON.stringify(scope.visibleData || {}, null, 0).slice(0, 260), "safe"),
    ...((scope.hiddenData || []).slice(0, 5).map((h) => item("Hidden data", h, "warn")))
  ].join("");

  $("privacyBox").innerHTML = [
    item("Private Screen First", privacy.privateScreenFirst ? "Yes" : "No", privacy.privateScreenFirst ? "safe" : "block"),
    item("No Public Labels", privacy.noPublicLabels ? "Yes" : "No", privacy.noPublicLabels ? "safe" : "block"),
    item("Safety", privacy.safety || "Student data private", "warn"),
    ...((privacy.sensitiveDataNotSpokenLoudly || []).slice(0, 5).map((x) => item("Not spoken loudly", x, "block")))
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part105/status");
    $("statusText").textContent = data.status === "active" ? "Support Analytics Active" : "Status Loaded";
    $("statusSub").textContent = "Support scores, gaps and plans ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part105/vani/greeting");
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
    const data = await getJSON("/api/part105/vani/command", {
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
  const command = "VANI, Riya ka academic gap analysis banao aur support plan draft karo";
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
