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
  const rec = data.recommendation || {};
  const top = rec.recommendedCourse || {};
  const course = top.course || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    privateScreenFirst: data.privateScreenFirst,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("topCourseBox").innerHTML = [
    item("Course", course.name || top.name || "Pending", top.fit || "possible"),
    item("Fit Score", `${top.score || 0}/100`, top.fit || "possible"),
    item("Why", rec.explanation?.parentFriendly || "Need more details"),
    item("No Guarantee", rec.explanation?.noGuarantee || "No marks/result guarantee.", "possible")
  ].join("");

  $("optionsBox").innerHTML = (rec.topRecommendations || []).map((r, i) => item(
    `${i + 1}. ${r.name}`,
    `Score ${r.score}/100 • ${r.reasons?.join(", ") || "closest match"}`,
    r.fit
  )).join("");

  $("fitBox").innerHTML = [
    item("Batch Fit", `${rec.batchFit?.batchType || "regular"} • ${rec.batchFit?.reason || ""}`, "good"),
    item("Fee Preview", `Preview fee ₹${rec.feeFitPreview?.previewFee || 0}. ${rec.feeFitPreview?.message || ""}`, rec.feeFitPreview?.fit === "fits" ? "excellent" : "possible"),
    item("Safety", "Final fee/discount/admission confirmation ke bina nahi hoga.", "possible")
  ].join("");

  $("demoPlanBox").innerHTML = [
    item("Demo Topic", rec.demoPlanPreview?.demoTopic || "Pending", "good"),
    item("Suggested Slot", rec.demoPlanPreview?.suggestedSlot || "Pending", "good"),
    item("Confirmation", rec.demoPlanPreview?.confirmationRequired ? "Required before booking" : "Not ready", "possible")
  ].join("");

  $("missingBox").innerHTML = (rec.missingDetails || []).length
    ? rec.missingDetails.map((m) => item(m.key, m.question, "possible")).join("")
    : item("No missing details", "Recommendation preview can proceed.", "excellent");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part90/status");
    $("statusText").textContent = data.status === "active" ? "Course AI Active" : "Status Loaded";
    $("statusSub").textContent = "Course recommendation workflow ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadCatalog() {
  const data = await getJSON("/api/part90/course-catalog");
  $("catalogBox").innerHTML = data.courses.map((c) => item(
    c.name,
    `${c.classes.join(", ")} • ${c.subjects.join(", ")} • ₹${c.monthlyFeePreview}/month preview`,
    "good"
  )).join("");
}

async function startVani() {
  try {
    const data = await getJSON("/api/part90/vani/greeting");
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

async function recommend(command) {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part90/vani/command", {
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
      $("vaniOutput").textContent = "Mic speech recognition supported nahi hai. Command type karke Recommend Course dabao.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nThinking...`;
    await recommend(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type command and press Recommend Course.`;
  }
}

function demo() {
  const command = "VANI, Aman Class 10 Maths board exam ke liye course recommend karo budget 3500";
  $("vaniCommand").value = command;
  recommend(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => recommend());
$("demoBtn").addEventListener("click", demo);
$("roleSelect").addEventListener("change", () => recommend());

loadStatus();
loadCatalog().catch(console.error);
demo();
