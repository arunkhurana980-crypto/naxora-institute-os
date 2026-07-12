const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

const form = document.querySelector("#parentForm");
const formHeading = document.querySelector("#formHeading");
const saveBtn = document.querySelector("#saveBtn");
const resetBtn = document.querySelector("#resetBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const formMessage = document.querySelector("#formMessage");
const listMessage = document.querySelector("#listMessage");
const parentList = document.querySelector("#parentList");
const refreshBtn = document.querySelector("#refreshBtn");
const addChildBtn = document.querySelector("#addChildBtn");
const childrenBox = document.querySelector("#childrenBox");

const searchInput = document.querySelector("#searchInput");
const relationFilter = document.querySelector("#relationFilter");
const statusFilter = document.querySelector("#statusFilter");
const portalFilter = document.querySelector("#portalFilter");
const feeFilter = document.querySelector("#feeFilter");

const totalParents = document.querySelector("#totalParents");
const totalChildren = document.querySelector("#totalChildren");
const portalEnabled = document.querySelector("#portalEnabled");
const followupParents = document.querySelector("#followupParents");

if (!token) window.location.href = "index.html";

const fields = [
  "parentId", "parentName", "relation", "phone", "alternatePhone", "email", "occupation", "preferredContactMode", "portalAccess", "status", "lastMeetingDate", "nextFollowUpDate", "address", "notes",
];

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function setValue(id, value = "") {
  if ((id === "lastMeetingDate" || id === "nextFollowUpDate") && value) {
    document.querySelector(`#${id}`).value = String(value).slice(0, 10);
    return;
  }
  document.querySelector(`#${id}`).value = value ?? "";
}
function titleCase(value = "") { return String(value).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function dateLabel(value) { return value ? new Date(value).toLocaleDateString("en-IN") : "Not set"; }
function parentIcon(relation) {
  if (relation === "father") return "👨";
  if (relation === "mother") return "👩";
  if (relation === "guardian") return "🧑";
  return "👪";
}

function childRowTemplate(child = {}) {
  return `
    <div class="child-row">
      <label>Student Name *<input class="child-studentName" placeholder="Student name" value="${child.studentName || ""}" /></label>
      <label>Roll No<input class="child-rollNo" placeholder="NAX-001" value="${child.rollNo || ""}" /></label>
      <label>Course<input class="child-courseName" placeholder="AI / Web Dev" value="${child.courseName || ""}" /></label>
      <label>Batch<input class="child-batchName" placeholder="Morning Batch" value="${child.batchName || ""}" /></label>
      <label>Class Level<input class="child-classLevel" placeholder="10th / 12th / Grad" value="${child.classLevel || ""}" /></label>
      <label>Attendance %<input class="child-attendancePercent" type="number" min="0" max="100" value="${child.attendancePercent ?? 0}" /></label>
      <label>Fee Status<select class="child-feeStatus"><option value="not_set">Not Set</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="partial">Partial</option><option value="overdue">Overdue</option></select></label>
      <label>Result<select class="child-resultStatus"><option value="not_set">Not Set</option><option value="excellent">Excellent</option><option value="good">Good</option><option value="average">Average</option><option value="needs_attention">Needs Attention</option></select></label>
      <label>Last Score<input class="child-lastScore" type="number" min="0" value="${child.lastScore ?? 0}" /></label>
      <label class="wide">Next Action<input class="child-nextAction" placeholder="Call parent / improve attendance" value="${child.nextAction || ""}" /></label>
      <button class="ghost-inline remove-child-btn" type="button">Remove</button>
    </div>`;
}

function addChildRow(child = {}) {
  childrenBox.insertAdjacentHTML("beforeend", childRowTemplate(child));
  const row = childrenBox.lastElementChild;
  row.querySelector(".child-feeStatus").value = child.feeStatus || "not_set";
  row.querySelector(".child-resultStatus").value = child.resultStatus || "not_set";
}

function getChildren() {
  return [...childrenBox.querySelectorAll(".child-row")].map((row) => ({
    studentName: row.querySelector(".child-studentName").value.trim(),
    rollNo: row.querySelector(".child-rollNo").value.trim(),
    courseName: row.querySelector(".child-courseName").value.trim(),
    batchName: row.querySelector(".child-batchName").value.trim(),
    classLevel: row.querySelector(".child-classLevel").value.trim(),
    attendancePercent: Number(row.querySelector(".child-attendancePercent").value || 0),
    feeStatus: row.querySelector(".child-feeStatus").value,
    resultStatus: row.querySelector(".child-resultStatus").value,
    lastScore: Number(row.querySelector(".child-lastScore").value || 0),
    nextAction: row.querySelector(".child-nextAction").value.trim(),
  })).filter((child) => child.studentName);
}

function getPayload() {
  return {
    parentName: getValue("parentName"),
    relation: getValue("relation") || "guardian",
    phone: getValue("phone"),
    alternatePhone: getValue("alternatePhone"),
    email: getValue("email"),
    occupation: getValue("occupation"),
    preferredContactMode: getValue("preferredContactMode") || "phone",
    portalAccess: getValue("portalAccess") || "pending",
    status: getValue("status") || "active",
    lastMeetingDate: getValue("lastMeetingDate"),
    nextFollowUpDate: getValue("nextFollowUpDate"),
    address: getValue("address"),
    notes: getValue("notes"),
    children: getChildren(),
  };
}

function clearForm() {
  fields.forEach((field) => {
    if (field === "relation") return setValue(field, "father");
    if (field === "preferredContactMode") return setValue(field, "phone");
    if (field === "portalAccess") return setValue(field, "pending");
    if (field === "status") return setValue(field, "active");
    setValue(field, "");
  });
  childrenBox.innerHTML = "";
  addChildRow();
  formHeading.textContent = "Add Parent Profile";
  saveBtn.textContent = "Save Parent";
  formMessage.textContent = "";
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

function renderParents(data) {
  totalParents.textContent = data.total ?? 0;
  totalChildren.textContent = data.totalChildren ?? 0;
  portalEnabled.textContent = data.portalEnabled ?? 0;
  followupParents.textContent = data.followup ?? 0;

  if (!data.parents.length) {
    parentList.innerHTML = `<div class="empty-state"><strong>No parent profiles found.</strong><br>Left form se first parent + child link add karo.</div>`;
    return;
  }

  parentList.innerHTML = data.parents.map((parent) => {
    const feeAlert = parent.children?.some((child) => ["pending", "partial", "overdue"].includes(child.feeStatus));
    const childChips = (parent.children || []).map((child) => `
      <span class="child-chip">${child.studentName} • ${child.courseName || "Course not set"} • ${child.attendancePercent || 0}% attendance • ${titleCase(child.feeStatus)}</span>
    `).join("");

    return `
      <article class="teacher-card parent-card" data-id="${parent.id}">
        <div class="teacher-card-top">
          <div class="teacher-title">
            <div class="teacher-avatar">${parentIcon(parent.relation)}</div>
            <div>
              <h3>${parent.parentName}</h3>
              <p>${titleCase(parent.relation)} • ${parent.phone || parent.email || "Contact not added"}</p>
            </div>
          </div>
          <div class="teacher-tags">
            <span class="tag blue">${titleCase(parent.status)}</span>
            <span class="tag">Portal: ${titleCase(parent.portalAccess)}</span>
            ${feeAlert ? `<span class="tag parent-alert">Fee Alert</span>` : ""}
          </div>
        </div>

        <div class="child-chip-row">${childChips}</div>

        <div class="parent-meta-grid">
          <div><span>Contact Mode</span>${titleCase(parent.preferredContactMode)}</div>
          <div><span>Occupation</span>${parent.occupation || "Not set"}</div>
          <div><span>Last Meeting</span>${dateLabel(parent.lastMeetingDate)}</div>
          <div><span>Next Follow-up</span>${dateLabel(parent.nextFollowUpDate)}</div>
          <div><span>Address</span>${parent.address || "Not set"}</div>
          <div><span>Alternate</span>${parent.alternatePhone || "Not set"}</div>
        </div>

        ${parent.notes ? `<p class="teacher-note">${parent.notes}</p>` : ""}

        <div class="mini-action-row">
          <button data-action="enablePortal">Enable Portal</button>
          <button data-action="followup">Needs Follow-up</button>
          <button data-action="active">Active</button>
        </div>
        <div class="card-actions">
          <button class="edit-btn" data-action="edit" data-parent='${JSON.stringify(parent).replaceAll("'", "&apos;")}'>Edit</button>
          <button class="delete-btn" data-action="delete">Delete</button>
        </div>
      </article>`;
  }).join("");
}

async function loadParents() {
  listMessage.textContent = "Parents loading…";
  try {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
    if (relationFilter.value) params.set("relation", relationFilter.value);
    if (statusFilter.value) params.set("status", statusFilter.value);
    if (portalFilter.value) params.set("portalAccess", portalFilter.value);
    if (feeFilter.value) params.set("feeStatus", feeFilter.value);
    const data = await apiRequest(`/parents?${params.toString()}`);
    renderParents(data);
    listMessage.textContent = `✅ ${data.count} parent profiles loaded.`;
  } catch (error) {
    listMessage.textContent = `❌ ${error.message}`;
    if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
      localStorage.removeItem("naxora_token");
      localStorage.removeItem("naxora_user");
      setTimeout(() => (window.location.href = "index.html"), 800);
    }
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = getValue("parentId");
  const payload = getPayload();
  if (!payload.parentName) return (formMessage.textContent = "❌ Parent name required hai");
  if (!payload.phone && !payload.email) return (formMessage.textContent = "❌ Parent phone ya email required hai");
  if (!payload.children.length) return (formMessage.textContent = "❌ Kam se kam ek child/student add karo");

  formMessage.textContent = id ? "Parent update ho raha hai…" : "Parent save ho raha hai…";
  try {
    const data = await apiRequest(id ? `/parents/${id}` : "/parents", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    formMessage.textContent = `✅ ${data.message}`;
    clearForm();
    await loadParents();
  } catch (error) {
    formMessage.textContent = `❌ ${error.message}`;
  }
});

parentList.addEventListener("click", async (event) => {
  const card = event.target.closest(".parent-card");
  const action = event.target.dataset.action;
  if (!card || !action) return;
  const id = card.dataset.id;

  if (action === "edit") {
    const parent = JSON.parse(event.target.dataset.parent.replaceAll("&apos;", "'"));
    setValue("parentId", parent.id);
    fields.forEach((field) => setValue(field, parent[field]));
    childrenBox.innerHTML = "";
    (parent.children || []).forEach(addChildRow);
    if (!parent.children?.length) addChildRow();
    formHeading.textContent = "Update Parent Profile";
    saveBtn.textContent = "Update Parent";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "enablePortal") {
    try {
      const data = await apiRequest(`/parents/${id}/status`, { method: "PATCH", body: JSON.stringify({ portalAccess: "enabled" }) });
      listMessage.textContent = `✅ ${data.message}`;
      await loadParents();
    } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
    return;
  }

  if (action === "followup") {
    try {
      const data = await apiRequest(`/parents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "needs_followup" }) });
      listMessage.textContent = `✅ ${data.message}`;
      await loadParents();
    } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
    return;
  }

  if (action === "active") {
    try {
      const data = await apiRequest(`/parents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
      listMessage.textContent = `✅ ${data.message}`;
      await loadParents();
    } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
    return;
  }

  if (action === "delete") {
    if (!confirm("Kya tum is parent profile ko delete karna chahte ho?")) return;
    try {
      const data = await apiRequest(`/parents/${id}`, { method: "DELETE" });
      listMessage.textContent = `✅ ${data.message}`;
      await loadParents();
    } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
  }
});

childrenBox.addEventListener("click", (event) => {
  if (!event.target.classList.contains("remove-child-btn")) return;
  event.target.closest(".child-row").remove();
  if (!childrenBox.children.length) addChildRow();
});

[relationFilter, statusFilter, portalFilter, feeFilter].forEach((el) => el.addEventListener("change", loadParents));
searchInput.addEventListener("input", () => setTimeout(loadParents, 250));
refreshBtn.addEventListener("click", loadParents);
addChildBtn.addEventListener("click", () => addChildRow());
resetBtn.addEventListener("click", clearForm);
sampleBtn.addEventListener("click", () => {
  clearForm();
  setValue("parentName", "Rajesh Kumar");
  setValue("relation", "father");
  setValue("phone", "9876543210");
  setValue("occupation", "Business");
  setValue("preferredContactMode", "whatsapp");
  setValue("portalAccess", "enabled");
  setValue("status", "needs_followup");
  setValue("notes", "Child attendance improve karne ke liye weekly parent follow-up required.");
  const row = childrenBox.querySelector(".child-row");
  row.querySelector(".child-studentName").value = "Aman Kumar";
  row.querySelector(".child-rollNo").value = "NAX-017";
  row.querySelector(".child-courseName").value = "AI Tools Masterclass";
  row.querySelector(".child-batchName").value = "Evening Batch";
  row.querySelector(".child-classLevel").value = "12th";
  row.querySelector(".child-attendancePercent").value = "76";
  row.querySelector(".child-feeStatus").value = "partial";
  row.querySelector(".child-resultStatus").value = "good";
  row.querySelector(".child-lastScore").value = "82";
  row.querySelector(".child-nextAction").value = "Attendance 85%+ tak improve karni hai.";
});

document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

clearForm();
loadParents();
