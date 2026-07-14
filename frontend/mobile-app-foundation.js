const $ = (id) => document.getElementById(id);

async function getJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function renderChips(items) {
  return (items || []).map((item) => `<span class="nx-chip">${item}</span>`).join("");
}

async function loadStatus() {
  try {
    const data = await getJSON("/api/part79/status");
    $("statusText").textContent = data.status === "active" ? "Part 79 Active" : "Status Loaded";
    $("statusSub").textContent = data.versionPhase || "Mobile foundation ready";
  } catch (err) {
    $("statusText").textContent = "Status check failed";
    $("statusSub").textContent = err.message;
  }
}

async function loadFeatures() {
  const data = await getJSON("/api/part79/features");
  $("featuresList").innerHTML = data.features.map((f) => `
    <article>
      <strong>${f.name}</strong>
      <p><b>Why:</b> ${f.why}</p>
      <p><b>Problem solved:</b> ${f.problemSolved}</p>
    </article>
  `).join("");
}

async function loadNavigation() {
  const role = $("roleSelect").value;
  const data = await getJSON(`/api/part79/navigation?role=${encodeURIComponent(role)}`);
  $("navPreview").innerHTML = renderChips(data.navigation);
}

async function loadOfflinePolicy() {
  const data = await getJSON("/api/part79/offline-policy");
  const entries = Object.entries(data.policy || {});
  $("offlinePolicy").innerHTML = entries.map(([key, value]) => `
    <article>
      <strong>${key}</strong>
      <p>${value}</p>
    </article>
  `).join("");
}

async function testVani() {
  $("vaniOutput").textContent = "Thinking...";
  try {
    const data = await getJSON("/api/part79/vani/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: $("roleSelect").value,
        command: "VANI, mobile app foundation status dikhao"
      })
    });
    $("vaniOutput").textContent = JSON.stringify(data.screenPreview, null, 2);
  } catch (err) {
    $("vaniOutput").textContent = err.message;
  }
}

$("roleSelect").addEventListener("change", loadNavigation);
$("vaniBtn").addEventListener("click", testVani);

loadStatus();
loadFeatures().catch(console.error);
loadNavigation().catch(console.error);
loadOfflinePolicy().catch(console.error);
