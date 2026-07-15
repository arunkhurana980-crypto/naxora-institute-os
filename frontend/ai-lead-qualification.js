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

function renderResult(data) {
  const q = data.qualification || {};
  const lead = data.lead || {};
  const follow = data.followupPlan || {};
  const objection = data.objectionRisk || {};
  const assignment = data.assignmentPreview || {};
  const crm = data.crmPayloadPreview || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    category: q.category,
    score: q.score,
    nextAction: data.nextAction?.label,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("scoreBox").innerHTML = [
    item("Category", q.category || "pending", q.category || "nurture"),
    item("Score", `${q.score || 0}/100`, q.category || "nurture"),
    item("Priority", q.priority || "Pending", "safe"),
    item("Reasons", (q.reasons || []).join(", ") || "Need more details")
  ].join("");

  $("leadBox").innerHTML = [
    item("Student", lead.studentName || "Missing"),
    item("Class", lead.className || "Missing"),
    item("Subject/Course", lead.subject || lead.courseInterest || "Missing"),
    item("Phone", lead.parentPhone || "Missing"),
    item("Source", lead.source || "unknown"),
    item("Urgency", lead.urgency || "medium")
  ].join("");

  $("followupBox").innerHTML = [
    item("Next Step", follow.nextStep || "Pending", "safe"),
    item("Timeline", follow.timeline || "Pending", "safe"),
    item("Script Draft", follow.script || "Pending"),
    item("Auto Send", follow.autoSend ? "Enabled" : "Off — confirmation required", "warm")
  ].join("");

  $("objectionBox").innerHTML = [
    item("Risk Level", objection.level || "low", objection.level === "high" ? "hot" : objection.level === "medium" ? "warm" : "safe"),
    item("Summary", objection.summary || "No objection risk"),
    ...(objection.risks || []).map((r) => item(r.type, r.response, r.level === "high" ? "hot" : "warm"))
  ].join("");

  $("assignmentBox").innerHTML = [
    item("Assign To", assignment.assignTo || "Pending", "safe"),
    item("Reason", assignment.reason || "Preview only"),
    item("Owner Review", assignment.ownerReviewRecommended ? "Recommended" : "Not required", assignment.ownerReviewRecommended ? "warm" : "safe"),
    item("CRM Payload", `Stage: ${crm.stage || "preview"} • Save requires confirmation: ${crm.finalSaveRequiresConfirmation ? "yes" : "no"}`, "nurture")
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part93/status");
    $("statusText").textContent = data.status === "active" ? "Lead AI Active" : "Status Loaded";
    $("statusSub").textContent = "Lead qualification workflow ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadCriteria() {
  const data = await getJSON("/api/part93/criteria");
  $("criteriaBox").innerHTML = data.criteria.map((c) => item(c.label, `Weight: ${c.weight}`, "safe")).join("");
}

async function startVani() {
  try {
    const data = await getJSON("/api/part93/vani/greeting");
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

async function qualify(command) {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part93/vani/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: $("roleSelect").value,
        instituteId: $("instituteId").value,
        branchId: $("branchId").value,
        command: command || $("vaniCommand").value
      })
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
      $("vaniOutput").textContent = "Mic speech recognition supported nahi hai. Command type karke Qualify Lead dabao.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nThinking...`;
    await qualify(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type command and press Qualify Lead.`;
  }
}

function demo() {
  const command = "VANI, Aman Class 10 Maths lead WhatsApp se hai parent phone 9876543210 urgent demo chahiye";
  $("vaniCommand").value = command;
  qualify(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => qualify());
$("demoBtn").addEventListener("click", demo);
$("roleSelect").addEventListener("change", () => qualify());

loadStatus();
loadCriteria().catch(console.error);
demo();
