const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
let currentPayments = [];
let selectedPayment = null;
let paymentConfig = { razorpayKeyId: "", companyName: "NAXORA Institute OS", providerMode: "test-mock-mode" };

if (!token) window.location.href = "index.html";

const $ = (selector) => document.querySelector(selector);
const getValue = (id) => $(`#${id}`)?.value?.trim() || "";
const setValue = (id, value) => { const el = $(`#${id}`); if (el) el.value = value ?? ""; };
const rupee = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const isoDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : "";
const dateText = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not set";
const label = (value) => String(value || "").replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
function escapeHTML(value = "") { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function logoutOnAuthError(error) {
  const message = String(error.message || "").toLowerCase();
  if (message.includes("token") || message.includes("login") || message.includes("authorized")) {
    localStorage.removeItem("naxora_token"); localStorage.removeItem("naxora_user");
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
function amountValue(id) { const num = Number(getValue(id)); return Number.isFinite(num) && num > 0 ? num : 0; }
function payload() {
  return {
    paymentFor: getValue("paymentFor") || "student_fees",
    title: getValue("title"),
    payerName: getValue("payerName"),
    payerPhone: getValue("payerPhone"),
    payerEmail: getValue("payerEmail"),
    studentName: getValue("studentName"),
    instituteName: getValue("instituteName"),
    amount: amountValue("amount"),
    provider: getValue("provider") || "manual",
    paymentMode: getValue("paymentMode") || "online",
    status: getValue("status") || "created",
    upiId: getValue("upiId"),
    transactionRef: getValue("transactionRef"),
    relatedRecordId: getValue("relatedRecordId"),
    dueDate: getValue("dueDate"),
    paidAt: getValue("paidAt"),
    receiptNote: getValue("receiptNote"),
  };
}
function clearForm() {
  ["paymentId", "title", "payerName", "payerPhone", "payerEmail", "studentName", "instituteName", "amount", "upiId", "transactionRef", "relatedRecordId", "dueDate", "paidAt", "receiptNote"].forEach((id) => setValue(id, ""));
  setValue("paymentFor", "student_fees"); setValue("provider", "razorpay"); setValue("paymentMode", "online"); setValue("status", "created");
  $("#paymentFormHeading").textContent = "Add Payment Record"; $("#savePaymentBtn").textContent = "Save Payment";
}
function fillSample() {
  setValue("paymentFor", "subscription"); setValue("title", "NAXORA Pro Plan Monthly Payment"); setValue("payerName", "Demo Institute"); setValue("payerPhone", "9999999999");
  setValue("payerEmail", "demo@naxora.in"); setValue("studentName", ""); setValue("instituteName", "NAXORA Demo Institute"); setValue("amount", "1499");
  setValue("provider", "razorpay"); setValue("paymentMode", "online"); setValue("status", "created"); setValue("upiId", "naxora@upi");
  setValue("transactionRef", `NX-TXN-${Date.now().toString().slice(-6)}`); setValue("dueDate", todayISO()); setValue("receiptNote", "Monthly SaaS subscription payment.");
}
function canUseRazorpayCheckout() {
  return Boolean(paymentConfig.razorpayKeyId && window.Razorpay);
}

function renderStats(data) {
  $("#totalCollected").textContent = rupee(data.totalCollected);
  $("#totalPending").textContent = rupee(data.totalPending);
  $("#totalRecords").textContent = data.totalRecords || 0;
  $("#failedRecords").textContent = data.failed || 0;
}
function updatePreview(payment) {
  selectedPayment = payment;
  $("#previewReceiptNo").textContent = payment?.receiptNumber || "NX-PAY-0000";
  $("#previewPayer").textContent = payment?.payerName || "Not selected";
  $("#previewAmount").textContent = rupee(payment?.amount || 0);
  $("#previewStatus").textContent = label(payment?.status || "created");
  $("#previewProvider").textContent = label(payment?.provider || "manual");
}
function renderPayments(data) {
  currentPayments = data.payments || [];
  renderStats(data);
  if (!currentPayments.length) {
    $("#paymentsList").innerHTML = `<div class="empty-state">Abhi payment record nahi mila. Pehla payment add karo.</div>`;
    updatePreview(null); return;
  }
  updatePreview(currentPayments[0]);
  $("#paymentsList").innerHTML = currentPayments.map((payment) => `
    <article class="data-card payment-card" data-id="${payment.id}">
      <div class="data-top">
        <div class="data-title">
          <div class="data-avatar">${payment.status === "paid" ? "✅" : payment.status === "failed" ? "⚠️" : "🧾"}</div>
          <div>
            <h3>${escapeHTML(payment.title)}</h3>
            <p>${escapeHTML(payment.payerName)} • ${label(payment.paymentFor)} • <span class="status-${payment.status}">${label(payment.status)}</span></p>
          </div>
        </div>
        <div class="data-tags"><span class="tag gold">${rupee(payment.amount)}</span><span class="tag blue">${label(payment.provider)}</span><span class="tag">${payment.receiptNumber}</span></div>
      </div>
      <div class="data-details">
        <div><span>Phone</span>${escapeHTML(payment.payerPhone || "Not added")}</div>
        <div><span>Student</span>${escapeHTML(payment.studentName || "Not linked")}</div>
        <div><span>Institute</span>${escapeHTML(payment.instituteName || "NAXORA Institute")}</div>
        <div><span>Order ID</span>${escapeHTML(payment.providerOrderId || "Not created")}</div>
        <div><span>Payment ID</span>${escapeHTML(payment.providerPaymentId || "Not verified")}</div>
        <div><span>Paid At</span>${dateText(payment.paidAt)}</div>
      </div>
      ${payment.receiptNote ? `<p class="data-note">${escapeHTML(payment.receiptNote)}</p>` : ""}
      <div class="card-actions">
        <button class="edit-btn" data-action="preview">Preview</button>
        <button class="edit-btn" data-action="edit">Edit</button>
        <button class="edit-btn" data-action="order">Create Order</button>
        <button class="edit-btn" data-action="checkout">Pay Razorpay</button>
        <button class="edit-btn" data-action="verify">Verify Test</button>
        <button class="edit-btn" data-action="paid">Mark Paid</button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>`).join("");
}
async function loadConfig() {
  try {
    const data = await apiRequest("/payments/config");
    paymentConfig = data;
    $("#configMessage").textContent = data.razorpayKeyId ? "✅ Razorpay key detected. Pay Razorpay button se checkout open hoga." : "⚠️ Keys missing: mock order mode active. .env me Razorpay keys add karo.";
  } catch (error) { $("#configMessage").textContent = `❌ ${error.message}`; }
}
async function loadPayments() {
  $("#paymentsListMessage").textContent = "Payments loading…";
  try {
    const params = new URLSearchParams();
    if (getValue("paymentSearch")) params.set("search", getValue("paymentSearch"));
    if (getValue("statusFilter")) params.set("status", getValue("statusFilter"));
    if (getValue("purposeFilter")) params.set("purpose", getValue("purposeFilter"));
    if (getValue("providerFilter")) params.set("provider", getValue("providerFilter"));
    const data = await apiRequest(`/payments?${params.toString()}`);
    renderPayments(data);
    $("#paymentsListMessage").textContent = `✅ ${data.count} payment records loaded.`;
  } catch (error) { $("#paymentsListMessage").textContent = `❌ ${error.message}`; logoutOnAuthError(error); }
}

async function startRazorpayCheckout(payment) {
  try {
    const data = await apiRequest(`/payments/${payment.id}/order`, { method: "POST" });
    if (!data.order?.razorpayKeyId) {
      alert(`Mock order ready: ${data.order.id}\nReal Checkout ke liye .env me RAZORPAY_KEY_ID aur RAZORPAY_KEY_SECRET add karo.`);
      await loadPayments();
      return;
    }
    if (!window.Razorpay) {
      throw new Error("Razorpay Checkout script load nahi hua. Internet check karo aur page refresh karo.");
    }
    const options = {
      key: data.order.razorpayKeyId,
      amount: data.order.amount,
      currency: data.order.currency || "INR",
      name: data.order.companyName || payment.instituteName || "NAXORA Institute OS",
      description: payment.title,
      order_id: data.order.id,
      prefill: {
        name: payment.payerName || "",
        email: payment.payerEmail || "",
        contact: payment.payerPhone || "",
      },
      notes: {
        paymentRecordId: payment.id,
        paymentFor: payment.paymentFor,
      },
      handler: async function (response) {
        await apiRequest(`/payments/${payment.id}/verify`, {
          method: "POST",
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        alert("✅ Razorpay payment verified ho gaya.");
        await loadPayments();
      },
      modal: {
        ondismiss: function () {
          $("#paymentsListMessage").textContent = "Payment window closed. Payment complete hua ho to records refresh karo.";
        },
      },
      theme: { color: "#0b0b0b" },
    };
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      $("#paymentsListMessage").textContent = `❌ Payment failed: ${response.error?.description || "Try again"}`;
    });
    rzp.open();
  } catch (error) {
    $("#paymentsListMessage").textContent = `❌ ${error.message}`;
    logoutOnAuthError(error);
  }
}

function fillForEdit(payment) {
  setValue("paymentId", payment.id); setValue("paymentFor", payment.paymentFor); setValue("title", payment.title); setValue("payerName", payment.payerName); setValue("payerPhone", payment.payerPhone);
  setValue("payerEmail", payment.payerEmail); setValue("studentName", payment.studentName); setValue("instituteName", payment.instituteName); setValue("amount", payment.amount);
  setValue("provider", payment.provider); setValue("paymentMode", payment.paymentMode); setValue("status", payment.status); setValue("upiId", payment.upiId); setValue("transactionRef", payment.transactionRef);
  setValue("relatedRecordId", payment.relatedRecordId); setValue("dueDate", isoDate(payment.dueDate)); setValue("paidAt", isoDate(payment.paidAt)); setValue("receiptNote", payment.receiptNote);
  $("#paymentFormHeading").textContent = "Update Payment Record"; $("#savePaymentBtn").textContent = "Update Payment"; window.scrollTo({ top: 0, behavior: "smooth" });
}
$("#paymentForm").addEventListener("submit", async (event) => {
  event.preventDefault(); $("#paymentMessage").textContent = "Saving payment…";
  const id = getValue("paymentId");
  try {
    await apiRequest(id ? `/payments/${id}` : "/payments", { method: id ? "PUT" : "POST", body: JSON.stringify(payload()) });
    $("#paymentMessage").textContent = id ? "✅ Payment update ho gaya." : "✅ Payment create ho gaya."; clearForm(); await loadPayments();
  } catch (error) { $("#paymentMessage").textContent = `❌ ${error.message}`; logoutOnAuthError(error); }
});
$("#paymentsList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]"); if (!button) return;
  const card = event.target.closest(".data-card"); const id = card?.dataset.id; const payment = currentPayments.find((item) => item.id === id); if (!payment) return;
  if (button.dataset.action === "preview") return updatePreview(payment);
  if (button.dataset.action === "edit") return fillForEdit(payment);
  if (button.dataset.action === "delete") {
    if (!confirm("Payment record delete karna hai?")) return;
    try { await apiRequest(`/payments/${id}`, { method: "DELETE" }); await loadPayments(); } catch (error) { $("#paymentsListMessage").textContent = `❌ ${error.message}`; }
  }
  if (button.dataset.action === "paid") {
    try { await apiRequest(`/payments/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "paid" }) }); await loadPayments(); } catch (error) { $("#paymentsListMessage").textContent = `❌ ${error.message}`; }
  }
  if (button.dataset.action === "order") {
    try { const data = await apiRequest(`/payments/${id}/order`, { method: "POST" }); alert(`Order ready: ${data.order.id}\nAmount: ${rupee(data.order.amount / 100)}\nMode: ${data.order.razorpayKeyId ? "Razorpay" : "Mock"}`); await loadPayments(); } catch (error) { $("#paymentsListMessage").textContent = `❌ ${error.message}`; }
  }
  if (button.dataset.action === "checkout") {
    await startRazorpayCheckout(payment);
  }
  if (button.dataset.action === "verify") {
    try { await apiRequest(`/payments/${id}/verify`, { method: "POST", body: JSON.stringify({ providerOrderId: payment.providerOrderId, providerPaymentId: `pay_TEST_${Date.now()}`, providerSignature: "test-signature" }) }); await loadPayments(); } catch (error) { $("#paymentsListMessage").textContent = `❌ ${error.message}`; }
  }
});
["paymentSearch", "statusFilter", "purposeFilter", "providerFilter"].forEach((id) => $(`#${id}`).addEventListener("input", loadPayments));
$("#refreshPaymentsBtn").addEventListener("click", loadPayments);
$("#clearPaymentBtn").addEventListener("click", clearForm);
$("#samplePaymentBtn").addEventListener("click", fillSample);
$("#printReceiptBtn").addEventListener("click", () => window.print());
$("#logoutBtn").addEventListener("click", () => { localStorage.removeItem("naxora_token"); localStorage.removeItem("naxora_user"); window.location.href = "index.html"; });
clearForm(); loadConfig(); loadPayments();
