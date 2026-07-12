const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
if (!token) window.location.href = "index.html";

const $ = (selector) => document.querySelector(selector);
const getValue = (id) => $(`#${id}`).value.trim();
const setValue = (id, value = "") => { $(`#${id}`).value = value ?? ""; };
let currentRecords = [];

function rupee(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function isoDate(value) { return value ? new Date(value).toISOString().slice(0, 10) : ""; }
function dateText(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function escapeHTML(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function label(value) {
  return String(value || "").replaceAll("-", " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}
function logoutOnAuthError(error) {
  const message = String(error.message || "").toLowerCase();
  if (message.includes("token") || message.includes("login") || message.includes("authorized")) {
    localStorage.removeItem("naxora_token");
    localStorage.removeItem("naxora_user");
    setTimeout(() => (window.location.href = "index.html"), 900);
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
function amountValue(id) {
  const num = Number(getValue(id) || 0);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}
function payload() {
  return {
    recordType: getValue("recordType") || "income",
    title: getValue("title"),
    category: getValue("category") || "other",
    amount: amountValue("amount"),
    paymentMode: getValue("paymentMode") || "cash",
    transactionDate: getValue("transactionDate"),
    month: getValue("month"),
    paidToOrFrom: getValue("paidToOrFrom"),
    referenceNo: getValue("referenceNo"),
    status: getValue("status") || "completed",
    recurring: getValue("recurring") === "true",
    note: getValue("note"),
  };
}
function clearForm() {
  ["financeId", "title", "amount", "transactionDate", "month", "paidToOrFrom", "referenceNo", "note"].forEach((id) => setValue(id, ""));
  setValue("recordType", "income"); setValue("category", "fees"); setValue("paymentMode", "cash"); setValue("status", "completed"); setValue("recurring", "false");
  $("#financeFormHeading").textContent = "Add Finance Record";
  $("#saveFinanceBtn").textContent = "Save Finance Record";
}
function fillSample(type) {
  if (type === "income") {
    setValue("recordType", "income"); setValue("title", "July fees collection"); setValue("category", "fees"); setValue("amount", "15000"); setValue("paymentMode", "upi"); setValue("paidToOrFrom", "Students Batch A");
    setValue("referenceNo", `NX-IN-${Date.now().toString().slice(-5)}`); setValue("note", "Monthly batch fees collection.");
  } else {
    setValue("recordType", "expense"); setValue("title", "Teacher salary payment"); setValue("category", "salary"); setValue("amount", "8000"); setValue("paymentMode", "bank"); setValue("paidToOrFrom", "Teacher Rahul");
    setValue("referenceNo", `NX-EX-${Date.now().toString().slice(-5)}`); setValue("note", "Monthly salary expense.");
  }
  setValue("transactionDate", todayISO()); setValue("month", "July 2026"); setValue("status", "completed"); setValue("recurring", type === "expense" ? "true" : "false");
}
function renderStats(data) {
  $("#totalIncome").textContent = rupee(data.totalIncome);
  $("#totalExpense").textContent = rupee(data.totalExpense);
  const net = Number(data.netProfit || 0);
  $("#netProfit").textContent = rupee(net);
  $("#netProfit").className = net >= 0 ? "positive" : "negative";
  $("#pendingAmount").textContent = rupee(data.pendingAmount);
  $("#totalRecords").textContent = data.totalRecords || 0;
  $("#incomeRecords").textContent = data.incomeRecords || 0;
  $("#expenseRecords").textContent = data.expenseRecords || 0;
  $("#pendingRecords").textContent = data.pendingRecords || 0;
}
function renderRecords(data) {
  currentRecords = data.records || [];
  renderStats(data);
  if (!currentRecords.length) {
    $("#financeList").innerHTML = `<div class="empty-state">Abhi koi finance record nahi mila. Pehla income/expense add karo.</div>`;
    return;
  }
  $("#financeList").innerHTML = currentRecords.map((record) => `
    <article class="data-card finance-card" data-id="${record.id}">
      <div class="data-top">
        <div class="data-title">
          <div class="data-avatar">${record.recordType === "income" ? "📈" : "📉"}</div>
          <div>
            <h3>${escapeHTML(record.title)}</h3>
            <p><span class="type-${record.recordType}">${label(record.recordType)}</span> • ${label(record.category)} • ${escapeHTML(record.month || "Month not set")}</p>
          </div>
        </div>
        <div class="data-tags">
          <span class="tag gold">${rupee(record.amount)}</span>
          <span class="tag blue">${label(record.paymentMode)}</span>
          <span class="tag">${label(record.status)}</span>
        </div>
      </div>
      <div class="data-details">
        <div><span>Date</span>${dateText(record.transactionDate)}</div>
        <div><span>Paid To/From</span>${escapeHTML(record.paidToOrFrom || "Not added")}</div>
        <div><span>Reference</span>${escapeHTML(record.referenceNo || "Not added")}</div>
        <div><span>Recurring</span>${record.recurring ? "Yes" : "No"}</div>
        <div><span>Created</span>${dateText(record.createdAt)}</div>
        <div><span>Updated</span>${dateText(record.updatedAt)}</div>
      </div>
      ${record.note ? `<p class="data-note">${escapeHTML(record.note)}</p>` : ""}
      <div class="card-actions">
        <button class="edit-btn" data-action="edit-record">Edit</button>
        <button class="edit-btn" data-action="toggle-status">Mark ${record.status === "completed" ? "Pending" : "Completed"}</button>
        <button class="delete-btn" data-action="delete-record">Delete</button>
      </div>
    </article>`).join("");
}
async function loadFinance() {
  $("#financeListMessage").textContent = "Finance records loading…";
  try {
    const params = new URLSearchParams();
    if (getValue("financeSearch")) params.set("search", getValue("financeSearch"));
    if (getValue("typeFilter")) params.set("type", getValue("typeFilter"));
    if (getValue("categoryFilter")) params.set("category", getValue("categoryFilter"));
    if (getValue("statusFilter")) params.set("status", getValue("statusFilter"));
    if (getValue("modeFilter")) params.set("mode", getValue("modeFilter"));
    if (getValue("monthFilter")) params.set("month", getValue("monthFilter"));
    const data = await apiRequest(`/finance?${params.toString()}`);
    renderRecords(data);
    $("#financeListMessage").textContent = `✅ ${data.count} finance record loaded.`;
  } catch (error) {
    $("#financeListMessage").textContent = `❌ ${error.message}`;
    logoutOnAuthError(error);
  }
}
function fillForEdit(record) {
  setValue("financeId", record.id); setValue("recordType", record.recordType); setValue("title", record.title); setValue("category", record.category); setValue("amount", record.amount);
  setValue("paymentMode", record.paymentMode); setValue("transactionDate", isoDate(record.transactionDate)); setValue("month", record.month); setValue("paidToOrFrom", record.paidToOrFrom); setValue("referenceNo", record.referenceNo);
  setValue("status", record.status); setValue("recurring", record.recurring ? "true" : "false"); setValue("note", record.note);
  $("#financeFormHeading").textContent = "Update Finance Record"; $("#saveFinanceBtn").textContent = "Update Finance Record";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$("#financeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#financeMessage").textContent = "Saving…";
  const id = getValue("financeId");
  try {
    await apiRequest(id ? `/finance/${id}` : "/finance", { method: id ? "PUT" : "POST", body: JSON.stringify(payload()) });
    $("#financeMessage").textContent = id ? "✅ Finance record update ho gaya." : "✅ Finance record save ho gaya.";
    clearForm(); await loadFinance();
  } catch (error) { $("#financeMessage").textContent = `❌ ${error.message}`; logoutOnAuthError(error); }
});
$("#financeList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]"); if (!button) return;
  const card = event.target.closest(".data-card"); const id = card?.dataset.id; const record = currentRecords.find((item) => item.id === id); if (!record) return;
  if (button.dataset.action === "edit-record") return fillForEdit(record);
  if (button.dataset.action === "toggle-status") {
    try { await apiRequest(`/finance/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: record.status === "completed" ? "pending" : "completed" }) }); await loadFinance(); }
    catch (error) { $("#financeListMessage").textContent = `❌ ${error.message}`; }
  }
  if (button.dataset.action === "delete-record") {
    if (!confirm("Ye finance record delete karna hai?")) return;
    try { await apiRequest(`/finance/${id}`, { method: "DELETE" }); await loadFinance(); }
    catch (error) { $("#financeListMessage").textContent = `❌ ${error.message}`; }
  }
});
["financeSearch", "typeFilter", "categoryFilter", "statusFilter", "modeFilter", "monthFilter"].forEach((id) => $(`#${id}`).addEventListener("input", loadFinance));
$("#refreshFinanceBtn").addEventListener("click", loadFinance);
$("#clearFinanceBtn").addEventListener("click", clearForm);
$("#sampleIncomeBtn").addEventListener("click", () => fillSample("income"));
$("#sampleExpenseBtn").addEventListener("click", () => fillSample("expense"));
$("#logoutBtn").addEventListener("click", () => { localStorage.removeItem("naxora_token"); localStorage.removeItem("naxora_user"); window.location.href = "index.html"; });
clearForm(); loadFinance();
