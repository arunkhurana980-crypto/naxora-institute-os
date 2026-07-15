const $ = (id) => document.getElementById(id);

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || `${res.status} ${res.statusText}`), { data });
  return data;
}

function body() {
  return {
    role: $("roleSelect").value,
    instituteId: $("instituteId").value,
    studentId: $("studentId").value,
    batchId: $("batchId").value,
    command: $("vaniCommand").value,
    q: $("vaniCommand").value
  };
}

function show(data) {
  $("output").textContent = JSON.stringify(data, null, 2);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part86/status");
    $("statusText").textContent = data.status === "active" ? "Part 86 Active" : "Status Loaded";
    $("statusSub").textContent = data.safeMode ? "Safe preview-first mode active." : "Ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadFeatures() {
  const data = await getJSON("/api/part86/features");
  $("features").innerHTML = data.features.map((f) => `
    <div class="item">
      <strong>${f.name}</strong>
      <p>${f.summary}</p>
      <span class="tag">${f.module}</span>
    </div>
  `).join("");
}

async function parseCommand() {
  show({ loading: true });
  try {
    show(await getJSON("/api/part86/command/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body())
    }));
  } catch (err) {
    show(err.data || { error: err.message });
  }
}

async function previewAction() {
  show({ loading: true });
  try {
    show(await getJSON("/api/part86/action/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body())
    }));
  } catch (err) {
    show(err.data || { error: err.message });
  }
}

async function askVani() {
  show({ thinking: true });
  try {
    const data = await getJSON("/api/part86/vani/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body())
    });
    show(data);
    window.NaxoraVaniVoice?.speak(data.spokenSafeSummary);
  } catch (err) {
    const data = err.data || { error: err.message };
    show(data);
    if (data.spokenSafeSummary) window.NaxoraVaniVoice?.speak(data.spokenSafeSummary);
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part86/vani/greeting");
    const result = window.NaxoraVaniVoice?.speak(data.greeting);
    show(result?.spoken === false ? { voice: "failed", reason: result.reason } : data);
  } catch (err) {
    show({ error: err.message });
  }
}

async function listenVani() {
  show({ listening: true });
  try {
    if (!window.NaxoraVaniVoice?.listenSupported()) {
      show({ error: "Mic speech recognition is not supported in this browser. Type command and press Ask VANI." });
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    $("vaniCommand").value = result.transcript || "";
    await askVani();
  } catch (err) {
    show({ error: `Listening failed: ${err.message}`, fallback: "Type command and press Ask VANI." });
  }
}

function toggleMute() {
  const next = !window.NaxoraVaniVoice?.isMuted();
  window.NaxoraVaniVoice?.setMuted(next);
  $("muteVaniBtn").textContent = next ? "Unmute" : "Mute";
  show({ muted: next });
}

$("parseBtn").addEventListener("click", parseCommand);
$("previewBtn").addEventListener("click", previewAction);
$("askVaniBtn").addEventListener("click", askVani);
$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenVani);
$("muteVaniBtn").addEventListener("click", toggleMute);

loadStatus();
loadFeatures().catch(console.error);
parseCommand().catch(console.error);
