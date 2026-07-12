const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

if (!token) window.location.href = "index.html";

const $ = (selector) => document.querySelector(selector);
function setText(id, value) { const el = $(`#${id}`); if (el) el.textContent = value; }
function row(label, value, ok) {
  const statusClass = ok ? "status-ok" : "status-bad";
  return `<div class="security-row"><b>${label}</b><span class="${statusClass}">${value}</span></div>`;
}
function neutralRow(label, value) {
  return `<div class="security-row"><b>${label}</b><span class="status-warn">${value}</span></div>`;
}
function logoutOnAuthError(error) {
  const message = String(error.message || "").toLowerCase();
  if (message.includes("token") || message.includes("login") || message.includes("authorized")) {
    localStorage.removeItem("naxora_token");
    localStorage.removeItem("naxora_user");
    setTimeout(() => (window.location.href = "index.html"), 800);
  }
}
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
async function publicRequest(path) {
  const response = await fetch(`${API}${path}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}
async function loadSecurity() {
  setText("securityMessage", "Security status loading…");
  try {
    const data = await apiRequest("/security/status");
    setText("headersStatus", data.security.headers);
    setText("rateLimitStatus", data.security.rateLimit);
    setText("databaseStatus", data.database.status);
    setText("validationStatus", data.security.authValidation);

    $("#envList").innerHTML = data.environment.checks.map((item) => row(item.key, item.safeValue, item.ok)).join("");
    $("#quickFixList").innerHTML = data.quickFixes.map((item, index) => neutralRow(`Fix ${index + 1}`, item)).join("");
    setText("securityMessage", "✅ Part 29 security panel backend se connected hai.");
  } catch (error) {
    setText("securityMessage", `❌ ${error.message}`);
    logoutOnAuthError(error);
  }
}
async function runDebug() {
  try {
    const data = await publicRequest("/security/debug");
    $("#debugOutput").textContent = JSON.stringify({
      frontendUrl: window.location.href,
      apiBase: API,
      tokenAvailable: Boolean(token),
      ...data,
    }, null, 2);
  } catch (error) {
    $("#debugOutput").textContent = `Debug failed: ${error.message}`;
  }
}
$("#refreshSecurityBtn")?.addEventListener("click", loadSecurity);
$("#runDebugBtn")?.addEventListener("click", runDebug);
$("#openHealthBtn")?.addEventListener("click", () => window.open(`${API.replace(/\/api$/, "")}/api/health`, "_blank"));
$("#clearTokenBtn")?.addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
$("#logoutBtn")?.addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });

loadSecurity();
