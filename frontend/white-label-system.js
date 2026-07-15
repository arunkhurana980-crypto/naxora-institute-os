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
    customDomain: $("customDomain").value,
    primaryColor: $("primaryColor").value,
    accentColor: $("accentColor").value,
    ...extra
  };
}

function renderResult(data) {
  const brand = data.brandProfile || {};
  const theme = data.themePreview || {};
  const domain = data.customDomainPreview || {};
  const portal = data.portalBrandingPreview || {};
  const communication = data.communicationBrandingPreview || {};
  const app = data.mobileAppBrandingPreview || {};
  const marketplace = data.marketplaceBrandingPreview || {};
  const approval = data.approvalWorkflow || {};
  const security = data.securityPolicy || {};
  const scope = data.roleScopedSummary || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    noAutoDnsChange: data.noAutoDnsChange,
    noAutoSslIssue: data.noAutoSslIssue,
    noAutoPublicPublish: data.noAutoPublicPublish,
    ownerVerificationRequiredFor: data.ownerVerificationRequiredFor
  }, null, 2);

  $("brandBox").innerHTML = [
    item("Can Manage Brand", brand.canManageBrand ? "Yes" : "No", brand.canManageBrand ? "safe" : "warn"),
    item("Public Brand", brand.profile?.publicBrandName || "Pending", "info"),
    item("Tagline", brand.profile?.tagline || "Pending", "info"),
    item("Logo", brand.profile?.logoStatus || "Pending", "info"),
    item("Auto Publish", brand.autoPublish ? "On" : "Off", brand.autoPublish ? "block" : "safe")
  ].join("");

  $("themeBox").innerHTML = [
    item("Primary Color", theme.primaryColor || "Pending", "info"),
    item("Accent Color", theme.accentColor || "Pending", "info"),
    item("Background", theme.backgroundMode || "Pending", "info"),
    item("Auto Apply", theme.autoApply ? "On" : "Off", theme.autoApply ? "block" : "safe"),
    ...((theme.accessibilityChecks || []).map((c) => item(c.key, `${c.status} • ${c.note}`, c.status === "pass_preview" ? "safe" : "warn")))
  ].join("");

  $("domainBox").innerHTML = [
    item("Custom Domain", domain.customDomain || "Pending", "info"),
    item("Domain Status", domain.domainStatus || "Pending", "warn"),
    item("SSL Status", domain.sslStatus || "Pending", "warn"),
    item("Auto DNS Change", domain.autoDnsChange ? "On" : "Off", domain.autoDnsChange ? "block" : "safe"),
    item("Auto SSL Issue", domain.autoSslIssue ? "On" : "Off", domain.autoSslIssue ? "block" : "safe"),
    ...((domain.dnsChecklist || []).map((d) => item(`${d.type} ${d.host}`, `${d.value} • ${d.status}`, "warn")))
  ].join("");

  $("portalBox").innerHTML = [
    item("Brand Name", portal.brandName || "Pending", "info"),
    item("Private Data Hidden", portal.privateInstituteDataHidden ? "Yes" : "No", portal.privateInstituteDataHidden ? "safe" : "block"),
    item("Auto Apply", portal.autoApply ? "On" : "Off", portal.autoApply ? "block" : "safe"),
    ...((portal.portals || []).map((p) => item(p.portal, `${p.title} • visibleTo ${p.visibleTo}`, "info")))
  ].join("");

  $("communicationBox").innerHTML = [
    item("Sender Name", communication.senderName || "Pending", "info"),
    item("Sender Domain", communication.senderDomain || "Pending", "info"),
    item("Sender Status", communication.senderStatus || "Pending", "warn"),
    item("Provider Keys Included", communication.providerKeysIncluded ? "Yes" : "No", communication.providerKeysIncluded ? "block" : "safe"),
    item("No Auto Send", communication.noAutoSend ? "Yes" : "No", communication.noAutoSend ? "safe" : "block")
  ].join("");

  $("appBox").innerHTML = [
    item("Mobile App", app.appName || "Pending", "info"),
    item("App Icon", app.appIconStatus || "Pending", "warn"),
    item("Auto Store Publish", app.autoStorePublish ? "On" : "Off", app.autoStorePublish ? "block" : "safe"),
    item("Marketplace Brand", marketplace.listingCard?.publicBrandName || "Pending", "info"),
    item("Marketplace Auto Publish", marketplace.autoPublish ? "On" : "Off", marketplace.autoPublish ? "block" : "safe")
  ].join("");

  $("securityBox").innerHTML = [
    item("Can Approve", approval.canApprovePublish ? "Yes" : "No", approval.canApprovePublish ? "safe" : "warn"),
    item("Final Publish Auto", approval.finalPublishAuto ? "On" : "Off", approval.finalPublishAuto ? "block" : "safe"),
    item("No Secrets In Source", security.noSecretsInSource ? "Yes" : "No", security.noSecretsInSource ? "safe" : "block"),
    item("No Auto DNS", security.noAutoDnsChange ? "Yes" : "No", security.noAutoDnsChange ? "safe" : "block"),
    item("No Auto SSL", security.noAutoSslIssue ? "Yes" : "No", security.noAutoSslIssue ? "safe" : "block"),
    ...((security.sensitiveDataNotSpokenLoudly || []).slice(0, 4).map((s) => item("Not spoken loudly", s, "block")))
  ].join("");

  $("scopeBox").innerHTML = [
    item("Scope", scope.scope || "Pending", "info"),
    item("Visible Data", JSON.stringify(scope.visibleData || {}, null, 0).slice(0, 360), "safe"),
    ...((scope.hiddenData || []).slice(0, 5).map((h) => item("Hidden data", h, "warn")))
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part109/status");
    $("statusText").textContent = data.status === "active" ? "White-Label Active" : "Status Loaded";
    $("statusSub").textContent = "Brand, theme, domain and portal preview ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part109/vani/greeting");
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
    const data = await getJSON("/api/part109/vani/command", {
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
  const command = "VANI, white-label theme preview banao aur custom domain checklist dikhao";
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
