const $ = (id) => document.getElementById(id);
const TOKEN_KEYS = ["naxoraToken", "naxora_token", "authToken", "accessToken", "token", "jwt"];

function findExistingToken() {
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of TOKEN_KEYS) {
      const value = storage.getItem(key);
      if (value && value.split(".").length === 3) return value;
    }
  }
  return "";
}

function currentToken() {
  return $("jwtToken").value.trim() || sessionStorage.getItem("part112OwnerToken") || findExistingToken();
}

function authHeaders(json = false) {
  const headers = {
    Authorization: `Bearer ${currentToken()}`,
    "x-naxora-institute-id": $("instituteId").value.trim(),
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function getJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `${response.status} ${response.statusText}`);
    error.data = data;
    throw error;
  }
  return data;
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function setBusy(button, busy) {
  button.disabled = busy;
  button.dataset.original ||= button.textContent;
  button.textContent = busy ? "Please wait…" : button.dataset.original;
}

function renderStatus(data) {
  $("modeBadge").textContent = data.testModeLocked ? "TEST MODE LOCKED" : "MODE CHECK REQUIRED";
  $("modeBadge").className = `badge ${data.testModeLocked ? "good" : "bad"}`;
  $("headline").textContent = data.foundationReady ? "Foundation environment ready" : "Environment setup pending";
  $("subline").textContent = data.realMoneyCollectionEnabled
    ? "Unexpected live state detected"
    : "Real-money collection disabled";

  const metrics = [
    [data.mode || "unknown", "Provider mode", data.testModeLocked ? "good" : "bad"],
    [data.credentialsConfigured ? "Yes" : "No", "Test credentials", data.credentialsConfigured ? "good" : "warn"],
    [data.webhookSecretConfigured ? "Yes" : "No", "Webhook secret", data.webhookSecretConfigured ? "good" : "warn"],
    [data.databaseConnected ? "Yes" : "No", "MongoDB connected", data.databaseConnected ? "good" : "warn"],
    [data.checkoutEnabled ? "Enabled" : "Locked", "Checkout", data.checkoutEnabled ? "bad" : "good"],
    [data.subscriptionCreationEnabled ? "Enabled" : "Locked", "Subscriptions", data.subscriptionCreationEnabled ? "bad" : "good"],
  ];
  $("metrics").innerHTML = metrics.map(([value, label, cls]) =>
    `<div class="metric"><strong class="${cls}">${value}</strong><span>${label}</span></div>`
  ).join("");
}

async function loadStatus() {
  try {
    const [status, checklistData] = await Promise.all([
      getJSON("/api/part112/status"),
      getJSON("/api/part112/checklist"),
    ]);
    renderStatus(status);
    $("checklist").innerHTML = (checklistData.checklist || []).map((item) =>
      `<div class="item"><span>${item.label}</span><strong class="${item.status === "pass" ? "good" : item.status === "fail" ? "bad" : "warn"}">${item.status}</strong></div>`
    ).join("");
  } catch (error) {
    $("headline").textContent = "Part 112 status failed";
    $("subline").textContent = error.message;
  }
}

function detectToken() {
  const token = findExistingToken();
  if (token) {
    $("jwtToken").value = token;
    sessionStorage.setItem("part112OwnerToken", token);
    $("vaniOutput").textContent = "Existing login token detected. Token private input me hidden hai.";
  } else {
    $("vaniOutput").textContent = "Existing JWT token detect nahi hua. Pehle owner login karein ya private token field use karein.";
  }
}

async function protectedCall(url, options = {}) {
  if (!currentToken()) throw new Error("Owner JWT token required.");
  sessionStorage.setItem("part112OwnerToken", currentToken());
  return getJSON(url, options);
}

async function loadReadiness() {
  const button = $("loadReadinessBtn");
  setBusy(button, true);
  try {
    const data = await protectedCall("/api/part112/readiness", { headers: authHeaders(false) });
    $("vaniOutput").textContent = pretty(data);
  } catch (error) {
    $("vaniOutput").textContent = pretty(error.data || { error: error.message });
  } finally {
    setBusy(button, false);
  }
}

async function askVani() {
  const button = $("askVaniBtn");
  setBusy(button, true);
  try {
    const data = await protectedCall("/api/part112/vani/command", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ command: $("vaniCommand").value, instituteId: $("instituteId").value }),
    });
    $("vaniOutput").textContent = pretty(data);
    if (data.spokenSafeSummary && "speechSynthesis" in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(data.spokenSafeSummary);
      utterance.lang = "hi-IN";
      speechSynthesis.speak(utterance);
    }
  } catch (error) {
    $("vaniOutput").textContent = pretty(error.data || { error: error.message });
  } finally {
    setBusy(button, false);
  }
}

async function testConnection() {
  const button = $("testConnectionBtn");
  setBusy(button, true);
  try {
    const data = await protectedCall("/api/part112/connection-test", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ instituteId: $("instituteId").value }),
    });
    $("vaniOutput").textContent = pretty(data);
  } catch (error) {
    $("vaniOutput").textContent = pretty(error.data || { error: error.message });
  } finally {
    setBusy(button, false);
  }
}

async function previewSetup() {
  const button = $("previewBtn");
  setBusy(button, true);
  try {
    const data = await protectedCall("/api/part112/setup/preview", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ instituteId: $("instituteId").value }),
    });
    $("previewOutput").textContent = pretty(data);
  } catch (error) {
    $("previewOutput").textContent = pretty(error.data || { error: error.message });
  } finally {
    setBusy(button, false);
  }
}

async function confirmSetup() {
  const button = $("confirmBtn");
  setBusy(button, true);
  try {
    const data = await protectedCall("/api/part112/setup/confirm", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({
        instituteId: $("instituteId").value,
        confirmationText: $("confirmationText").value,
      }),
    });
    $("previewOutput").textContent = pretty(data);
    await loadStatus();
  } catch (error) {
    $("previewOutput").textContent = pretty(error.data || { error: error.message });
  } finally {
    setBusy(button, false);
  }
}

$("detectTokenBtn").addEventListener("click", detectToken);
$("loadReadinessBtn").addEventListener("click", loadReadiness);
$("refreshStatusBtn").addEventListener("click", loadStatus);
$("askVaniBtn").addEventListener("click", askVani);
$("testConnectionBtn").addEventListener("click", testConnection);
$("previewBtn").addEventListener("click", previewSetup);
$("confirmBtn").addEventListener("click", confirmSetup);

const initialToken = findExistingToken();
if (initialToken) $("jwtToken").value = initialToken;
loadStatus();
