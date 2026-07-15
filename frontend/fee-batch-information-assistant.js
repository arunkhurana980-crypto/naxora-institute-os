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
  const selected = data.selectedCourse || {};
  const fee = data.feeInfo || {};
  const batch = data.batchInfo || {};
  const inst = data.installmentPreview || {};
  const demo = data.demoSlotPreview || {};
  const eligibility = data.eligibilityPreview || {};

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    privateScreenFirst: data.privateScreenFirst,
    confirmationRequiredFor: data.confirmationRequiredFor
  }, null, 2);

  $("courseBox").innerHTML = [
    item("Course", selected.courseName || "Pending", "safe"),
    item("Class", selected.className || "Pending", "safe"),
    item("Subjects", (selected.subjects || []).join(", ") || "Pending"),
    item("Duration", selected.duration || "Pending")
  ].join("");

  $("feeBox").innerHTML = [
    item("Monthly Fee Preview", `₹${fee.monthlyFeePreview || 0}`, "private"),
    item("Registration Fee Preview", `₹${fee.registrationFeePreview || 0}`, "private"),
    item("Policy", "Fee commitment/discount owner approval ke bina nahi hoga.", "warn")
  ].join("");

  $("batchBox").innerHTML = (batch.batches || []).map((b) => item(
    b.name,
    `${b.days} • ${b.time} • ${b.mode} • seats preview: ${b.seatsPreview}`,
    "safe"
  )).join("");

  $("installmentBox").innerHTML = [
    item("Monthly Plan", `First month preview ₹${inst.monthlyPlan?.firstMonthPreview || 0}; monthly ₹${inst.monthlyPlan?.monthlyFeePreview || 0}`, "warn"),
    item("Quarterly Plan", `₹${inst.quarterlyPlan?.totalPreview || 0}`, "warn"),
    item("Full Course Plan", `₹${inst.fullCoursePlan?.totalPreview || 0}`, "warn"),
    item("Safety", inst.safety || "Preview only", "private")
  ].join("");

  $("demoEligibilityBox").innerHTML = [
    item("Demo Slot", `${demo.suggestedBatchName || "Pending"} • ${demo.suggestedSlot || ""}`, "safe"),
    item("Demo Confirmation", demo.confirmationRequired ? "Required before booking" : "Not ready", "warn"),
    item("Eligibility", eligibility.eligiblePreview ? "Suitable preview" : "Alternative suggested", eligibility.eligiblePreview ? "safe" : "warn"),
    item("Note", eligibility.note || "Preview only")
  ].join("");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part91/status");
    $("statusText").textContent = data.status === "active" ? "Fee + Batch Active" : "Status Loaded";
    $("statusSub").textContent = "Fee/batch info assistant ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadCatalog() {
  const data = await getJSON("/api/part91/course-batch-catalog");
  $("catalogBox").innerHTML = data.catalog.map((c) => item(
    c.courseName,
    `${c.className} • ₹${c.monthlyFeePreview}/month preview • ${c.batches.length} batches`,
    "safe"
  )).join("");
}

async function startVani() {
  try {
    const data = await getJSON("/api/part91/vani/greeting");
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

async function getInfo(command) {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part91/vani/command", {
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
      $("vaniOutput").textContent = "Mic speech recognition supported nahi hai. Command type karke Get Info dabao.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nThinking...`;
    await getInfo(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type command and press Get Info.`;
  }
}

function demo() {
  const command = "VANI, Class 10 Maths ki fee aur batch timing batao";
  $("vaniCommand").value = command;
  getInfo(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => getInfo());
$("demoBtn").addEventListener("click", demo);
$("roleSelect").addEventListener("change", () => getInfo());

loadStatus();
loadCatalog().catch(console.error);
demo();
