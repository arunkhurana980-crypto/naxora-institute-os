const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

if (!token) window.location.href = "index.html";

const $ = (selector) => document.querySelector(selector);
const getValue = (id) => $(`#${id}`).value.trim();
const setValue = (id, value = "") => { $(`#${id}`).value = value ?? ""; };

const feeForm = $("#feeForm");
const feesList = $("#feesList");
let currentFees = [];

function rupee(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isoDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function dateText(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusLabel(status) {
  const labels = {
    paid: "Paid",
    partial: "Partial",
    pending: "Pending",
    overdue: "Overdue",
  };
  return labels[status] || status;
}

function modeLabel(mode) {
  const labels = {
    cash: "Cash",
    upi: "UPI",
    bank: "Bank",
    card: "Card",
    other: "Other",
  };
  return labels[mode] || mode;
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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function amountValue(id) {
  const value = Number(getValue(id) || 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function updateFeePreview() {
  const total = amountValue("totalAmount");
  const paid = amountValue("paidAmount");
  const discount = amountValue("discount");
  const pending = Math.max(total - paid - discount, 0);
  let status = getValue("status") || "pending";
  if (pending <= 0 && total > 0) status = "paid";
  else if (paid > 0) status = "partial";
  $("#feePreview").textContent = `Pending Amount: ${rupee(pending)} • Auto status: ${statusLabel(status)}`;
}

function feePayload() {
  return {
    studentName: getValue("studentName"),
    phone: getValue("phone"),
    courseName: getValue("courseName"),
    batchName: getValue("batchName"),
    month: getValue("month"),
    dueDate: getValue("dueDate"),
    totalAmount: amountValue("totalAmount"),
    paidAmount: amountValue("paidAmount"),
    discount: amountValue("discount"),
    paymentMode: getValue("paymentMode") || "cash",
    paymentDate: getValue("paymentDate"),
    receiptNo: getValue("receiptNo"),
    status: getValue("status") || "pending",
    notes: getValue("notes"),
  };
}

function clearFeeForm() {
  [
    "feeId",
    "studentName",
    "phone",
    "courseName",
    "batchName",
    "month",
    "dueDate",
    "totalAmount",
    "paidAmount",
    "discount",
    "paymentDate",
    "receiptNo",
    "notes",
  ].forEach((id) => setValue(id, ""));
  setValue("paymentMode", "cash");
  setValue("status", "pending");
  $("#feeFormHeading").textContent = "Add Fee Record";
  $("#saveFeeBtn").textContent = "Save Fee Record";
  updateFeePreview();
}

function fillSampleFee() {
  setValue("studentName", "Arun Khurana");
  setValue("phone", "9876543210");
  setValue("courseName", "Full Stack Web Development");
  setValue("batchName", "Morning Batch A");
  setValue("month", "July 2026");
  setValue("dueDate", todayISO());
  setValue("totalAmount", "2000");
  setValue("paidAmount", "1000");
  setValue("discount", "0");
  setValue("paymentMode", "upi");
  setValue("paymentDate", todayISO());
  setValue("receiptNo", `NX-FEE-${Date.now().toString().slice(-5)}`);
  setValue("status", "partial");
  setValue("notes", "First installment received. Remaining amount next week.");
  updateFeePreview();
}

function renderStats(data) {
  $("#totalFees").textContent = rupee(data.totalFees);
  $("#paidFees").textContent = rupee(data.paidFees);
  $("#pendingFees").textContent = rupee(data.pendingFees);
  $("#overdueRecords").textContent = String(data.overdueRecords || 0);
}

function renderFees(data) {
  currentFees = data.fees || [];
  renderStats(data);

  if (!currentFees.length) {
    feesList.innerHTML = `<div class="empty-state">Abhi koi fee record nahi mila. Pehla fee record add karo.</div>`;
    return;
  }

  feesList.innerHTML = currentFees.map((fee) => `
    <article class="data-card" data-id="${fee.id}">
      <div class="data-top">
        <div class="data-title">
          <div class="data-avatar">💳</div>
          <div>
            <h3>${escapeHTML(fee.studentName)}</h3>
            <p>${escapeHTML(fee.courseName || "Course not set")} • ${escapeHTML(fee.batchName || "Batch not set")}</p>
          </div>
        </div>
        <div class="data-tags">
          <span class="tag gold status-${fee.status}">${statusLabel(fee.status)}</span>
          <span class="tag blue">${modeLabel(fee.paymentMode)}</span>
          <span class="tag">${escapeHTML(fee.month)}</span>
        </div>
      </div>

      <div class="money-row">
        <div class="money-box"><span>Total</span><strong>${rupee(fee.totalAmount)}</strong></div>
        <div class="money-box"><span>Paid</span><strong>${rupee(fee.paidAmount)}</strong></div>
        <div class="money-box"><span>Discount</span><strong>${rupee(fee.discount)}</strong></div>
        <div class="money-box"><span>Pending</span><strong>${rupee(fee.pendingAmount)}</strong></div>
      </div>

      <div class="data-details">
        <div><span>Phone</span>${escapeHTML(fee.phone || "Not added")}</div>
        <div><span>Due Date</span>${dateText(fee.dueDate)}</div>
        <div><span>Payment Date</span>${dateText(fee.paymentDate)}</div>
        <div><span>Receipt No.</span>${escapeHTML(fee.receiptNo || "Not generated")}</div>
        <div><span>Created</span>${dateText(fee.createdAt)}</div>
        <div><span>Updated</span>${dateText(fee.updatedAt)}</div>
      </div>

      ${fee.notes ? `<p class="data-note">${escapeHTML(fee.notes)}</p>` : ""}

      <div class="card-actions">
        <button class="edit-btn" data-action="edit-fee">Edit</button>
        <button class="receipt-btn edit-btn" data-action="receipt-fee">Receipt</button>
        <button class="delete-btn" data-action="delete-fee">Delete</button>
      </div>
    </article>
  `).join("");
}

async function loadFees() {
  $("#feesListMessage").textContent = "Fees records loading…";
  try {
    const params = new URLSearchParams();
    if (getValue("feeSearch")) params.set("search", getValue("feeSearch"));
    if (getValue("statusFilter")) params.set("status", getValue("statusFilter"));
    if (getValue("modeFilter")) params.set("mode", getValue("modeFilter"));
    if (getValue("monthFilter")) params.set("month", getValue("monthFilter"));
    const data = await apiRequest(`/fees?${params.toString()}`);
    renderFees(data);
    $("#feesListMessage").textContent = `✅ ${data.count} fee record loaded.`;
  } catch (error) {
    $("#feesListMessage").textContent = `❌ ${error.message}`;
    logoutOnAuthError(error);
  }
}

function fillFeeForEdit(fee) {
  setValue("feeId", fee.id);
  setValue("studentName", fee.studentName);
  setValue("phone", fee.phone);
  setValue("courseName", fee.courseName);
  setValue("batchName", fee.batchName);
  setValue("month", fee.month);
  setValue("dueDate", isoDate(fee.dueDate));
  setValue("totalAmount", fee.totalAmount);
  setValue("paidAmount", fee.paidAmount);
  setValue("discount", fee.discount);
  setValue("paymentMode", fee.paymentMode || "cash");
  setValue("paymentDate", isoDate(fee.paymentDate));
  setValue("receiptNo", fee.receiptNo);
  setValue("status", fee.status || "pending");
  setValue("notes", fee.notes);
  $("#feeFormHeading").textContent = "Update Fee Record";
  $("#saveFeeBtn").textContent = "Update Fee Record";
  updateFeePreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function printReceipt(fee) {
  const receipt = window.open("", "_blank", "width=720,height=820");
  if (!receipt) {
    $("#feesListMessage").textContent = "❌ Popup blocked. Browser me popups allow karo.";
    return;
  }
  receipt.document.write(`
    <html>
      <head>
        <title>NAXORA Fee Receipt</title>
        <style>
          body{font-family:Arial,sans-serif;padding:30px;color:#111} .box{border:2px solid #111;padding:26px;border-radius:18px}
          h1{margin:0 0 4px} .muted{color:#666}.row{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:10px 0}
          .total{font-size:22px;font-weight:800}.status{text-transform:uppercase;font-weight:800}.sign{margin-top:50px;text-align:right}
          button{margin-top:20px;padding:12px 18px;border:0;background:#111;color:#fff;border-radius:10px;cursor:pointer}
        </style>
      </head>
      <body>
        <div class="box">
          <h1>NAXORA Institute</h1>
          <p class="muted">Fee Receipt • ${escapeHTML(fee.receiptNo || "Not generated")}</p>
          <div class="row"><b>Student</b><span>${escapeHTML(fee.studentName)}</span></div>
          <div class="row"><b>Phone</b><span>${escapeHTML(fee.phone || "-")}</span></div>
          <div class="row"><b>Course</b><span>${escapeHTML(fee.courseName || "-")}</span></div>
          <div class="row"><b>Batch</b><span>${escapeHTML(fee.batchName || "-")}</span></div>
          <div class="row"><b>Month</b><span>${escapeHTML(fee.month)}</span></div>
          <div class="row"><b>Payment Mode</b><span>${modeLabel(fee.paymentMode)}</span></div>
          <div class="row"><b>Payment Date</b><span>${dateText(fee.paymentDate)}</span></div>
          <div class="row"><b>Total Amount</b><span>${rupee(fee.totalAmount)}</span></div>
          <div class="row"><b>Paid Amount</b><span>${rupee(fee.paidAmount)}</span></div>
          <div class="row"><b>Discount</b><span>${rupee(fee.discount)}</span></div>
          <div class="row total"><b>Pending</b><span>${rupee(fee.pendingAmount)}</span></div>
          <p class="status">Status: ${statusLabel(fee.status)}</p>
          <p class="muted">Note: This is a system-generated receipt preview for institute records.</p>
          <div class="sign">Authorized Signature<br><br>__________________</div>
        </div>
        <button onclick="window.print()">Print Receipt</button>
      </body>
    </html>
  `);
  receipt.document.close();
}

feeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = getValue("feeId");
  const payload = feePayload();

  if (!payload.studentName) return ($("#feeMessage").textContent = "❌ Student name required hai");
  if (!payload.month) return ($("#feeMessage").textContent = "❌ Fees month required hai");
  if (!payload.totalAmount || payload.totalAmount <= 0) return ($("#feeMessage").textContent = "❌ Total amount 0 se zyada hona chahiye");
  if (payload.paidAmount + payload.discount > payload.totalAmount) return ($("#feeMessage").textContent = "❌ Paid amount + discount total fees se zyada nahi ho sakta");

  $("#feeMessage").textContent = id ? "Fee record update ho raha hai…" : "Fee record save ho raha hai…";
  try {
    const data = await apiRequest(id ? `/fees/${id}` : "/fees", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    $("#feeMessage").textContent = `✅ ${data.message}`;
    clearFeeForm();
    await loadFees();
  } catch (error) {
    $("#feeMessage").textContent = `❌ ${error.message}`;
  }
});

feesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".data-card");
  const id = card?.dataset.id;
  const fee = currentFees.find((item) => item.id === id);
  if (!id || !fee) return;

  if (button.dataset.action === "edit-fee") {
    fillFeeForEdit(fee);
    return;
  }

  if (button.dataset.action === "receipt-fee") {
    printReceipt(fee);
    return;
  }

  if (button.dataset.action === "delete-fee") {
    if (!confirm(`Delete fee record for ${fee.studentName}?`)) return;
    try {
      const data = await apiRequest(`/fees/${id}`, { method: "DELETE" });
      $("#feesListMessage").textContent = `✅ ${data.message}`;
      await loadFees();
    } catch (error) {
      $("#feesListMessage").textContent = `❌ ${error.message}`;
    }
  }
});

["totalAmount", "paidAmount", "discount", "status"].forEach((id) => {
  $(`#${id}`).addEventListener("input", updateFeePreview);
  $(`#${id}`).addEventListener("change", updateFeePreview);
});

["feeSearch", "statusFilter", "modeFilter", "monthFilter"].forEach((id) => {
  $(`#${id}`).addEventListener("input", loadFees);
  $(`#${id}`).addEventListener("change", loadFees);
});

$("#clearFeeBtn").addEventListener("click", clearFeeForm);
$("#sampleFeeBtn").addEventListener("click", fillSampleFee);
$("#refreshFeesBtn").addEventListener("click", loadFees);
$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

clearFeeForm();
loadFees();
