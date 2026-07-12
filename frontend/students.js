const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

const form = document.querySelector("#studentForm");
const formHeading = document.querySelector("#formHeading");
const saveBtn = document.querySelector("#saveBtn");
const resetBtn = document.querySelector("#resetBtn");
const formMessage = document.querySelector("#formMessage");
const listMessage = document.querySelector("#listMessage");
const studentList = document.querySelector("#studentList");
const refreshBtn = document.querySelector("#refreshBtn");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const feesFilter = document.querySelector("#feesFilter");

const totalStudents = document.querySelector("#totalStudents");
const activeStudents = document.querySelector("#activeStudents");
const pendingFees = document.querySelector("#pendingFees");

if (!token) {
  window.location.href = "index.html";
}

const fields = [
  "studentId",
  "name",
  "email",
  "phone",
  "gender",
  "classLevel",
  "courseName",
  "batchName",
  "feesStatus",
  "status",
  "guardianName",
  "guardianPhone",
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
    classLevel: getValue("classLevel"),
    courseName: getValue("courseName"),
    batchName: getValue("batchName"),
    feesStatus: getValue("feesStatus") || "pending",
    status: getValue("status") || "active",
    guardianName: getValue("guardianName"),
    guardianPhone: getValue("guardianPhone"),
    address: getValue("address"),
    notes: getValue("notes"),
  };
}

function clearForm() {
  fields.forEach((field) => {
    if (field === "gender") return setValue(field, "not_set");
    if (field === "feesStatus") return setValue(field, "pending");
    if (field === "status") return setValue(field, "active");
    setValue(field, "");
  });
  formHeading.textContent = "Add New Student";
  saveBtn.textContent = "Save Student";
  formMessage.textContent = "";
}

function feeLabel(value) {
  const labels = { paid: "Fees Paid", pending: "Fees Pending", partial: "Fees Partial" };
  return labels[value] || "Fees Pending";
}

function genderIcon(gender) {
  if (gender === "female") return "👩‍🎓";
  if (gender === "male") return "👨‍🎓";
  return "🧑‍🎓";
}

function renderStudents(data) {
  totalStudents.textContent = data.total ?? 0;
  activeStudents.textContent = data.active ?? 0;
  pendingFees.textContent = data.pendingFees ?? 0;

  if (!data.students.length) {
    studentList.innerHTML = `
      <div class="empty-state">
        <strong>No students found.</strong><br>
        Left side form se first student add karo. MongoDB me data save hoga.
      </div>
    `;
    return;
  }

  studentList.innerHTML = data.students.map((student) => `
    <article class="student-card" data-id="${student.id}">
      <div class="student-card-top">
        <div class="student-title">
          <div class="student-avatar">${genderIcon(student.gender)}</div>
          <div>
            <h3>${student.name}</h3>
            <p>${student.email || "Email not added"} • ${student.phone || "Phone not added"}</p>
          </div>
        </div>
        <div class="student-tags">
          <span class="tag ${student.status === "active" ? "blue" : "dark"}">${student.status}</span>
          <span class="tag">${feeLabel(student.feesStatus)}</span>
        </div>
      </div>

      <div class="student-details">
        <div><span>Course:</span> ${student.courseName || "Not set"}</div>
        <div><span>Batch:</span> ${student.batchName || "Not set"}</div>
        <div><span>Class:</span> ${student.classLevel || "Not set"}</div>
        <div><span>Guardian:</span> ${student.guardianName || "Not set"}</div>
        <div><span>Guardian Phone:</span> ${student.guardianPhone || "Not set"}</div>
        <div><span>Address:</span> ${student.address || "Not set"}</div>
      </div>

      ${student.notes ? `<p class="student-note">${student.notes}</p>` : ""}

      <div class="card-actions">
        <button class="edit-btn" data-action="edit" data-student='${JSON.stringify(student).replaceAll("'", "&apos;")}'>Edit</button>
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

async function loadStudents() {
  listMessage.textContent = "Students loading…";
  try {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
    if (statusFilter.value) params.set("status", statusFilter.value);
    if (feesFilter.value) params.set("feesStatus", feesFilter.value);

    const data = await apiRequest(`/students?${params.toString()}`);
    renderStudents(data);
    listMessage.textContent = `✅ ${data.count} student record loaded.`;
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
  const id = getValue("studentId");
  const payload = getPayload();

  if (!payload.name) {
    formMessage.textContent = "❌ Student name required hai";
    return;
  }

  formMessage.textContent = id ? "Student update ho raha hai…" : "Student save ho raha hai…";
  try {
    const data = await apiRequest(id ? `/students/${id}` : "/students", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    formMessage.textContent = `✅ ${data.message}`;
    clearForm();
    await loadStudents();
  } catch (error) {
    formMessage.textContent = `❌ ${error.message}`;
  }
});

studentList.addEventListener("click", async (event) => {
  const card = event.target.closest(".student-card");
  const action = event.target.dataset.action;
  if (!card || !action) return;

  const id = card.dataset.id;

  if (action === "edit") {
    const student = JSON.parse(event.target.dataset.student.replaceAll("&apos;", "'"));
    setValue("studentId", student.id);
    Object.entries(student).forEach(([key, value]) => {
      if (fields.includes(key)) setValue(key, value);
    });
    formHeading.textContent = "Update Student";
    saveBtn.textContent = "Update Student";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "delete") {
    const ok = confirm("Kya tum is student ko delete karna chahte ho?");
    if (!ok) return;
    try {
      const data = await apiRequest(`/students/${id}`, { method: "DELETE" });
      listMessage.textContent = `✅ ${data.message}`;
      await loadStudents();
    } catch (error) {
      listMessage.textContent = `❌ ${error.message}`;
    }
  }
});

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadStudents, 350);
});
statusFilter.addEventListener("change", loadStudents);
feesFilter.addEventListener("change", loadStudents);
refreshBtn.addEventListener("click", loadStudents);
resetBtn.addEventListener("click", clearForm);

document.querySelector("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

loadStudents();
