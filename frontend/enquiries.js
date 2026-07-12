const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

const form = document.querySelector("#enquiryForm");
const enquiryId = document.querySelector("#enquiryId");
const formTitle = document.querySelector("#formTitle");
const message = document.querySelector("#message");
const enquiryStats = document.querySelector("#enquiryStats");
const enquiriesList = document.querySelector("#enquiriesList");
const profilePill = document.querySelector("#profilePill");
const followDialog = document.querySelector("#followDialog");
const followForm = document.querySelector("#followForm");

profilePill.textContent = `${savedUser?.name || "User"} • Enquiries`;

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function money(value = 0) { return `₹${Number(value || 0).toLocaleString("en-IN")}`; }
function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function label(value = "") { return String(value).replaceAll("_", " "); }

function readPayload() {
  return {
    studentName: getValue("studentName"),
    parentName: getValue("parentName"),
    phone: getValue("phone"),
    alternatePhone: getValue("alternatePhone"),
    email: getValue("email"),
    classLevel: getValue("classLevel"),
    interestedCourse: getValue("interestedCourse"),
    preferredBatch: getValue("preferredBatch"),
    leadSource: getValue("leadSource"),
    leadTemperature: getValue("leadTemperature"),
    status: getValue("status"),
    counsellorName: getValue("counsellorName"),
    expectedFee: Number(getValue("expectedFee") || 0),
    offeredDiscount: Number(getValue("offeredDiscount") || 0),
    demoDate: getValue("demoDate"),
    nextFollowUpDate: getValue("nextFollowUpDate"),
    city: getValue("city"),
    address: getValue("address"),
    notes: getValue("notes"),
  };
}

function fillForm(enquiry) {
  enquiryId.value = enquiry.id;
  formTitle.textContent = "Edit Enquiry";
  ["studentName", "parentName", "phone", "alternatePhone", "email", "classLevel", "interestedCourse", "preferredBatch", "counsellorName", "expectedFee", "offeredDiscount", "city", "address", "notes"].forEach((id) => {
    document.querySelector(`#${id}`).value = enquiry[id] ?? "";
  });
  document.querySelector("#leadSource").value = enquiry.leadSource || "youtube";
  document.querySelector("#leadTemperature").value = enquiry.leadTemperature || "warm";
  document.querySelector("#status").value = enquiry.status || "new";
  document.querySelector("#demoDate").value = enquiry.demoDate ? String(enquiry.demoDate).slice(0, 10) : "";
  document.querySelector("#nextFollowUpDate").value = enquiry.nextFollowUpDate ? String(enquiry.nextFollowUpDate).slice(0, 10) : "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  enquiryId.value = "";
  form.reset();
  formTitle.textContent = "Add Enquiry";
  document.querySelector("#leadSource").value = "youtube";
  document.querySelector("#leadTemperature").value = "warm";
  document.querySelector("#status").value = "new";
  document.querySelector("#expectedFee").value = 0;
  document.querySelector("#offeredDiscount").value = 0;
}

function renderStats(data) {
  const cards = [
    { title: "Total Leads", value: data.totalEnquiries || 0, label: `${data.newEnquiries || 0} new • ${data.contactedEnquiries || 0} contacted`, icon: "📞" },
    { title: "Hot Leads", value: data.hotLeads || 0, label: `${data.warmLeads || 0} warm • ${data.coldLeads || 0} cold`, icon: "🔥" },
    { title: "Follow-ups", value: data.dueFollowUps || 0, label: `${data.followUpLeads || 0} follow-up • ${data.demoBooked || 0} demo`, icon: "⏰" },
    { title: "Conversion", value: `${data.conversionPercent || 0}%`, label: `${data.convertedLeads || 0} converted • ${money(data.expectedFinalRevenue || 0)} pipeline`, icon: "🎯" },
  ];
  enquiryStats.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <div class="stat-icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <div class="stat-value">${card.value}</div>
      <p class="stat-label">${card.label}</p>
    </article>
  `).join("");
}

function renderEnquiries(enquiries) {
  if (!enquiries.length) {
    enquiriesList.innerHTML = `<p class="empty-state">Abhi enquiries empty hain. Sample enquiry add karke CRM start karo.</p>`;
    return;
  }

  enquiriesList.innerHTML = enquiries.map((enquiry) => {
    const recentFollowUps = (enquiry.followUps || []).slice(-2).reverse();
    return `
      <article class="data-card enquiry-card" data-id="${enquiry.id}">
        <div class="data-top">
          <div>
            <h3>${escapeHtml(enquiry.studentName)} <span class="enquiry-temp ${escapeHtml(enquiry.leadTemperature)}">${escapeHtml(enquiry.leadTemperature)}</span></h3>
            <p>${escapeHtml(enquiry.interestedCourse)} • ${escapeHtml(enquiry.classLevel || "Class not set")} • ${escapeHtml(enquiry.city || "No city")}</p>
          </div>
          <div class="data-tags">
            <span class="tag gold">${escapeHtml(label(enquiry.status))}</span>
            <span class="tag gold">${escapeHtml(label(enquiry.leadSource))}</span>
          </div>
        </div>
        <div class="data-details">
          <div><span>Phone</span><b>${escapeHtml(enquiry.phone)}</b></div>
          <div><span>Parent</span><b>${escapeHtml(enquiry.parentName || "Not set")}</b></div>
          <div><span>Batch</span><b>${escapeHtml(enquiry.preferredBatch || "Not set")}</b></div>
          <div><span>Demo</span><b>${formatDate(enquiry.demoDate)}</b></div>
          <div><span>Next Follow-up</span><b>${formatDate(enquiry.nextFollowUpDate)}</b></div>
          <div><span>Counsellor</span><b>${escapeHtml(enquiry.counsellorName || "Not set")}</b></div>
        </div>
        <div class="enquiry-money">
          <span>Expected Fee <b>${money(enquiry.expectedFee)}</b></span>
          <span>Discount <b>${money(enquiry.offeredDiscount)}</b></span>
          <span>Final Fee <b>${money(enquiry.finalFee)}</b></span>
        </div>
        ${enquiry.notes ? `<div class="solution-box"><b>Notes:</b> ${escapeHtml(enquiry.notes)}</div>` : ""}
        ${recentFollowUps.length ? `<div class="enquiry-timeline">${recentFollowUps.map((f) => `<div><b>${formatDate(f.date)} • ${escapeHtml(label(f.mode))}</b><br>${escapeHtml(label(f.outcome))}: ${escapeHtml(f.note || "No note")}</div>`).join("")}</div>` : ""}
        <div class="card-actions">
          <button class="edit-btn" data-action="edit">Edit</button>
          <button class="edit-btn" data-action="follow">Follow-up</button>
          <button class="edit-btn" data-action="contacted">Contacted</button>
          <button class="edit-btn" data-action="demo_booked">Demo</button>
          <button class="edit-btn" data-action="converted">Converted</button>
          <button class="delete-btn" data-action="delete">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function queryParams() {
  const params = new URLSearchParams();
  const map = { search: "searchInput", course: "courseFilter", leadSource: "sourceFilter", leadTemperature: "tempFilter", status: "statusFilter" };
  Object.entries(map).forEach(([key, id]) => {
    const value = document.querySelector(`#${id}`).value.trim();
    if (value) params.set(key, value);
  });
  return params.toString();
}

let currentEnquiries = [];

async function loadEnquiries() {
  message.textContent = "Enquiries loading…";
  try {
    const response = await fetch(`${API}/enquiries?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Enquiries load failed");
    currentEnquiries = data.enquiries || [];
    renderStats(data);
    renderEnquiries(currentEnquiries);
    message.textContent = "✅ Enquiry CRM backend se connected hai.";
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.clear();
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}

async function saveEnquiry(event) {
  event.preventDefault();
  const payload = readPayload();
  const id = enquiryId.value;
  try {
    const response = await fetch(id ? `${API}/enquiries/${id}` : `${API}/enquiries`, {
      method: id ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Enquiry save failed");
    message.textContent = `✅ ${data.message}`;
    clearForm();
    await loadEnquiries();
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
}

async function updateStatus(id, status) {
  const response = await fetch(`${API}/enquiries/${id}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Status update failed");
  message.textContent = `✅ ${data.message}`;
  await loadEnquiries();
}

async function deleteEnquiry(id) {
  if (!confirm("Delete this enquiry?")) return;
  const response = await fetch(`${API}/enquiries/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Delete failed");
  message.textContent = `✅ ${data.message}`;
  await loadEnquiries();
}

function openFollowUp(id) {
  document.querySelector("#followEnquiryId").value = id;
  document.querySelector("#followMode").value = "call";
  document.querySelector("#followOutcome").value = "callback";
  document.querySelector("#followNextDate").value = "";
  document.querySelector("#followNote").value = "";
  followDialog.showModal();
}

async function saveFollowUp(event) {
  event.preventDefault();
  const id = document.querySelector("#followEnquiryId").value;
  const payload = {
    mode: getValue("followMode"),
    outcome: getValue("followOutcome"),
    nextFollowUpDate: getValue("followNextDate"),
    note: getValue("followNote"),
  };
  try {
    const response = await fetch(`${API}/enquiries/${id}/follow-up`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Follow-up save failed");
    followDialog.close();
    message.textContent = `✅ ${data.message}`;
    await loadEnquiries();
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
}

function sampleEnquiry() {
  clearForm();
  document.querySelector("#studentName").value = "Rahul Sharma";
  document.querySelector("#parentName").value = "Mr. Sharma";
  document.querySelector("#phone").value = "9876543210";
  document.querySelector("#email").value = "rahul@example.com";
  document.querySelector("#classLevel").value = "12th / Beginner";
  document.querySelector("#interestedCourse").value = "AI Tools + Web Development";
  document.querySelector("#preferredBatch").value = "Evening Batch";
  document.querySelector("#leadSource").value = "youtube";
  document.querySelector("#leadTemperature").value = "hot";
  document.querySelector("#status").value = "follow_up";
  document.querySelector("#counsellorName").value = "Arun Khurana";
  document.querySelector("#expectedFee").value = 4999;
  document.querySelector("#offeredDiscount").value = 500;
  document.querySelector("#city").value = "Ambala Cantt";
  document.querySelector("#notes").value = "YouTube class dekhkar interested hai. Parent ko demo class aur fees structure explain karna hai.";
}

form.addEventListener("submit", saveEnquiry);
followForm.addEventListener("submit", saveFollowUp);
document.querySelector("#closeFollowBtn").addEventListener("click", () => followDialog.close());
document.querySelector("#clearBtn").addEventListener("click", clearForm);
document.querySelector("#sampleBtn").addEventListener("click", sampleEnquiry);
document.querySelector("#refreshBtn").addEventListener("click", loadEnquiries);
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

["searchInput", "courseFilter", "sourceFilter", "tempFilter", "statusFilter"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", () => loadEnquiries());
  document.querySelector(`#${id}`).addEventListener("change", () => loadEnquiries());
});

enquiriesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const card = event.target.closest(".data-card");
  const id = card?.dataset.id;
  const action = button.dataset.action;
  try {
    if (action === "edit") {
      const enquiry = currentEnquiries.find((item) => item.id === id);
      if (enquiry) fillForm(enquiry);
    } else if (action === "delete") {
      await deleteEnquiry(id);
    } else if (action === "follow") {
      openFollowUp(id);
    } else {
      await updateStatus(id, action);
    }
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
});

loadEnquiries();
