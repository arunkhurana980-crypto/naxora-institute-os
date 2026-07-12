const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

const form = document.querySelector("#subscriptionForm");
const message = document.querySelector("#subscriptionMessage");
const listMessage = document.querySelector("#subscriptionListMessage");
const subscriptionList = document.querySelector("#subscriptionList");
const planGrid = document.querySelector("#planGrid");

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function money(value = 0) { return `₹${Number(value || 0).toLocaleString("en-IN")}`; }
function escapeHtml(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function label(value = "") { return String(value || "").replaceAll("_", " "); }
function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function dateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}
function numberOrZero(value) { return Number(value || 0); }
function queryParams() {
  const params = new URLSearchParams();
  const map = { search: "subscriptionSearch", planName: "planFilter", status: "statusFilter", billingCycle: "cycleFilter" };
  Object.entries(map).forEach(([key, id]) => { const value = getValue(id); if (value) params.set(key, value); });
  return params.toString();
}
function setStats(data) {
  document.querySelector("#totalSubscriptions").textContent = data.totalSubscriptions || 0;
  document.querySelector("#activeSubscriptions").textContent = data.activeSubscriptions || 0;
  document.querySelector("#expiringSoon").textContent = data.expiringSoon || 0;
  document.querySelector("#estimatedMRR").textContent = money(data.estimatedMRR || 0);
}
function renderPlans(plans = {}, addons = {}) {
  const order = ["free", "starter", "pro", "premium", "enterprise"];
  planGrid.innerHTML = order.map((key) => {
    const plan = plans[key] || {};
    return `<article class="plan-card">
      <h3>${escapeHtml(plan.label || key)}</h3>
      <div class="plan-price">${money(plan.monthlyPrice || 0)}<small>/mo</small></div>
      <p>${money(plan.yearlyPrice || 0)} yearly • ${plan.limits?.students || 0} students • ${plan.limits?.branches || 0} branch</p>
      <ul>${(plan.features || []).slice(0, 4).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
    </article>`;
  }).join("") + `<article class="plan-card vani-card">
      <h3>${escapeHtml(addons.vani_ai?.name || "NAXORA VANI AI")}</h3>
      <div class="plan-price">₹1,499<small>/mo</small></div>
      <p>Founding offer ₹799/month • Yearly ₹14,999 • Multi-branch ₹2,999/month</p>
      <ul><li>Voice Search Foundation</li><li>Voice Reports</li><li>Secure Voice Actions later</li></ul>
    </article>`;
}
function usageBlock(item) {
  const usage = item.usage || {};
  const limits = item.limits || {};
  const percent = item.usagePercent || {};
  const rows = [
    ["Students", usage.students, limits.students, percent.students],
    ["Teachers", usage.teachers, limits.teachers, percent.teachers],
    ["Branches", usage.branches, limits.branches, percent.branches],
    ["AI Doubts", usage.aiDoubtsThisMonth, limits.aiDoubtsPerMonth, percent.aiDoubts],
    ["Storage", usage.storageGBUsed, `${limits.storageGB} GB`, percent.storage],
    ["Users", usage.users, limits.users, percent.users],
  ];
  return `<div class="subscription-usage">${rows.map(([name, used, limit, pct]) => `<div class="usage-pill"><span>${name}</span><b>${used || 0} / ${limit || 0}</b><div class="usage-bar"><i style="width:${pct || 0}%"></i></div></div>`).join("")}</div>`;
}
function renderSubscriptions(items = []) {
  if (!items.length) {
    subscriptionList.innerHTML = `<p class="empty-state">Abhi subscription records nahi hain. Upar se ek institute subscription add karo.</p>`;
    return;
  }
  subscriptionList.innerHTML = items.map((item) => {
    const vani = (item.addons || []).find((a) => a.key === "vani_ai" && a.enabled && a.status === "active");
    return `<article class="data-card subscription-card" data-id="${item.id}">
      <div class="data-top">
        <div>
          <h3>${escapeHtml(item.instituteName)} ${vani ? `<span class="tag vani-badge">VANI AI</span>` : ""}</h3>
          <p>${escapeHtml(item.ownerName || "No owner")} • ${escapeHtml(item.ownerPhone || "No phone")} • ${escapeHtml(item.city || "No city")}</p>
        </div>
        <div class="subscription-badges">
          <span class="tag gold">${escapeHtml(label(item.planName))}</span>
          <span class="tag status-${escapeHtml(item.status)}">${escapeHtml(label(item.status))}</span>
          <span class="tag">${escapeHtml(label(item.billingCycle))}</span>
        </div>
      </div>
      <div class="priority-strip">
        <div><span>Amount Due</span><b>${money(item.amountDue || 0)}</b></div>
        <div><span>Expiry</span><b>${formatDate(item.expiryDate)}</b></div>
        <div><span>Days Left</span><b>${item.daysLeft ?? "—"}</b></div>
        <div><span>Last Payment</span><b>${money(item.lastPaymentAmount || 0)}</b></div>
      </div>
      ${usageBlock(item)}
      ${item.notes ? `<div class="last-note"><b>Notes:</b> ${escapeHtml(item.notes)}</div>` : ""}
      <div class="card-actions">
        <button class="edit-btn" data-action="edit">Edit</button>
        <button class="edit-btn" data-action="active">Active</button>
        <button class="edit-btn" data-action="past_due">Past Due</button>
        <button class="edit-btn" data-action="vani">Toggle VANI</button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>`;
  }).join("");
}
function payloadFromForm() {
  const vaniEnabled = document.querySelector("#vaniEnabled").checked;
  const vaniBilling = getValue("vaniBilling") || "monthly";
  return {
    instituteName: getValue("instituteName"),
    ownerName: getValue("ownerName"),
    ownerPhone: getValue("ownerPhone"),
    ownerEmail: getValue("ownerEmail"),
    city: getValue("city"),
    planName: getValue("planName"),
    billingCycle: getValue("billingCycle"),
    status: getValue("status"),
    basePrice: numberOrZero(getValue("basePrice")),
    discount: numberOrZero(getValue("discount")),
    lastPaymentAmount: numberOrZero(getValue("lastPaymentAmount")),
    paymentMode: getValue("paymentMode"),
    startDate: getValue("startDate"),
    expiryDate: getValue("expiryDate"),
    studentLimit: numberOrZero(getValue("studentLimit")),
    teacherLimit: numberOrZero(getValue("teacherLimit")),
    branchLimit: numberOrZero(getValue("branchLimit")),
    aiDoubtLimit: numberOrZero(getValue("aiDoubtLimit")),
    storageLimit: numberOrZero(getValue("storageLimit")),
    userLimit: numberOrZero(getValue("userLimit")),
    studentsUsed: numberOrZero(getValue("studentsUsed")),
    aiDoubtsUsed: numberOrZero(getValue("aiDoubtsUsed")),
    internalTag: getValue("internalTag"),
    notes: getValue("notes"),
    addons: [{ key: "vani_ai", enabled: vaniEnabled, billingCycle: vaniBilling, price: vaniBilling === "yearly" ? 14999 : 1499, usageCap: numberOrZero(getValue("vaniUsageCap")), status: "active" }],
  };
}
function clearForm() {
  form.reset();
  document.querySelector("#subscriptionId").value = "";
  document.querySelector("#subscriptionFormHeading").textContent = "Add Institute Subscription";
  document.querySelector("#planName").value = "starter";
  document.querySelector("#billingCycle").value = "monthly";
  document.querySelector("#status").value = "trial";
  document.querySelector("#vaniUsageCap").value = 1000;
}
function fillForm(item) {
  document.querySelector("#subscriptionId").value = item.id;
  document.querySelector("#subscriptionFormHeading").textContent = "Edit Subscription";
  ["instituteName", "ownerName", "ownerPhone", "ownerEmail", "city", "planName", "billingCycle", "status", "paymentMode", "internalTag", "notes"].forEach((id) => { document.querySelector(`#${id}`).value = item[id] || ""; });
  ["basePrice", "discount", "lastPaymentAmount"].forEach((id) => { document.querySelector(`#${id}`).value = item[id] || 0; });
  document.querySelector("#startDate").value = dateInput(item.startDate);
  document.querySelector("#expiryDate").value = dateInput(item.expiryDate);
  document.querySelector("#studentLimit").value = item.limits?.students || 0;
  document.querySelector("#teacherLimit").value = item.limits?.teachers || 0;
  document.querySelector("#branchLimit").value = item.limits?.branches || 0;
  document.querySelector("#aiDoubtLimit").value = item.limits?.aiDoubtsPerMonth || 0;
  document.querySelector("#storageLimit").value = item.limits?.storageGB || 0;
  document.querySelector("#userLimit").value = item.limits?.users || 0;
  document.querySelector("#studentsUsed").value = item.usage?.students || 0;
  document.querySelector("#aiDoubtsUsed").value = item.usage?.aiDoubtsThisMonth || 0;
  const vani = (item.addons || []).find((a) => a.key === "vani_ai");
  document.querySelector("#vaniEnabled").checked = Boolean(vani?.enabled);
  document.querySelector("#vaniBilling").value = vani?.billingCycle || "monthly";
  document.querySelector("#vaniUsageCap").value = vani?.usageCap || 1000;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
async function loadSubscriptions() {
  listMessage.textContent = "Subscriptions loading…";
  try {
    const response = await fetch(`${API}/subscriptions?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Subscriptions load failed");
    setStats(data);
    renderPlans(data.plans || {}, data.addons || {});
    renderSubscriptions(data.subscriptions || []);
    listMessage.textContent = "✅ Part 25 subscriptions backend se connected hai.";
  } catch (error) {
    listMessage.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.clear();
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}
async function saveSubscription(event) {
  event.preventDefault();
  const id = getValue("subscriptionId");
  const payload = payloadFromForm();
  try {
    const response = await fetch(id ? `${API}/subscriptions/${id}` : `${API}/subscriptions`, {
      method: id ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Save failed");
    message.textContent = `✅ ${data.message}`;
    clearForm();
    await loadSubscriptions();
  } catch (error) { message.textContent = `❌ ${error.message}`; }
}
async function patchStatus(id, status) {
  const response = await fetch(`${API}/subscriptions/${id}/status`, { method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ status }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Status update failed");
  listMessage.textContent = `✅ ${data.message}`;
  await loadSubscriptions();
}
async function toggleVani(id, enabled = true) {
  const response = await fetch(`${API}/subscriptions/${id}/addon`, { method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ key: "vani_ai", enabled, billingCycle: "monthly", price: 1499, usageCap: 1000 }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "VANI update failed");
  listMessage.textContent = `✅ ${data.message}`;
  await loadSubscriptions();
}
async function deleteSubscription(id) {
  if (!confirm("Subscription delete karni hai?")) return;
  const response = await fetch(`${API}/subscriptions/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Delete failed");
  listMessage.textContent = `✅ ${data.message}`;
  await loadSubscriptions();
}
function sample(type) {
  clearForm();
  document.querySelector("#instituteName").value = type === "premium" ? "NAXORA Premium Branch Demo" : "NAXORA Pro Institute Demo";
  document.querySelector("#ownerName").value = savedUser?.name || "Arun Khurana";
  document.querySelector("#ownerPhone").value = "9253444624";
  document.querySelector("#ownerEmail").value = savedUser?.email || "owner@example.com";
  document.querySelector("#city").value = "Shahabad Markanda";
  document.querySelector("#planName").value = type === "premium" ? "premium" : "pro";
  document.querySelector("#billingCycle").value = "monthly";
  document.querySelector("#status").value = "active";
  document.querySelector("#basePrice").value = type === "premium" ? 4999 : 2499;
  document.querySelector("#lastPaymentAmount").value = type === "premium" ? 6498 : 2499;
  document.querySelector("#paymentMode").value = "upi";
  document.querySelector("#studentLimit").value = type === "premium" ? 1500 : 500;
  document.querySelector("#teacherLimit").value = type === "premium" ? 100 : 35;
  document.querySelector("#branchLimit").value = type === "premium" ? 10 : 3;
  document.querySelector("#aiDoubtLimit").value = type === "premium" ? 10000 : 2500;
  document.querySelector("#storageLimit").value = type === "premium" ? 100 : 25;
  document.querySelector("#userLimit").value = type === "premium" ? 100 : 25;
  document.querySelector("#studentsUsed").value = type === "premium" ? 180 : 70;
  document.querySelector("#aiDoubtsUsed").value = type === "premium" ? 900 : 220;
  document.querySelector("#vaniEnabled").checked = type === "premium";
  document.querySelector("#notes").value = type === "premium" ? "Premium + VANI AI add-on enabled. Usage capped, not unlimited." : "Pro plan sample subscription.";
}
form.addEventListener("submit", saveSubscription);
document.querySelector("#clearSubscriptionBtn").addEventListener("click", clearForm);
document.querySelector("#refreshSubscriptionsBtn").addEventListener("click", loadSubscriptions);
document.querySelector("#sampleProBtn").addEventListener("click", () => sample("pro"));
document.querySelector("#samplePremiumBtn").addEventListener("click", () => sample("premium"));
document.querySelector("#logoutBtn").addEventListener("click", () => { localStorage.removeItem("naxora_token"); localStorage.removeItem("naxora_user"); window.location.href = "index.html"; });
["subscriptionSearch", "planFilter", "statusFilter", "cycleFilter"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", loadSubscriptions));
subscriptionList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const card = event.target.closest(".data-card");
  const id = card?.dataset.id;
  const action = button.dataset.action;
  try {
    if (action === "edit") {
      const response = await fetch(`${API}/subscriptions/${id}`, { headers: authHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Subscription read failed");
      fillForm(data.subscription);
    }
    if (action === "active") await patchStatus(id, "active");
    if (action === "past_due") await patchStatus(id, "past_due");
    if (action === "vani") await toggleVani(id, true);
    if (action === "delete") await deleteSubscription(id);
  } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
});
clearForm();
loadSubscriptions();
