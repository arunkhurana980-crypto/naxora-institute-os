const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
if (!token) window.location.href = "index.html";

const form = document.querySelector("#settingsForm");
const message = document.querySelector("#settingsMessage");

const fields = [
  "instituteName", "legalName", "tagline", "logoUrl", "brandColor", "accentColor", "themeMode",
  "ownerName", "ownerPhone", "ownerEmail", "supportPhone", "supportEmail", "websiteUrl",
  "addressLine1", "addressLine2", "city", "district", "state", "pinCode",
  "academicYearName", "academicStartDate", "academicEndDate", "workingDays", "openingTime", "closingTime",
  "receiptPrefix", "receiptFooter", "invoiceNote", "taxEnabled", "taxName", "taxPercent",
  "certificatePrefix", "certificateAuthority", "certificateSignatureUrl", "certificateSealUrl",
  "defaultAttendanceRule", "minimumAttendancePercent", "feeDueDay", "lateFeeEnabled", "lateFeeAmount",
  "studentIdPrefix", "teacherIdPrefix", "branchCodePrefix", "whatsappEnabled", "emailEnabled", "smsEnabled", "autoBackupEnabled", "notes"
];

function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function formatDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
function setValue(id, value) {
  const el = document.querySelector(`#${id}`);
  if (!el) return;
  if (el.type === "date") el.value = formatDateInput(value);
  else if (Array.isArray(value)) el.value = value.join(",");
  else el.value = value ?? "";
}
function getValue(id) {
  const el = document.querySelector(`#${id}`);
  return el ? el.value.trim() : "";
}
function applyPreview(settings = {}, preview = {}) {
  document.querySelector("#previewInstituteName").textContent = settings.instituteName || "NAXORA Institute";
  document.querySelector("#previewTagline").textContent = settings.tagline || "AI-powered coaching management";
  document.querySelector("#previewAddress").textContent = preview.fullAddress || "Address not set";
  document.querySelector("#receiptSampleNo").textContent = preview.receiptSampleNo || "NXR-RCPT-0001";
  document.querySelector("#certificateSampleNo").textContent = preview.certificateSampleNo || "NXR-CERT-0001";
  document.querySelector("#studentSampleId").textContent = preview.studentSampleId || "NXR-STU-001";
  document.querySelector("#teacherSampleId").textContent = preview.teacherSampleId || "NXR-TCH-001";
  const logo = document.querySelector("#previewLogo");
  if (settings.logoUrl) logo.innerHTML = `<img src="${escapeHtml(settings.logoUrl)}" alt="Logo" />`;
  else logo.textContent = (settings.instituteName || "N").slice(0, 1).toUpperCase();
  const brand = settings.brandColor || "#D4AF37";
  const accent = settings.accentColor || "#00D4FF";
  logo.style.background = `linear-gradient(135deg, ${brand}, ${accent})`;
  document.documentElement.style.setProperty("--gold", brand);
}
function fillForm(settings = {}) {
  fields.forEach((id) => setValue(id, settings[id]));
}
function payloadFromForm() {
  const payload = {};
  fields.forEach((id) => { payload[id] = getValue(id); });
  return payload;
}
async function loadSettings() {
  message.textContent = "Settings loading…";
  try {
    const response = await fetch(`${API}/settings`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Settings load failed");
    fillForm(data.settings || {});
    applyPreview(data.settings || {}, data.preview || {});
    message.textContent = "✅ Part 27 Settings backend se connected hai.";
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.clear();
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}
async function saveSettings(event) {
  event.preventDefault();
  message.textContent = "Saving settings…";
  try {
    const response = await fetch(`${API}/settings`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payloadFromForm()),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Settings save failed");
    fillForm(data.settings || {});
    applyPreview(data.settings || {}, data.preview || {});
    message.textContent = `✅ ${data.message}`;
  } catch (error) { message.textContent = `❌ ${error.message}`; }
}
async function resetSettings() {
  const sure = confirm("Settings ko default par reset karna hai?");
  if (!sure) return;
  message.textContent = "Resetting…";
  try {
    const response = await fetch(`${API}/settings/reset`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Reset failed");
    fillForm(data.settings || {});
    applyPreview(data.settings || {}, data.preview || {});
    message.textContent = `✅ ${data.message}`;
  } catch (error) { message.textContent = `❌ ${error.message}`; }
}

form.addEventListener("submit", saveSettings);
document.querySelector("#refreshSettingsBtn").addEventListener("click", loadSettings);
document.querySelector("#resetSettingsBtn").addEventListener("click", resetSettings);
document.querySelector("#logoutBtn").addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
["instituteName", "tagline", "logoUrl", "brandColor", "accentColor", "addressLine1", "city", "state", "pinCode", "receiptPrefix", "certificatePrefix", "studentIdPrefix", "teacherIdPrefix"].forEach((id) => {
  const el = document.querySelector(`#${id}`);
  if (el) el.addEventListener("input", () => applyPreview(payloadFromForm(), {
    fullAddress: [getValue("addressLine1"), getValue("city"), getValue("state"), getValue("pinCode")].filter(Boolean).join(", ") || "Address not set",
    receiptSampleNo: `${getValue("receiptPrefix") || "NXR-RCPT"}-0001`,
    certificateSampleNo: `${getValue("certificatePrefix") || "NXR-CERT"}-0001`,
    studentSampleId: `${getValue("studentIdPrefix") || "NXR-STU"}-001`,
    teacherSampleId: `${getValue("teacherIdPrefix") || "NXR-TCH"}-001`,
  }));
});
loadSettings();
