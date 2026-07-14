const $ = (id) => document.getElementById(id);

async function getJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || `${res.status} ${res.statusText}`), { data });
  return data;
}

function params() {
  return new URLSearchParams({
    role: $("roleSelect").value,
    instituteId: $("instituteId").value,
    subscription: "demo"
  }).toString();
}

function renderMetrics(today = {}) {
  const rows = [
    ["Revenue Today", `₹${today.revenueCollected || 0}`],
    ["New Enquiries", today.newEnquiries || 0],
    ["Attendance", `${today.studentAttendancePercent || 0}%`],
    ["Hot Leads", today.hotLeads || 0]
  ];
  $("metrics").innerHTML = rows.map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderTiles(tiles = []) {
  $("tiles").innerHTML = tiles.map((t) => `
    <div class="tile">
      <strong>${t.icon} ${t.name}</strong>
      <p>${t.summary}</p>
      <p class="sensitive">${t.sensitive ? "Private-screen-first" : "Safe summary"}</p>
    </div>
  `).join("");
}

function renderAlerts(alerts = []) {
  $("alerts").innerHTML = alerts.map((a) => `
    <div class="alert">
      <strong>${a.level.toUpperCase()} • ${a.type}</strong>
      <p>${a.message}</p>
      <p class="sensitive">${a.privateScreenFirst ? "Show privately on screen" : "Can show as normal alert"}</p>
    </div>
  `).join("");
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part80/status");
    $("statusText").textContent = data.status === "active" ? "Owner App Active" : "Status Loaded";
    $("statusSub").textContent = data.versionPhase || "NAXORA OS 2.0";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadOwnerApp() {
  $("accessBox").textContent = "Loading...";
  try {
    const data = await getJSON(`/api/part80/overview?${params()}`);
    $("accessBox").textContent = JSON.stringify(data.access, null, 2);
    renderMetrics(data.overview.today);
    renderTiles(data.tiles);
    renderAlerts(data.overview.urgentAlerts);
  } catch (err) {
    $("accessBox").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
    renderMetrics({});
    renderTiles([]);
    renderAlerts([]);
  }
}

async function askVani() {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part80/vani/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: $("roleSelect").value,
        instituteId: $("instituteId").value,
        subscription: "demo",
        command: $("vaniCommand").value
      })
    });
    $("vaniOutput").textContent = JSON.stringify(data, null, 2);
    window.NaxoraVaniVoice?.speak(data.spokenSafeSummary);
  } catch (err) {
    $("vaniOutput").textContent = JSON.stringify(err.data || { error: err.message }, null, 2);
  }
}

$("loadBtn").addEventListener("click", loadOwnerApp);
$("vaniBtn").addEventListener("click", askVani);
$("roleSelect").addEventListener("change", loadOwnerApp);

loadStatus();
loadOwnerApp();


const ownerStartBtn = document.getElementById("ownerStartVani");
const ownerMuteBtn = document.getElementById("ownerMuteVani");

if (ownerStartBtn) {
  ownerStartBtn.addEventListener("click", () => {
    const line = "Namaste, main VANI hoon. Main aapki kya help kar sakti hoon?";
    const result = window.NaxoraVaniVoice?.speak(line);
    if (result && result.spoken === false) {
      $("vaniOutput").textContent = `Voice not started: ${result.reason}`;
    }
  });
}
if (ownerMuteBtn) {
  ownerMuteBtn.addEventListener("click", () => {
    const next = !window.NaxoraVaniVoice?.isMuted();
    window.NaxoraVaniVoice?.setMuted(next);
    $("vaniOutput").textContent = next ? "VANI muted." : "VANI unmuted.";
  });
}
