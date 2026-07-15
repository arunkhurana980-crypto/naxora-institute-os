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
    city: $("city").value,
    className: $("className").value,
    subject: $("subject").value,
    demoOnly: "true",
    consent: true,
    ...extra
  };
}

function renderResult(data) {
  const search = data.searchResults || {};
  const catalog = data.courseCatalog || {};
  const compare = data.comparison || {};
  const listing = data.listingDraft || {};
  const lead = data.leadDraft || {};
  const trust = data.trustScore || {};
  const review = data.reviewModerationPreview || {};
  const approval = data.marketplaceApproval || {};
  const analytics = data.marketplaceAnalytics || {};
  const scope = data.roleScopedSummary || {};
  const privacy = data.privacyPolicy || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    noAutoPublish: data.noAutoPublish,
    noAutoAdmission: data.noAutoAdmission,
    ownerVerificationRequiredFor: data.ownerVerificationRequiredFor
  }, null, 2);

  $("searchBox").innerHTML = [
    item("Results", `${search.resultCount || 0} listings`, "info"),
    ...((search.results || []).map((i) => item(i.name, `${i.city} • Trust ${i.trustScore} • Rating ${i.ratingPreview} • ${i.highlights.join(", ")}`, i.publicStatus === "approved_preview" ? "safe" : "warn")))
  ].join("");

  $("coursesBox").innerHTML = (catalog.courses || []).map((c) =>
    item(c.title, `${c.instituteName} • ${c.className} ${c.subject} • ${c.mode} • ${c.publicFeeRange} • Demo ${c.demoAvailable ? "yes" : "no"}`, c.demoAvailable ? "safe" : "info")
  ).join("");

  $("compareBox").innerHTML = [
    item("Winner by Trust Score", compare.winnerByTrustScore ? compare.winnerByTrustScore.name : "Pending", "safe"),
    ...((compare.listings || []).map((l) => item(l.name, `Trust ${l.trustScore} • Rating ${l.ratingPreview} • Courses ${l.courseCount} • Demo ${l.demoCourses}`, "info")))
  ].join("");

  $("listingBox").innerHTML = [
    item("Can Manage Listing", listing.canManageListing ? "Yes" : "No", listing.canManageListing ? "safe" : "block"),
    item("Draft Name", listing.draft?.name || "Hidden", "info"),
    item("Public Summary", listing.draft?.publicSummary || "Hidden", "info"),
    item("Auto Publish", listing.autoPublish ? "On" : "Off", listing.autoPublish ? "block" : "safe"),
    item("Owner Verification", listing.ownerVerificationRequiredForPublish ? "Required" : "Pending", "warn")
  ].join("");

  $("leadBox").innerHTML = [
    item("Can Create Lead", lead.canCreateLead ? "Yes" : "No", lead.canCreateLead ? "safe" : "block"),
    item("Consent", lead.consent ? "Yes" : "No", lead.consent ? "safe" : "block"),
    item("Blocked If No Consent", lead.blockedIfNoConsent ? "Yes" : "No", lead.blockedIfNoConsent ? "block" : "safe"),
    item("Auto Admission", lead.autoBookAdmission ? "On" : "Off", lead.autoBookAdmission ? "block" : "safe"),
    item("Auto CRM Send", lead.autoSendToCRM ? "On" : "Off", lead.autoSendToCRM ? "block" : "safe")
  ].join("");

  $("trustBox").innerHTML = [
    item("Institute", trust.instituteName || "Pending", "info"),
    item("Trust Score", `${trust.trustScore || 0}`, (trust.trustScore || 0) >= 85 ? "safe" : "warn"),
    item("No Private Data Used", trust.noPrivateDataUsedInPublicScore ? "Yes" : "No", trust.noPrivateDataUsedInPublicScore ? "safe" : "block"),
    item("Review Moderation", review.moderationStatus || "Pending", "warn"),
    item("Review Auto Publish", review.autoPublish ? "On" : "Off", review.autoPublish ? "block" : "safe")
  ].join("");

  $("approvalBox").innerHTML = [
    item("Can Approve", approval.canApprovePublish ? "Yes" : "No", approval.canApprovePublish ? "safe" : "warn"),
    item("Auto Final Publish", approval.finalPublishAuto ? "On" : "Off", approval.finalPublishAuto ? "block" : "safe"),
    item("Public Data Only", privacy.publicDataOnly ? "Yes" : "No", privacy.publicDataOnly ? "safe" : "block"),
    item("No Auto Payment", privacy.noAutoPayment ? "Yes" : "No", privacy.noAutoPayment ? "safe" : "block"),
    ...((approval.checks || []).map((c) => item(c.key, c.status, c.status?.includes("pass") ? "safe" : "warn")))
  ].join("");

  $("analyticsBox").innerHTML = [
    item("Can View Leads", analytics.canViewLeads ? "Yes" : "No", analytics.canViewLeads ? "safe" : "block"),
    item("Listing Count", `${analytics.listingCount || 0}`, "info"),
    item("Lead Count", `${analytics.leadCount || 0}`, "info"),
    item("Callbacks Pending", `${analytics.callbacksPending || 0}`, "warn"),
    item("Private Lead Details Hidden", analytics.privateLeadDetailsHiddenForPublic ? "Yes" : "No", analytics.privateLeadDetailsHiddenForPublic ? "safe" : "block")
  ].join("");

  $("scopeBox").innerHTML = [
    item("Scope", scope.scope || "Pending", "info"),
    item("Visible Data", JSON.stringify(scope.visibleData || {}, null, 0).slice(0, 320), "safe"),
    ...((scope.hiddenData || []).slice(0, 5).map((h) => item("Hidden data", h, "warn")))
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part108/status");
    $("statusText").textContent = data.status === "active" ? "Marketplace Active" : "Status Loaded";
    $("statusSub").textContent = "Search, catalog, compare and leads ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part108/vani/greeting");
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
    const data = await getJSON("/api/part108/vani/command", {
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
  const command = "VANI, Delhi me Class 10 Maths institutes dhoondo aur compare karo";
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
