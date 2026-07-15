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
    studentId: $("studentId").value,
    ...extra
  };
}

function renderResult(data) {
  const score = data.selectedScorecard || {};
  const scores = score.scores || {};
  const ranking = data.ranking || {};
  const peer = data.peerBenchmark || {};
  const gap = data.gapAnalysis || {};
  const target = data.targetPreview || {};
  const practices = data.bestPractices || {};
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

  $("scoreBox").innerHTML = [
    metric("Composite", scores.compositeScore || 0),
    metric("Grade", score.grade || "-"),
    metric("Growth", scores.growthScore || 0),
    metric("Finance", scores.financeScore || 0),
    metric("Academic", scores.academicScore || 0),
    metric("Operations", scores.operationScore || 0)
  ].join("");

  $("rankingBox").innerHTML = [
    item("Can Benchmark All", ranking.canBenchmarkAll ? "Yes" : "Assigned branch only", ranking.canBenchmarkAll ? "safe" : "warn"),
    item("Top Branch", ranking.topBranch ? `${ranking.topBranch.branchName} • ${ranking.topBranch.scorecard.scores.compositeScore}` : "Pending", "safe"),
    ...((ranking.rankedBranches || []).map((b, i) => item(`#${i + 1} ${b.branchName}`, `Score ${b.scorecard.scores.compositeScore} • Grade ${b.scorecard.grade} • Risk ${b.scorecard.riskLevel}`, b.scorecard.risks.length ? "warn" : "safe")))
  ].join("");

  $("peerBox").innerHTML = [
    item("Peer Group", peer.sizeBand || "Pending", "info"),
    item("Below Peer", `${peer.belowPeerCount || 0} metrics`, (peer.belowPeerCount || 0) ? "warn" : "safe"),
    ...((peer.metrics || []).map((m) => item(m.metric, `Branch ${m.branchValue} vs peer ${m.peerBenchmark} • gap ${m.gap}`, m.status === "above_peer" ? "safe" : "warn")))
  ].join("");

  $("gapBox").innerHTML = [
    item("Compared With", gap.comparedWith || "peer benchmark", "info"),
    ...((gap.priorityGaps || []).map((g) => item(g.area, `Current ${g.current}${g.unit} • Benchmark ${g.benchmark}${g.unit} • Improve ${g.improvementNeeded}`, "warn")))
  ].join("");

  $("targetBox").innerHTML = [
    item("Can Set Target Preview", target.canSetTargetsPreview ? "Yes" : "No", target.canSetTargetsPreview ? "safe" : "block"),
    item("Auto Apply", target.autoApply ? "On" : "Off", target.autoApply ? "block" : "safe"),
    ...Object.entries(target.suggestedTargets || {}).map(([k, v]) => item(k, `${v}`, "info")),
    item("Final Change", target.finalTargetChangeRequiresOwnerConfirmation ? "Owner confirmation required" : "Pending", "warn")
  ].join("");

  $("practiceBox").innerHTML = [
    item("Model Branch", practices.modelBranch || "Pending", "safe"),
    ...((practices.practices || []).map((p, i) => item(`Practice ${i + 1}`, p, "info"))),
    item("Auto Assign", practices.autoAssign ? "On" : "Off", practices.autoAssign ? "block" : "safe")
  ].join("");

  $("actionBox").innerHTML = [
    item("Can Create Plan", action.canCreateActionPlan ? "Yes" : "No", action.canCreateActionPlan ? "safe" : "block"),
    ...((action.plan || []).map((p) => item(`Step ${p.step}: ${p.area}`, p.action, "info"))),
    item("Auto Send", action.autoSend ? "On" : "Off", action.autoSend ? "block" : "safe")
  ].join("");

  $("scopeBox").innerHTML = [
    item("Scope", scope.scope || "Pending", "info"),
    item("Visible Data", JSON.stringify(scope.visibleData || {}, null, 0).slice(0, 220), "safe"),
    ...((scope.hiddenData || []).slice(0, 5).map((h) => item("Hidden data", h, "warn")))
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
    const data = await getJSON("/api/part104/status");
    $("statusText").textContent = data.status === "active" ? "Benchmarking Active" : "Status Loaded";
    $("statusSub").textContent = "Ranking, peer benchmark and gap analysis ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part104/vani/greeting");
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
    const data = await getJSON("/api/part104/vani/command", {
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
  const command = "VANI, branches rank karo aur South branch gap analysis banao";
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
