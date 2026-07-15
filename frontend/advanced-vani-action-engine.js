const $ = (id) => document.getElementById(id);
let lastPreview = null;

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || `${res.status} ${res.statusText}`), { data });
  return data;
}

function contextPayload(command) {
  return {
    command,
    role: $("roleSelect").value,
    instituteId: $("instituteId").value,
    branchId: $("branchId").value,
    studentId: $("studentId").value,
    batchId: "BAT-10-MATH-A",
    date: "today",
    topic: "Quadratic Equations",
    dueDate: "tomorrow"
  };
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part84/status");
    $("statusText").textContent = data.status === "active" ? "VANI Engine Active" : "Status Loaded";
    $("statusSub").textContent = "Preview • Confirm • Verify • Audit";
  } catch (err) {
    $("statusText").textContent = "Status failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadFeatures() {
  const data = await getJSON("/api/part84/features");
  $("features").innerHTML = data.features.map((f) => `<div class="item"><strong>${f.name}</strong><p>${f.why}</p><span class="tag">${f.key}</span></div>`).join("");
}

async function loadModules() {
  const data = await getJSON("/api/part84/modules");
  $("modules").innerHTML = data.modules.map((m) => `<div class="item"><strong>${m.name}</strong><p>${m.actions.join(", ")}</p><span class="tag private">${m.roles.join(", ")}</span></div>`).join("");
}

async function startVani() {
  const data = await getJSON("/api/part84/vani/greeting");
  const result = window.NaxoraVaniVoice?.speak(data.greeting);
  $("output").textContent = result?.spoken === false ? `Voice not started: ${result.reason}` : data.greeting;
}

function toggleMute() {
  const next = !window.NaxoraVaniVoice?.isMuted();
  window.NaxoraVaniVoice?.setMuted(next);
  $("muteBtn").textContent = next ? "Unmute" : "Mute";
  $("output").textContent = next ? "VANI muted." : "VANI unmuted.";
}

async function ask(command) {
  $("output").textContent = "Thinking...";
  const data = await getJSON("/api/part84/vani/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contextPayload(command))
  });
  lastPreview = data.preview || null;
  $("output").textContent = JSON.stringify(data, null, 2);
  window.NaxoraVaniVoice?.speak(data.spokenSafeSummary);
}

async function listenAndAsk() {
  try {
    if (!window.NaxoraVaniVoice?.listenSupported()) {
      $("output").textContent = "Mic speech recognition not supported in this browser. Type command and press Ask VANI.";
      return;
    }
    $("output").textContent = "Listening...";
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("commandInput").value = transcript;
    await ask(transcript);
  } catch (err) {
    $("output").textContent = `Listening failed: ${err.message}. Type command and press Ask VANI.`;
  }
}

async function executePreview() {
  if (!lastPreview) {
    $("output").textContent = "No preview yet. Ask VANI first.";
    return;
  }
  try {
    const data = await getJSON("/api/part84/action/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: $("roleSelect").value,
        instituteId: $("instituteId").value,
        module: lastPreview.module,
        action: lastPreview.action,
        confirmationToken: lastPreview.confirmationToken,
        confirmed: true,
        sensitive: lastPreview.sensitive,
        ownerVerificationCode: lastPreview.sensitive ? "DEMO-OWNER-VERIFY" : ""
      })
    });
    $("output").textContent = JSON.stringify(data, null, 2);
    window.NaxoraVaniVoice?.speak(data.message || "Action completed safely.");
  } catch (err) {
    $("output").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
  }
}

$("startBtn").addEventListener("click", startVani);
$("listenBtn").addEventListener("click", listenAndAsk);
$("muteBtn").addEventListener("click", toggleMute);
$("askBtn").addEventListener("click", () => ask($("commandInput").value).catch((err) => { $("output").textContent = JSON.stringify(err.data || { error: err.message }, null, 2); }));
$("executeBtn").addEventListener("click", executePreview);
for (const btn of document.querySelectorAll(".chip")) btn.addEventListener("click", () => { $("commandInput").value = btn.textContent; ask(btn.textContent).catch((err) => { $("output").textContent = JSON.stringify(err.data || { error: err.message }, null, 2); }); });

loadStatus();
loadFeatures().catch(console.error);
loadModules().catch(console.error);
