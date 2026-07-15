const $ = (id) => document.getElementById(id);
let lastPreview = null;

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.replyText || data.message || `${res.status} ${res.statusText}`), { data });
  return data;
}

function item(title, text, tag = "") {
  return `<div class="item"><strong>${title}</strong><p>${text}</p>${tag ? `<span class="tag ${tag}">${tag}</span>` : ""}</div>`;
}

function renderPreview(data) {
  lastPreview = data;
  const preview = data.bookingPreview || {};
  const slot = data.selectedSlot || preview.selectedSlot || {};
  const reminder = data.reminderDraft || {};
  const confirmed = data.confirmedBooking || null;

  $("accessBox").textContent = JSON.stringify(data.access || {}, null, 2);
  $("vaniOutput").textContent = JSON.stringify({
    reply: data.replyText,
    nextAction: data.nextAction,
    confirmationCode: preview.confirmationCode,
    privateScreenFirst: data.privateScreenFirst
  }, null, 2);

  $("previewBox").innerHTML = [
    item("Student", `${preview.studentName || "Pending"} • ${preview.className || ""} • ${preview.subject || ""}`, "safe"),
    item("Parent Phone", preview.parentPhone || "Pending", "private"),
    item("Selected Slot", `${slot.courseName || ""} • ${slot.day || ""} • ${slot.time || ""}`, "safe"),
    item("Confirmation Code", preview.confirmationCode || "Pending", "warn"),
    item("Policy", "Final booking confirmation ke bina slot reserve nahi hoga.", "warn")
  ].join("");

  $("slotsBox").innerHTML = (data.availableSlots || []).map((s) => item(
    `${s.slot.courseName} (${s.score}/100)`,
    `${s.slot.day} • ${s.slot.time} • ${s.slot.mode} • seats preview: ${s.slot.seatsLeftPreview} • ${s.reasons.join(", ")}`,
    "safe"
  )).join("");

  $("reminderBox").innerHTML = [
    item("Auto-send", reminder.autoSend ? "On" : "Off", "warn"),
    item("Hindi/Hinglish Draft", reminder.hindiHinglish || "Pending", "safe"),
    item("Confirmation", reminder.confirmationRequired ? "Required before sending" : "Not required", "warn")
  ].join("");

  $("missingBox").innerHTML = (data.missingDetails || []).length
    ? data.missingDetails.map((m) => item(m.key, m.question, "warn")).join("")
    : item("No missing details", "Demo preview can proceed.", "safe");

  $("confirmedBox").innerHTML = confirmed
    ? [
        item("Booking ID", confirmed.bookingId, "safe"),
        item("Status", confirmed.status, "safe"),
        item("DB", confirmed.dbPersistence, "warn"),
        item("Reminder", "Draft ready; auto-send off.", "warn")
      ].join("")
    : item("Not confirmed yet", "Use Confirm Demo after preview.", "warn");

  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary || data.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part92/status");
    $("statusText").textContent = data.status === "active" ? "Demo Booking Active" : "Status Loaded";
    $("statusSub").textContent = "Soft calm VANI voice enabled.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadCatalog() {
  const data = await getJSON("/api/part92/demo-slots");
  $("catalogBox").innerHTML = data.slots.map((s) => item(
    s.courseName,
    `${s.className} • ${s.subject} • ${s.day} • ${s.time} • ${s.mode} • seats: ${s.seatsLeftPreview}`,
    "safe"
  )).join("");
}

async function startVani() {
  try {
    const data = await getJSON("/api/part92/vani/greeting");
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

async function previewBooking(command) {
  $("vaniOutput").textContent = "Preparing preview...";
  try {
    const data = await getJSON("/api/part92/booking/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: $("roleSelect").value,
        instituteId: $("instituteId").value,
        branchId: $("branchId").value,
        command: command || $("vaniCommand").value
      })
    });
    renderPreview(data);
  } catch (err) {
    $("vaniOutput").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
    if (err.data) renderPreview(err.data);
  }
}

async function confirmBooking() {
  const confirmationCode = lastPreview?.bookingPreview?.confirmationCode || "";
  $("vaniOutput").textContent = "Confirming...";
  try {
    const data = await getJSON("/api/part92/booking/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: $("roleSelect").value,
        instituteId: $("instituteId").value,
        branchId: $("branchId").value,
        command: $("vaniCommand").value,
        confirm: true,
        confirmationCode
      })
    });
    renderPreview(data);
  } catch (err) {
    $("vaniOutput").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
    if (err.data) renderPreview(err.data);
  }
}

async function listenAndReply() {
  $("vaniOutput").textContent = "Listening...";
  try {
    if (!window.NaxoraVaniVoice?.listenSupported()) {
      $("vaniOutput").textContent = "Mic speech recognition supported nahi hai. Command type karke Preview Booking dabao.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nPreparing preview...`;
    await previewBooking(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type command and press Preview Booking.`;
  }
}

function demo() {
  const command = "VANI, Aman Class 10 Maths demo book karo parent phone 9876543210";
  $("vaniCommand").value = command;
  previewBooking(command);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("previewBtn").addEventListener("click", () => previewBooking());
$("confirmBtn").addEventListener("click", confirmBooking);
$("demoBtn").addEventListener("click", demo);
$("roleSelect").addEventListener("change", () => previewBooking());

loadStatus();
loadCatalog().catch(console.error);
demo();
