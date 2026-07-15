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
    assignedBranchId: $("assignedBranchId").value,
    studentId: $("studentId").value,
    ...extra
  };
}

function renderResult(data) {
  const planner = data.campaignPlanner || {};
  const campaigns = data.campaigns || [];
  const segments = data.audienceSegments || {};
  const content = data.contentDraft || {};
  const schedule = data.schedulePreview || {};
  const budget = data.budgetRoiPreview || {};
  const consent = data.consentPolicy || {};
  const approval = data.approvalPreview || {};
  const action = data.actionPlan || {};
  const scope = data.roleScopedSummary || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    noAutoSend: data.noAutoSend,
    providerApisConnected: data.providerApisConnected,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("plannerBox").innerHTML = [
    item("Can Plan", planner.canPlanCampaign ? "Yes" : "No", planner.canPlanCampaign ? "safe" : "block"),
    item("Campaign", planner.campaignName || "Pending", "info"),
    item("Objective", planner.objective || "Pending", "info"),
    item("No Auto Send", planner.noAutoSend ? "Yes" : "No", planner.noAutoSend ? "safe" : "block")
  ].join("");

  $("campaignsBox").innerHTML = campaigns.map((c) => item(
    c.campaignName,
    `Status ${c.status} • Audience ${c.estimatedAudience ?? "hidden"} • Consent ${c.consentEligible ?? "hidden"} • Budget ${c.budgetPreview ?? "hidden"}`,
    c.status?.includes("approval") ? "warn" : "info"
  )).join("");

  $("segmentsBox").innerHTML = [
    item("Total Audience", `${segments.totalAudience || 0}`, "info"),
    item("Consent Eligible", `${segments.totalConsentEligible || 0}`, "safe"),
    ...((segments.segments || []).map((s) => item(s.name, `${s.description} • Size ${s.size} • Consent ${s.consentEligible}`, "info")))
  ].join("");

  $("contentBox").innerHTML = [
    item("Can Create Content", content.canCreateContent ? "Yes" : "No", content.canCreateContent ? "safe" : "block"),
    item("WhatsApp Draft", content.drafts?.whatsappDraft || "Hidden", "info"),
    item("SMS Draft", content.drafts?.smsDraft || "Hidden", "info"),
    item("Email Subject", content.drafts?.emailSubject || "Hidden", "info"),
    item("Auto Send", content.noAutoSend ? "Off" : "On", content.noAutoSend ? "safe" : "block")
  ].join("");

  $("scheduleBox").innerHTML = [
    item("Best Time", schedule.bestTimePreview || "Pending", "info"),
    item("Approval Before Scheduling", schedule.approvalRequiredBeforeScheduling ? "Required" : "Not required", "warn"),
    ...((schedule.steps || []).map((s) => item(`Day ${s.day}: ${s.channel}`, `${s.action} • autoSend ${s.autoSend}`, s.autoSend ? "block" : "safe")))
  ].join("");

  $("budgetBox").innerHTML = [
    item("Can View Budget", budget.canViewBudget ? "Yes" : "No", budget.canViewBudget ? "safe" : "block"),
    item("Budget", `${budget.budgetPreview ?? "hidden"}`, "info"),
    item("Expected Leads", `${budget.expectedLeads ?? "hidden"}`, "info"),
    item("Expected Admissions", `${budget.expectedAdmissions ?? "hidden"}`, "info"),
    item("ROI Multiple", `${budget.roiMultiplePreview ?? "hidden"}`, "warn"),
    item("Budget Auto Apply", budget.budgetAutoApply ? "On" : "Off", budget.budgetAutoApply ? "block" : "safe")
  ].join("");

  $("approvalBox").innerHTML = [
    item("Campaign", approval.campaignName || "Pending", "info"),
    item("Can Approve", approval.canApproveCampaign ? "Yes" : "No", approval.canApproveCampaign ? "safe" : "warn"),
    item("Bulk Send", approval.bulkSendStillDisabled ? "Still disabled" : "Enabled", approval.bulkSendStillDisabled ? "safe" : "block"),
    item("Consent First", consent.consentFirst ? "Yes" : "No", consent.consentFirst ? "safe" : "block"),
    item("DND Respect", consent.dndRespectRequired ? "Required" : "No", consent.dndRespectRequired ? "safe" : "block"),
    item("Secrets in Chat", consent.secretsInChatAllowed ? "Allowed" : "Not allowed", consent.secretsInChatAllowed ? "block" : "safe")
  ].join("");

  $("scopeBox").innerHTML = [
    item("Scope", scope.scope || "Pending", "info"),
    item("Visible Data", JSON.stringify(scope.visibleData || {}, null, 0).slice(0, 320), "safe"),
    ...((scope.hiddenData || []).slice(0, 5).map((h) => item("Hidden data", h, "warn")))
  ].join("");

  $("actionBox").innerHTML = [
    item("Can Create Action Plan", action.canCreateActionPlan ? "Yes" : "No", action.canCreateActionPlan ? "safe" : "block"),
    ...((action.actions || []).map((a, i) => item(`Action ${i + 1}`, a, "info"))),
    item("Auto Send", action.autoSend ? "On" : "Off", action.autoSend ? "block" : "safe"),
    item("Auto Budget Apply", action.autoBudgetApply ? "On" : "Off", action.autoBudgetApply ? "block" : "safe")
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part107/status");
    $("statusText").textContent = data.status === "active" ? "Marketing Active" : "Status Loaded";
    $("statusSub").textContent = "Campaign planning, drafts and approval preview ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part107/vani/greeting");
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
    const data = await getJSON("/api/part107/vani/command", {
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
  const command = "VANI, demo class campaign plan banao aur WhatsApp draft ready karo";
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
