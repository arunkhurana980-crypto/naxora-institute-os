const $ = (id) => document.getElementById(id);
const TOKEN_KEYS = ["naxoraToken", "naxora_token", "authToken", "accessToken", "token", "jwt"];

function findToken() {
  for (const storage of [sessionStorage, localStorage]) {
    for (const key of TOKEN_KEYS) {
      const value = storage.getItem(key);
      if (value && value.split(".").length === 3) return value;
    }
  }
  return "";
}

function token() {
  return $("jwtToken").value.trim() || sessionStorage.getItem("part115OwnerToken") || findToken();
}

function headers(json = false) {
  const result = {
    Authorization: `Bearer ${token()}`,
    "x-naxora-institute-id": $("instituteId").value.trim(),
  };
  if (json) result["Content-Type"] = "application/json";
  return result;
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `${response.status} ${response.statusText}`);
    error.data = data;
    throw error;
  }
  return data;
}

function protectedRequest(url, options = {}) {
  if (!token()) throw new Error("Owner JWT token required.");
  sessionStorage.setItem("part115OwnerToken", token());
  return request(url, options);
}

function pretty(value) { return JSON.stringify(value, null, 2); }
function busy(button, state) {
  button.dataset.label ||= button.textContent;
  button.disabled = state;
  button.textContent = state ? "Please wait…" : button.dataset.label;
}

async function loadStatus() {
  try {
    const data = await request("/api/part115/status");
    $("modeBadge").textContent = data.testModeLocked ? "TEST MODE" : "MODE CHECK";
    $("modeBadge").className = `badge ${data.testModeLocked ? "good" : "bad"}`;
    $("statusHeadline").textContent = data.webhookEndpointReady ? "Secure webhook endpoint ready" : "Webhook dependency pending";
    $("statusText").textContent = `Secret: ${data.webhookSecretConfigured ? "configured" : "pending"} • MongoDB: ${data.databaseConnected ? "connected" : "pending"} • Access unlock: locked`;
  } catch (error) {
    $("statusHeadline").textContent = "Part 115 status failed";
    $("statusText").textContent = error.message;
  }
}

function detectToken() {
  const existing = findToken();
  if (existing) {
    $("jwtToken").value = existing;
    sessionStorage.setItem("part115OwnerToken", existing);
    $("sessionOutput").textContent = "Existing owner token detected. Private input me hidden hai.";
  } else {
    $("sessionOutput").textContent = "Existing owner JWT detect nahi hua. Pehle owner login karein.";
  }
}

async function loadSetup() {
  const button = $("loadSetupBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part115/setup", { headers: headers(false) });
    $("webhookUrl").value = data.webhookUrl || "";
    $("eventList").innerHTML = (data.activeEventsToSelect || []).map((event) => `<div class="event">${event}</div>`).join("");
    $("sessionOutput").textContent = pretty(data);
  } catch (error) {
    $("sessionOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function copyUrl() {
  const value = $("webhookUrl").value;
  if (!value || value === "Load owner setup first") return;
  await navigator.clipboard.writeText(value);
  $("copyUrlBtn").textContent = "Copied";
  setTimeout(() => { $("copyUrlBtn").textContent = "Copy URL"; }, 1200);
}

async function loadHealth() {
  const button = $("loadHealthBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part115/health", { headers: headers(false) });
    $("healthOutput").textContent = pretty(data);
  } catch (error) {
    $("healthOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function loadEvents(status = "") {
  const button = status ? $("loadFailuresBtn") : $("loadEventsBtn"); busy(button, true);
  try {
    const url = status ? `/api/part115/events?status=${encodeURIComponent(status)}` : "/api/part115/events";
    const data = await protectedRequest(url, { headers: headers(false) });
    $("eventsOutput").textContent = pretty(data);
  } catch (error) {
    $("eventsOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function loadSync() {
  const button = $("loadSyncBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part115/sync-states", { headers: headers(false) });
    $("syncOutput").textContent = pretty(data);
  } catch (error) {
    $("syncOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function reconcile() {
  const button = $("reconcileBtn"); busy(button, true);
  try {
    const id = $("localSubscriptionId").value.trim();
    if (!id) throw new Error("Local Part 114 Subscription ID required.");
    const data = await protectedRequest(`/api/part115/subscription/${encodeURIComponent(id)}/reconcile`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({ instituteId: $("instituteId").value }),
    });
    $("reconcileOutput").textContent = pretty(data);
  } catch (error) {
    $("reconcileOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function askVani() {
  const button = $("askVaniBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part115/vani/command", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({
        instituteId: $("instituteId").value,
        command: $("vaniCommand").value,
        localSubscriptionId: $("localSubscriptionId").value.trim(),
      }),
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
  } finally { busy(button, false); }
}

$("detectTokenBtn").addEventListener("click", detectToken);
$("loadSetupBtn").addEventListener("click", loadSetup);
$("copyUrlBtn").addEventListener("click", copyUrl);
$("loadHealthBtn").addEventListener("click", loadHealth);
$("loadEventsBtn").addEventListener("click", () => loadEvents(""));
$("loadFailuresBtn").addEventListener("click", () => loadEvents("failed"));
$("loadSyncBtn").addEventListener("click", loadSync);
$("reconcileBtn").addEventListener("click", reconcile);
$("askVaniBtn").addEventListener("click", askVani);

const initialToken = findToken();
if (initialToken) $("jwtToken").value = initialToken;
loadStatus();
