const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");
const savedUser = JSON.parse(localStorage.getItem("naxora_user") || "null");

if (!token) window.location.href = "index.html";

const form = document.querySelector("#branchForm");
const branchId = document.querySelector("#branchId");
const formTitle = document.querySelector("#formTitle");
const message = document.querySelector("#message");
const branchStats = document.querySelector("#branchStats");
const branchesList = document.querySelector("#branchesList");
const profilePill = document.querySelector("#profilePill");

profilePill.textContent = `${savedUser?.name || "User"} • Branches`;

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function authHeaders(extra = {}) { return { Authorization: `Bearer ${token}`, ...extra }; }
function money(value = 0) { return `₹${Number(value || 0).toLocaleString("en-IN")}`; }
function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function readPayload() {
  return {
    branchName: getValue("branchName"),
    branchCode: getValue("branchCode"),
    branchType: document.querySelector("#branchType").value,
    status: document.querySelector("#status").value,
    city: getValue("city"),
    district: getValue("district"),
    state: getValue("state"),
    pinCode: getValue("pinCode"),
    managerName: getValue("managerName"),
    managerPhone: getValue("managerPhone"),
    managerEmail: getValue("managerEmail"),
    contactPhone: getValue("contactPhone"),
    contactEmail: getValue("contactEmail"),
    openingDate: getValue("openingDate"),
    capacity: Number(getValue("capacity") || 0),
    currentStudents: Number(getValue("currentStudents") || 0),
    currentTeachers: Number(getValue("currentTeachers") || 0),
    monthlyRevenue: Number(getValue("monthlyRevenue") || 0),
    monthlyExpense: Number(getValue("monthlyExpense") || 0),
    facilities: getValue("facilities"),
    address: getValue("address"),
    notes: getValue("notes"),
  };
}

function fillForm(branch) {
  branchId.value = branch.id;
  formTitle.textContent = "Edit Branch";
  ["branchName", "branchCode", "city", "district", "state", "pinCode", "managerName", "managerPhone", "managerEmail", "contactPhone", "contactEmail", "capacity", "currentStudents", "currentTeachers", "monthlyRevenue", "monthlyExpense", "address", "notes"].forEach((id) => {
    document.querySelector(`#${id}`).value = branch[id] ?? "";
  });
  document.querySelector("#facilities").value = (branch.facilities || []).join(", ");
  document.querySelector("#branchType").value = branch.branchType || "main";
  document.querySelector("#status").value = branch.status || "active";
  document.querySelector("#openingDate").value = branch.openingDate ? String(branch.openingDate).slice(0, 10) : "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearForm() {
  branchId.value = "";
  form.reset();
  formTitle.textContent = "Add Branch";
  document.querySelector("#state").value = "Haryana";
  document.querySelector("#capacity").value = 50;
  document.querySelector("#currentStudents").value = 0;
  document.querySelector("#currentTeachers").value = 0;
  document.querySelector("#monthlyRevenue").value = 0;
  document.querySelector("#monthlyExpense").value = 0;
}

function renderStats(data) {
  const cards = [
    { title: "Branches", value: data.totalBranches || 0, label: `${data.activeBranches || 0} active • ${data.planningBranches || 0} planning`, icon: "🏢" },
    { title: "Students", value: data.totalStudents || 0, label: `${data.occupancyPercent || 0}% capacity used`, icon: "🎓" },
    { title: "Teachers", value: data.totalTeachers || 0, label: `${data.totalCapacity || 0} total seats`, icon: "👨‍🏫" },
    { title: "Monthly Profit", value: money(data.monthlyProfit || 0), label: `${money(data.monthlyRevenue || 0)} revenue`, icon: "💹" },
  ];
  branchStats.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <div class="stat-icon">${card.icon}</div>
      <h3>${card.title}</h3>
      <div class="stat-value">${card.value}</div>
      <p class="stat-label">${card.label}</p>
    </article>
  `).join("");
}

function renderBranches(branches) {
  if (!branches.length) {
    branchesList.innerHTML = `<p class="empty-state">Abhi branch list empty hai. Sample branch add karke start karo.</p>`;
    return;
  }

  branchesList.innerHTML = branches.map((branch) => `
    <article class="data-card branch-card" data-id="${branch.id}">
      <div class="data-top">
        <div>
          <h3>${escapeHtml(branch.branchName)} <span class="branch-code">${escapeHtml(branch.branchCode)}</span></h3>
          <p>${escapeHtml(branch.city || "No city")} • ${escapeHtml(branch.district || "No district")} • ${escapeHtml(branch.state || "")}</p>
        </div>
        <div class="data-tags">
          <span class="tag gold">${escapeHtml(branch.status)}</span>
          <span class="tag gold">${escapeHtml(branch.branchType)}</span>
        </div>
      </div>
      <div class="branch-progress">
        <div><b>${branch.occupancyPercent || 0}%</b><span>Occupancy</span></div>
        <div class="progress-bar"><i style="width:${Math.min(branch.occupancyPercent || 0, 100)}%"></i></div>
      </div>
      <div class="data-details">
        <div><span>Manager</span><b>${escapeHtml(branch.managerName || "Not set")}</b></div>
        <div><span>Students</span><b>${branch.currentStudents || 0}/${branch.capacity || 0}</b></div>
        <div><span>Teachers</span><b>${branch.currentTeachers || 0}</b></div>
        <div><span>Profit</span><b>${money(branch.monthlyProfit || 0)}</b></div>
        <div><span>Contact</span><b>${escapeHtml(branch.contactPhone || branch.managerPhone || "Not set")}</b></div>
        <div><span>Opening</span><b>${formatDate(branch.openingDate)}</b></div>
      </div>
      ${branch.address ? `<div class="solution-box"><b>Address:</b> ${escapeHtml(branch.address)}</div>` : ""}
      ${(branch.facilities || []).length ? `<div class="branch-chips">${branch.facilities.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
      ${branch.notes ? `<div class="solution-box"><b>Notes:</b> ${escapeHtml(branch.notes)}</div>` : ""}
      <div class="card-actions">
        <button class="edit-btn" data-action="edit">Edit</button>
        <button class="edit-btn" data-action="active">Active</button>
        <button class="edit-btn" data-action="planning">Planning</button>
        <button class="edit-btn" data-action="inactive">Inactive</button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
}

function queryParams() {
  const params = new URLSearchParams();
  const map = { search: "searchInput", city: "cityFilter", branchType: "typeFilter", status: "statusFilter" };
  Object.entries(map).forEach(([key, id]) => {
    const value = document.querySelector(`#${id}`).value.trim();
    if (value) params.set(key, value);
  });
  return params.toString();
}

let currentBranches = [];

async function loadBranches() {
  message.textContent = "Branches loading…";
  try {
    const response = await fetch(`${API}/branches?${queryParams()}`, { headers: authHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Branches load failed");
    currentBranches = data.branches || [];
    renderStats(data);
    renderBranches(currentBranches);
    message.textContent = "✅ Branches backend se connected hain.";
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.clear();
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}

async function saveBranch(event) {
  event.preventDefault();
  const payload = readPayload();
  const id = branchId.value;
  try {
    const response = await fetch(id ? `${API}/branches/${id}` : `${API}/branches`, {
      method: id ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Branch save failed");
    message.textContent = `✅ ${data.message}`;
    clearForm();
    await loadBranches();
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
}

async function updateStatus(id, status) {
  const response = await fetch(`${API}/branches/${id}/status`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Status update failed");
  message.textContent = `✅ ${data.message}`;
  await loadBranches();
}

async function deleteBranch(id) {
  if (!confirm("Delete this branch?")) return;
  const response = await fetch(`${API}/branches/${id}`, { method: "DELETE", headers: authHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Delete failed");
  message.textContent = `✅ ${data.message}`;
  await loadBranches();
}

function sampleBranch() {
  clearForm();
  document.querySelector("#branchName").value = "NAXORA Ambala Cantt Center";
  document.querySelector("#branchCode").value = "AMB-001";
  document.querySelector("#branchType").value = "main";
  document.querySelector("#city").value = "Ambala Cantt";
  document.querySelector("#district").value = "Ambala";
  document.querySelector("#state").value = "Haryana";
  document.querySelector("#pinCode").value = "133001";
  document.querySelector("#managerName").value = "Arun Khurana";
  document.querySelector("#managerPhone").value = "9253444624";
  document.querySelector("#contactPhone").value = "9253444624";
  document.querySelector("#capacity").value = 80;
  document.querySelector("#currentStudents").value = 25;
  document.querySelector("#currentTeachers").value = 3;
  document.querySelector("#monthlyRevenue").value = 60000;
  document.querySelector("#monthlyExpense").value = 22000;
  document.querySelector("#facilities").value = "Computer Lab, Projector, AC Room, Doubt Desk";
  document.querySelector("#address").value = "Near main market, Ambala Cantt, Haryana";
  document.querySelector("#notes").value = "First flagship branch. Focus: AI, coding, web development and cyber security batches.";
}

form.addEventListener("submit", saveBranch);
document.querySelector("#clearBtn").addEventListener("click", clearForm);
document.querySelector("#sampleBtn").addEventListener("click", sampleBranch);
document.querySelector("#refreshBtn").addEventListener("click", loadBranches);
document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

["searchInput", "cityFilter", "typeFilter", "statusFilter"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", () => loadBranches());
  document.querySelector(`#${id}`).addEventListener("change", () => loadBranches());
});

branchesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const card = event.target.closest(".data-card");
  const id = card?.dataset.id;
  const action = button.dataset.action;
  try {
    if (action === "edit") {
      const branch = currentBranches.find((item) => item.id === id);
      if (branch) fillForm(branch);
    } else if (action === "delete") {
      await deleteBranch(id);
    } else {
      await updateStatus(id, action);
    }
  } catch (error) {
    message.textContent = `❌ ${error.message}`;
  }
});

loadBranches();
