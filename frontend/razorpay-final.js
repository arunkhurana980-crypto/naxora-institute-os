
const API = (() => {
  const host = window.location.hostname || "127.0.0.1";
  if (window.location.port === "5000") return `${window.location.origin}/api`;
  return `http://${host}:5000/api`;
})();

const token = localStorage.getItem("naxora_token") || localStorage.getItem("token") || "";
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const msg = document.getElementById("pageMessage");
let planCache = [];

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
}

function setMessage(text, danger = false) {
  msg.textContent = text || "";
  msg.style.color = danger ? "#fecaca" : "#86efac";
}

function renderStatus(data) {
  const r = data.razorpay || {};
  const modeClass = r.providerMode === "mock-mode" ? "warn" : "good";
  document.getElementById("statusGrid").innerHTML = `
    <div class="rzp-stat"><span>Provider Mode</span><strong>${r.providerMode || "mock-mode"}</strong><small class="rzp-pill ${modeClass}">${r.keyMode || "mock"}</small></div>
    <div class="rzp-stat"><span>Key ID</span><strong>${r.safeKeyPreview || "missing"}</strong><small>${r.hasKeyId ? "Key detected" : "Add key in .env"}</small></div>
    <div class="rzp-stat"><span>Key Secret</span><strong>${r.secretPreview || "missing"}</strong><small>Never expose secret</small></div>
    <div class="rzp-stat"><span>Webhook Secret</span><strong>${r.hasWebhookSecret ? "present" : "optional"}</strong><small>/api/payments/webhook</small></div>
  `;
}

function renderPlans(data) {
  planCache = data.plans || [];
  document.getElementById("planCode").innerHTML = planCache.map(p => `<option value="${p.code}">${p.name} — ${money(p.amount)}</option>`).join("");
  document.getElementById("plansGrid").innerHTML = planCache.map(plan => `
    <article class="rzp-plan">
      <span class="rzp-pill">${plan.billing}</span>
      <h3>${plan.name}</h3>
      <div class="price">${money(plan.amount)}<small>/${plan.billing}</small></div>
      <p>${plan.bestFor}</p>
      <ul>${(plan.includes || []).map(item => `<li>${item}</li>`).join("")}</ul>
    </article>
  `).join("");
}

function renderChecklist(data) {
  document.getElementById("checklist").innerHTML = (data.checklist || []).map((item, index) => `<li><b>${index + 1}.</b> ${item}</li>`).join("");
}

async function loadAll() {
  try {
    const [status, pricing, checklist] = await Promise.all([
      api("/razorpay-final/status"),
      api("/razorpay-final/pricing"),
      api("/razorpay-final/checklist"),
    ]);
    renderStatus(status);
    renderPlans(pricing);
    renderChecklist(checklist);
    setMessage("Part 48 Razorpay Final status loaded.");
  } catch (error) {
    setMessage(`Failed: ${error.message}`, true);
  }
}

document.getElementById("quickForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const data = await api("/razorpay-final/quick-payment", { method: "POST", body: JSON.stringify(payload) });
    document.getElementById("payloadBox").textContent = JSON.stringify(data.paymentPayload, null, 2);
    setMessage("Payload ready. Payments page me same details add karke order create karo.");
  } catch (error) {
    setMessage(`Payload error: ${error.message}`, true);
  }
});

document.getElementById("refreshBtn").addEventListener("click", loadAll);
document.getElementById("logoutBtn")?.addEventListener("click", () => { localStorage.clear(); window.location.href = "index.html"; });
loadAll();
