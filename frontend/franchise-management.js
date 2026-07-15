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
    franchiseId: $("franchiseId").value,
    assignedFranchiseId: $("assignedFranchiseId").value,
    branchId: $("branchId").value,
    studentId: $("studentId").value,
    ...extra
  };
}

function renderResult(data) {
  const dashboard = data.dashboard || {};
  const totals = dashboard.totals || {};
  const franchises = data.franchises || [];
  const perf = data.performancePreview || {};
  const onboard = data.onboardingPreview || {};
  const compliance = data.compliancePreview || {};
  const royalty = data.royaltyPreview || {};
  const brand = data.brandAssetPreview || {};
  const support = data.supportTicketPreview || {};
  const renewal = data.renewalRiskPreview || {};
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
    metric("Visible Franchises", dashboard.franchiseCount || 0),
    metric("Students", totals.students || 0),
    metric("Admissions This Month", totals.admissionsThisMonth || 0),
    metric("Open Enquiries", totals.enquiriesOpen || 0),
    metric("Royalty Due Preview", totals.royaltyDuePreview || 0),
    metric("Avg Compliance", `${totals.avgCompliancePercent || 0}%`)
  ].join("");

  $("franchisesBox").innerHTML = franchises.map((f) => item(
    `${f.franchiseName} — ${f.city}`,
    `Stage ${f.onboardingStage} • Students ${f.students} • Compliance ${f.compliancePercent}% • Royalty ${f.royaltyStatus}`,
    f.status?.includes("needs") ? "warn" : f.status?.includes("onboarding") ? "info" : "safe"
  )).join("");

  $("performanceBox").innerHTML = [
    item("Best Franchise", perf.bestFranchise ? `${perf.bestFranchise.franchiseName} • Score ${perf.bestFranchise.performance.score}` : "Pending", "safe"),
    ...((perf.rankedFranchises || []).map((f, i) => item(`#${i + 1} ${f.franchiseName}`, `Score ${f.performance.score} • Grade ${f.performance.grade} • Issues: ${f.performance.issues.join(", ") || "none"}`, f.performance.issues.length ? "warn" : "safe")))
  ].join("");

  $("onboardingBox").innerHTML = [
    item("Can Onboard", onboard.canOnboard ? "Yes" : "View only", onboard.canOnboard ? "safe" : "warn"),
    item("Current Stage", onboard.currentStage || "Pending", "info"),
    ...((onboard.stages || []).map((s) => item(s.name, `Status ${s.status} • Required: ${s.required.join(", ")}`, s.status?.includes("completed") ? "safe" : s.status?.includes("current") ? "warn" : "info")))
  ].join("");

  $("complianceBox").innerHTML = [
    item("Compliance Score", `${compliance.compliancePercent || 0}%`, (compliance.compliancePercent || 0) >= 80 ? "safe" : "warn"),
    item("Failed/Review Checks", `${compliance.failedCount || 0}`, (compliance.failedCount || 0) ? "warn" : "safe"),
    ...((compliance.checks || []).map((c) => item(c.label, c.status, c.status === "pass_preview" ? "safe" : "warn"))),
    item("Auto Notice", compliance.finalNoticeAutoSend ? "On" : "Off", compliance.finalNoticeAutoSend ? "block" : "safe")
  ].join("");

  $("royaltyBox").innerHTML = [
    item("Can View Royalty", royalty.canViewRoyalty ? "Yes" : "No", royalty.canViewRoyalty ? "safe" : "block"),
    item("Royalty Due", `${royalty.royaltyDuePreview ?? "hidden"}`, "info"),
    item("Auto Charge", royalty.autoCharge ? "On" : "Off", royalty.autoCharge ? "block" : "safe"),
    item("Brand Status", brand.brandAssetStatus || "Pending", brand.brandAssetStatus?.includes("approved") ? "safe" : "warn"),
    ...((brand.accessibleAssets || []).slice(0, 4).map((a) => item("Accessible asset", a, "info"))),
    ...((brand.lockedAssets || []).slice(0, 3).map((a) => item("Locked asset", a, "warn")))
  ].join("");

  $("supportBox").innerHTML = [
    item("Can Create Support Plan", support.canCreateSupportPlan ? "Yes" : "No", support.canCreateSupportPlan ? "safe" : "block"),
    item("Ticket Priority", support.priority || "Pending", support.priority?.includes("high") ? "warn" : "info"),
    ...((support.suggestedActions || []).map((a, i) => item(`Action ${i + 1}`, a, "info"))),
    item("Renewal Risk", renewal.renewalRisk || "Pending", renewal.reviewRecommended ? "warn" : "safe"),
    ...((renewal.riskFactors || []).map((r) => item("Risk factor", r, "warn")))
  ].join("");

  $("scopeBox").innerHTML = [
    item("Scope", scope.scope || "Pending", "info"),
    item("Visible Data", JSON.stringify(scope.visibleData || {}, null, 0).slice(0, 220), "safe"),
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
    const data = await getJSON("/api/part103/status");
    $("statusText").textContent = data.status === "active" ? "Franchise Active" : "Status Loaded";
    $("statusSub").textContent = "Franchise onboarding, compliance and royalty preview ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part103/vani/greeting");
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
    const data = await getJSON("/api/part103/vani/command", {
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
  const command = "VANI, franchise performance compare karo aur South franchise compliance check karo";
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
