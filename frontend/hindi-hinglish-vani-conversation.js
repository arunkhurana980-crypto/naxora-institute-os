const $ = (id) => document.getElementById(id);

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.replyText || data.reason || `${res.status} ${res.statusText}`), { data });
  return data;
}

function renderObjectList(targetId, obj) {
  const el = $(targetId);
  if (!obj) { el.innerHTML = ""; return; }
  if (Array.isArray(obj)) {
    el.innerHTML = obj.map((x, i) => `<div class="item"><strong>${x.key || x.name || `Item ${i+1}`}</strong><p>${x.question || x.summary || JSON.stringify(x)}</p></div>`).join("");
    return;
  }
  el.innerHTML = Object.entries(obj).map(([k, v]) => `
    <div class="item">
      <strong>${k}</strong>
      <p>${typeof v === "object" ? JSON.stringify(v) : v}</p>
    </div>
  `).join("");
}

function renderResult(data) {
  $("accessBox").textContent = JSON.stringify(data.access || data.reply?.access || {}, null, 2);
  const result = data.reply || data;
  $("vaniOutput").textContent = JSON.stringify({
    language: result.language,
    module: result.detectedModule,
    intent: result.detectedIntent,
    reply: result.replyText,
    needsFollowUp: result.needsFollowUp,
    privateScreenFirst: result.privateScreenFirst
  }, null, 2);
  renderObjectList("screenPreview", result.screenPreview);
  renderObjectList("detectedBox", {
    language: result.language,
    module: result.detectedModule,
    intent: result.detectedIntent,
    entities: result.extractedEntities
  });
  renderObjectList("followupBox", result.missingDetails?.length ? result.missingDetails : [{ name: "No missing details", summary: "VANI can answer or prepare preview." }]);
  window.NaxoraVaniVoice?.speak(result.spokenSafeSummary || result.replyText);
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part88/status");
    $("statusText").textContent = data.status === "active" ? "Conversation Active" : "Status Loaded";
    $("statusSub").textContent = "Hindi/Hinglish reply mode ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadModules() {
  const data = await getJSON("/api/part88/modules");
  $("modulesBox").innerHTML = data.modules.map((m) => `
    <div class="item">
      <strong>${m.name}</strong>
      <p>${m.intents.join(", ")}</p>
      <span class="tag ${m.privateScreenFirst ? "private" : "safe"}">${m.privateScreenFirst ? "Private-screen-first" : "Safe summary"}</span>
    </div>
  `).join("");
}

async function startVani() {
  try {
    const data = await getJSON("/api/part88/vani/greeting");
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

async function askVani(command) {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part88/conversation/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: $("roleSelect").value,
        instituteId: $("instituteId").value,
        sessionId: $("sessionId").value,
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
      $("vaniOutput").textContent = "Mic speech recognition supported nahi hai. Command type karke Ask VANI dabao.";
      return;
    }
    const result = await window.NaxoraVaniVoice.listen({ lang: "hi-IN" });
    const transcript = result.transcript || "";
    $("vaniCommand").value = transcript;
    $("vaniOutput").textContent = `Heard: ${transcript}\nThinking...`;
    await askVani(transcript);
  } catch (err) {
    $("vaniOutput").textContent = `Listening failed: ${err.message}. Type command and press Ask VANI.`;
  }
}

function tryDemo() {
  const demos = [
    "VANI, homework kya hai",
    "VANI, fee summary dikhao",
    "VANI, attendance report batao",
    "VANI, Aman class 10 admission draft banao parent phone 9876543210",
    "VANI, owner daily report sunao"
  ];
  const next = demos[Math.floor(Math.random() * demos.length)];
  $("vaniCommand").value = next;
  askVani(next);
}

$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => askVani());
$("demoBtn").addEventListener("click", tryDemo);

loadStatus();
loadModules().catch(console.error);
tryDemo();
