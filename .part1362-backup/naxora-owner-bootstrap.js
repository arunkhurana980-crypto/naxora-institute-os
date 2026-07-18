const $ = id => document.getElementById(id);
let preview = null;

function normalizeSecret(value = "") {
  let output = String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (output.length >= 2 && ((output.startsWith('"') && output.endsWith('"')) || (output.startsWith("'") && output.endsWith("'")))) {
    output = output.slice(1, -1).trim();
  }
  return output;
}
function showMessage(text, type = "error") {
  $("messageBox").hidden = false;
  $("messageBox").className = `message ${type}`;
  $("messageBox").textContent = text;
}
function busy(button, state, label = "Please wait…") {
  button.dataset.original ||= button.textContent;
  button.disabled = state;
  button.textContent = state ? label : button.dataset.original;
}
async function api(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `${response.status} ${response.statusText}`);
    error.data = data;
    throw error;
  }
  return data;
}
function currentSecret() { return normalizeSecret($("bootstrapSecret").value); }
function secretHeaders() {
  return { "Content-Type": "application/json", "x-naxora-bootstrap-secret": currentSecret() };
}
function secretBody(payload = {}) {
  return JSON.stringify({ ...payload, bootstrapSecret: currentSecret() });
}
function saveSession(data) {
  for (const storage of [sessionStorage, localStorage]) {
    storage.removeItem("naxoraToken");
    storage.removeItem("naxoraInstituteId");
    storage.removeItem("naxoraSession");
  }
  sessionStorage.setItem("naxoraToken", data.token);
  sessionStorage.setItem("naxoraInstituteId", data.institute.instituteId);
  sessionStorage.setItem("naxoraSession", JSON.stringify(data.session || {}));
}
function diagnosticText(error) {
  const diagnostic = error.data?.diagnostic;
  return diagnostic ? ` [Received: ${diagnostic.receivedVia}; typed length: ${diagnostic.suppliedLength}; Render length: ${diagnostic.expectedLength}]` : "";
}
async function loadStatus() {
  try {
    const data = await api("/api/part1361/status");
    $("statusHeading").textContent = data.bootstrapAvailable ? "First Owner setup available" : "Bootstrap currently unavailable";
    $("statusBox").textContent = data.bootstrapAvailable
      ? "Private bootstrap secret enter karein. Part 136.2 header aur secure HTTPS body dono se verification karega."
      : data.bootstrapReasonCode === "BOOTSTRAP_SECRET_NOT_CONFIGURED"
        ? "Render Environment me NAXORA_OWNER_BOOTSTRAP_SECRET configure nahi hai."
        : data.firstOwnerExists ? "First Institute Owner already exists. Common Login use karein." : `Bootstrap unavailable: ${data.bootstrapReasonCode}`;
    $("bootstrapForm").hidden = !data.bootstrapAvailable;
    if (data.firstOwnerExists) $("confirmPanel").hidden = true;
  } catch (error) { showMessage(error.data?.message || error.message); }
}
async function verifySecretBeforeAction() {
  if (!currentSecret()) throw new Error("Private bootstrap secret required.");
  const data = await api("/api/part1361/bootstrap/verify-secret", {
    method: "POST", headers: secretHeaders(), body: secretBody({})
  });
  showMessage(`Bootstrap secret matched securely (${data.receivedVia}).`, "success");
  return data;
}
$("bootstrapForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = $("previewBtn");
  busy(button, true, "Verifying…");
  try {
    await verifySecretBeforeAction();
    busy(button, true, "Generating…");
    const data = await api("/api/part1361/bootstrap/preview", {
      method: "POST", headers: secretHeaders(),
      body: secretBody({ instituteName: $("instituteName").value, ownerDisplayName: $("ownerDisplayName").value, identifier: $("identifier").value })
    });
    preview = data.preview;
    $("previewDetails").innerHTML = `<strong>${preview.instituteName}</strong><span>Institute ID: ${preview.instituteId}</span><span>Owner: ${preview.ownerDisplayName}</span><span>Login ID: ${preview.identifier}</span>`;
    $("confirmationText").value = preview.confirmationTextRequired || "";
    $("confirmPanel").hidden = false;
    showMessage("Preview ready. Institute ID aur Owner details review karein.", "success");
    $("confirmPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { showMessage(`${error.data?.message || error.message}${diagnosticText(error)}`); }
  finally { busy(button, false); }
});
$("confirmBtn").addEventListener("click", async () => {
  const button = $("confirmBtn");
  busy(button, true, "Verifying…");
  try {
    if (!preview) throw new Error("Pehle preview generate karein.");
    await verifySecretBeforeAction();
    busy(button, true, "Creating Owner…");
    const data = await api("/api/part1361/bootstrap/confirm", {
      method: "POST", headers: secretHeaders(),
      body: secretBody({ previewId: preview.previewId, confirmationText: $("confirmationText").value, password: $("password").value })
    });
    saveSession(data);
    $("bootstrapSecret").value = "";
    $("password").value = "";
    $("bootstrapForm").hidden = true;
    $("confirmPanel").hidden = true;
    $("successPanel").hidden = false;
    $("finalInstituteId").textContent = data.institute.instituteId;
    showMessage("First Owner account successfully create ho gaya.", "success");
  } catch (error) { showMessage(`${error.data?.message || error.message}${diagnosticText(error)}`); }
  finally { busy(button, false); }
});
function toggle(inputId, buttonId) {
  const input = $(inputId), button = $(buttonId);
  input.type = input.type === "password" ? "text" : "password";
  button.textContent = input.type === "password" ? "Show" : "Hide";
}
$("toggleSecret").addEventListener("click", () => toggle("bootstrapSecret", "toggleSecret"));
$("togglePassword").addEventListener("click", () => toggle("password", "togglePassword"));
$("copyIdBtn").addEventListener("click", async () => {
  const value = $("finalInstituteId").textContent.trim();
  try { await navigator.clipboard.writeText(value); showMessage("Institute ID copied.", "success"); }
  catch { showMessage("Copy nahi hua. Institute ID manually save karein."); }
});
loadStatus();
