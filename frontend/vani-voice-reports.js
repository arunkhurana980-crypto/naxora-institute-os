const $ = (id) => document.getElementById(id);
let lastVoiceScript = "";

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || `${res.status} ${res.statusText}`), { data });
  return data;
}

function reportQuery(extra = {}) {
  const params = {
    role: $("roleSelect").value,
    instituteId: $("instituteId").value,
    reportType: $("reportType").value,
    teacherId: $("teacherId").value,
    studentId: $("studentId").value,
    parentId: $("parentId").value,
    childId: $("childId").value,
    ...extra
  };
  return new URLSearchParams(params).toString();
}

function renderReport(report, voiceScript) {
  lastVoiceScript = voiceScript || "";
  const metrics = report?.content?.metrics || [];
  $("metrics").innerHTML = metrics.map((m) => `
    <div class="item">
      <strong>${m.label}</strong>
      <p>${m.value}</p>
      <span class="tag ${m.private ? "private" : "safe"}">${m.private ? "Private screen" : "Safe to speak"}</span>
    </div>
  `).join("");
  const recs = report?.content?.recommendations || [];
  $("recommendations").innerHTML = recs.map((r, i) => `
    <div class="item">
      <strong>Recommendation ${i + 1}</strong>
      <p>${r}</p>
    </div>
  `).join("");
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part87/status");
    $("statusText").textContent = data.status === "active" ? "Voice Reports Active" : "Status Loaded";
    $("statusSub").textContent = "Safe voice report reader ready.";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadReportTypes() {
  const data = await getJSON("/api/part87/report-types");
  $("reportTypes").innerHTML = data.reportTypes.map((r) => `
    <div class="item">
      <strong>${r.name}</strong>
      <p>${r.modules.join(", ")}</p>
      <span class="tag ${r.privateScreenFirst ? "private" : "safe"}">${r.privateScreenFirst ? "Private-screen-first" : "Safe summary"}</span>
    </div>
  `).join("");
}

async function generateReport() {
  $("accessBox").textContent = "Generating...";
  try {
    const data = await getJSON(`/api/part87/report/generate?${reportQuery()}`);
    $("accessBox").textContent = JSON.stringify(data.access, null, 2);
    renderReport(data.report, data.voiceScript);
    $("vaniOutput").textContent = data.voiceScript;
  } catch (err) {
    $("accessBox").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
    $("metrics").innerHTML = "";
    $("recommendations").innerHTML = "";
  }
}

async function startVani() {
  try {
    const data = await getJSON("/api/part87/vani/greeting");
    const result = window.NaxoraVaniVoice?.speak(data.greeting);
    $("vaniOutput").textContent = result?.spoken === false ? `Voice not started: ${result.reason}` : data.greeting;
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
    const data = await getJSON("/api/part87/vani/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: $("roleSelect").value,
        instituteId: $("instituteId").value,
        reportType: $("reportType").value,
        teacherId: $("teacherId").value,
        studentId: $("studentId").value,
        parentId: $("parentId").value,
        childId: $("childId").value,
        command: command || $("vaniCommand").value
      })
    });
    $("vaniOutput").textContent = JSON.stringify({
      detectedReportType: data.detectedReportType,
      spokenSafeSummary: data.spokenSafeSummary,
      voiceScript: data.voiceScript,
      privateScreenFirst: data.privateScreenFirst
    }, null, 2);
    renderReport(data.report, data.voiceScript);
    window.NaxoraVaniVoice?.speak(data.voiceScript);
  } catch (err) {
    $("vaniOutput").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
  }
}

async function listenAndReply() {
  $("vaniOutput").textContent = "Listening...";
  try {
    if (!window.NaxoraVaniVoice?.listenSupported()) {
      $("vaniOutput").textContent = "Mic speech recognition is not supported in this browser. Type command and press Ask VANI.";
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

function readReport() {
  if (!lastVoiceScript) {
    $("vaniOutput").textContent = "Pehle report generate karo.";
    return;
  }
  const result = window.NaxoraVaniVoice?.speak(lastVoiceScript);
  if (result?.spoken === false) $("vaniOutput").textContent = `Voice not started: ${result.reason}`;
}

$("generateBtn").addEventListener("click", generateReport);
$("startVaniBtn").addEventListener("click", startVani);
$("listenVaniBtn").addEventListener("click", listenAndReply);
$("muteVaniBtn").addEventListener("click", toggleMute);
$("askVaniBtn").addEventListener("click", () => askVani());
$("readReportBtn").addEventListener("click", readReport);
$("roleSelect").addEventListener("change", generateReport);
$("reportType").addEventListener("change", generateReport);

loadStatus();
loadReportTypes().catch(console.error);
generateReport();
