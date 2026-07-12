const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

const form = document.querySelector("#staffForm");
const formHeading = document.querySelector("#formHeading");
const saveBtn = document.querySelector("#saveBtn");
const resetBtn = document.querySelector("#resetBtn");
const sampleBtn = document.querySelector("#sampleBtn");
const formMessage = document.querySelector("#formMessage");
const listMessage = document.querySelector("#listMessage");
const staffList = document.querySelector("#staffList");
const refreshBtn = document.querySelector("#refreshBtn");
const searchInput = document.querySelector("#searchInput");
const roleFilter = document.querySelector("#roleFilter");
const statusFilter = document.querySelector("#statusFilter");
const salaryFilter = document.querySelector("#salaryFilter");
const attendanceFilter = document.querySelector("#attendanceFilter");

const totalStaff = document.querySelector("#totalStaff");
const activeStaff = document.querySelector("#activeStaff");
const pendingSalary = document.querySelector("#pendingSalary");
const salaryLoad = document.querySelector("#salaryLoad");

if (!token) window.location.href = "index.html";

const fields = [
  "staffId", "name", "email", "phone", "gender", "staffRole", "department", "shift", "joiningDate", "salaryAmount", "salaryStatus", "attendanceStatus", "status", "emergencyContact", "address", "notes",
];

function getValue(id) { return document.querySelector(`#${id}`).value.trim(); }
function setValue(id, value = "") {
  if (id === "joiningDate" && value) {
    document.querySelector(`#${id}`).value = String(value).slice(0, 10);
    return;
  }
  document.querySelector(`#${id}`).value = value ?? "";
}
function rupee(value) { return `₹${Number(value || 0).toLocaleString("en-IN")}`; }
function titleCase(value = "") { return String(value).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function staffIcon(role, gender) {
  if (role === "accountant") return "🧾";
  if (role === "receptionist") return "☎️";
  if (role === "counsellor") return "🗣️";
  if (role === "security") return "🛡️";
  if (gender === "female") return "👩‍💼";
  if (gender === "male") return "👨‍💼";
  return "🧑‍💼";
}
function dateLabel(value) { return value ? new Date(value).toLocaleDateString("en-IN") : "Not set"; }

function getPayload() {
  return {
    name: getValue("name"),
    email: getValue("email"),
    phone: getValue("phone"),
    gender: getValue("gender") || "not_set",
    staffRole: getValue("staffRole") || "other",
    department: getValue("department"),
    shift: getValue("shift") || "not_set",
    joiningDate: getValue("joiningDate"),
    salaryAmount: Number(getValue("salaryAmount") || 0),
    salaryStatus: getValue("salaryStatus") || "not_set",
    attendanceStatus: getValue("attendanceStatus") || "not_marked",
    status: getValue("status") || "active",
    emergencyContact: getValue("emergencyContact"),
    address: getValue("address"),
    notes: getValue("notes"),
  };
}

function clearForm() {
  fields.forEach((field) => {
    if (field === "gender") return setValue(field, "not_set");
    if (field === "staffRole") return setValue(field, "receptionist");
    if (field === "shift") return setValue(field, "not_set");
    if (field === "salaryStatus") return setValue(field, "not_set");
    if (field === "attendanceStatus") return setValue(field, "not_marked");
    if (field === "status") return setValue(field, "active");
    setValue(field, "");
  });
  formHeading.textContent = "Add Staff Member";
  saveBtn.textContent = "Save Staff";
  formMessage.textContent = "";
}

function renderStaff(data) {
  totalStaff.textContent = data.total ?? 0;
  activeStaff.textContent = data.active ?? 0;
  pendingSalary.textContent = data.pendingSalary ?? 0;
  salaryLoad.textContent = rupee(data.monthlySalaryLoad ?? 0);

  if (!data.staff.length) {
    staffList.innerHTML = `<div class="empty-state"><strong>No staff found.</strong><br>Left form se first receptionist/accountant/support staff add karo.</div>`;
    return;
  }

  staffList.innerHTML = data.staff.map((staff) => `
    <article class="teacher-card staff-card" data-id="${staff.id}">
      <div class="teacher-card-top">
        <div class="teacher-title">
          <div class="teacher-avatar">${staffIcon(staff.staffRole, staff.gender)}</div>
          <div>
            <h3>${staff.name}</h3>
            <p>${staff.phone || "Phone not added"} • ${staff.email || "Email not added"}</p>
          </div>
        </div>
        <div class="teacher-tags">
          <span class="tag blue staff-role-pill">${titleCase(staff.staffRole)}</span>
          <span class="tag ${staff.status === "active" ? "blue" : "dark"}">${titleCase(staff.status)}</span>
          <span class="tag">${titleCase(staff.salaryStatus)}</span>
        </div>
      </div>

      <div class="teacher-details">
        <div><span>Department:</span> ${staff.department || "Not set"}</div>
        <div><span>Shift:</span> ${titleCase(staff.shift)}</div>
        <div><span>Joining:</span> ${dateLabel(staff.joiningDate)}</div>
        <div><span>Salary:</span> ${rupee(staff.salaryAmount)}</div>
        <div><span>Attendance:</span> ${titleCase(staff.attendanceStatus)}</div>
        <div><span>Emergency:</span> ${staff.emergencyContact || "Not set"}</div>
        <div><span>Address:</span> ${staff.address || "Not set"}</div>
      </div>

      ${staff.notes ? `<p class="teacher-note">${staff.notes}</p>` : ""}

      <div class="mini-action-row">
        <button data-action="present">Present</button>
        <button data-action="late">Late</button>
        <button data-action="absent">Absent</button>
        <button data-action="salaryPaid">Salary Paid</button>
      </div>

      <div class="card-actions">
        <button class="edit-btn" data-action="edit" data-staff='${JSON.stringify(staff).replaceAll("'", "&apos;")}'>Edit</button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
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

async function loadStaff() {
  listMessage.textContent = "Staff loading…";
  try {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
    if (roleFilter.value) params.set("role", roleFilter.value);
    if (statusFilter.value) params.set("status", statusFilter.value);
    if (salaryFilter.value) params.set("salaryStatus", salaryFilter.value);
    if (attendanceFilter.value) params.set("attendanceStatus", attendanceFilter.value);
    const data = await apiRequest(`/staff?${params.toString()}`);
    renderStaff(data);
    listMessage.textContent = `✅ ${data.count} staff records loaded.`;
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
  const id = getValue("staffId");
  const payload = getPayload();
  if (!payload.name) return (formMessage.textContent = "❌ Staff name required hai");

  formMessage.textContent = id ? "Staff update ho raha hai…" : "Staff save ho raha hai…";
  try {
    const data = await apiRequest(id ? `/staff/${id}` : "/staff", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) });
    formMessage.textContent = `✅ ${data.message}`;
    clearForm();
    await loadStaff();
  } catch (error) {
    formMessage.textContent = `❌ ${error.message}`;
  }
});

staffList.addEventListener("click", async (event) => {
  const card = event.target.closest(".staff-card");
  const action = event.target.dataset.action;
  if (!card || !action) return;
  const id = card.dataset.id;

  if (action === "edit") {
    const staff = JSON.parse(event.target.dataset.staff.replaceAll("&apos;", "'"));
    setValue("staffId", staff.id);
    Object.entries(staff).forEach(([key, value]) => { if (fields.includes(key)) setValue(key, value); });
    formHeading.textContent = "Update Staff Member";
    saveBtn.textContent = "Update Staff";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (["present", "late", "absent"].includes(action)) {
    try {
      const data = await apiRequest(`/staff/${id}/status`, { method: "PATCH", body: JSON.stringify({ attendanceStatus: action }) });
      listMessage.textContent = `✅ ${data.message}`;
      await loadStaff();
    } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
    return;
  }

  if (action === "salaryPaid") {
    try {
      const data = await apiRequest(`/staff/${id}/status`, { method: "PATCH", body: JSON.stringify({ salaryStatus: "paid" }) });
      listMessage.textContent = `✅ ${data.message}`;
      await loadStaff();
    } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
    return;
  }

  if (action === "delete") {
    if (!confirm("Kya tum is staff record ko delete karna chahte ho?")) return;
    try {
      const data = await apiRequest(`/staff/${id}`, { method: "DELETE" });
      listMessage.textContent = `✅ ${data.message}`;
      await loadStaff();
    } catch (error) { listMessage.textContent = `❌ ${error.message}`; }
  }
});

[salaryFilter, statusFilter, roleFilter, attendanceFilter].forEach((el) => el.addEventListener("change", loadStaff));
searchInput.addEventListener("input", () => setTimeout(loadStaff, 250));
refreshBtn.addEventListener("click", loadStaff);
resetBtn.addEventListener("click", clearForm);
sampleBtn.addEventListener("click", () => {
  clearForm();
  setValue("name", "Neha Office Admin");
  setValue("phone", "9876543210");
  setValue("staffRole", "office_admin");
  setValue("department", "Operations");
  setValue("shift", "full_day");
  setValue("salaryAmount", "14000");
  setValue("salaryStatus", "pending");
  setValue("attendanceStatus", "present");
  setValue("notes", "Admission enquiry aur daily office management handle karegi.");
});

document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

loadStaff();
