const API = window.NAXORA_API_BASE || (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" ? "http://127.0.0.1:5000/api" : `${window.location.origin}/api`);
const token = localStorage.getItem("naxora_token");

if (!token) window.location.href = "index.html";

const $ = (selector) => document.querySelector(selector);
const getValue = (id) => $(`#${id}`).value.trim();
const setValue = (id, value = "") => { $(`#${id}`).value = value ?? ""; };

const courseForm = $("#courseForm");
const batchForm = $("#batchForm");
const courseList = $("#courseList");
const batchList = $("#batchList");

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

function rupee(value) {
  const amount = Number(value || 0);
  if (!amount) return "Not set";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function dateText(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isoDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function safeData(item) {
  return JSON.stringify(item).replaceAll("'", "&apos;");
}

function logoutOnAuthError(error) {
  if (error.message.toLowerCase().includes("token") || error.message.toLowerCase().includes("login")) {
    localStorage.removeItem("naxora_token");
    localStorage.removeItem("naxora_user");
    setTimeout(() => (window.location.href = "index.html"), 800);
  }
}

function coursePayload() {
  return {
    name: getValue("courseNameInput"),
    code: getValue("courseCode"),
    category: getValue("courseCategory"),
    level: getValue("courseLevel") || "beginner",
    duration: getValue("courseDuration"),
    mode: getValue("courseMode") || "offline",
    totalFees: Number(getValue("courseFees") || 0),
    status: getValue("courseStatus") || "active",
    description: getValue("courseDescription"),
  };
}

function batchPayload() {
  return {
    name: getValue("batchNameInput"),
    courseName: getValue("batchCourseName"),
    teacherName: getValue("batchTeacherName"),
    timing: getValue("batchTiming"),
    days: getValue("batchDays"),
    startDate: getValue("batchStartDate"),
    endDate: getValue("batchEndDate"),
    maxStudents: Number(getValue("maxStudents") || 0),
    enrolledStudents: Number(getValue("enrolledStudents") || 0),
    batchFees: Number(getValue("batchFees") || 0),
    status: getValue("batchStatus") || "active",
    location: getValue("batchLocation"),
    notes: getValue("batchNotes"),
  };
}

function clearCourseForm() {
  ["courseId", "courseNameInput", "courseCode", "courseCategory", "courseDuration", "courseFees", "courseDescription"].forEach((id) => setValue(id, ""));
  setValue("courseLevel", "beginner");
  setValue("courseMode", "offline");
  setValue("courseStatus", "active");
  $("#courseFormHeading").textContent = "Add New Course";
  $("#saveCourseBtn").textContent = "Save Course";
  $("#courseMessage").textContent = "";
}

function clearBatchForm() {
  ["batchId", "batchNameInput", "batchCourseName", "batchTeacherName", "batchTiming", "batchDays", "batchStartDate", "batchEndDate", "maxStudents", "enrolledStudents", "batchFees", "batchLocation", "batchNotes"].forEach((id) => setValue(id, ""));
  setValue("batchStatus", "active");
  $("#batchFormHeading").textContent = "Add New Batch";
  $("#saveBatchBtn").textContent = "Save Batch";
  $("#batchMessage").textContent = "";
}

function renderCourses(data) {
  $("#totalCourses").textContent = data.total ?? 0;
  $("#activeCourses").textContent = data.active ?? 0;

  if (!data.courses.length) {
    courseList.innerHTML = `<div class="empty-state"><strong>No courses found.</strong><br>Upar se first course add karo.</div>`;
    return;
  }

  courseList.innerHTML = data.courses.map((course) => `
    <article class="data-card" data-id="${course.id}">
      <div class="data-top">
        <div class="data-title">
          <div class="data-avatar">📚</div>
          <div>
            <h3>${course.name}</h3>
            <p>${course.code || "No code"} • ${course.category || "No category"}</p>
          </div>
        </div>
        <div class="data-tags">
          <span class="tag blue">${course.status}</span>
          <span class="tag gold">${course.mode}</span>
        </div>
      </div>
      <div class="data-details">
        <div><span>Level</span>${course.level}</div>
        <div><span>Duration</span>${course.duration || "Not set"}</div>
        <div><span>Fees</span>${rupee(course.totalFees)}</div>
      </div>
      ${course.description ? `<p class="data-note">${course.description}</p>` : ""}
      <div class="card-actions">
        <button class="edit-btn" data-action="edit-course" data-course='${safeData(course)}'>Edit</button>
        <button class="delete-btn" data-action="delete-course">Delete</button>
      </div>
    </article>
  `).join("");
}

function renderBatches(data) {
  $("#totalBatches").textContent = data.total ?? 0;
  $("#activeBatches").textContent = data.active ?? 0;

  if (!data.batches.length) {
    batchList.innerHTML = `<div class="empty-state"><strong>No batches found.</strong><br>Upar se first batch add karo.</div>`;
    return;
  }

  batchList.innerHTML = data.batches.map((batch) => `
    <article class="data-card" data-id="${batch.id}">
      <div class="data-top">
        <div class="data-title">
          <div class="data-avatar">🏫</div>
          <div>
            <h3>${batch.name}</h3>
            <p>${batch.courseName || "No course"} • ${batch.teacherName || "No teacher"}</p>
          </div>
        </div>
        <div class="data-tags">
          <span class="tag blue">${batch.status}</span>
          <span class="tag gold">${batch.enrolledStudents || 0}/${batch.maxStudents || 0} students</span>
        </div>
      </div>
      <div class="data-details">
        <div><span>Timing</span>${batch.timing || "Not set"}</div>
        <div><span>Days</span>${batch.days || "Not set"}</div>
        <div><span>Fees</span>${rupee(batch.batchFees)}</div>
        <div><span>Start</span>${dateText(batch.startDate)}</div>
        <div><span>End</span>${dateText(batch.endDate)}</div>
        <div><span>Location</span>${batch.location || "Not set"}</div>
      </div>
      ${batch.notes ? `<p class="data-note">${batch.notes}</p>` : ""}
      <div class="card-actions">
        <button class="edit-btn" data-action="edit-batch" data-batch='${safeData(batch)}'>Edit</button>
        <button class="delete-btn" data-action="delete-batch">Delete</button>
      </div>
    </article>
  `).join("");
}

async function loadCourses() {
  $("#courseListMessage").textContent = "Courses loading…";
  try {
    const params = new URLSearchParams();
    if (getValue("courseSearch")) params.set("search", getValue("courseSearch"));
    if (getValue("courseStatusFilter")) params.set("status", getValue("courseStatusFilter"));
    if (getValue("courseModeFilter")) params.set("mode", getValue("courseModeFilter"));
    const data = await apiRequest(`/courses?${params.toString()}`);
    renderCourses(data);
    $("#courseListMessage").textContent = `✅ ${data.count} course record loaded.`;
  } catch (error) {
    $("#courseListMessage").textContent = `❌ ${error.message}`;
    logoutOnAuthError(error);
  }
}

async function loadBatches() {
  $("#batchListMessage").textContent = "Batches loading…";
  try {
    const params = new URLSearchParams();
    if (getValue("batchSearch")) params.set("search", getValue("batchSearch"));
    if (getValue("batchStatusFilter")) params.set("status", getValue("batchStatusFilter"));
    const data = await apiRequest(`/batches?${params.toString()}`);
    renderBatches(data);
    $("#batchListMessage").textContent = `✅ ${data.count} batch record loaded.`;
  } catch (error) {
    $("#batchListMessage").textContent = `❌ ${error.message}`;
    logoutOnAuthError(error);
  }
}

courseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = getValue("courseId");
  const payload = coursePayload();
  if (!payload.name) return ($("#courseMessage").textContent = "❌ Course name required hai");

  $("#courseMessage").textContent = id ? "Course update ho raha hai…" : "Course save ho raha hai…";
  try {
    const data = await apiRequest(id ? `/courses/${id}` : "/courses", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    $("#courseMessage").textContent = `✅ ${data.message}`;
    clearCourseForm();
    await loadCourses();
  } catch (error) {
    $("#courseMessage").textContent = `❌ ${error.message}`;
  }
});

batchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = getValue("batchId");
  const payload = batchPayload();
  if (!payload.name) return ($("#batchMessage").textContent = "❌ Batch name required hai");

  $("#batchMessage").textContent = id ? "Batch update ho raha hai…" : "Batch save ho raha hai…";
  try {
    const data = await apiRequest(id ? `/batches/${id}` : "/batches", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });
    $("#batchMessage").textContent = `✅ ${data.message}`;
    clearBatchForm();
    await loadBatches();
  } catch (error) {
    $("#batchMessage").textContent = `❌ ${error.message}`;
  }
});

courseList.addEventListener("click", async (event) => {
  const card = event.target.closest(".data-card");
  const action = event.target.dataset.action;
  if (!card || !action) return;

  if (action === "edit-course") {
    const course = JSON.parse(event.target.dataset.course.replaceAll("&apos;", "'"));
    setValue("courseId", course.id);
    setValue("courseNameInput", course.name);
    setValue("courseCode", course.code);
    setValue("courseCategory", course.category);
    setValue("courseLevel", course.level);
    setValue("courseDuration", course.duration);
    setValue("courseMode", course.mode);
    setValue("courseFees", course.totalFees);
    setValue("courseStatus", course.status);
    setValue("courseDescription", course.description);
    $("#courseFormHeading").textContent = "Edit Course";
    $("#saveCourseBtn").textContent = "Update Course";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "delete-course") {
    if (!confirm("Course delete karna hai?")) return;
    try {
      const data = await apiRequest(`/courses/${card.dataset.id}`, { method: "DELETE" });
      $("#courseListMessage").textContent = `✅ ${data.message}`;
      await loadCourses();
    } catch (error) {
      $("#courseListMessage").textContent = `❌ ${error.message}`;
    }
  }
});

batchList.addEventListener("click", async (event) => {
  const card = event.target.closest(".data-card");
  const action = event.target.dataset.action;
  if (!card || !action) return;

  if (action === "edit-batch") {
    const batch = JSON.parse(event.target.dataset.batch.replaceAll("&apos;", "'"));
    setValue("batchId", batch.id);
    setValue("batchNameInput", batch.name);
    setValue("batchCourseName", batch.courseName);
    setValue("batchTeacherName", batch.teacherName);
    setValue("batchTiming", batch.timing);
    setValue("batchDays", batch.days);
    setValue("batchStartDate", isoDate(batch.startDate));
    setValue("batchEndDate", isoDate(batch.endDate));
    setValue("maxStudents", batch.maxStudents);
    setValue("enrolledStudents", batch.enrolledStudents);
    setValue("batchFees", batch.batchFees);
    setValue("batchStatus", batch.status);
    setValue("batchLocation", batch.location);
    setValue("batchNotes", batch.notes);
    $("#batchFormHeading").textContent = "Edit Batch";
    $("#saveBatchBtn").textContent = "Update Batch";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (action === "delete-batch") {
    if (!confirm("Batch delete karna hai?")) return;
    try {
      const data = await apiRequest(`/batches/${card.dataset.id}`, { method: "DELETE" });
      $("#batchListMessage").textContent = `✅ ${data.message}`;
      await loadBatches();
    } catch (error) {
      $("#batchListMessage").textContent = `❌ ${error.message}`;
    }
  }
});

$("#clearCourseBtn").addEventListener("click", clearCourseForm);
$("#clearBatchBtn").addEventListener("click", clearBatchForm);
$("#refreshCoursesBtn").addEventListener("click", loadCourses);
$("#refreshBatchesBtn").addEventListener("click", loadBatches);
$("#courseSearch").addEventListener("input", loadCourses);
$("#courseStatusFilter").addEventListener("change", loadCourses);
$("#courseModeFilter").addEventListener("change", loadCourses);
$("#batchSearch").addEventListener("input", loadBatches);
$("#batchStatusFilter").addEventListener("change", loadBatches);
$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("naxora_token");
  localStorage.removeItem("naxora_user");
  window.location.href = "index.html";
});

loadCourses();
loadBatches();
