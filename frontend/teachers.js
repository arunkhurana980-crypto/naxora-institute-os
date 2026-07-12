const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

const form = document.querySelector("#teacherForm");
const formHeading = document.querySelector("#formHeading");
const saveBtn = document.querySelector("#saveBtn");
const resetBtn = document.querySelector("#resetBtn");
const formMessage = document.querySelector("#formMessage");
const listMessage = document.querySelector("#listMessage");
const teacherList = document.querySelector("#teacherList");
const refreshBtn = document.querySelector("#refreshBtn");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const salaryFilter = document.querySelector("#salaryFilter");

const totalTeachers = document.querySelector("#totalTeachers");
const activeTeachers = document.querySelector("#activeTeachers");
const pendingSalary = document.querySelector("#pendingSalary");

if (!token) {
  window.location.href = "index.html";
}

const fields = [
  "teacherId",
  "name",
  "email",
  "phone",
  "gender",
  "subject",
  "courseName",
  "batchName",
  "qualification",
  "experienceYears",
  "salaryType",
  "salaryAmount",
  "salaryStatus",
  "status",
  "address",
  "notes",
];

function getValue(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function setValue(id, value = "") {
  document.querySelector(`#${id}`).value = value ?? "";
}

function getPayload() {
  return {
    name: getValue("name"),
    email: getValue("email"),
    phone: getValue("phone"),
    gender: getValue("gender") || "not_set",
    subject: getValue("subject"),
    courseName: getValue("courseName"),
    batchName: getValue("batchName"),
    qualification: getValue("qualification"),
    experienceYears: Number(getValue("experienceYears") || 0),
    salaryType: getValue("salaryType") || "not_set",
    salaryAmount: Number(getValue("salaryAmount") || 0),
    salaryStatus: getValue("salaryStatus") || "not_set",
    status: getValue("status") || "active",
    address: getValue("address"),
    notes: getValue("notes"),
  };
}

function clearForm() {
  fields.forEach((field) => {
    if (field === "gender") return setValue(field, "not_set");
    if (field === "salaryType") return setValue(field, "not_set");
    if (field === "salaryStatus") return setValue(field, "not_set");
    if (field === "status") return setValue(field, "active");
    setValue(field, "");
  });
  formHeading.textContent = "Add New Teacher";
  saveBtn.textContent = "Save Teacher";
  formMessage.textContent = "";
}

function salaryLabel(value) {
  const labels = { paid: "Salary Paid", pending: "Salary Pending", partial: "Salary Partial", not_set: "Salary Not Set" };
  return labels[value] || "Salary Not Set";
}

function salaryTypeLabel(value) {
  const labels = { monthly: "Monthly", per_class: "Per Class", percentage: "Percentage", not_set: "Not set" };
  return labels[value] || "Not set";
}

function teacherIcon(gender) {
  if (gender === "female") return "👩‍🏫";
  if (gender === "male") return "👨‍🏫";
  return "🧑‍🏫";
}

function rupee(value) {
  const amount = Number(value || 0);
  if (!amount) return "Not set";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function renderTeachers(data) {
  totalTeachers.textContent = data.total ?? 0;
  activeTeachers.textContent = data.active ?? 0;
  pendingSalary.textContent = data.pendingSalary ?? 0;

  if (!data.teachers.length) {
    teacherList.innerHTML = `
      <div class="empty-state">
        <strong>No teachers found.</strong><br>
        Left side form se first teacher add karo. MongoDB me data save hoga.
      </div>
    `;
    return;
  }

  teacherList.innerHTML = data.teachers.map((teacher) => `
    <article class="teacher-card" data-id="${teacher.id}">
      <div class="teacher-card-top">
        <div class="teacher-title">
          <div class="teacher-avatar">${teacherIcon(teacher.gender)}</div>
          <div>
            <h3>${teacher.name}</h3>
            <p>${teacher.email || "Email not added"} • ${teacher.phone || "Phone not added"}</p>
          </div>
        </div>
        <div class="teacher-tags">
          <span class="tag ${teacher.status === "active" ? "blue" : "dark"}">${teacher.status}</span>
          <span class="tag">${salaryLabel(teacher.salaryStatus)}</span>
        </div>
      </div>

      <div class="teacher-details">
        <div><span>Subject:</span> ${teacher.subject || "Not set"}</div>
        <div><span>Course:</span> ${teacher.courseName || "Not set"}</div>
        <div><span>Batch:</span> ${teacher.batchName || "Not set"}</div>
        <div><span>Qualification:</span> ${teacher.qualification || "Not set"}</div>
        <div><span>Experience:</span> ${teacher.experienceYears || 0} years</div>
        <div><span>Salary:</span> ${rupee(teacher.salaryAmount)} • ${salaryTypeLabel(teacher.salaryType)}</div>
        <div><span>Address:</span> ${teacher.address || "Not set"}</div>
      </div>

      ${teacher.notes ? `<p class="teacher-note">${teacher.notes}</p>` : ""}

      <div class="card-actions">
        <button class="edit-btn" data-action="edit" data-teacher='${JSON.stringify(teacher).replaceAll("'", "&apos;")}'>Edit</button>
        <button class="delete-btn" data-action="delete">Delete</button>
      </div>
    </article>
  `).join("");
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

async function loadTeachers() {
  listMessage.textContent = "Teachers loading…";
  try {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
    if (statusFilter.value) params.set("status", statusFilter.value);
    if (salaryFilter.value) params.set("salaryStatus", salaryFilter.value);

    const data = await apiRequest(`/teachers?${params.toString()}`);
    renderTeachers(data);
    listMessage.textContent = `✅ ${data.count} teacher record loaded.`;
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
  const id = getValue("teacherId");
  const payload = getPayload();

  if (!payload.name) {
    formMessage.textContent = "❌ Teacher name required hai";
    return;
  }

  formMessage.textContent = id ? "Teacher update ho raha hai…" : "Teacher save ho raha hai…";
  try {
    const data = await apiRequest(id ? `/teachers/${id}` : "/teachers", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    formMessage.textContent = `✅ ${data.message}`;
    clearForm();
    await loadTeachers();
  } catch (error) {
    formMessage.textContent = `❌ ${error.message}`;
  }
});

teacherList.addEventListener("click", async (event) => {
  const card = event.target.closest(".teacher-card");
  const action = event.target.dataset.action;
  if (!card || !action) return;

  const id = card.dataset.id;

  if (action === "edit") {
    const teacher = JSON.parse(event.target.dataset.teacher.replaceAll("&apos;", "'"));
    setValue("teacherId", teacher.id);
    Object.entries(teacher).forEach(([key, value]) => {
      if (fields.includes(key)) setValue(key, value);
    });
    formHeading.textContent = "Update Teacher";
    saveBtn.textContent = "Update Teacher";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "delete") {
    const ok = confirm("Kya tum is teacher ko delete karna chahte ho?");
    if (!ok) return;
    try {
      const data = await apiRequest(`/teachers/${id}`, { method: "DELETE" });
      listMessage.textContent = `✅ ${data.message}`;
      await loadTeachers();
    } catch (error) {
      listMessage.textContent = `❌ ${error.message}`;
    }
  }
});

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadTeachers, 350);
});
statusFilter.addEventListener("change", loadTeachers);
salaryFilter.addEventListener("change", loadTeachers);
refreshBtn.addEventListener("click", loadTeachers);
resetBtn.addEventListener("click", clearForm);

document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

loadTeachers();
