const $ = (id) => document.getElementById(id);
const TOKEN_KEYS = ["naxoraToken", "naxora_token", "authToken", "accessToken", "token", "jwt"];
let templates = [];
let currentDraftId = "";

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
  return $("jwtToken").value.trim() || sessionStorage.getItem("part113OwnerToken") || findToken();
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

function pretty(value) { return JSON.stringify(value, null, 2); }
function busy(button, state) {
  button.dataset.label ||= button.textContent;
  button.disabled = state;
  button.textContent = state ? "Please wait…" : button.dataset.label;
}

function protectedRequest(url, options = {}) {
  if (!token()) throw new Error("Owner JWT token required.");
  sessionStorage.setItem("part113OwnerToken", token());
  return request(url, options);
}

async function loadPublic() {
  try {
    const [status, templateData] = await Promise.all([
      request("/api/part113/status"),
      request("/api/part113/templates"),
    ]);
    $("modeBadge").textContent = status.testModeLocked ? "TEST MODE" : "MODE CHECK";
    $("modeBadge").className = `badge ${status.testModeLocked ? "good" : "bad"}`;
    $("statusHeadline").textContent = status.razorpayTestPlanCreationEnabled ? "Test Plan creation ready" : "Setup/readiness pending";
    $("statusText").textContent = `MongoDB: ${status.databaseConnected ? "connected" : "pending"} • Checkout: locked`;
    templates = templateData.templates || [];
    $("planCode").innerHTML = templates.map((item) => `<option value="${item.code}">${item.name}</option>`).join("");
    $("templateCards").innerHTML = templates.map((item) =>
      `<div class="template"><strong>${item.name}</strong><p>${item.description}</p><span>${item.features.join(" • ")}</span></div>`
    ).join("");
    applyTemplate();
  } catch (error) {
    $("statusHeadline").textContent = "Part 113 load failed";
    $("statusText").textContent = error.message;
  }
}

function applyTemplate() {
  const selected = templates.find((item) => item.code === $("planCode").value);
  if (!selected) return;
  $("planName").value = selected.name;
  $("description").value = selected.description;
}

function detectToken() {
  const existing = findToken();
  if (existing) {
    $("jwtToken").value = existing;
    sessionStorage.setItem("part113OwnerToken", existing);
    $("readinessOutput").textContent = "Existing owner token detected. Private input me hidden hai.";
  } else {
    $("readinessOutput").textContent = "Existing token detect nahi hua. Pehle owner login karein.";
  }
}

async function readiness() {
  const button = $("readinessBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part113/readiness", { headers: headers(false) });
    $("readinessOutput").textContent = pretty(data);
  } catch (error) {
    $("readinessOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function preview() {
  const button = $("previewBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part113/plan/preview", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({
        instituteId: $("instituteId").value,
        planCode: $("planCode").value,
        name: $("planName").value,
        period: $("period").value,
        amountRupees: $("amountRupees").value,
        description: $("description").value,
      }),
    });
    currentDraftId = data.preview?.id || "";
    $("confirmationText").value = data.confirmationTextRequired || "";
    $("previewOutput").textContent = pretty(data);
  } catch (error) {
    $("previewOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function createPlan() {
  const button = $("createPlanBtn"); busy(button, true);
  try {
    if (!currentDraftId) throw new Error("Pehle plan preview banaiye.");
    const data = await protectedRequest("/api/part113/plan/create-confirmed", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({
        instituteId: $("instituteId").value,
        draftId: currentDraftId,
        confirmationText: $("confirmationText").value,
      }),
    });
    $("previewOutput").textContent = pretty(data);
  } catch (error) {
    $("previewOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

async function askVani() {
  const button = $("askVaniBtn"); busy(button, true);
  try {
    const data = await protectedRequest("/api/part113/vani/command", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({ instituteId: $("instituteId").value, command: $("vaniCommand").value }),
    });
    $("vaniOutput").textContent = pretty(data);
    if (data.preview?.id) {
      currentDraftId = data.preview.id;
      $("confirmationText").value = data.confirmationTextRequired || "";
      $("previewOutput").textContent = pretty(data);
    }
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

async function loadPlans(source) {
  const button = source === "local" ? $("loadLocalBtn") : $("loadProviderBtn"); busy(button, true);
  try {
    const data = await protectedRequest(`/api/part113/plans/${source}`, { headers: headers(false) });
    $("plansOutput").textContent = pretty(data);
  } catch (error) {
    $("plansOutput").textContent = pretty(error.data || { error: error.message });
  } finally { busy(button, false); }
}

$("detectTokenBtn").addEventListener("click", detectToken);
$("readinessBtn").addEventListener("click", readiness);
$("planCode").addEventListener("change", applyTemplate);
$("previewBtn").addEventListener("click", preview);
$("createPlanBtn").addEventListener("click", createPlan);
$("askVaniBtn").addEventListener("click", askVani);
$("loadLocalBtn").addEventListener("click", () => loadPlans("local"));
$("loadProviderBtn").addEventListener("click", () => loadPlans("provider"));

const initialToken = findToken();
if (initialToken) $("jwtToken").value = initialToken;
loadPublic();
