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
  const session = data.session || {};
  const chatPreview = data.chatPreview || {};
  const pollPreview = data.pollPreview || {};
  const votePreview = data.votePreview || {};
  const hand = data.handRaisePreview || {};
  const policy = data.chatPolicy || {};
  const moderation = data.moderationPreview || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    socketReadyFoundation: data.socketReadyFoundation,
    productionRealtimePending: data.productionRealtimePending
  }, null, 2);

  $("sessionBox").innerHTML = [
    item("Session", session.title || "Pending", "safe"),
    item("Batch", session.batchId || "Pending"),
    item("Status", session.status || "preview", "info"),
    item("Tools", `Chat: ${session.chatEnabled ? "on" : "off"} • Polls: ${session.pollsEnabled ? "on" : "off"} • Hand Raise: ${session.handRaiseEnabled ? "on" : "off"}`, "safe")
  ].join("");

  const messages = data.messagesPreview || [];
  $("chatBox").innerHTML = [
    item("Send Preview", chatPreview.canSend ? "Allowed" : "Blocked", chatPreview.canSend ? "safe" : "block"),
    item("Moderation", chatPreview.moderation?.reason || "Preview only", chatPreview.canSend ? "safe" : "warn"),
    ...messages.map((m) => item(`${m.senderName} (${m.senderRole})`, m.text, "info"))
  ].join("");

  const polls = data.pollsPreview || [];
  $("pollBox").innerHTML = [
    item("Create Poll", pollPreview.canCreate ? "Teacher can create poll preview" : "Not allowed for this role", pollPreview.canCreate ? "safe" : "block"),
    item("Vote Preview", votePreview.canVote ? `Selected: ${votePreview.selectedOption}` : "Vote not allowed or teacher mode", votePreview.canVote ? "safe" : "warn"),
    ...polls.map((p) => item(p.question, p.options.join(" • "), "info"))
  ].join("");

  const queue = data.handRaiseQueuePreview || [];
  $("handRaiseBox").innerHTML = [
    item("Raise Hand", hand.canRaiseHand ? "Student hand raise preview ready" : "Raise not allowed for this role", hand.canRaiseHand ? "safe" : "warn"),
    ...queue.map((h) => item(`${h.studentName} waiting`, h.reason, "info"))
  ].join("");

  $("policyBox").innerHTML = [
    item("Can Chat", policy.canChat ? "Yes" : "No", policy.canChat ? "safe" : "block"),
    item("Can Moderate", policy.canModerate ? "Yes" : "No", policy.canModerate ? "safe" : "warn"),
    item("Moderation Action", moderation.result || "Preview only", moderation.canModerate ? "safe" : "warn"),
    item("Realtime", "Socket-ready foundation; production persistence pending.", "warn")
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part96/status");
    $("statusText").textContent = data.status === "active" ? "Interactions Active" : "Status Loaded";
    $("statusSub").textContent = "Chat, polls and hand raise preview ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part96/vani/greeting");
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
    const data = await getJSON("/api/part96/vani/command", {
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

async function sendChat() {
  $("roleSelect").value ||= "student";
  await ask(`chat message: ${$("chatText").value}`);
}

async function createPoll() {
  const current = $("roleSelect").value;
  $("roleSelect").value = "teacher";
  await ask(`poll create: ${$("pollQuestion").value}`);
  $("roleSelect").value = current;
}

async function raiseHand() {
  const current = $("roleSelect").value;
  $("roleSelect").value = "student";
  await ask(`hand raise: ${$("raiseReason").value}`);
  $("roleSelect").value = current;
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
  const command = "VANI, live chat status dikhao aur hand raise queue batao";
  $("vaniCommand").value = command;
  ask(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => ask());
$("demoBtn").addEventListener("click", demo);
$("chatBtn").addEventListener("click", sendChat);
$("pollBtn").addEventListener("click", createPoll);
$("raiseBtn").addEventListener("click", raiseHand);
$("roleSelect").addEventListener("change", () => ask());

loadStatus();
demo();
