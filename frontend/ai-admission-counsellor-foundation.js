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
  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    privateScreenFirst: data.privateScreenFirst,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  const score = data.leadScore || {};
  $("scoreBox").innerHTML = [
    item("Lead Category", score.category || "pending", score.category === "hot" ? "hot" : score.category === "warm" ? "warm" : "safe"),
    item("Score", `${score.score || 0}/100`, "safe"),
    item("Priority", score.priority || "Pending details", "safe"),
    item("Reasons", (score.reasons || []).join(", ") || "No reasons yet")
  ].join("");

  const course = data.courseRecommendation || {};
  const fee = data.feePlanPreview || {};
  $("courseBox").innerHTML = [
    item("Recommended Course", course.recommendedCourse || "Pending", "safe"),
    item("Batch Type", course.batchType || "Pending", "safe"),
    item("Why", course.reason || "Need more details"),
    item("Fee Preview", fee.monthlyEstimate ? `₹${fee.monthlyEstimate}/month estimate. ${fee.starterOffer}` : "Preview pending", "warm")
  ].join("");

  const demo = data.demoClassPreview || {};
  const followup = data.followupScript || {};
  $("followupBox").innerHTML = [
    item("Demo Preview", `${demo.suggestedSlot || "Pending"} • ${demo.mode || ""}`, "safe"),
    item("Confirmation", demo.confirmationRequired ? "Required before booking" : "Not ready", "warm"),
    item("Follow-up Script", followup.script || "Pending", "safe")
  ].join("");

  $("missingBox").innerHTML = (data.missingDetails || []).length
    ? data.missingDetails.map((m) => item(m.key, m.question, "warm")).join("")
    : item("No missing details", "Counselling preview can proceed.", "safe");

  const objection = data.objectionHandling || {};
  $("objectionBox").innerHTML = [
    item("Objection", objection.objection || "General concern", "safe"),
    item("Safe Response", objection.safeResponse || "Clarify concern and guide parent/student.", "safe")
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part89/status");
    $("statusText").textContent = data.status === "active" ? "Counsellor Active" : "Status Loaded";
    $("statusSub").textContent = "Admission counselling workflow ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadFeatures() {
  const data = await getJSON("/api/part89/features");
  $("featuresBox").innerHTML = data.features.map((f) => item(f.name, `${f.summary} ${f.problemSolved}`, "safe")).join("");
}

async function startVani() {
  try {
    const data = await getJSON("/api/part89/vani/greeting");
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

async function askCounsellor(command) {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part89/counsellor/conversation-reply", {
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
      $("vaniOutput").textContent = "Mic speech recognition supported nahi hai. Command type karke Ask Counsellor dabao.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nThinking...`;
    await askCounsellor(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type command and press Ask Counsellor.`;
  }
}

function demo() {
  const command = "VANI, Aman Class 10 Maths admission counselling banao parent phone 9876543210 source WhatsApp";
  $("vaniCommand").value = command;
  askCounsellor(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => askCounsellor());
$("demoBtn").addEventListener("click", demo);
$("roleSelect").addEventListener("change", () => askCounsellor());

loadStatus();
loadFeatures().catch(console.error);
demo();
