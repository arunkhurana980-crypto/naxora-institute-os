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
  const materials = data.sessionMaterials || {};
  const notes = data.notes || {};
  const summary = data.summary || {};
  const homework = data.homeworkDraft || {};
  const quiz = data.quizDraft || {};
  const revision = data.revisionNotes || {};
  const parent = data.parentSummaryDraft || {};
  const review = data.teacherReviewPreview || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    externalAIConnected: data.externalAIConnected,
    ruleBasedFoundation: data.ruleBasedFoundation,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("sessionBox").innerHTML = [
    item("Session", materials.title || "Pending", "safe"),
    item("Subject", `${materials.className || ""} ${materials.subject || ""}`.trim() || "Pending"),
    item("Content Signals", `Transcript: ${materials.transcriptPreview?.length || 0}, Chat: ${materials.chatHighlights?.length || 0}, Polls: ${materials.pollHighlights?.length || 0}`, "info"),
    item("Attendance Context", `Present ${materials.attendanceSummaryPreview?.present || 0}, Review ${materials.attendanceSummaryPreview?.review || 0}`, "warn")
  ].join("");

  $("notesBox").innerHTML = [
    item("Title", notes.title || "Pending", "safe"),
    ...(notes.sections || []).map((s) => item(s.heading, s.content, "info")),
    item("Safety", notes.safety || "Teacher review required", "warn")
  ].join("");

  $("summaryBox").innerHTML = [
    item("Short Summary", summary.shortSummary || "Pending", "safe"),
    ...((summary.detailedSummary || []).map((s, i) => item(`Point ${i + 1}`, s, "info"))),
    item("Publish", summary.publishRequiresConfirmation ? "Confirmation required" : "Pending", "warn")
  ].join("");

  $("homeworkBox").innerHTML = [
    item("Auto Assign", homework.autoAssign ? "On" : "Off", homework.autoAssign ? "warn" : "safe"),
    ...((homework.homework || []).map((h, i) => item(`Task ${i + 1}`, h, "info"))),
    item("Due", homework.dueDatePreview || "Next class", "warn")
  ].join("");

  $("quizBox").innerHTML = [
    item("Auto Create Test", quiz.autoCreateTest ? "On" : "Off", quiz.autoCreateTest ? "warn" : "safe"),
    ...((quiz.questions || []).map((q, i) => item(`Q${i + 1}: ${q.type}`, q.question, "info")))
  ].join("");

  $("revisionBox").innerHTML = [
    item("Title", revision.title || "Pending", "safe"),
    ...((revision.bullets || []).map((b, i) => item(`Revision ${i + 1}`, b, "info"))),
    item("Tip", revision.practiceTip || "Practice step-by-step", "warn")
  ].join("");

  $("parentReviewBox").innerHTML = [
    item("Parent Auto Send", parent.autoSend ? "On" : "Off", parent.autoSend ? "warn" : "safe"),
    item("Parent Draft", parent.draft || "Pending", "info"),
    item("Review Status", review.reviewStatus || "teacher_review_pending", "warn"),
    ...((review.checklist || []).map((c, i) => item(`Review ${i + 1}`, c, "warn")))
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part98/status");
    $("statusText").textContent = data.status === "active" ? "Class Notes Active" : "Status Loaded";
    $("statusSub").textContent = "Notes and summary preview ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part98/vani/greeting");
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
    const data = await getJSON("/api/part98/vani/command", {
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
  const command = "VANI, class notes generate karo";
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
